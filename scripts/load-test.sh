#!/usr/bin/env bash
# Generate traffic against the backend through the Ingress so the HPA and Grafana panels move.
set -euo pipefail
URL="${URL:-http://stockdesk.local/api/products}"
REQUESTS="${REQUESTS:-2000}"
for i in $(seq 1 "$REQUESTS"); do
  curl -s "$URL" >/dev/null &
  # Keep 50 requests in flight at a time.
  if (( i % 50 == 0 )); then wait; fi
done
wait
echo "Load test completed ($REQUESTS requests to $URL)"
