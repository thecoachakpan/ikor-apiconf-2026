#![allow(non_snake_case)]

use base64::Engine;
use std::ffi::c_void;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// Win32 constants
const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
const SHGFI_ICON: u32 = 0x000000100;
const SHGFI_SMALLICON: u32 = 0x000000001;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct ICONINFO {
    pub fIcon: i32,
    pub xHotspot: u32,
    pub yHotspot: u32,
    pub hbmMask: isize,
    pub hbmColor: isize,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct BITMAP {
    pub bmType: i32,
    pub bmWidth: i32,
    pub bmHeight: i32,
    pub bmWidthBytes: i32,
    pub bmPlanes: u16,
    pub bmBitsPixel: u16,
    pub bmBits: *mut u8,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct BITMAPINFOHEADER {
    pub biSize: u32,
    pub biWidth: i32,
    pub biHeight: i32,
    pub biPlanes: u16,
    pub biBitCount: u16,
    pub biCompression: u32,
    pub biSizeImage: u32,
    pub biXPelsPerMeter: i32,
    pub biYPelsPerMeter: i32,
    pub biClrUsed: u32,
    pub biClrImportant: u32,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct BITMAPINFO {
    pub bmiHeader: BITMAPINFOHEADER,
    pub bmiColors: [u32; 1],
}

#[repr(C)]
pub struct SHFILEINFOW {
    pub hIcon: isize,
    pub iIcon: i32,
    pub dwAttributes: u32,
    pub szDisplayName: [u16; 260],
    pub szTypeName: [u16; 80],
}

extern "system" {
    fn GetForegroundWindow() -> isize;
    fn GetWindowThreadProcessId(hwnd: isize, lpdwprocessid: *mut u32) -> u32;
    fn OpenProcess(dwdesiredaccess: u32, binherithandle: i32, dwprocessid: u32) -> isize;
    fn QueryFullProcessImageNameW(
        hprocess: isize,
        dwflags: u32,
        lpexename: *mut u16,
        lpdwsize: *mut u32,
    ) -> i32;
    fn GetWindowTextW(hwnd: isize, lpstring: *mut u16, nmaxcount: i32) -> i32;
    fn CloseHandle(hobject: isize) -> i32;

    fn SHGetFileInfoW(
        pszpath: *const u16,
        dwfileattributes: u32,
        psfi: *mut SHFILEINFOW,
        cbsfi: u32,
        uflags: u32,
    ) -> usize;

    fn DestroyIcon(hicon: isize) -> i32;
    fn GetIconInfo(hicon: isize, piconinfo: *mut ICONINFO) -> i32;
    fn DeleteObject(hgdiobj: isize) -> i32;
    fn GetDC(hwnd: isize) -> isize;
    fn ReleaseDC(hwnd: isize, hdc: isize) -> i32;
    fn GetObjectW(hgdiobj: isize, cbbuffer: i32, lpvobject: *mut c_void) -> i32;
    fn GetDIBits(
        hdc: isize,
        hbmp: isize,
        uStartScan: u32,
        cScanLines: u32,
        lpvBits: *mut u8,
        lpbmi: *mut BITMAPINFO,
        uUsage: u32,
    ) -> i32;
}

#[derive(serde::Serialize, Clone, Debug, PartialEq)]
pub struct AppInfoPayload {
    pub name: String,
    pub icon: Option<String>,
    pub exe: String,
    pub title: String,
}

lazy_static::lazy_static! {
    static ref LAST_EMITTED_APP: Mutex<Option<AppInfoPayload>> = Mutex::new(None);
}

pub fn get_foreground_app_info() -> Option<(String, String, String)> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd == 0 {
            return None;
        }

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return None;
        }

        let hprocess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if hprocess == 0 {
            return None;
        }

        let mut path_buf = vec![0u16; 1024];
        let mut size = path_buf.len() as u32;
        let success = QueryFullProcessImageNameW(hprocess, 0, path_buf.as_mut_ptr(), &mut size);
        CloseHandle(hprocess);

        if success == 0 {
            return None;
        }

        let exe_path = String::from_utf16_lossy(&path_buf[..size as usize]);
        let exe_name = std::path::Path::new(&exe_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let mut title_buf = vec![0u16; 512];
        let title_len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
        let title = if title_len > 0 {
            String::from_utf16_lossy(&title_buf[..title_len as usize])
        } else {
            String::new()
        };

        Some((exe_name, title, exe_path))
    }
}

pub fn extract_exe_icon(exe_path: &str) -> Option<String> {
    unsafe {
        let mut path_w: Vec<u16> = exe_path.encode_utf16().collect();
        path_w.push(0);

        let mut shfi: SHFILEINFOW = std::mem::zeroed();
        let res = SHGetFileInfoW(
            path_w.as_ptr(),
            0,
            &mut shfi,
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_SMALLICON,
        );

        if res == 0 || shfi.hIcon == 0 {
            return None;
        }

        let hicon = shfi.hIcon;
        let mut icon_info: ICONINFO = std::mem::zeroed();
        let get_info_res = GetIconInfo(hicon, &mut icon_info);
        if get_info_res == 0 {
            DestroyIcon(hicon);
            return None;
        }

        let mut bmp: BITMAP = std::mem::zeroed();
        let get_obj_res = GetObjectW(
            icon_info.hbmColor,
            std::mem::size_of::<BITMAP>() as i32,
            &mut bmp as *mut _ as *mut _,
        );

        if get_obj_res == 0 {
            if icon_info.hbmColor != 0 {
                DeleteObject(icon_info.hbmColor);
            }
            if icon_info.hbmMask != 0 {
                DeleteObject(icon_info.hbmMask);
            }
            DestroyIcon(hicon);
            return None;
        }

        let width = bmp.bmWidth;
        let height = bmp.bmHeight;

        let hdc = GetDC(0);
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // negative for top-down layout
                biPlanes: 1,
                biBitCount: 32, // BGRA format
                biCompression: 0,
                biSizeImage: (width * height * 4) as u32,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [0],
        };

        let mut pixel_data = vec![0u8; (width * height * 4) as usize];
        let lines_copied = GetDIBits(
            hdc,
            icon_info.hbmColor,
            0,
            height as u32,
            pixel_data.as_mut_ptr(),
            &mut bmi,
            0,
        );

        ReleaseDC(0, hdc);

        if icon_info.hbmColor != 0 {
            DeleteObject(icon_info.hbmColor);
        }
        if icon_info.hbmMask != 0 {
            DeleteObject(icon_info.hbmMask);
        }
        DestroyIcon(hicon);

        if lines_copied == 0 {
            return None;
        }

        // Build 32-bit BMP bytes manually
        let mut bmp_bytes = Vec::with_capacity(14 + 40 + pixel_data.len());

        // 1. File Header (14 bytes)
        bmp_bytes.extend_from_slice(b"BM");
        let file_size = (14 + 40 + pixel_data.len()) as u32;
        bmp_bytes.extend_from_slice(&file_size.to_le_bytes());
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes());
        bmp_bytes.extend_from_slice(&54u32.to_le_bytes());

        // 2. Info Header (40 bytes)
        bmp_bytes.extend_from_slice(&40u32.to_le_bytes());
        bmp_bytes.extend_from_slice(&width.to_le_bytes());
        bmp_bytes.extend_from_slice(&(-height).to_le_bytes());
        bmp_bytes.extend_from_slice(&1u16.to_le_bytes());
        bmp_bytes.extend_from_slice(&32u16.to_le_bytes()); // 32 bpp
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes());
        bmp_bytes.extend_from_slice(&(pixel_data.len() as u32).to_le_bytes());
        bmp_bytes.extend_from_slice(&0i32.to_le_bytes());
        bmp_bytes.extend_from_slice(&0i32.to_le_bytes());
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes());
        bmp_bytes.extend_from_slice(&0u32.to_le_bytes());

        // 3. Pixel data (BGRA)
        bmp_bytes.extend_from_slice(&pixel_data);

        let b64 = base64::engine::general_purpose::STANDARD.encode(&bmp_bytes);
        Some(format!("data:image/bmp;base64,{}", b64))
    }
}

pub fn resolve_app_payload(exe_name: &str, title: &str, exe_path: &str) -> AppInfoPayload {
    let exe_lower = exe_name.to_lowercase();
    let title_lower = title.to_lowercase();

    // Check if the foreground application is Sayikor itself
    if exe_lower == "sayikor.exe" || exe_lower == "sayikor-inference.exe" {
        return AppInfoPayload {
            title: title.to_string(),
            name: "Sayikor".to_string(),
            icon: None,
            exe: exe_name.to_string(),
        };
    }

    let is_browser = exe_lower == "chrome.exe"
        || exe_lower == "msedge.exe"
        || exe_lower == "firefox.exe"
        || exe_lower == "brave.exe"
        || exe_lower == "opera.exe";

    if exe_lower == "slack.exe" || (is_browser && title_lower.contains("slack")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Slack".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "whatsapp.exe" || (is_browser && title_lower.contains("whatsapp")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "WhatsApp".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "cursor.exe" || (is_browser && title_lower.contains("cursor")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Cursor".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "code.exe"
        || (is_browser
            && (title_lower.contains("visual studio code") || title_lower.contains("vscode")))
    {
        AppInfoPayload {
            title: title.to_string(),
            name: "VS Code".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "notion.exe" || (is_browser && title_lower.contains("notion")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Notion".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "spotify.exe" || (is_browser && title_lower.contains("spotify")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Spotify".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "discord.exe" || (is_browser && title_lower.contains("discord")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Discord".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "teams.exe" || (is_browser && title_lower.contains("teams")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Teams".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "zoom.exe" || (is_browser && title_lower.contains("zoom")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Zoom".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "figma.exe" || (is_browser && title_lower.contains("figma")) {
        AppInfoPayload {
            title: title.to_string(),
            name: "Figma".to_string(),
            icon: if is_browser {
                None
            } else {
                extract_exe_icon(exe_path)
            },
            exe: exe_name.to_string(),
        }
    } else if is_browser && title_lower.contains("gmail") {
        AppInfoPayload {
            title: title.to_string(),
            name: "Gmail".to_string(),
            icon: None,
            exe: exe_name.to_string(),
        }
    } else if is_browser && title_lower.contains("youtube") {
        AppInfoPayload {
            title: title.to_string(),
            name: "YouTube".to_string(),
            icon: None,
            exe: exe_name.to_string(),
        }
    } else if is_browser && title_lower.contains("github") {
        AppInfoPayload {
            title: title.to_string(),
            name: "GitHub".to_string(),
            icon: None,
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "chrome.exe" {
        AppInfoPayload {
            title: title.to_string(),
            name: "Chrome".to_string(),
            icon: None,
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "msedge.exe" {
        AppInfoPayload {
            title: title.to_string(),
            name: "Edge".to_string(),
            icon: None,
            exe: exe_name.to_string(),
        }
    } else if exe_lower == "firefox.exe" {
        AppInfoPayload {
            title: title.to_string(),
            name: "Firefox".to_string(),
            icon: None,
            exe: exe_name.to_string(),
        }
    } else {
        let extracted_icon = extract_exe_icon(exe_path);
        let name_without_ext = exe_name
            .strip_suffix(".exe")
            .unwrap_or(&exe_name)
            .to_string();

        let mut chars = name_without_ext.chars();
        let capitalized_name = match chars.next() {
            None => String::new(),
            Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
        };

        AppInfoPayload {
            title: title.to_string(),
            name: capitalized_name,
            icon: extracted_icon,
            exe: exe_name.to_string(),
        }
    }
}

pub fn get_current_app_payload() -> Option<AppInfoPayload> {
    let (exe_name, title, exe_path) = get_foreground_app_info()?;
    Some(resolve_app_payload(&exe_name, &title, &exe_path))
}

pub fn start_app_context_tracking(app_handle: AppHandle) {
    thread::spawn(move || loop {
        if let Some(current_payload) = get_current_app_payload() {
            let mut last_emitted = LAST_EMITTED_APP.lock().unwrap();
            let should_emit = match &*last_emitted {
                None => true,
                Some(last) => {
                    last.name != current_payload.name
                        || last.icon != current_payload.icon
                        || last.exe != current_payload.exe
                        || last.title != current_payload.title
                }
            };

            if should_emit {
                println!(
                    "[App Context] Emitting active app changed: name={} exe={}",
                    current_payload.name, current_payload.exe
                );
                let _ = app_handle.emit("active-app-changed", current_payload.clone());
                *last_emitted = Some(current_payload);
            }
        }
        thread::sleep(Duration::from_millis(250));
    });
}
