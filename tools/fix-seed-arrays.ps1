# One-shot fixer: unwraps PowerShell-ConvertTo-Json's {value:[...], Count:N}
# wrapper around top-level arrays in src/data.js, so window.SEED_DATA.people
# (and friends) are real JS arrays again.
#
# Run from the repo root:  pwsh tools/fix-seed-arrays.ps1
$ErrorActionPreference = 'Stop'

$path = (Resolve-Path (Join-Path $PSScriptRoot '..\src\data.js')).Path
$txt = Get-Content -Raw $path

$marker = 'window.SEED_DATA = '
$i = $txt.IndexOf($marker)
if ($i -lt 0) { throw "marker not found in $path" }

$prefix = $txt.Substring(0, $i + $marker.Length)
$rest = $txt.Substring($i + $marker.Length)
$trimmed = $rest.TrimEnd()
$hadSemi = $trimmed.EndsWith(';')
if ($hadSemi) { $jsonText = $trimmed.TrimEnd(';').TrimEnd() } else { $jsonText = $trimmed }

# Round-trip through .NET serializer to preserve UTF-8 cleanly (avoid PS's
# default Latin-1 codepage when reading the Thai strings).
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = [int]::MaxValue
$data = $ser.DeserializeObject($jsonText)

# Fields that should be arrays
$arrayFields = @('people','departments','history','collaborations','coOversight','deptLinks')
$report = @()
foreach ($k in $arrayFields) {
  if (-not $data.ContainsKey($k)) { continue }
  $v = $data[$k]
  if ($v -is [System.Collections.IDictionary]) {
    $hasValue = $v.Keys -contains 'value'
    if ($hasValue -and $v['value'] -is [System.Collections.IList]) {
      $arr = $v['value']
      $data[$k] = $arr
      $report += "  $k : unwrapped {value:[...]} -> array($($arr.Count))"
    } else {
      $report += "  $k : object without 'value' key - leaving as-is"
    }
  } elseif ($v -is [System.Collections.IList]) {
    $report += "  $k : already array($($v.Count))"
  } else {
    $report += "  $k : unknown type $($v.GetType().Name)"
  }
}

# Reserialize compact (no pretty-print) to match the original style
$newJson = $ser.Serialize($data)
$newRest = $newJson
if ($hadSemi) { $newRest += ';' }
# Preserve a trailing newline (most editors keep one)
$endNewline = ($rest.Length -gt 0 -and $rest[$rest.Length - 1] -eq "`n")
if ($endNewline) { $newRest += "`n" }

$newTxt = $prefix + $newRest
[System.IO.File]::WriteAllText($path, $newTxt, [System.Text.UTF8Encoding]::new($false))

Write-Output "Wrote: $path"
Write-Output "Fields:"
$report | ForEach-Object { Write-Output $_ }
