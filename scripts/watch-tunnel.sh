#!/bin/bash
# مراقب رابط Cloudflare — يحدث FRONTEND_URL تلقائياً
# ويرسل إشعار لما يتغير الرابط

URL_FILE="/tmp/cloudflare_url"
ENV_FILE="/data/palex/server/.env"

while true; do
  if [ -f "$URL_FILE" ]; then
    NEW_URL=$(cat "$URL_FILE" 2>/dev/null)
    if [ -n "$NEW_URL" ]; then
      CURRENT_URL=$(grep "^FRONTEND_URL=" "$ENV_FILE" | cut -d= -f2-)
      if [ "$NEW_URL" != "$CURRENT_URL" ]; then
        sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=$NEW_URL|" "$ENV_FILE"
        echo "✅ تم تحديث الرابط: $NEW_URL"
      fi
    fi
  fi
  sleep 30
done
