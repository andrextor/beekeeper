#!/usr/bin/env bash
# Sets a new password for a user while the project cannot send recovery emails.
# Usage: SUPABASE_URL=… SUPABASE_SECRET_KEY=… scripts/reset-password.sh <email>
# The secret key bypasses RLS: keep it on this machine only, never in an app or in the repo.
set -euo pipefail

email="${1:-}"
if [[ -z "$email" ]]; then
  echo "Uso: scripts/reset-password.sh <correo>" >&2
  exit 1
fi
: "${SUPABASE_URL:?Falta SUPABASE_URL}"
: "${SUPABASE_SECRET_KEY:?Falta SUPABASE_SECRET_KEY}"

auth=(-H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
email_lower=$(printf '%s' "$email" | tr '[:upper:]' '[:lower:]')

# ponytail: scans pages of 1000 users; fine until the pilot has tens of thousands of accounts.
user_id=""
page=1
while [[ -z "$user_id" ]]; do
  body=$(curl -sS --fail-with-body "${auth[@]}" "$SUPABASE_URL/auth/v1/admin/users?page=$page&per_page=1000") || {
    echo "La API de Auth respondió con error (revisa SUPABASE_URL y SUPABASE_SECRET_KEY): $body" >&2
    exit 1
  }
  # Prints "<id or -> <page size>", or exits 1 when the response is not a user list.
  parsed=$(printf '%s' "$body" | EMAIL="$email_lower" python3 -c '
import json, os, sys
data = json.load(sys.stdin)
users = data.get("users") if isinstance(data, dict) else None
if not isinstance(users, list):
    sys.exit(1)
match = next((u["id"] for u in users if (u.get("email") or "").lower() == os.environ["EMAIL"]), "")
print(match or "-", len(users))
') || {
    echo "Respuesta inesperada de la API de Auth: $body" >&2
    exit 1
  }
  read -r user_id count <<<"$parsed"
  [[ "$user_id" == "-" ]] && user_id=""
  if [[ -z "$user_id" && "$count" -lt 1000 ]]; then
    echo "No existe un usuario con el correo $email_lower" >&2
    exit 1
  fi
  page=$((page + 1))
done

read -rsp "Nueva contraseña para $email_lower (mínimo 8): " password
echo
if [[ ${#password} -lt 8 ]]; then
  echo "La contraseña debe tener al menos 8 caracteres." >&2
  exit 1
fi

payload=$(PASSWORD="$password" python3 -c 'import json, os; print(json.dumps({"password": os.environ["PASSWORD"]}))')
if ! result=$(curl -sS --fail-with-body -X PUT "${auth[@]}" -H "content-type: application/json" \
  -d "$payload" "$SUPABASE_URL/auth/v1/admin/users/$user_id"); then
  echo "No se pudo cambiar la contraseña: $result" >&2
  exit 1
fi
echo "Contraseña actualizada para $email_lower. Compártela por un canal privado."
