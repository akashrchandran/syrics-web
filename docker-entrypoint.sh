#!/bin/sh

# Generate runtime config from environment variables
cat <<EOF > /usr/share/nginx/html/config.js
window.__RUNTIME_CONFIG__ = {
  VITE_SPOTIFY_CLIENT_ID: "${VITE_SPOTIFY_CLIENT_ID:-}",
  VITE_LYRICS_API_BASE: "${VITE_LYRICS_API_BASE:-}"
};
EOF

echo "Runtime config generated:"
cat /usr/share/nginx/html/config.js

# Execute the main command
exec "$@"
