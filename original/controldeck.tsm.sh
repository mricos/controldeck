#!/usr/bin/env bash
# ControlDeck TSM Service
# Port 1977 - year of the Atari 2600 release (first major gamepad controller era)

TSM_NAME="controldeck"
TSM_PORT=1977
TSM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

controldeck_start() {
    cd "$TSM_DIR" || return 1
    python3 -m http.server "$TSM_PORT" &
    echo $!
}

controldeck_stop() {
    local pid=$1
    kill "$pid" 2>/dev/null
}

controldeck_status() {
    curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TSM_PORT}/" 2>/dev/null
}

controldeck_url() {
    echo "http://localhost:${TSM_PORT}/"
}
