use crate::{get_clipboard, get_enigo};
use enigo::{Direction, Key, Keyboard};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use uiautomation::patterns::{UITextPattern, UIValuePattern};
use uiautomation::types::ControlType;
use uiautomation::UIAutomation;

lazy_static::lazy_static! {
    static ref LAST_CAPTURED_CONTEXT: Mutex<Option<(String, Instant)>> = Mutex::new(None);
}

/// Capture active context immediately on hotkey press while user's target app is focused
pub fn capture_active_context_now() {
    if let Ok(ctx) = raw_get_window_context_optimized(false) {
        if !ctx.trim().is_empty() {
            println!("[Scribe] Captured context on hotkey press: {} chars", ctx.len());
            if let Ok(mut guard) = LAST_CAPTURED_CONTEXT.lock() {
                *guard = Some((ctx, Instant::now()));
            }
        }
    }
}

/// Helper to simulate copy shortcuts and safely grab selection from clipboard when UI Automation fails
pub fn get_selection_via_clipboard() -> Option<String> {
    let mut backup = None;
    if let Some(clipboard_mutex) = get_clipboard() {
        if let Ok(mut clipboard) = clipboard_mutex.lock() {
            if let Ok(text) = clipboard.get_text() {
                backup = Some(text);
            }
        }
    }

    // Set clipboard to a unique sentinel value to check if copy actually did something
    let sentinel = format!(
        "__SCRIBE_SENTINEL_{}__",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );
    if let Some(clipboard_mutex) = get_clipboard() {
        if let Ok(mut clipboard) = clipboard_mutex.lock() {
            let _ = clipboard.set_text(sentinel.clone());
        }
    }

    // Simulate Ctrl+C
    if let Ok(mut enigo) = get_enigo().lock() {
        #[cfg(target_os = "macos")]
        let modifier = Key::Meta;
        #[cfg(not(target_os = "macos"))]
        let modifier = Key::Control;

        let _ = enigo.key(modifier, Direction::Press);
        let _ = enigo.key(Key::Unicode('c'), Direction::Click);
        let _ = enigo.key(modifier, Direction::Release);
    }

    // Wait 50ms for clipboard buffer
    thread::sleep(Duration::from_millis(50));

    let mut selected_text = None;
    if let Some(clipboard_mutex) = get_clipboard() {
        if let Ok(mut clipboard) = clipboard_mutex.lock() {
            if let Ok(text) = clipboard.get_text() {
                if !text.trim().is_empty() && text != sentinel {
                    println!(
                        "Scribe: Clipboard fallback got selected text ({} chars)",
                        text.len()
                    );
                    selected_text = Some(text);
                }
            }
            // Restore backup
            if let Some(ref backup_text) = backup {
                let _ = clipboard.set_text(backup_text.clone());
            } else {
                let _ = clipboard.set_text(String::new());
            }
        }
    }

    selected_text
}

/// Helper to clean chat logs (from Slack, WhatsApp, Teams) to filter out UI buttons, stamps, etc.
fn clean_chat_context(text: &str) -> String {
    let mut cleaned_lines = Vec::new();
    let mut consecutive_empty = 0;

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            consecutive_empty += 1;
            if consecutive_empty <= 1 {
                cleaned_lines.push("");
            }
            continue;
        }
        consecutive_empty = 0;

        let lower = trimmed.to_lowercase();

        // Skip common UI noise in chat/email clients
        if lower == "search"
            || lower == "jump to"
            || lower == "channels"
            || lower == "direct messages"
            || lower == "apps"
            || lower == "online"
            || lower == "offline"
            || lower == "away"
            || lower == "mute"
            || lower == "unmute"
            || lower == "pinned"
            || lower == "bookmarks"
            || lower == "canvas"
            || lower == "files"
            || lower == "more"
            || lower.starts_with("typing...")
            || lower == "write a message"
            || lower == "reply..."
            || lower == "send"
            || lower == "attach file"
            || lower == "add emoji"
            || lower == "record video"
        {
            continue;
        }

        // Filter out simple time stamps
        if trimmed.contains(':')
            && (trimmed.contains("AM")
                || trimmed.contains("PM")
                || trimmed.contains("am")
                || trimmed.contains("pm")
                || trimmed.contains("Today")
                || trimmed.contains("Yesterday"))
        {
            continue;
        }

        cleaned_lines.push(trimmed);
    }

    // Keep the last 15 non-empty lines to maintain thread history context while saving LLM tokens
    let non_empty_count = cleaned_lines.iter().filter(|l| !l.is_empty()).count();
    if non_empty_count > 15 {
        let mut skipped = 0;
        let target_skip = non_empty_count - 15;
        let mut final_lines = Vec::new();
        for line in cleaned_lines {
            if !line.is_empty() {
                if skipped < target_skip {
                    skipped += 1;
                    continue;
                }
            }
            final_lines.push(line);
        }
        final_lines.join("\n").trim().to_string()
    } else {
        cleaned_lines.join("\n").trim().to_string()
    }
}

/// Original get_window_context function (remains fully backward-compatible)
pub fn get_window_context() -> Result<String, String> {
    let automation = UIAutomation::new().map_err(|e| format!("UIAutomation init failed: {}", e))?;
    let element = automation
        .get_focused_element()
        .map_err(|e| format!("get_focused_element failed: {}", e))?;

    let mut focused_context = String::new();
    let mut has_highlighted_text = false;

    // Try TextPattern first (rich text editors, browsers, documents)
    if let Ok(text_pattern) = element.get_pattern::<UITextPattern>() {
        // Check for highlighted/selected text first
        if let Ok(selections) = text_pattern.get_selection() {
            if !selections.is_empty() {
                if let Ok(text) = selections[0].get_text(-1) {
                    if !text.trim().is_empty() {
                        println!(
                            "Scribe: Got selected text via UITextPattern ({} chars)",
                            text.len()
                        );
                        focused_context = format!("[HIGHLIGHTED TEXT]:\n{}\n\n", text);
                        has_highlighted_text = true;
                    }
                }
            }
        }

        // No selection — get full document text
        if focused_context.is_empty() {
            if let Ok(document_range) = text_pattern.get_document_range() {
                if let Ok(text) = document_range.get_text(-1) {
                    if !text.trim().is_empty() {
                        println!(
                            "Scribe: Got document text via UITextPattern ({} chars)",
                            text.len()
                        );
                        focused_context = format!("[FOCUSED TEXT]:\n{}\n\n", text);
                    }
                }
            }
        }
    }

    // Try ValuePattern (simple input fields, text boxes)
    if focused_context.is_empty() {
        if let Ok(value_pattern) = element.get_pattern::<UIValuePattern>() {
            if let Ok(val) = value_pattern.get_value() {
                if !val.trim().is_empty() {
                    println!("Scribe: Got value via UIValuePattern ({} chars)", val.len());
                    focused_context = format!("[INPUT FIELD TEXT]:\n{}\n\n", val);
                }
            }
        }
    }

    // Try reading the element name as last resort
    if focused_context.is_empty() {
        if let Ok(name) = element.get_name() {
            if !name.trim().is_empty() {
                println!(
                    "Scribe: Got element name as fallback ({} chars)",
                    name.len()
                );
                focused_context = format!("[FOCUSED ELEMENT NAME]:\n{}\n\n", name);
            }
        }
    }

    // ALWAYS walk up the tree to find context, using Ascending Container Strategy
    let mut window_context_str = String::new();
    let mut current = element.clone();

    if let Ok(walker) = automation.get_control_view_walker() {
        let mut app_title = String::new();
        let mut extracted_text = String::new();
        let mut text_found = false;

        while let Ok(parent) = walker.get_parent(&current) {
            if let Ok(control_type) = parent.get_control_type() {
                // If we haven't found a solid block of text yet, try to extract from structural containers
                if !text_found
                    && (control_type == ControlType::Group
                        || control_type == ControlType::ListItem
                        || control_type == ControlType::Pane
                        || control_type == ControlType::Document
                        || control_type == ControlType::Window)
                {
                    if let Ok(text_pattern) = parent.get_pattern::<UITextPattern>() {
                        if let Ok(document_range) = text_pattern.get_document_range() {
                            if let Ok(text) = document_range.get_text(-1) {
                                let trimmed = text.trim();
                                if trimmed.len() > 50
                                    || control_type == ControlType::Document
                                    || control_type == ControlType::Window
                                {
                                    extracted_text = trimmed.to_string();
                                    text_found = true;
                                    println!("Scribe: Ascending Container extracted {} chars from type {:?}", extracted_text.len(), control_type);
                                }
                            }
                        }
                    }
                }

                // Always try to grab the top-level window or document title for the APP header
                if control_type == ControlType::Window || control_type == ControlType::Document {
                    if let Ok(name) = parent.get_name() {
                        if !name.trim().is_empty() && app_title.is_empty() {
                            app_title = name.trim().to_string();
                        }
                    }
                    if control_type == ControlType::Window {
                        break; // Stop climbing once we hit the main window
                    }
                }
            }
            current = parent;
        }

        let header = if !app_title.is_empty() {
            format!("[APP: {}]\n", app_title)
        } else {
            String::new()
        };

        if !extracted_text.is_empty() {
            let limit = if has_highlighted_text { 500 } else { 1500 };

            // Apply Strict Truncation cap to protect LLM tokens
            if extracted_text.chars().count() > limit {
                extracted_text = extracted_text.chars().take(limit).collect::<String>();
                extracted_text.push_str("\n...[Context Truncated]");
            }
            window_context_str = format!("{}[WINDOW CONTEXT]:\n{}", header, extracted_text);
        } else if !header.is_empty() {
            // Even if no text, at least send the app name
            window_context_str = format!(
                "{}[WINDOW CONTEXT]:\n(No additional text extracted)",
                header
            );
        }
    }

    let combined_context = format!("{}{}", focused_context, window_context_str)
        .trim()
        .to_string();

    if combined_context.is_empty() {
        Err("No text found via UIAutomation".to_string())
    } else {
        println!(
            "Scribe: Sending {} highlighted/focused chars and {} context window chars to frontend",
            focused_context.chars().count(),
            window_context_str.chars().count()
        );
        Ok(combined_context)
    }
}

/// Optimized get_window_context_optimized with app-awareness and token reduction rules
pub fn get_window_context_optimized(needs_full_page: bool) -> Result<String, String> {
    // 1. If context was freshly captured at hotkey press down (within last 6 sec), return it immediately!
    if let Ok(guard) = LAST_CAPTURED_CONTEXT.lock() {
        if let Some((ref text, timestamp)) = *guard {
            if timestamp.elapsed() < Duration::from_secs(6) && !text.trim().is_empty() {
                println!(
                    "[Scribe] Using freshly captured hotkey-press context ({} chars)",
                    text.len()
                );
                return Ok(text.clone());
            }
        }
    }

    // 2. Otherwise perform live capture
    raw_get_window_context_optimized(needs_full_page)
}

pub fn raw_get_window_context_optimized(needs_full_page: bool) -> Result<String, String> {
    let automation = UIAutomation::new().map_err(|e| format!("UIAutomation init failed: {}", e))?;
    let element = automation
        .get_focused_element()
        .map_err(|e| format!("get_focused_element failed: {}", e))?;

    let mut focused_context = String::new();
    let mut has_highlighted_text = false;

    // 1. Try UI Automation UITextPattern for selection first
    if let Ok(text_pattern) = element.get_pattern::<UITextPattern>() {
        if let Ok(selections) = text_pattern.get_selection() {
            if !selections.is_empty() {
                if let Ok(text) = selections[0].get_text(-1) {
                    if !text.trim().is_empty() {
                        println!(
                            "Scribe (Optimized): Got selected text via UITextPattern ({} chars)",
                            text.len()
                        );
                        focused_context = format!("[HIGHLIGHTED TEXT]:\n{}\n\n", text);
                        has_highlighted_text = true;
                    }
                }
            }
        }
    }

    // 2. If no selection found via UI Automation, try Clipboard Fallback
    if focused_context.is_empty() {
        if let Some(text) = get_selection_via_clipboard() {
            focused_context = format!("[HIGHLIGHTED TEXT]:\n{}\n\n", text);
            has_highlighted_text = true;
        }
    }

    // 3. If we found highlighted/selected text, return it IMMEDIATELY without fetching background context!
    // This saves massive token counts when the user is explicitly acting on highlighted text.
    if has_highlighted_text {
        return Ok(focused_context.trim().to_string());
    }

    // 4. Otherwise, determine the focused app context
    let app_info = crate::app_context::get_foreground_app_info();
    let is_chat_or_email = if let Some((ref exe, ref title, _)) = app_info {
        let exe_lower = exe.to_lowercase();
        let title_lower = title.to_lowercase();
        exe_lower == "slack.exe"
            || exe_lower == "whatsapp.exe"
            || exe_lower == "teams.exe"
            || exe_lower == "discord.exe"
            || title_lower.contains("slack")
            || title_lower.contains("whatsapp")
            || title_lower.contains("gmail")
            || title_lower.contains("linkedin")
            || title_lower.contains("mail")
    } else {
        false
    };

    let mut extracted_text = String::new();
    let mut text_found = false;
    let mut app_title = String::new();

    // 5. Walk up the tree to find structural container text
    let mut current = element.clone();
    if let Ok(walker) = automation.get_control_view_walker() {
        while let Ok(parent) = walker.get_parent(&current) {
            if let Ok(control_type) = parent.get_control_type() {
                if !text_found
                    && (control_type == ControlType::Group
                        || control_type == ControlType::ListItem
                        || control_type == ControlType::Pane
                        || control_type == ControlType::Document
                        || control_type == ControlType::Window)
                {
                    if let Ok(text_pattern) = parent.get_pattern::<UITextPattern>() {
                        if let Ok(document_range) = text_pattern.get_document_range() {
                            if let Ok(text) = document_range.get_text(-1) {
                                let trimmed = text.trim();
                                if trimmed.len() > 50
                                    || control_type == ControlType::Document
                                    || control_type == ControlType::Window
                                {
                                    extracted_text = trimmed.to_string();
                                    text_found = true;
                                    println!("Scribe (Optimized): Ascending Container extracted {} chars from type {:?}", extracted_text.len(), control_type);
                                }
                            }
                        }
                    }
                }

                if control_type == ControlType::Window || control_type == ControlType::Document {
                    if let Ok(name) = parent.get_name() {
                        if !name.trim().is_empty() && app_title.is_empty() {
                            app_title = name.trim().to_string();
                        }
                    }
                    if control_type == ControlType::Window {
                        break;
                    }
                }
            }
            current = parent;
        }
    }

    // 6. Clean and format the container context
    let mut window_context_str = String::new();
    let header = if !app_title.is_empty() {
        format!("[APP: {}]\n", app_title)
    } else {
        String::new()
    };

    if !extracted_text.is_empty() {
        if is_chat_or_email {
            // Chat/Email: Apply intelligent thread filtering
            let cleaned = clean_chat_context(&extracted_text);
            window_context_str = format!("{}[THREAD HISTORY]:\n{}", header, cleaned);
        } else {
            // Document/Notepad/Editor: Conditional truncation
            let limit = if needs_full_page { 2500 } else { 1000 };
            let text_len = extracted_text.chars().count();
            if text_len > limit {
                // Take the LAST characters (cursor context) instead of the beginning of the file
                let skip_count = text_len - limit;
                extracted_text = extracted_text.chars().skip(skip_count).collect::<String>();
                extracted_text.insert_str(0, "[Context Truncated]...\n");
            }
            window_context_str = format!("{}[WINDOW CONTEXT]:\n{}", header, extracted_text);
        }
    } else if !header.is_empty() {
        window_context_str = format!(
            "{}[WINDOW CONTEXT]:\n(No additional text extracted)",
            header
        );
    }

    let combined_context = format!("{}{}", focused_context, window_context_str)
        .trim()
        .to_string();
    if combined_context.is_empty() {
        Err("No text found via UIAutomation".to_string())
    } else {
        println!(
            "Scribe (Optimized): Sending context ({} chars) to pipeline",
            combined_context.chars().count()
        );
        Ok(combined_context)
    }
}
