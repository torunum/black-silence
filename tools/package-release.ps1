param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedHtmlSha256,
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]*\.zip$')][string]$OutputName = 'THE-BLACK-SILENCE-ARSENAL-HELL.zip'
)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$htmlPath = Join-Path $workspace 'THE-BLACK-SILENCE.html'
$actual = (Get-FileHash -LiteralPath $htmlPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $ExpectedHtmlSha256.ToLowerInvariant()) { throw 'Main HTML does not match the verified release.' }
$buildInfo = Get-Content -LiteralPath (Join-Path $workspace 'docs/build-info.json') -Raw | ConvertFrom-Json
if ($buildInfo.sha256 -ne $actual) { throw 'Build metadata is stale.' }
$dist = Join-Path $workspace 'dist'
[IO.Directory]::CreateDirectory($dist) | Out-Null
$destination = [IO.Path]::GetFullPath((Join-Path $dist $OutputName))
if (-not $destination.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Output escaped workspace.' }
if (Test-Path -LiteralPath $destination) { throw 'Release ZIP already exists; refusing to replace it.' }
$files = [Collections.Generic.List[IO.FileInfo]]::new()
foreach ($name in @('THE-BLACK-SILENCE.html','README.md','package.json','package-lock.json','.gitignore','.gitattributes')) {
  $file = Get-Item -LiteralPath (Join-Path $workspace $name)
  $files.Add($file)
}
foreach ($name in @('src','assets','docs','tools')) {
  Get-ChildItem -LiteralPath (Join-Path $workspace $name) -File -Recurse | ForEach-Object {
    if (($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Symlink/reparse files are excluded.' }
    $files.Add($_)
  }
}
Add-Type -AssemblyName System.IO.Compression
$stream = [IO.File]::Open($destination,[IO.FileMode]::CreateNew)
$zip = [IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create,$false)
try {
  foreach ($file in ($files | Sort-Object FullName)) {
    $relative = $file.FullName.Substring($workspace.Length + 1).Replace('\','/')
    if ($relative -match '(^|/)(\.git|\.dream-loop|node_modules|temp|tmp)(/|$)' -or $relative.Contains('..')) { throw "Excluded path: $relative" }
    $entry = $zip.CreateEntry($relative,[IO.Compression.CompressionLevel]::Optimal)
    $inputStream = $file.OpenRead(); $outputStream = $entry.Open()
    try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
  }
} finally { $zip.Dispose(); $stream.Dispose() }
$stream = [IO.File]::OpenRead($destination)
$zip = [IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Read)
try {
  $entry = $zip.GetEntry('THE-BLACK-SILENCE.html')
  if (-not $entry) { throw 'ZIP has no main HTML.' }
  $inputStream=$entry.Open(); $digest=[Security.Cryptography.SHA256]::Create()
  try { $zipHtmlSha=([BitConverter]::ToString($digest.ComputeHash($inputStream))).Replace('-','').ToLowerInvariant() } finally { $inputStream.Dispose(); $digest.Dispose() }
  if ($zipHtmlSha -ne $actual) { throw 'ZIP HTML differs from verified main HTML.' }
  $count=$zip.Entries.Count
} finally { $zip.Dispose(); $stream.Dispose() }
[PSCustomObject]@{ file=$destination; entries=$count; htmlSha256=$zipHtmlSha; zipSha256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant(); bytes=(Get-Item -LiteralPath $destination).Length } | ConvertTo-Json
