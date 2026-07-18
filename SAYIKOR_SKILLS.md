# Sayikor Local Skills - Test Speech Bubble

This project implements the standalone Speech Bubble overlay for the Sayikor App.

## 🛠️ Technical Implementation
- **Positioning Fix**: Uses `monitor.workArea` to correctly position the bubble (now 72x35) 37px above the Windows taskbar.
- **Visuals**: 7-line symmetric "pyramid" waveform animation using `framer-motion`.
- **Audio**: Real-time microphone input with a **100-level noise gate** and **0.85 smoothing** to ignore keyboard clicks and background noise.
- **Persistence**: Implemented a 5-second re-assertion of `alwaysOnTop` to win Z-order conflicts with other overlay apps.

## 📋 Tauri v2 Positioning Pattern
To position windows accurately relative to the taskbar in Tauri v2:
1. Get the current monitor: `const monitor = await currentMonitor();`
2. Access `monitor.workArea.size` and `monitor.workArea.position`.
3. Calculate logical coordinates: `(PhysicalCoord / monitor.scaleFactor)`.
4. Use "Position-then-Show":
   - Set `"visible": false` in `tauri.conf.json`.
   - Call `win.setPosition` first.
   - Call `win.show()` second.

## 🔐 Required Capabilities
- `core:window:allow-set-position`
- `core:window:allow-set-size`
- `core:window:allow-current-monitor`
- `core:window:allow-show`

## 📥 Tray & Window Management
- **System Tray**: Added a tray icon with a "Quit" menu item.
- **Hiding from Taskbar**: The window is hidden from the taskbar using `"skipTaskbar": true` in `tauri.conf.json`. This ensures the speech bubble feels like a desktop overlay rather than a standalone application window.
- **Window Aesthetics**: Combined with `"decorations": false` and `"transparent": true` to achieve the floating pill effect.
