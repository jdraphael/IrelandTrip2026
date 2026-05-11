$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

if (-not (Test-Path -LiteralPath ".env")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
  Write-Host "Created .env. Add OPENAI_API_KEY there when you want live research."
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  npm.cmd install
}

Start-Process "http://127.0.0.1:5173"
npm.cmd run dev
