#!/usr/bin/env bash
# ==============================================================
# سكريبت إدارة نفق Cloudflare لمشروع Palex
# ==============================================================
set -e

PROJECT="Palex"
PORT=3000
URL_FILE="/data/palex/.tunnel_url.txt"
LOG_FILE="/data/palex/tunnel.log"
PID_FILE="/data/palex/.tunnel.pid"
OLD_URL_FILE="/data/palex/.tunnel_old_url.txt"

log() { echo "[$(date '+%H:%M:%S')] $1" >> "$LOG_FILE"; echo "[$(date '+%H:%M:%S')] $1"; }

# === إيقاف نفق port 3000 فقط (ما يمس أنفاق المشاريع الثانية) ===
kill_my_tunnel() {
    local MY_TUNNEL_PIDS
    MY_TUNNEL_PIDS=$(pgrep -f "cloudflared.*:$PORT" 2>/dev/null || true)
    if [ -n "$MY_TUNNEL_PIDS" ]; then
        echo "$MY_TUNNEL_PIDS" | xargs kill -9 2>/dev/null || true
        sleep 1
        log "✅ تم إيقاف نفق port $PORT"
    else
        log "✅ لا يوجد نفق على port $PORT"
    fi
}

# === بدء النفق ===
start_tunnel() {
    log "🔄 تشغيل نفق TryCloudflare للمشروع $PROJECT..."
    kill_my_tunnel
    (
        nohup /data/cloudflared tunnel --url http://localhost:$PORT 2>&1 | while IFS= read -r line; do
            echo "$line" >> "$LOG_FILE"
            URL=$(echo "$line" | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
            if [ -n "$URL" ]; then
                echo "$URL" > "$URL_FILE"
                log "✅ الرابط الجديد: $URL"
            fi
        done
    ) &
    disown
    echo $! > "$PID_FILE"

    for i in $(seq 1 30); do
        if [ -s "$URL_FILE" ]; then
            log "✅ النفق شغال: $(cat "$URL_FILE")"
            return 0
        fi
        sleep 1
    done
    log "⚠️ لم نتحصل على رابط (قد يحتاج وقت)"
    return 1
}

# === إيقاف النفق ===
stop_tunnel() {
    log "🛑 إيقاف نفق $PROJECT..."
    [ -f "$PID_FILE" ] && { kill "$(cat "$PID_FILE")" 2>/dev/null || true; rm -f "$PID_FILE"; }
    kill_my_tunnel
    log "✅ تم"
}

# === حالة النفق ===
get_url() {
    cat "$URL_FILE" 2>/dev/null || echo ""
}

is_running() {
    local PID
    [ -f "$PID_FILE" ] && { PID=$(cat "$PID_FILE"); kill -0 "$PID" 2>/dev/null && return 0; }
    return 1
}

# === وضع المراقب (watchdog) ===
watchdog() {
    local OLD_URL NEW_URL
    OLD_URL=$(cat "$OLD_URL_FILE" 2>/dev/null || echo "")
    
    if is_running && [ -n "$(get_url)" ]; then
        local CODE
        CODE=$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' "$(get_url)" 2>/dev/null || echo "000")
        if [ "$CODE" != "000" ]; then
            log "✅ النفق يعمل"
            NEW_URL=$(get_url)
            if [ "$NEW_URL" != "$OLD_URL" ]; then
                echo "$NEW_URL" > "$OLD_URL_FILE"
                echo "🔗 الرابط الجديد: $NEW_URL"
            fi
            return 0
        fi
        log "⚠️ النفق لا يستجيب، إعادة تشغيل..."
    else
        log "⚠️ النفق لا يعمل، إعادة تشغيل..."
    fi

    stop_tunnel > /dev/null 2>&1
    sleep 1
    start_tunnel
    return $?
}

# === التحقق من السيرفرات ===
ensure_servers() {
    local APP_OK
    curl -s --max-time 2 -o /dev/null http://localhost:$PORT/ && APP_OK=1 || APP_OK=0
    
    [ "$APP_OK" = "0" ] && { log "⚠️ Next.js ساكت، المستخدم يحتاج تشغيله"; }
    sleep 2
}

# === التنفيذ ===
case "${1:-start}" in
    start)
        ensure_servers
        stop_tunnel > /dev/null 2>&1
        sleep 1
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    restart)
        ensure_servers
        stop_tunnel
        sleep 1
        start_tunnel
        ;;
    status)
        if is_running && [ -n "$(get_url)" ]; then
            echo "✅ يعمل: $(get_url)"
            curl -s --max-time 5 -o /dev/null -w "(HTTP %{http_code})" "$(get_url)" 2>/dev/null
            echo ""
        else
            echo "❌ لا يعمل"
            exit 1
        fi
        ;;
    url)
        get_url
        [ -z "$(get_url)" ] && { echo "لا يوجد رابط"; exit 1; }
        ;;
    watch)
        ensure_servers
        watchdog
        ;;
    *)
        echo "الاستخدام: $0 {start|stop|restart|status|url|watch}"
        exit 1
        ;;
esac
