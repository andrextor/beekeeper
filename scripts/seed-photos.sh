#!/usr/bin/env bash
# Local only: uploads the sample photos of supabase/seed-photos to hive C-01 as owner@landak.test,
# through RLS and the storage policies like the app. Safe to run again: existing photos are skipped.
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

org='00000000-0000-4000-b000-000000000001'
hive='00000000-0000-4000-d000-000000000001'
latest_inspection='00000000-0000-4000-e000-000000000003'
dir='supabase/seed-photos'

request() {
  local body
  if ! body="$(curl -sS --fail-with-body "$@")"; then
    echo "Falló la petición a Supabase: $body" >&2
    exit 1
  fi
  printf '%s' "$body"
}

# The seed password is public (supabase/seed.sql); it is not a secret.
session="$(request -X POST "$url/auth/v1/token?grant_type=password" \
  -H "apikey: $key" -H 'Content-Type: application/json' \
  -d '{"email":"owner@landak.test","password":"landak-2026"}')"
# The token goes to curl through a header file, not the command line (visible in ps).
headers="$(mktemp)"
trap 'rm -f "$headers"' EXIT
python3 -c '
import json, sys
data = json.load(sys.stdin)
if not isinstance(data, dict) or not isinstance(data.get("access_token"), str):
    sys.exit("Respuesta inesperada al iniciar sesión")
print("Authorization: Bearer " + data["access_token"])
' <<<"$session" >"$headers"

auth=(-H "apikey: $key" -H "@$headers")

# id | file | days ago | inspection | caption
photos=(
  "00000000-0000-4000-9000-000000000001|1|2|$latest_inspection|Cuadro central con cría operculada"
  "00000000-0000-4000-9000-000000000002|2|21||Piquera por la mañana"
)

for entry in "${photos[@]}"; do
  IFS='|' read -r id file days inspection caption <<<"$entry"
  existing="$(request "$url/rest/v1/photos?id=eq.$id&select=id" "${auth[@]}")"
  if [[ $existing != '[]' ]]; then
    echo "Ya existe: $caption"
    continue
  fi

  path="$org/$hive/$id"
  for suffix in jpg thumb.jpg; do
    request -X POST "$url/storage/v1/object/hive-photos/$path.$suffix" "${auth[@]}" \
      -H 'Content-Type: image/jpeg' -H 'x-upsert: true' \
      --data-binary "@$dir/$file.$suffix" >/dev/null
  done

  row="$(python3 -c '
import json, os, sys
from datetime import datetime, timedelta, timezone
id, org, hive, inspection, caption, days, size = sys.argv[1:8]
print(json.dumps({
    "id": id, "organization_id": org, "hive_id": hive, "inspection_id": inspection or None,
    "storage_path": f"{org}/{hive}/{id}.jpg",
    "taken_at": (datetime.now(timezone.utc) - timedelta(days=int(days))).isoformat(),
    "width": 1600, "height": 1200, "bytes": int(size), "caption": caption,
}))
' "$id" "$org" "$hive" "$inspection" "$caption" "$days" "$(wc -c <"$dir/$file.jpg" | tr -d ' ')")"
  request -X POST "$url/rest/v1/photos" "${auth[@]}" \
    -H 'Content-Type: application/json' -H 'Prefer: return=minimal' -d "$row" >/dev/null
  echo "Subida: $caption"
done
