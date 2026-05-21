param([int]$Port = 8765)

$root = $PSScriptRoot
$prefix = "http://localhost:$Port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try { $listener.Start() } catch {
  Write-Host ("Failed to start on " + $prefix + " - try another port: .\serve.ps1 -Port 8080")
  exit 1
}

$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8"
  ".js"="application/javascript; charset=utf-8"; ".mjs"="application/javascript; charset=utf-8"
  ".jsx"="application/javascript; charset=utf-8"
  ".css"="text/css; charset=utf-8"; ".json"="application/json; charset=utf-8"
  ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"
  ".svg"="image/svg+xml"; ".gif"="image/gif"; ".ico"="image/x-icon"
  ".woff"="font/woff"; ".woff2"="font/woff2"; ".ttf"="font/ttf"
}

Write-Host "Serving $root at $prefix"
Write-Host "Open: ${prefix}Org%20Chart.html"
Write-Host "Press Ctrl+C to stop."

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($rel)) { $rel = "Org Chart.html" }
      $path = Join-Path $root $rel
      $full = [System.IO.Path]::GetFullPath($path)
      if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root))) {
        $res.StatusCode = 403; $res.Close(); continue
      }
      if ((Test-Path $full) -and (Get-Item $full).PSIsContainer) {
        $full = Join-Path $full "index.html"
      }
      if (Test-Path $full -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $res.ContentType = $mime[$ext]; if (-not $res.ContentType) { $res.ContentType = "application/octet-stream" }
        # Force no-cache so browser always picks up the latest edits
        $res.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        $res.Headers.Add("Pragma", "no-cache")
        $res.Headers.Add("Expires", "0")
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host "200 $rel"
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
        $res.OutputStream.Write($msg, 0, $msg.Length)
        Write-Host "404 $rel"
      }
    } catch {
      $res.StatusCode = 500
      $errMsg = $_.Exception.Message
      Write-Host ("500 " + $errMsg)
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop(); $listener.Close()
}
