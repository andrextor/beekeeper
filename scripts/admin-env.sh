#!/usr/bin/env bash
# Writes admin/.env.local from the local Supabase stack: the API URL and the publishable key, nothing else.
set -euo pipefail
cd "$(dirname "$0")/.."

status="$(pnpm exec supabase status -o env 2>/dev/null || true)"
value() { sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" <<<"$status"; }
url="$(value API_URL)"
key="$(value PUBLISHABLE_KEY)"

if [[ -z $url || -z $key ]]; then
  echo "Supabase local no está corriendo. Levántalo con: pnpm db:start" >&2
  exit 1
fi

printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\n' "$url" "$key" >admin/.env.local
echo "Listo: admin/.env.local apunta a $url"
