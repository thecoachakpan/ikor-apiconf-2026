use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::fs;
use std::process::{Child, Command};
use std::sync::{Mutex, OnceLock, RwLock};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

static ENIGO: OnceLock<Mutex<Enigo>> = OnceLock::new();
static CLIPBOARD: OnceLock<Option<Mutex<arboard::Clipboard>>> = OnceLock::new();
static WHISPER_CHILD: Mutex<Option<Child>> = Mutex::new(None);
static MCP_CHILD: Mutex<Option<Child>> = Mutex::new(None);
static APPROVAL_TEXT: OnceLock<Mutex<Option<String>>> = OnceLock::new();
static SHORTCUTS_JSON: RwLock<String> = RwLock::new(String::new());
static WAS_MUTED_BEFORE: Mutex<Option<bool>> = Mutex::new(None);

#[derive(serde::Deserialize, Clone, Debug)]
struct ShortcutConfig {
    id: String,
    keys: Vec<String>,
}

struct CompiledShortcut {
    id: String,
    vk_codes: Vec<i32>,
    was_pressed: bool,
}

fn key_name_to_vk(name: &str) -> Option<i32> {
    match name {
        "Left Ctrl" | "Ctrl" => Some(0xA2),
        "Right Ctrl" => Some(0xA3),
        "Left Alt" => Some(0xA4),
        "Right Alt" => Some(0xA5),
        "Left Win" => Some(0x5B),
        "Right Win" => Some(0x5C),
        "Shift" => Some(0x10),
        "Left Shift" => Some(0xA0),
        "Right Shift" => Some(0xA1),
        "Space" => Some(0x20),
        "Tab" => Some(0x09),
        "Enter" => Some(0x0D),
        "Escape" | "Esc" => Some(0x1B),
        "Backspace" => Some(0x08),
        "Delete" => Some(0x2E),
        // Arrow keys
        "ArrowUp" => Some(0x26),
        "ArrowDown" => Some(0x28),
        "ArrowLeft" => Some(0x25),
        "ArrowRight" => Some(0x27),
        // Navigation keys
        "Insert" => Some(0x2D),
        "Home" => Some(0x24),
        "End" => Some(0x23),
        "PageUp" => Some(0x21),
        "PageDown" => Some(0x22),
        // Lock keys
        "CapsLock" => Some(0x14),
        "NumLock" => Some(0x90),
        "ScrollLock" => Some(0x91),
        // Punctuation (VK_OEM codes for US keyboard layout)
        ";" => Some(0xBA),  // VK_OEM_1
        "=" => Some(0xBB),  // VK_OEM_PLUS
        "," => Some(0xBC),  // VK_OEM_COMMA
        "-" => Some(0xBD),  // VK_OEM_MINUS
        "." => Some(0xBE),  // VK_OEM_PERIOD
        "/" => Some(0xBF),  // VK_OEM_2
        "`" => Some(0xC0),  // VK_OEM_3
        "[" => Some(0xDB),  // VK_OEM_4
        "\\" => Some(0xDC), // VK_OEM_5
        "]" => Some(0xDD),  // VK_OEM_6
        "'" => Some(0xDE),  // VK_OEM_7
        _ => {
            if name.len() == 1 {
                let c = name.chars().next().unwrap().to_ascii_uppercase();
                if c.is_ascii_alphanumeric() {
                    Some(c as i32)
                } else {
                    println!("[Shortcuts] WARNING: Unrecognized single-char key name: '{}' (char code {})", name, c as u32);
                    None
                }
            } else if name.starts_with('F') && name.len() <= 3 {
                if let Ok(n) = name[1..].parse::<i32>() {
                    if (1..=12).contains(&n) {
                        Some(0x70 + n - 1)
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                println!("[Shortcuts] WARNING: Unrecognized key name: '{}'", name);
                None
            }
        }
    }
}

mod local_whisper_stream;
use local_whisper_stream::{
    append_audio_chunk, finish_audio_stream, init_whisper_stream, WhisperAppState,
};

mod native_recording;
use native_recording::{start_native_recording, stop_native_recording, NativeRecorderState};

mod audio_test;
mod scribe;
use audio_test::*;

mod app_context;
use app_context::{start_app_context_tracking, AppInfoPayload};

pub(crate) fn get_enigo() -> &'static Mutex<Enigo> {
    ENIGO.get_or_init(|| Mutex::new(Enigo::new(&Settings::default()).unwrap()))
}

pub(crate) fn get_clipboard() -> Option<&'static Mutex<arboard::Clipboard>> {
    CLIPBOARD
        .get_or_init(|| arboard::Clipboard::new().ok().map(Mutex::new))
        .as_ref()
}

fn simulate_paste() {
    let mut enigo = get_enigo().lock().unwrap();

    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    let _ = enigo.key(modifier, Direction::Press);
    let _ = enigo.key(Key::Unicode('v'), Direction::Click);
    let _ = enigo.key(modifier, Direction::Release);
}

fn convert_markdown_tables_to_html(text: &str) -> (String, bool) {
    let mut result = String::new();
    let mut in_table = false;
    let mut table_lines: Vec<String> = Vec::new();
    let mut converted_any = false;

    if !text.contains('|') {
        return (text.to_string(), false);
    }

    for line in text.lines() {
        let trimmed = line.trim();
        let is_table_row = trimmed.starts_with('|') && trimmed.ends_with('|');

        if is_table_row {
            if !in_table {
                in_table = true;
                table_lines.clear();
            }
            table_lines.push(trimmed.to_string());
        } else {
            if in_table {
                if let Some(html_table) = render_html_table(&table_lines) {
                    result.push_str(&html_table);
                    result.push('\n');
                    converted_any = true;
                } else {
                    for tl in &table_lines {
                        result.push_str(tl);
                        result.push('\n');
                    }
                }
                in_table = false;
            }
            result.push_str(line);
            result.push('\n');
        }
    }

    if in_table {
        if let Some(html_table) = render_html_table(&table_lines) {
            result.push_str(&html_table);
            converted_any = true;
        } else {
            for tl in &table_lines {
                result.push_str(tl);
                result.push('\n');
            }
        }
    }

    if !text.ends_with('\n') && result.ends_with('\n') {
        result.pop();
    }

    (result, converted_any)
}

fn render_html_table(lines: &[String]) -> Option<String> {
    if lines.len() < 2 {
        return None;
    }

    let mut html = String::new();
    html.push_str("<table border=\"1\" style=\"border-collapse: collapse; width: 100%;\">\n");

    for (i, line) in lines.iter().enumerate() {
        let content = line.trim_start_matches('|').trim_end_matches('|');
        let cols: Vec<&str> = content.split('|').collect();

        if i == 1 {
            let is_sep = cols.iter().all(|col| {
                let t = col.trim();
                t.is_empty() || t.chars().all(|c| c == '-' || c == ':' || c == ' ')
            });
            if is_sep {
                continue;
            }
        }

        html.push_str("  <tr>\n");
        for col in cols {
            let cell_text = col.trim();
            if i == 0 && is_header_separator_check(lines) {
                html.push_str(&format!("    <th style=\"border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #f2f2f2;\">{}</th>\n", cell_text));
            } else {
                html.push_str(&format!(
                    "    <td style=\"border: 1px solid #ccc; padding: 8px;\">{}</td>\n",
                    cell_text
                ));
            }
        }
        html.push_str("  </tr>\n");
    }
    html.push_str("</table>");
    Some(html)
}

fn is_header_separator_check(lines: &[String]) -> bool {
    if lines.len() < 2 {
        return false;
    }
    let content = lines[1].trim_start_matches('|').trim_end_matches('|');
    let cols: Vec<&str> = content.split('|').collect();
    cols.iter().all(|col| {
        let t = col.trim();
        t.is_empty() || t.chars().all(|c| c == '-' || c == ':' || c == ' ')
    })
}

fn convert_markdown_to_html(text: &str) -> String {
    let (mut html, _) = convert_markdown_tables_to_html(text);

    let mut in_list = false;
    let mut list_converted = String::new();
    for line in html.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
            if !in_list {
                in_list = true;
                list_converted.push_str("<ul>\n");
            }
            let item_text = trimmed[2..].trim();
            list_converted.push_str(&format!("  <li>{}</li>\n", item_text));
        } else {
            if in_list {
                list_converted.push_str("</ul>\n");
                in_list = false;
            }
            list_converted.push_str(line);
            list_converted.push('\n');
        }
    }
    if in_list {
        list_converted.push_str("</ul>\n");
    }
    html = list_converted;

    let mut bold_converted = String::new();
    let parts = html.split("**");
    for (i, part) in parts.enumerate() {
        if i % 2 == 1 {
            bold_converted.push_str(&format!("<b>{}</b>", part));
        } else {
            bold_converted.push_str(part);
        }
    }
    html = bold_converted;

    let mut final_html = String::new();
    final_html.push_str("<html><body>\n");
    for line in html.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<table")
            || trimmed.ends_with("</table>")
            || trimmed.starts_with("<tr")
            || trimmed.ends_with("</tr>")
            || trimmed.starts_with("<td")
            || trimmed.ends_with("</td>")
            || trimmed.starts_with("<th")
            || trimmed.ends_with("</th>")
            || trimmed.starts_with("<ul")
            || trimmed.ends_with("</ul>")
            || trimmed.starts_with("<li")
            || trimmed.ends_with("</li>")
        {
            final_html.push_str(line);
            final_html.push('\n');
        } else if trimmed.is_empty() {
            final_html.push_str("<br><br>\n");
        } else {
            final_html.push_str(&format!("{}<br>\n", line));
        }
    }
    final_html.push_str("</body></html>");

    final_html
}

fn strip_html_tags(html: &str) -> String {
    let mut clean = String::new();
    let mut in_tag = false;
    for c in html.chars() {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            clean.push(c);
        }
    }
    clean
}

fn strip_markdown_code_fences(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.starts_with("```") && trimmed.ends_with("```") {
        if let Some(first_newline) = trimmed.find('\n') {
            let content = &trimmed[first_newline + 1..];
            if content.ends_with("```") {
                return content[..content.len() - 3].trim().to_string();
            }
        }
    }
    text.to_string()
}

#[tauri::command]
fn type_text(text: String) {
    let cleaned_text = strip_markdown_code_fences(&text);

    // Write text to native OS clipboard (bypasses browser focus restrictions)
    if let Some(clipboard_mutex) = get_clipboard() {
        if let Ok(mut clipboard) = clipboard_mutex.lock() {
            let has_html = cleaned_text.contains("<table")
                || cleaned_text.contains("<tr")
                || cleaned_text.contains("<td")
                || cleaned_text.contains("<th")
                || cleaned_text.contains("<ul")
                || cleaned_text.contains("<ol")
                || cleaned_text.contains("<li>")
                || cleaned_text.contains("<p>")
                || cleaned_text.contains("<b>")
                || cleaned_text.contains("<i>");

            let has_markdown = cleaned_text.contains('|')
                || cleaned_text.contains("**")
                || cleaned_text.contains("- ")
                || cleaned_text.contains("* ");

            if has_html {
                let html_content =
                    if cleaned_text.contains("<html>") || cleaned_text.contains("<body>") {
                        cleaned_text.clone()
                    } else {
                        format!("<html><body>\n{}\n</body></html>", cleaned_text)
                    };
                let plain_fallback = strip_html_tags(&cleaned_text);
                let _ = clipboard.set_html(html_content, Some(plain_fallback));
            } else if has_markdown {
                let html_content = convert_markdown_to_html(&cleaned_text);
                let _ = clipboard.set_html(html_content, Some(cleaned_text.clone()));
            } else {
                let _ = clipboard.set_text(cleaned_text);
            }
        }
    }
    simulate_paste();
}

#[tauri::command]
fn check_whisper_status(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let local_data = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    let bin_dir = local_data.join("bin");
    let inference_exe = bin_dir.join("sayikor-inference.exe");

    // Migration: Copy pre-existing whisper-server.exe if present to avoid re-downloads
    let old_exe = bin_dir.join("whisper-server.exe");
    if old_exe.exists() && !inference_exe.exists() {
        let _ = fs::copy(&old_exe, &inference_exe);
    }

    let has_exe = inference_exe.exists();

    // Check if the preferred base model exists (for high accuracy and speed)
    let models_dir = local_data.join("models");
    let has_model = models_dir.join("ggml-base.en.bin").exists();

    Ok(has_exe && has_model)
}

#[tauri::command]
fn setup_whisper_assets(app_handle: tauri::AppHandle) -> Result<(), String> {
    let local_data = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    let bin_dir = local_data.join("bin");
    let inference_exe = bin_dir.join("sayikor-inference.exe");
    let models_dir = local_data.join("models");
    let model_bin = models_dir.join("ggml-base.en.bin");

    let _ = fs::create_dir_all(&bin_dir);
    let _ = fs::create_dir_all(&models_dir);

    // Download sayikor-inference.exe if still missing
    if !inference_exe.exists() {
        println!("Downloading Sayikor Inference Engine assets...");
        let zip_url = "https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.1/whisper-blas-bin-x64.zip";
        let zip_path = bin_dir.join("sayikor-blas-bin-x64.zip");
        let temp_dir = bin_dir.join("temp_extract");

        let ps_cmd = format!(
            "Invoke-WebRequest -Uri '{}' -OutFile '{}'; Expand-Archive -Path '{}' -DestinationPath '{}' -Force; Copy-Item '{}' '{}' -Force; Remove-Item '{}', '{}' -Recurse -ErrorAction SilentlyContinue",
            zip_url,
            zip_path.to_str().unwrap(),
            zip_path.to_str().unwrap(),
            temp_dir.to_str().unwrap(),
            temp_dir.join("whisper-server.exe").to_str().unwrap(),
            inference_exe.to_str().unwrap(),
            zip_path.to_str().unwrap(),
            temp_dir.to_str().unwrap()
        );

        #[cfg(target_os = "windows")]
        let status = Command::new("powershell")
            .args(&["-Command", &ps_cmd])
            .creation_flags(0x08000000)
            .status()
            .map_err(|e| e.to_string())?;

        #[cfg(not(target_os = "windows"))]
        let status = Command::new("sh")
            .arg("-c")
            .arg("echo 'Not supported on non-windows fallbacks yet'")
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to download or extract Sayikor Inference assets".to_string());
        }
    }

    // Download ggml-base.en.bin if still missing
    if !model_bin.exists() {
        println!("Downloading ggml-base.en.bin model (~148MB)...");
        let model_url =
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
        let ps_cmd = format!(
            "Invoke-WebRequest -Uri '{}' -OutFile '{}'",
            model_url,
            model_bin.to_str().unwrap()
        );

        #[cfg(target_os = "windows")]
        let status = Command::new("powershell")
            .args(&["-Command", &ps_cmd])
            .creation_flags(0x08000000)
            .status()
            .map_err(|e| e.to_string())?;

        #[cfg(not(target_os = "windows"))]
        let status = Command::new("sh")
            .arg("-c")
            .arg("echo 'Not supported on non-windows fallbacks yet'")
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to download Whisper model".to_string());
        }
    }

    Ok(())
}

#[tauri::command]
fn start_whisper_server(app_handle: tauri::AppHandle) -> Result<(), String> {
    let mut child_guard = WHISPER_CHILD.lock().unwrap();
    if child_guard.is_none() {
        let local_data = app_handle
            .path()
            .app_local_data_dir()
            .map_err(|e| e.to_string())?;
        let bin_path = local_data.join("bin").join("sayikor-inference.exe");

        if !bin_path.exists() {
            return Err("Sayikor Inference Engine is not installed".to_string());
        }

        let models_dir = local_data.join("models");
        let model_path = if models_dir.join("ggml-base.en.bin").exists() {
            models_dir.join("ggml-base.en.bin")
        } else if models_dir.join("ggml-tiny.en.bin").exists() {
            models_dir.join("ggml-tiny.en.bin")
        } else if models_dir.join("ggml-small.en.bin").exists() {
            models_dir.join("ggml-small.en.bin")
        } else {
            return Err("No Whisper model found".to_string());
        };

        let logical_cores = std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4);
        // Optimize thread count to match physical cores (logical / 2) to eliminate hyper-threading CPU contention
        let threads = if logical_cores > 2 {
            logical_cores / 2
        } else {
            logical_cores
        };
        let threads_str = threads.to_string();

        println!(
            "Starting Sayikor Inference Engine with model: {:?} and threads: {} (logical: {})",
            model_path, threads, logical_cores
        );

        #[cfg(target_os = "windows")]
        let child = Command::new(bin_path)
            .args(&[
                "--model",
                model_path.to_str().unwrap(),
                "--port",
                "8080",
                "--host",
                "127.0.0.1",
                "--threads",
                &threads_str,
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| e.to_string())?;

        #[cfg(not(target_os = "windows"))]
        let child = Command::new(bin_path)
            .args(&[
                "--model",
                model_path.to_str().unwrap(),
                "--port",
                "8080",
                "--host",
                "127.0.0.1",
                "--threads",
                &threads_str,
            ])
            .spawn()
            .map_err(|e| e.to_string())?;

        *child_guard = Some(child);
        println!("Sayikor Inference Engine started successfully on port 8080!");
    }
    Ok(())
}

#[tauri::command]
fn stop_whisper_server() -> Result<(), String> {
    let mut child_guard = WHISPER_CHILD.lock().unwrap();
    if let Some(mut child) = child_guard.take() {
        let _ = child.kill();
        println!("Sayikor Inference Engine stopped.");
    }
    Ok(())
}

#[tauri::command]
fn start_mcp_server(
    api_key: String,
    secret_key: String,
    contract_code: String,
    is_sandbox: bool,
) -> Result<(), String> {
    // Kill existing child process immediately
    {
        let mut child_guard = MCP_CHILD.lock().unwrap();
        if let Some(mut child) = child_guard.take() {
            let _ = child.kill();
            println!("Monnify MCP server stopped.");
        }
    }

    // Spawn a background thread to run the child process and perform the handshake
    std::thread::spawn(move || {
        let mode = if is_sandbox { "sandbox" } else { "live" };

        #[cfg(target_os = "windows")]
        let cmd_name = "npx.cmd";
        #[cfg(not(target_os = "windows"))]
        let cmd_name = "npx";

        let mut cmd = Command::new(cmd_name);
        cmd.arg("-y")
            .arg("@monnify/mcp-server")
            .arg("--apiKey")
            .arg(&api_key)
            .arg("--secretKey")
            .arg(&secret_key)
            .arg("--contractCode")
            .arg(&contract_code)
            .arg("--env")
            .arg(mode)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

        println!(
            "Spawning Monnify MCP server in {} mode (background)...",
            mode
        );
        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Failed to spawn Monnify MCP server: {}", e);
                return;
            }
        };

        // ── MCP Protocol Initialization Handshake ──────────────────────────
        // The MCP spec requires: initialize request → read response → send initialized notification
        // before any tools/call requests are accepted by the server.
        let handshake_res = || -> Result<(), String> {
            use std::io::{BufRead, Write};

            let stdin = child
                .stdin
                .as_mut()
                .ok_or_else(|| "Failed to open MCP stdin for initialization".to_string())?;
            let stdout = child
                .stdout
                .as_mut()
                .ok_or_else(|| "Failed to open MCP stdout for initialization".to_string())?;

            // Step 1: Send the initialize request (id: 0)
            let init_request = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "Sayikor",
                        "version": "1.0.0"
                    }
                },
                "id": 0
            });
            let init_str = serde_json::to_string(&init_request).unwrap() + "\n";
            stdin
                .write_all(init_str.as_bytes())
                .map_err(|e| format!("Failed to send MCP initialize request: {}", e))?;
            stdin
                .flush()
                .map_err(|e| format!("Failed to flush MCP initialize request: {}", e))?;

            println!("[MCP] Sent initialize request, waiting for server response...");

            // Step 2: Read lines until we receive the initialize response (id: 0)
            let mut reader = std::io::BufReader::new(stdout);
            let mut line = String::new();
            let mut got_init_response = false;
            for _ in 0..50 {
                line.clear();
                reader
                    .read_line(&mut line)
                    .map_err(|e| format!("Failed to read MCP init response: {}", e))?;

                if line.is_empty() {
                    return Err("MCP server closed stdout during initialization".to_string());
                }

                println!("[MCP Init]: {}", line.trim());

                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                    if val.get("id").and_then(|id| id.as_i64()) == Some(0) {
                        got_init_response = true;
                        break;
                    }
                }
            }

            if !got_init_response {
                return Err("MCP server did not respond to initialize request".to_string());
            }

            // Step 3: Send the initialized notification (no response expected)
            let initialized_notif = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            });
            let notif_str = serde_json::to_string(&initialized_notif).unwrap() + "\n";
            stdin
                .write_all(notif_str.as_bytes())
                .map_err(|e| format!("Failed to send MCP initialized notification: {}", e))?;
            stdin
                .flush()
                .map_err(|e| format!("Failed to flush MCP initialized notification: {}", e))?;

            println!("[MCP] Initialization handshake complete.");
            Ok(())
        }();

        if let Err(err) = handshake_res {
            eprintln!("Monnify MCP server handshake failed: {}", err);
            let _ = child.kill();
        } else {
            let mut child_guard = MCP_CHILD.lock().unwrap();
            *child_guard = Some(child);
            println!("Monnify MCP server spawned and initialized successfully.");
        }
    });

    Ok(())
}

#[tauri::command]
fn stop_mcp_server() -> Result<(), String> {
    let mut child_guard = MCP_CHILD.lock().unwrap();
    if let Some(mut child) = child_guard.take() {
        let _ = child.kill();
        println!("Monnify MCP server stopped.");
    }
    Ok(())
}

#[tauri::command]
fn call_mcp_tool(name: String, arguments: String) -> Result<String, String> {
    let mut child_guard = MCP_CHILD.lock().unwrap();
    let child = child_guard
        .as_mut()
        .ok_or_else(|| "Monnify MCP server is not running".to_string())?;

    let stdin = child
        .stdin
        .as_mut()
        .ok_or_else(|| "Failed to open stdin of MCP process".to_string())?;
    let stdout = child
        .stdout
        .as_mut()
        .ok_or_else(|| "Failed to open stdout of MCP process".to_string())?;

    let args_val: serde_json::Value =
        serde_json::from_str(&arguments).map_err(|e| format!("Invalid arguments JSON: {}", e))?;

    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": name,
            "arguments": args_val
        },
        "id": 1
    });

    let req_str = serde_json::to_string(&request).unwrap() + "\n";

    use std::io::Write;
    stdin
        .write_all(req_str.as_bytes())
        .map_err(|e| format!("Failed to write to MCP stdin: {}", e))?;
    stdin
        .flush()
        .map_err(|e| format!("Failed to flush MCP stdin: {}", e))?;

    use std::io::BufRead;
    let mut reader = std::io::BufReader::new(stdout);
    let mut line = String::new();

    // Read lines until we find our response
    for _ in 0..100 {
        line.clear();
        reader
            .read_line(&mut line)
            .map_err(|e| format!("Failed to read from MCP stdout: {}", e))?;

        if line.is_empty() {
            return Err("MCP server closed connection/stdout is empty".to_string());
        }

        println!("[MCP Server Output]: {}", line.trim());

        if let Ok(response_val) = serde_json::from_str::<serde_json::Value>(&line) {
            if response_val.get("id").and_then(|id| id.as_i64()) == Some(1) {
                if let Some(error) = response_val.get("error") {
                    return Err(format!("MCP tool error: {}", error));
                }
                if let Some(result) = response_val.get("result") {
                    return Ok(result.to_string());
                }
                return Ok(response_val.to_string());
            }
        }
    }

    Err("Timed out waiting for MCP response".to_string())
}

fn clean_hallucinations(text: &str) -> String {
    let trimmed = text.trim().to_lowercase();

    if trimmed.is_empty()
        || trimmed == "you"
        || trimmed == "you."
        || trimmed == "bye"
        || trimmed == "bye."
        || trimmed == "thank you"
        || trimmed == "thank you."
        || trimmed == "thanks for watching"
        || trimmed == "thanks for watching."
        || trimmed == "thanks for listening"
        || trimmed == "thanks for listening."
        || trimmed == "i can't wait"
        || trimmed == "i can't wait."
        || trimmed == "i can't speak to you"
        || trimmed == "i can't speak to you."
        || trimmed == "ignore silence, breathing, or background noise"
        || trimmed == "ignore silence, breathing, and background noise"
        || trimmed.contains("ignore silence")
        || trimmed.contains("breathing and background noise")
        || trimmed.contains("transcribe the following speech accurately")
        || trimmed.contains("if there is no speech, leave it blank")
    {
        println!(
            "clean_hallucinations: Detected silent-audio hallucination ('{}'), discarding.",
            text
        );
        return String::new();
    }

    text.to_string()
}

#[tauri::command]
async fn transcribe_groq_cloud(
    api_key: String,
    base64_wav: String,
    custom_terms: Option<String>,
    recorder_state: tauri::State<'_, NativeRecorderState>,
) -> Result<String, String> {
    use base64::Engine;
    use reqwest::multipart;

    let final_base64 = if base64_wav.is_empty() {
        let samples = {
            let buf = recorder_state.audio_buffer.lock().unwrap();
            buf.clone()
        };
        if samples.is_empty() {
            return Ok("".to_string());
        }
        let wav_bytes = native_recording::create_wav_bytes(&samples, 16000);
        base64::engine::general_purpose::STANDARD.encode(wav_bytes)
    } else {
        base64_wav
    };

    // Fast base64 decoding in Rust
    let wav_bytes = base64::engine::general_purpose::STANDARD
        .decode(final_base64)
        .map_err(|e| format!("Base64 decoding failed: {}", e))?;

    println!(
        "transcribe_groq_cloud: Sending request to Groq ASR... (Audio size: {} bytes)",
        wav_bytes.len()
    );

    let client = reqwest::Client::new();

    // Create multipart form data for file upload
    let part = multipart::Part::bytes(wav_bytes)
        .file_name("recording.webm")
        .mime_str("audio/webm")
        .map_err(|e| format!("Multipart Part creation failed: {}", e))?;

    let default_prompt = "Please transcribe the following speech accurately. Ignore silence, breathing, and background noise. If there is no speech, leave it blank.";
    let prompt_str = if let Some(ref terms) = custom_terms {
        let trimmed_terms = terms.trim();
        if !trimmed_terms.is_empty() {
            format!("{}. Key spelling terms: {}.", default_prompt, trimmed_terms)
        } else {
            default_prompt.to_string()
        }
    } else {
        default_prompt.to_string()
    };

    let form = multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-large-v3-turbo")
        .text("temperature", "0.0")
        .text("prompt", prompt_str);

    let response = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Groq ASR API returned error status {}: {}",
            status, err_text
        ));
    }

    #[derive(serde::Deserialize)]
    struct TranscriptionResponse {
        text: String,
    }

    let data: TranscriptionResponse = response
        .json()
        .await
        .map_err(|e| format!("JSON parsing failed: {}", e))?;

    let cleaned_text = clean_hallucinations(&data.text);
    println!("transcribe_groq_cloud: Successfully transcribed text!");
    Ok(cleaned_text)
}

#[tauri::command]
async fn polish_groq_cloud(
    api_key: String,
    raw_text: String,
    window_context: Option<String>,
    is_dictation: bool,
    custom_terms: Option<String>,
    custom_shortcuts: Option<String>,
) -> Result<String, String> {
    println!("polish_groq_cloud: Sending text to Groq LLM (Llama 3.3)...");

    let client = reqwest::Client::new();

    let terms_section = if let Some(terms) = custom_terms {
        format!("\n[CUSTOM TERMS (Correct spelling of phonetically similar words, garbled/noisy speech, or incorrect transcriptions to match these terms exactly)]:\n{}\n", terms)
    } else {
        String::new()
    };

    let shortcuts_section = if let Some(shortcuts) = custom_shortcuts {
        format!(
            "\n[CUSTOM SHORTCUTS (Expand ONLY if the exact trigger word is dictated)]:\n{}\n",
            shortcuts
        )
    } else {
        String::new()
    };

    let system_prompt = if !is_dictation {
        // ScribePro Mode
        let ctx_section = if let Some(ctx) = window_context {
            format!("[ACTIVE WINDOW CONTEXT]:\n{}\n", ctx)
        } else {
            String::new()
        };

        format!("You are a context-aware AI assistant (Scribe).
Your job is to read the context from the user's active screen and follow their dictated command to write a response or rewrite the text.
Do NOT add any conversational filler like 'Here is the response' or 'Sure!'. Just return the final drafted text that will be pasted directly into the user's window.
CRITICAL INSTRUCTION: Do NOT randomly insert the custom terms or shortcuts into your response to pad the content. Correct spelling of phonetically similar words, garbled/noisy speech, or incorrect transcriptions to match these terms exactly where they fit the context, and ONLY apply a shortcut if the user explicitly dictates its trigger.
When writing responses or formatting text for collaboration/communication apps like Notion, Slack, WhatsApp, Teams, Discord, Gmail, LinkedIn, convert command mentions like 'at [Name]', 'tag [Name]', 'mention [Name]', or 'at sign [Name]' to '@[Name]' (e.g. 'at John' -> '@John').

{}{}{}[USER COMMAND]:
{}", ctx_section, terms_section, shortcuts_section, raw_text)
    } else {
        // Dictation Mode
        let dictation_ctx = if let Some(ctx) = window_context {
            format!("\n[CONTEXT FROM SCREEN (Use to infer correct spelling of names/terms only)]:\n{}\n", ctx)
        } else {
            String::new()
        };

        format!("You are an expert keyboard transcription formatting assistant.
Your job is to polish the following raw transcribed text.

Follow these strict formatting rules:
1. Fix any minor spelling, ASR transcription homophone errors, capitalization, and punctuation.
2. Format keyboard shortcuts cleanly (e.g., convert 'control plus alt' to 'Ctrl + Alt', 'control c' to 'Ctrl + C', 'command' to 'Cmd').
3. Convert dictation triggers like 'at [Name/Page/Time]', 'tag [Name]', 'mention [Name]', or 'at sign [Name]' to '@[Name/Page/Time]' (e.g. 'at John' becomes '@John', 'tag Sarah' becomes '@Sarah', 'at today' becomes '@today') when the active window context indicates a collaboration/comms/notetaking app (like Notion, Slack, WhatsApp, Teams, Discord, Gmail, LinkedIn) and it makes sense as a mention or tag.
4. Format lists or step numbers cleanly if the user says something like 'number one' or 'number two' when starting steps or lists.
5. Correct software/tech names (e.g., 'Grok' to 'Groq', 'Lama' to 'Llama').
6. Format the content into typed paragraphs when necessary.
7. Transcribe everything exactly as dictated without summarizing or answering questions (e.g., if the user says 'What is a noun? A noun is...', output exactly that).
8. Do NOT add any conversational fluff, introductory remarks, or explanations.
9. Return ONLY the final polished text itself.
10. Format direct speech, dialogue, or spoken quotes by enclosing them in double quotes, preceded by a comma (e.g., convert 'I said to him what is your name' to 'I said to him, \"What is your name?\"'). Use grammatically correct formatting: capitalize the first letter inside the quotes, and place ending punctuation inside the quotes (e.g., \"Grace Academy.\").
{}{}{}
Raw transcribed text: {}", dictation_ctx, terms_section, shortcuts_section, raw_text)
    };

    let payload = serde_json::json!({
        "model": "openai/gpt-oss-120b",
        "messages": [
            {
                "role": "user",
                "content": system_prompt
            }
        ],
        "temperature": 0.0
    });

    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Groq LLM API returned error status {}: {}",
            status, err_text
        ));
    }

    #[derive(serde::Deserialize)]
    struct Message {
        content: String,
    }

    #[derive(serde::Deserialize)]
    struct Choice {
        message: Message,
    }

    #[derive(serde::Deserialize)]
    struct ChatResponse {
        choices: Vec<Choice>,
    }

    let data: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("JSON parsing failed: {}", e))?;

    if let Some(choice) = data.choices.first() {
        println!("polish_groq_cloud: Successfully polished text!");
        Ok(choice.message.content.clone())
    } else {
        Err("No choices returned from Groq LLM".to_string())
    }
}

#[tauri::command]
async fn transcribe_deepgram_cloud(
    api_key: String,
    base64_wav: String,
    endpoint: String,
) -> Result<String, String> {
    use base64::Engine;

    let wav_bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_wav)
        .map_err(|e| format!("Base64 decoding failed: {}", e))?;

    println!("transcribe_deepgram_cloud: Sending request to Deepgram ASR via {}... (Audio size: {} bytes)", endpoint, wav_bytes.len());

    let client = reqwest::Client::new();

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Token {}", api_key))
        .header("Content-Type", "audio/webm")
        .body(wav_bytes)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Deepgram API returned error status {}: {}",
            status, err_text
        ));
    }

    #[derive(serde::Deserialize)]
    struct Alternative {
        transcript: String,
    }

    #[derive(serde::Deserialize)]
    struct Channel {
        alternatives: Vec<Alternative>,
    }

    #[derive(serde::Deserialize)]
    struct Results {
        channels: Vec<Channel>,
    }

    #[derive(serde::Deserialize)]
    struct DeepgramResponse {
        results: Results,
    }

    let data: DeepgramResponse = response
        .json()
        .await
        .map_err(|e| format!("JSON parsing failed: {}", e))?;

    if let Some(channel) = data.results.channels.first() {
        if let Some(alternative) = channel.alternatives.first() {
            println!("transcribe_deepgram_cloud: Successfully transcribed text!");
            return Ok(alternative.transcript.clone());
        }
    }

    Err("No transcript returned from Deepgram".to_string())
}

#[tauri::command]
fn mute_system_audio() -> Result<(), String> {
    use volumecontrol::AudioDevice;
    let device = AudioDevice::from_default()
        .map_err(|e| format!("Failed to get default audio device: {:?}", e))?;
    let is_muted = device
        .is_mute()
        .map_err(|e| format!("Failed to read mute state: {:?}", e))?;

    if let Ok(mut was_muted) = WAS_MUTED_BEFORE.lock() {
        *was_muted = Some(is_muted);
    }

    if !is_muted {
        println!("[Audio] Muting system audio...");
        device
            .set_mute(true)
            .map_err(|e| format!("Failed to mute: {:?}", e))?;
    } else {
        println!("[Audio] System audio is already muted.");
    }
    Ok(())
}

#[tauri::command]
fn unmute_system_audio() -> Result<(), String> {
    use volumecontrol::AudioDevice;

    let was_muted = if let Ok(mut guard) = WAS_MUTED_BEFORE.lock() {
        guard.take()
    } else {
        None
    };

    if let Some(false) = was_muted {
        println!("[Audio] Unmuting system audio...");
        let device = AudioDevice::from_default()
            .map_err(|e| format!("Failed to get default audio device: {:?}", e))?;
        device
            .set_mute(false)
            .map_err(|e| format!("Failed to unmute: {:?}", e))?;
    } else {
        println!("[Audio] Restoring audio state: keeping muted or no active mute state stored.");
    }
    Ok(())
}

#[tauri::command]
fn save_image_file(base64_data: String, file_path: String) -> Result<String, String> {
    use base64::Engine;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    fs::write(&file_path, bytes).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file_path)
}

#[derive(serde::Serialize)]
struct TelemetryData {
    #[serde(rename = "payloadSizeKb")]
    payload_size_kb: f64,
    #[serde(rename = "asrTimeMs")]
    asr_time_ms: f64,
    #[serde(rename = "llmTimeMs")]
    llm_time_ms: f64,
    #[serde(rename = "modelUsed")]
    model_used: String,
}

#[tauri::command]
async fn get_window_context() -> Result<String, String> {
    scribe::get_window_context()
}

#[tauri::command]
async fn get_window_context_optimized(needs_full_page: bool) -> Result<String, String> {
    scribe::get_window_context_optimized(needs_full_page)
}

#[tauri::command]
fn set_approval_mode(_app_handle: tauri::AppHandle, text: Option<String>) {
    if let Some(mutex) = APPROVAL_TEXT.get() {
        if let Ok(mut guard) = mutex.lock() {
            *guard = text.clone();
        }
    } else {
        let _ = APPROVAL_TEXT.set(Mutex::new(text.clone()));
    }

    if text.is_some() {
        // The frontend (ApprovalPanel.tsx) handles window.show() and window.set_focus()
        // after it dynamically calculates the correct position relative to the main bubble.
    }
}

#[tauri::command]
async fn fetch_groq_key(supabase_url: String, supabase_anon_key: String) -> Result<String, String> {
    if supabase_url.is_empty() || supabase_anon_key.is_empty() {
        return Err("Supabase credentials not provided".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/app_settings?id=eq.1&select=*", supabase_url);
    let res = client
        .get(&url)
        .header("apikey", &supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Supabase returned error status: {}", res.status()));
    }

    #[derive(serde::Deserialize)]
    struct AppSettings {
        groq_key: Option<String>,
    }

    let settings: Vec<AppSettings> = res
        .json()
        .await
        .map_err(|e| format!("JSON parsing failed: {}", e))?;

    if let Some(setting) = settings.first() {
        if let Some(key) = &setting.groq_key {
            return Ok(key.clone());
        }
    }

    Err("No Groq API key found in Supabase".to_string())
}

#[tauri::command]
async fn fetch_deepgram_key(supabase_url: String, supabase_anon_key: String) -> Result<String, String> {
    if supabase_url.is_empty() || supabase_anon_key.is_empty() {
        return Err("Supabase credentials not provided".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/app_settings?id=eq.1&select=*", supabase_url);
    let res = client
        .get(&url)
        .header("apikey", &supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Supabase returned error status: {}", res.status()));
    }

    #[derive(serde::Deserialize)]
    struct AppSettings {
        deepgram_key: Option<String>,
    }

    let settings: Vec<AppSettings> = res
        .json()
        .await
        .map_err(|e| format!("JSON parsing failed: {}", e))?;

    if let Some(setting) = settings.first() {
        if let Some(key) = &setting.deepgram_key {
            return Ok(key.clone());
        }
    }

    Err("No Deepgram API key found in Supabase".to_string())
}


#[derive(serde::Serialize)]
struct PipelineResult {
    text: String,
    #[serde(rename = "rawAsrText")]
    raw_asr_text: Option<String>,
    telemetry: Option<TelemetryData>,
}

#[tauri::command]
async fn process_audio_pipeline(
    base64_wav: String,
    supabase_url: String,
    supabase_anon_key: String,
    gemini_key: String,
    window_context: Option<String>,
    is_dictation: bool,
    custom_terms: Option<String>,
    custom_shortcuts: Option<String>,
    recorder_state: tauri::State<'_, NativeRecorderState>,
) -> Result<PipelineResult, String> {
    use base64::Engine;
    use std::time::Instant;

    // Resolve audio bytes (either from base64 input or native recorder state)
    let final_base64 = if base64_wav.is_empty() {
        let samples = {
            let buf = recorder_state.audio_buffer.lock().unwrap();
            buf.clone()
        };
        if samples.is_empty() {
            return Ok(PipelineResult {
                text: "".to_string(),
                raw_asr_text: None,
                telemetry: None,
            });
        }
        let wav_bytes = native_recording::create_wav_bytes(&samples, 16000);
        base64::engine::general_purpose::STANDARD.encode(wav_bytes)
    } else {
        base64_wav
    };

    let wav_len = base64::engine::general_purpose::STANDARD
        .decode(&final_base64)
        .ok()
        .map(|b| b.len())
        .unwrap_or(0);
    let payload_size_kb = wav_len as f64 / 1024.0;

    let client = reqwest::Client::new();
    let mut groq_key = String::new();

    // 1. Securely fetch Groq API Key from Supabase
    if !supabase_url.is_empty() && !supabase_anon_key.is_empty() {
        let url = format!("{}/rest/v1/app_settings?id=eq.1&select=*", supabase_url);
        let db_res = client
            .get(&url)
            .header("apikey", &supabase_anon_key)
            .header("Authorization", format!("Bearer {}", supabase_anon_key))
            .send()
            .await;

        if let Ok(res) = db_res {
            if res.status().is_success() {
                #[derive(serde::Deserialize)]
                struct AppSettings {
                    groq_key: Option<String>,
                }
                if let Ok(settings) = res.json::<Vec<AppSettings>>().await {
                    if let Some(setting) = settings.first() {
                        if let Some(key) = &setting.groq_key {
                            groq_key = key.clone();
                        }
                    }
                }
            }
        }
    }

    let mut asr_text = String::new();
    let mut asr_time_ms = 0.0;
    let mut asr_success = false;

    // 2. Groq Whisper ASR
    if !groq_key.is_empty() {
        let asr_start = Instant::now();
        match transcribe_groq_cloud(
            groq_key.clone(),
            final_base64.clone(),
            custom_terms.clone(),
            recorder_state.clone(),
        )
        .await
        {
            Ok(text) => {
                asr_text = text;
                asr_time_ms = asr_start.elapsed().as_millis() as f64;
                asr_success = true;
            }
            Err(e) => {
                println!("Groq ASR failed: {}", e);
            }
        }
    }

    // 3. Fallback to Gemini 2.5 Flash Lite for ASR
    if !asr_success && !gemini_key.is_empty() {
        println!("Falling back to Gemini for ASR...");
        let asr_start = Instant::now();
        let gemini_url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={}", gemini_key);

        let payload = serde_json::json!({
            "contents": [{
                "parts": [
                    { "inlineData": { "mimeType": "audio/wav", "data": final_base64 } },
                    { "text": "Transcribe the audio accurately. Output only the transcription, nothing else." }
                ]
            }],
            "generationConfig": { "temperature": 0.0 }
        });

        let res = client.post(&gemini_url).json(&payload).send().await;
        if let Ok(response) = res {
            if response.status().is_success() {
                let json: serde_json::Value = response.json().await.unwrap_or_default();
                if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                    asr_text = clean_hallucinations(text);
                    asr_time_ms = asr_start.elapsed().as_millis() as f64;
                    asr_success = true;
                }
            }
        }
    }

    if !asr_success || asr_text.trim().is_empty() {
        return Ok(PipelineResult {
            text: "".to_string(),
            raw_asr_text: None,
            telemetry: None,
        });
    }

    let mut polished_text = String::new();
    let mut llm_time_ms = 0.0;
    let mut model_used = String::new();
    let mut llm_success = false;

    // 4. Groq Llama 3.3 Polishing
    if !groq_key.is_empty() {
        let llm_start = Instant::now();
        match polish_groq_cloud(
            groq_key.clone(),
            asr_text.clone(),
            window_context.clone(),
            is_dictation,
            custom_terms.clone(),
            custom_shortcuts.clone(),
        )
        .await
        {
            Ok(text) => {
                polished_text = text;
                llm_time_ms = llm_start.elapsed().as_millis() as f64;
                model_used = "GPT OSS 120B (Groq)".to_string();
                llm_success = true;
            }
            Err(e) => {
                println!("Groq LLM polishing failed: {}", e);
            }
        }
    }

    // 5. Fallback to Gemini 2.5 Flash Lite for Polishing
    if !llm_success && !gemini_key.is_empty() {
        println!("Falling back to Gemini for Polishing...");
        let llm_start = Instant::now();
        let gemini_url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={}", gemini_key);

        let prompt = format!("Correct any minor spelling or transcription errors in the following text, and add appropriate punctuation marks. Do NOT add any extra commentary or introductory text. Return only the final polished text.\n\nText: {}", asr_text);

        let payload = serde_json::json!({
            "contents": [{
                "parts": [{ "text": prompt }]
            }],
            "generationConfig": { "temperature": 0.0 }
        });

        let res = client.post(&gemini_url).json(&payload).send().await;
        if let Ok(response) = res {
            if response.status().is_success() {
                let json: serde_json::Value = response.json().await.unwrap_or_default();
                if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                    polished_text = text.trim().to_string();
                    llm_time_ms = llm_start.elapsed().as_millis() as f64;
                    model_used = "Gemini 2.5 Flash Lite".to_string();
                    llm_success = true;
                }
            }
        }
    }

    if !llm_success {
        // Just return unpolished if everything failed
        polished_text = asr_text.clone();
        model_used = "None (Fallback)".to_string();
    }

    Ok(PipelineResult {
        text: polished_text,
        raw_asr_text: Some(asr_text),
        telemetry: Some(TelemetryData {
            payload_size_kb,
            asr_time_ms,
            llm_time_ms,
            model_used,
        }),
    })
}

#[tauri::command]
fn notify_shortcuts_changed(app_handle: tauri::AppHandle, shortcuts_json: String) {
    // Store shortcuts for the Rust polling thread
    if let Ok(mut guard) = SHORTCUTS_JSON.write() {
        *guard = shortcuts_json.clone();
        println!("[Shortcuts] Updated from dashboard: {}", shortcuts_json);
    }
    // Also notify the bubble window so it knows shortcuts changed
    use tauri::Emitter;
    let _ = app_handle.emit_to("bubble", "shortcuts-updated", shortcuts_json);
}

#[tauri::command]
fn update_shortcuts(shortcuts_json: String) {
    if let Ok(mut guard) = SHORTCUTS_JSON.write() {
        *guard = shortcuts_json.clone();
        println!("[Shortcuts] Updated from bubble init: {}", shortcuts_json);
    }
}

#[tauri::command]
fn get_active_app() -> Option<AppInfoPayload> {
    app_context::get_current_app_payload()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("dashboard") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            type_text,
            check_whisper_status,
            setup_whisper_assets,
            start_whisper_server,
            stop_whisper_server,
            transcribe_groq_cloud,
            transcribe_deepgram_cloud,
            polish_groq_cloud,
            init_whisper_stream,
            append_audio_chunk,
            finish_audio_stream,
            save_image_file,
            process_audio_pipeline,
            get_window_context,
            get_window_context_optimized,
            set_approval_mode,
            fetch_groq_key,
            fetch_deepgram_key,
            notify_shortcuts_changed,
            update_shortcuts,
            get_audio_devices,
            start_mic_test,
            stop_mic_test,
            get_active_app,
            mute_system_audio,
            unmute_system_audio,
            start_native_recording,
            stop_native_recording,
            start_mcp_server,
            stop_mcp_server,
            call_mcp_tool
        ])
        .manage(WhisperAppState::new())
        .manage(NativeRecorderState::new())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if window.label() == "dashboard" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .setup(|app| {
            // Proactively warm up Enigo and Clipboard caches during application startup phase
            let _ = get_enigo();
            let _ = get_clipboard();

            // Spawn app context tracking thread
            let app_handle_for_tracking = app.handle().clone();
            start_app_context_tracking(app_handle_for_tracking);

            let show_i = MenuItem::with_id(app, "show", "Show Dashboard", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .tooltip("Sayikor")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("dashboard") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("dashboard") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .icon(app.default_window_icon().unwrap().clone())
                .build(app)?;

            // Auto-grant microphone permissions for all webview windows
            // This replaces the --use-fake-ui-for-media-stream flag which caused
            // the mic to appear active in idle mode
            for label in ["bubble", "dashboard", "approval"] {
                if let Some(ww) = app.get_webview_window(label) {
                    let _ = ww.with_webview(|webview| {
                        #[cfg(target_os = "windows")]
                        unsafe {
                            use webview2_com::Microsoft::Web::WebView2::Win32::*;
                            let core = webview.controller().CoreWebView2().unwrap();
                            let mut token: i64 = 0;
                            let _ = core.add_PermissionRequested(
                                &webview2_com::PermissionRequestedEventHandler::create(Box::new(
                                    |_sender, args| {
                                        if let Some(args) = args {
                                            let _ =
                                                args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW);
                                        }
                                        Ok(())
                                    },
                                )),
                                &mut token as *mut i64 as *mut _,
                            );
                        }
                    });
                }
            }

            // Dynamic Shortcut Listener & Mouse Activity Detection
            use std::thread;
            use std::time::{Duration, Instant};
            use tauri::Emitter;
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
            use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;

            #[repr(C)]
            struct POINT {
                x: i32,
                y: i32,
            }

            let app_handle = app.handle().clone();
            thread::spawn(move || {
                let mut last_mouse_x: i32 = 0;
                let mut last_mouse_y: i32 = 0;
                let mut mouse_active = false;
                let mut last_move_time = Instant::now();

                // Dynamic shortcut state
                let mut compiled_shortcuts: Vec<CompiledShortcut> = Vec::new();
                let mut last_shortcuts_json = String::new();

                loop {
                    // ── Dynamic Shortcut Detection ─────────────────────────────
                    // Check if shortcuts config has changed
                    if let Ok(json_guard) = SHORTCUTS_JSON.read() {
                        if *json_guard != last_shortcuts_json {
                            last_shortcuts_json = json_guard.clone();
                            compiled_shortcuts.clear();
                            if !last_shortcuts_json.is_empty() {
                                if let Ok(parsed) = serde_json::from_str::<Vec<ShortcutConfig>>(
                                    &last_shortcuts_json,
                                ) {
                                    for sc in parsed {
                                        let vk_codes: Vec<i32> = sc
                                            .keys
                                            .iter()
                                            .filter_map(|k| key_name_to_vk(k))
                                            .collect();
                                        if !vk_codes.is_empty() && vk_codes.len() == sc.keys.len() {
                                            println!(
                                                "[Shortcuts] Compiled '{}': {:?} -> VKs {:?}",
                                                sc.id, sc.keys, vk_codes
                                            );
                                            compiled_shortcuts.push(CompiledShortcut {
                                                id: sc.id,
                                                vk_codes,
                                                was_pressed: false,
                                            });
                                        }
                                    }
                                }
                            }
                            // Sort longest first for subset-priority
                            compiled_shortcuts
                                .sort_by(|a, b| b.vk_codes.len().cmp(&a.vk_codes.len()));
                            println!("[Shortcuts] {} shortcuts active", compiled_shortcuts.len());
                        }
                    }

                    // Poll each compiled shortcut
                    let mut longer_active = false;
                    for shortcut in compiled_shortcuts.iter_mut() {
                        let all_pressed = shortcut
                            .vk_codes
                            .iter()
                            .all(|&vk| unsafe { GetAsyncKeyState(vk) < 0 });

                        if all_pressed && !shortcut.was_pressed && !longer_active {
                            // ── Pressed edge ──
                            shortcut.was_pressed = true;
                            if shortcut.id == "paste" {
                                simulate_paste();
                            } else {
                                if shortcut.id == "dictation"
                                    || shortcut.id == "scribe"
                                    || shortcut.id == "mcp"
                                {
                                    // Capture window context in a background thread so the
                                    // clipboard Ctrl+C simulation doesn't interfere with
                                    // the hotkey polling loop's GetAsyncKeyState checks.
                                    std::thread::spawn(|| {
                                        crate::scribe::capture_active_context_now();
                                    });
                                }
                                let _ = app_handle.emit_to(
                                    "bubble",
                                    "shortcut-pressed",
                                    shortcut.id.clone(),
                                );
                            }
                        } else if !all_pressed && shortcut.was_pressed {
                            // ── Released edge ──
                            shortcut.was_pressed = false;
                            if shortcut.id != "paste" {
                                let _ = app_handle.emit_to(
                                    "bubble",
                                    "shortcut-released",
                                    shortcut.id.clone(),
                                );
                            }
                        }

                        if all_pressed && shortcut.was_pressed {
                            longer_active = true;
                        }
                    }

                    // ── Approval mode check ────────────────────────────────────
                    let mut approval_handled = false;
                    if let Some(mutex) = APPROVAL_TEXT.get() {
                        if let Ok(mut guard) = mutex.lock() {
                            if let Some(text) = guard.clone() {
                                let enter_down = unsafe { GetAsyncKeyState(0x0D) } < 0;
                                let esc_down = unsafe { GetAsyncKeyState(0x1B) } < 0;

                                if enter_down {
                                    if let Some(clipboard_mutex) = get_clipboard() {
                                        if let Ok(mut clipboard) = clipboard_mutex.lock() {
                                            let _ = clipboard.set_text(text);
                                        }
                                    }
                                    *guard = None;
                                    approval_handled = true;
                                    if let Some(win) = app_handle.get_webview_window("approval") {
                                        let _ = win.hide();
                                    }
                                    let _ = app_handle.emit_to("bubble", "approval-done", ());
                                    let _ = app_handle.emit_to("approval", "approval-done", ());
                                    thread::sleep(Duration::from_millis(150));
                                    simulate_paste();
                                } else if esc_down {
                                    *guard = None;
                                    approval_handled = true;
                                    if let Some(win) = app_handle.get_webview_window("approval") {
                                        let _ = win.hide();
                                    }
                                    let _ = app_handle.emit_to("bubble", "approval-cancelled", ());
                                    let _ =
                                        app_handle.emit_to("approval", "approval-cancelled", ());
                                }
                            }
                        }
                    }
                    if approval_handled {
                        thread::sleep(Duration::from_millis(300));
                    }

                    // ── Mouse activity detection ───────────────────────────────
                    let mut pt = POINT { x: 0, y: 0 };
                    let got_pos = unsafe { GetCursorPos(&mut pt as *mut POINT as *mut _) };
                    if got_pos != 0 && (pt.x != last_mouse_x || pt.y != last_mouse_y) {
                        last_mouse_x = pt.x;
                        last_mouse_y = pt.y;
                        last_move_time = Instant::now();
                        if !mouse_active {
                            mouse_active = true;
                            let _ = app_handle.emit_to("bubble", "mouse-active", ());
                        }
                    }
                    if mouse_active && last_move_time.elapsed() > Duration::from_secs(2) {
                        mouse_active = false;
                        let _ = app_handle.emit_to("bubble", "mouse-idle", ());
                    }

                    thread::sleep(Duration::from_millis(16));
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| match event {
        tauri::RunEvent::Exit => {
            let mut child_guard = WHISPER_CHILD.lock().unwrap();
            if let Some(mut child) = child_guard.take() {
                let _ = child.kill();
                println!("Whisper child process terminated on app exit.");
            }
            let mut mcp_guard = MCP_CHILD.lock().unwrap();
            if let Some(mut child) = mcp_guard.take() {
                let _ = child.kill();
                println!("Monnify MCP process terminated on app exit.");
            }
        }
        _ => {}
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn benchmark_pipeline() {
        println!("=== STARTING BENCHMARK ===");

        let start = Instant::now();
        let clip_res = arboard::Clipboard::new();
        println!("arboard::Clipboard::new() took: {:?}", start.elapsed());

        if let Ok(mut clipboard) = clip_res {
            let start = Instant::now();
            let _ = clipboard.set_text("test string".to_string());
            println!("clipboard.set_text() took: {:?}", start.elapsed());
        } else {
            println!("Failed to create clipboard");
        }

        let start = Instant::now();
        let enigo_res = Enigo::new(&Settings::default());
        println!("Enigo::new() took: {:?}", start.elapsed());

        if let Ok(mut enigo) = enigo_res {
            #[cfg(target_os = "macos")]
            let modifier = Key::Meta;
            #[cfg(not(target_os = "macos"))]
            let modifier = Key::Control;

            let start = Instant::now();
            let _ = enigo.key(modifier, Direction::Press);
            println!("enigo.key(modifier, Press) took: {:?}", start.elapsed());

            let start = Instant::now();
            let _ = enigo.key(Key::Unicode('v'), Direction::Click);
            println!("enigo.key(v, Click) took: {:?}", start.elapsed());

            let start = Instant::now();
            let _ = enigo.key(modifier, Direction::Release);
            println!("enigo.key(modifier, Release) took: {:?}", start.elapsed());
        } else {
            println!("Failed to create enigo");
        }

        println!("=== BENCHMARK FINISHED ===");
    }
}
