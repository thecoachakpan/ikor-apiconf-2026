Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("app-logo.png")
$bmp = New-Object System.Drawing.Bitmap 1024, 1024
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)

$ratio = $src.Width / $src.Height
if ($ratio -gt 1) {
    $newWidth = 1024
    $newHeight = [int](1024 / $ratio)
    $x = 0
    $y = (1024 - $newHeight) / 2
} else {
    $newHeight = 1024
    $newWidth = [int](1024 * $ratio)
    $y = 0
    $x = (1024 - $newWidth) / 2
}

$g.DrawImage($src, $x, $y, $newWidth, $newHeight)
$bmp.Save("app-logo-square.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$src.Dispose()
