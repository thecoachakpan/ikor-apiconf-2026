Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class User32 {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@
$hwnd = [User32]::FindWindow($null, "Speech Bubble")
if ($hwnd -ne [IntPtr]::Zero) {
    $rect = New-Object User32+RECT
    [User32]::GetWindowRect($hwnd, [ref]$rect)
    Write-Host "Left: $($rect.Left)"
    Write-Host "Top: $($rect.Top)"
    Write-Host "Right: $($rect.Right)"
    Write-Host "Bottom: $($rect.Bottom)"
} else {
    Write-Host "Window not found"
}
