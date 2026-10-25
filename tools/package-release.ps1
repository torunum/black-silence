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
# Stage approved new release artifacts before packaging. Never sweep ignored
# logs, local experiments or unrelated untracked files into a release.
$repoRoot = (& git -C $workspace rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($repoRoot) -ne $workspace) { throw 'Expected the project Git root.' }
$required = @('THE-BLACK-SILENCE.html','README.md','package.json','package-lock.json','.gitignore','.gitattributes')
$listed = @(& git -C $workspace -c core.quotepath=false ls-files --cached --full-name -- $required src assets docs tools)
if ($LASTEXITCODE -ne 0) { throw 'Unable to read tracked release manifest.' }
foreach ($name in $required) { if ($listed -notcontains $name) { throw "Required release file is not tracked: $name" } }
foreach ($relative in ($listed | Sort-Object -Unique)) {
  if ($relative -notin $required -and $relative -notmatch '^(src|assets|docs|tools)/') { throw 'Unexpected release manifest path.' }
  $full = [IO.Path]::GetFullPath((Join-Path $workspace $relative))
  if (-not $full.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Input escaped workspace.' }
  $file = Get-Item -LiteralPath $full
  for ($entry = $file; $entry.FullName -ne $workspace; ) {
    if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Symlink/reparse paths are excluded.' }
    if ($entry -is [IO.DirectoryInfo]) { $entry = $entry.Parent } else { $entry = $entry.Directory }
  }
  if ($file.PSIsContainer) { throw 'Release manifest contains a directory.' }
  $files.Add($file)
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
