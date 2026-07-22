use crate::{get_clipboard, get_enigo};
use enigo::{Direction, Key, Keyboard};
use std::thread;
use std::time::Duration;
use uiautomation::patterns::{UITextPattern, UIValuePattern};
use uiautomation::types::{ControlType, TextPatternRangeEndpoint};
use uiautomation::UIAutomation;

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
    raw_get_window_context_optimized(true)
}

/// Optimized get_window_context_optimized with app-awareness and token reduction rules
pub fn get_window_context_optimized(needs_full_page: bool) -> Result<String, String> {
    raw_get_window_context_optimized(needs_full_page)
}

pub fn raw_get_window_context_optimized(needs_full_page: bool) -> Result<String, String> {
    let automation = UIAutomation::new().map_err(|e| format!("UIAutomation init failed: {}", e))?;
    let element = automation
        .get_focused_element()
        .map_err(|e| format!("get_focused_element failed: {}", e))?;

    let mut highlighted_text: Option<String> = None;
    let mut text_above_cursor: Option<String> = None;
    let mut text_below_cursor: Option<String> = None;
    let mut focused_doc_text: Option<String> = None;
    let mut input_value: Option<String> = None;
    let mut element_name: Option<String> = None;

    // 1. Inspect focused element with UITextPattern
    if let Ok(text_pattern) = element.get_pattern::<UITextPattern>() {
        let selections_res = text_pattern.get_selection();
        let doc_range_res = text_pattern.get_document_range();

        if let Ok(ref selections) = selections_res {
            if let Some(sel_range) = selections.first() {
                if let Ok(txt) = sel_range.get_text(-1) {
                    if !txt.trim().is_empty() {
                        highlighted_text = Some(txt.trim().to_string());
                    }
                }

                // If document range is available, extract surrounding text above and below cursor/selection
                if let Ok(ref doc_range) = doc_range_res {
                    let before_range = doc_range.clone();
                    if before_range
                        .move_endpoint_by_range(
                            TextPatternRangeEndpoint::End,
                            sel_range,
                            TextPatternRangeEndpoint::Start,
                        )
                        .is_ok()
                    {
                        if let Ok(txt) = before_range.get_text(-1) {
                            if !txt.trim().is_empty() {
                                text_above_cursor = Some(txt.trim().to_string());
                            }
                        }
                    }

                    let after_range = doc_range.clone();
                    if after_range
                        .move_endpoint_by_range(
                            TextPatternRangeEndpoint::Start,
                            sel_range,
                            TextPatternRangeEndpoint::End,
                        )
                        .is_ok()
                    {
                        if let Ok(txt) = after_range.get_text(-1) {
                            if !txt.trim().is_empty() {
                                text_below_cursor = Some(txt.trim().to_string());
                            }
                        }
                    }
                }
            }
        }

        if let Ok(ref doc_range) = doc_range_res {
            if let Ok(txt) = doc_range.get_text(-1) {
                if !txt.trim().is_empty() {
                    focused_doc_text = Some(txt.trim().to_string());
                }
            }
        }
    }

    // 2. Clipboard fallback for highlighted text if UIAutomation selection was empty
    if highlighted_text.is_none() {
        if let Some(clip_text) = get_selection_via_clipboard() {
            highlighted_text = Some(clip_text.trim().to_string());
        }
    }

    // 3. Fallback to UIValuePattern for simple input boxes if no text pattern was found
    if focused_doc_text.is_none() && highlighted_text.is_none() {
        if let Ok(value_pattern) = element.get_pattern::<UIValuePattern>() {
            if let Ok(val) = value_pattern.get_value() {
                if !val.trim().is_empty() {
                    input_value = Some(val.trim().to_string());
                }
            }
        }
    }

    // 4. Element name fallback
    if focused_doc_text.is_none() && input_value.is_none() && highlighted_text.is_none() {
        if let Ok(name) = element.get_name() {
            if !name.trim().is_empty() {
                element_name = Some(name.trim().to_string());
            }
        }
    }

    // 5. Determine application title and container text by ascending control tree
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

    let mut container_text = String::new();
    let mut app_title = String::new();
    let mut current = element.clone();

    if let Ok(walker) = automation.get_control_view_walker() {
        while let Ok(parent) = walker.get_parent(&current) {
            if let Ok(control_type) = parent.get_control_type() {
                if container_text.is_empty()
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
                                    container_text = trimmed.to_string();
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

    if app_title.is_empty() {
        if let Some((_, ref title, _)) = app_info {
            app_title = title.clone();
        }
    }

    // 6. Build structured context blocks
    let mut parts = Vec::new();

    if !app_title.is_empty() {
        parts.push(format!("[APP: {}]", app_title));
    }

    if let Some(ref hl) = highlighted_text {
        parts.push(format!("[HIGHLIGHTED TEXT]:\n{}", hl));
    }

    if let Some(ref above) = text_above_cursor {
        let trimmed = above.trim();
        if !trimmed.is_empty() {
            let limit = 1200;
            let truncated = if trimmed.chars().count() > limit {
                let skip = trimmed.chars().count() - limit;
                format!("...[Context Truncated]\n{}", trimmed.chars().skip(skip).collect::<String>())
            } else {
                trimmed.to_string()
            };
            parts.push(format!("[SURROUNDING TEXT ABOVE CURSOR]:\n{}", truncated));
        }
    }

    if let Some(ref below) = text_below_cursor {
        let trimmed = below.trim();
        if !trimmed.is_empty() {
            let limit = 1200;
            let truncated = if trimmed.chars().count() > limit {
                format!("{}\n...[Context Truncated]", trimmed.chars().take(limit).collect::<String>())
            } else {
                trimmed.to_string()
            };
            parts.push(format!("[SURROUNDING TEXT BELOW CURSOR]:\n{}", truncated));
        }
    }

    // If surrounding text wasn't split, fallback to focused document text / input value
    if text_above_cursor.is_none() && text_below_cursor.is_none() {
        if let Some(ref full_text) = focused_doc_text {
            let trimmed = full_text.trim();
            if !trimmed.is_empty() && highlighted_text.as_deref() != Some(trimmed) {
                let limit = if needs_full_page { 3000 } else { 1500 };
                let truncated = if trimmed.chars().count() > limit {
                    let skip = trimmed.chars().count() - limit;
                    format!("...[Context Truncated]\n{}", trimmed.chars().skip(skip).collect::<String>())
                } else {
                    trimmed.to_string()
                };
                parts.push(format!("[FOCUSED TEXT]:\n{}", truncated));
            }
        } else if let Some(ref val) = input_value {
            let trimmed = val.trim();
            if !trimmed.is_empty() && highlighted_text.as_deref() != Some(trimmed) {
                parts.push(format!("[INPUT FIELD TEXT]:\n{}", trimmed));
            }
        } else if let Some(ref name) = element_name {
            let trimmed = name.trim();
            if !trimmed.is_empty() {
                parts.push(format!("[FOCUSED ELEMENT NAME]:\n{}", trimmed));
            }
        }
    }

    // Background container context (if not redundant)
    if !container_text.is_empty() {
        let cleaned = if is_chat_or_email {
            clean_chat_context(&container_text)
        } else {
            container_text
        };
        let trimmed = cleaned.trim();
        if !trimmed.is_empty()
            && focused_doc_text.as_deref() != Some(trimmed)
            && highlighted_text.as_deref() != Some(trimmed)
        {
            let limit = if needs_full_page { 2000 } else { 1000 };
            let truncated = if trimmed.chars().count() > limit {
                format!("{}\n...[Context Truncated]", trimmed.chars().take(limit).collect::<String>())
            } else {
                trimmed.to_string()
            };
            let label = if is_chat_or_email { "THREAD HISTORY" } else { "WINDOW CONTEXT" };
            parts.push(format!("[{}]:\n{}", label, truncated));
        }
    }

    let combined = parts.join("\n\n").trim().to_string();

    if combined.is_empty() {
        Err("No text found via UIAutomation".to_string())
    } else {
        println!(
            "Scribe (Optimized): Extracted rich context ({} chars) from focused app/window",
            combined.chars().count()
        );
        Ok(combined)
    }
}
