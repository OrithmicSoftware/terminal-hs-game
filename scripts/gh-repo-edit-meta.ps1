# Option A: GitHub CLI — set repo description + homepage (matches package.json).
# Run from repo root: npm run repo:gh-edit
$ErrorActionPreference = 'Continue'

$repo = 'OrithmicSoftware/terminal-hs-game'
$description = 'Educational terminal hacking campaign (safe, sandbox). CLI + browser alpha — Node 18+, MIT.'
$homepage = 'https://github.com/OrithmicSoftware/terminal-hs-game#readme'

cmd /c "gh auth status >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Not logged in. Complete GitHub authentication in the browser or at https://github.com/login/device'
  gh auth login -h github.com -p https -w --skip-ssh-key
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

gh repo edit $repo --description $description --homepage $homepage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Updated $repo (description + homepage)."
