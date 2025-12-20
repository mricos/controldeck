#!/usr/bin/env bash
# ControlDeck Build Script
# Copies terrain assets + app files to dist/ for production

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
SRC_DIR="$SCRIPT_DIR/src"
TERRAIN_SRC="${TERRAIN_SRC:-$SCRIPT_DIR/terrain}"

echo "[build] Building ControlDeck..."
echo "[build] Source: $SCRIPT_DIR"
echo "[build] Terrain: $TERRAIN_SRC"

# Clean and create dist
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/css" "$DIST_DIR/js"

# Copy terrain CSS
echo "[build] Copying terrain CSS..."
cp "$TERRAIN_SRC/css/core.css" "$DIST_DIR/css/"
cp "$TERRAIN_SRC/css/tokens.css" "$DIST_DIR/css/"
cp "$TERRAIN_SRC/css/components/panels.css" "$DIST_DIR/css/"

# Copy app CSS
echo "[build] Copying app CSS..."
cp "$SCRIPT_DIR/css/controldeck-skin.css" "$DIST_DIR/css/"
cp "$SRC_DIR/components.css" "$DIST_DIR/css/"

# Copy app JS
echo "[build] Copying app JS..."
cp "$SRC_DIR/engine.js" "$DIST_DIR/js/"
cp "$SRC_DIR/app.js" "$DIST_DIR/js/"

# Copy polyfill
cp "$SCRIPT_DIR/controldeck-polyfill.js" "$DIST_DIR/"

# Copy HTML (TODO: update paths)
echo "[build] Generating index.html..."
cat > "$DIST_DIR/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ControlDeck</title>
    <!-- Terrain CSS -->
    <link rel="stylesheet" href="css/core.css">
    <link rel="stylesheet" href="css/tokens.css">
    <link rel="stylesheet" href="css/panels.css">
    <!-- App CSS -->
    <link rel="stylesheet" href="css/controldeck-skin.css">
    <link rel="stylesheet" href="css/components.css">
</head>
<body>
    <!-- App HTML here - see source index.html -->
    <script>document.body.innerHTML = '<h1>Build not complete</h1><p>Copy HTML body from source index.html</p>';</script>
    <!-- JS -->
    <script src="js/engine.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
HTMLEOF

# Summary
echo ""
echo "[build] Done! Output: $DIST_DIR"
ls -la "$DIST_DIR"
echo ""
echo "Files:"
find "$DIST_DIR" -type f | while read f; do
    size=$(wc -c < "$f" | tr -d ' ')
    echo "  $(basename "$f"): $size bytes"
done
