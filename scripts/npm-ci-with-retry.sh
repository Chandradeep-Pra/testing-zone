#!/bin/sh
# Retry interrupted downloads without retrying lockfile, auth or compile errors.
set -eu

attempt=1
max_attempts=3
install_log="$(mktemp)"
trap 'rm -f -- "$install_log"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

while :; do
  printf 'Installing locked dependencies (attempt %s/%s)...\n' "$attempt" "$max_attempts"
  if npm ci --no-audit --no-fund --prefer-offline \
    --fetch-retries=3 --fetch-retry-factor=2 \
    --fetch-retry-mintimeout=5000 --fetch-retry-maxtimeout=20000 \
    --fetch-timeout=300000 --maxsockets=10 > "$install_log" 2>&1; then
    cat "$install_log"
    exit 0
  else
    install_status=$?
    cat "$install_log" >&2
  fi

  # Response bodies can be interrupted after npm's request retries have ended.
  # Repeat the full clean install only when the failure names a network error.
  if [ "$attempt" -ge "$max_attempts" ] ||
    ! grep -Eq '(^|[^[:alnum:]_])(ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ECONNECTIONTIMEOUT|EIDLETIMEOUT|ERESPONSETIMEOUT|ETRANSFERTIMEOUT|EAI_AGAIN|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|EPIPE|ERR_SOCKET_TIMEOUT|ERR_STREAM_PREMATURE_CLOSE)([^[:alnum:]_]|$)' "$install_log"; then
    exit "$install_status"
  fi

  delay=$((attempt * 5))
  printf 'Network download interrupted; retrying in %s seconds...\n' "$delay" >&2
  sleep "$delay"
  attempt=$((attempt + 1))
done
