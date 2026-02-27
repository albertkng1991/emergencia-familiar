#!/bin/bash
# Creates a macOS .app bundle that launches the menu bar toggle

APP_NAME="DailyDigest"
APP_DIR="$HOME/Applications/${APP_NAME}.app"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="${PROJECT_DIR}/scripts/menubar.py"
PYTHON="${PROJECT_DIR}/.venv/bin/python"

mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Info.plist — LSUIElement=true hides from Dock (menu bar only)
cat > "${APP_DIR}/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>DailyDigest</string>
    <key>CFBundleIdentifier</key>
    <string>com.dailydigest.menubar</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
PLIST

# Launcher script
cat > "${APP_DIR}/Contents/MacOS/${APP_NAME}" << LAUNCHER
#!/bin/bash
exec "${PYTHON}" "${SCRIPT}"
LAUNCHER
chmod +x "${APP_DIR}/Contents/MacOS/${APP_NAME}"

echo "Created: ${APP_DIR}"
echo "Open it or add to Login Items for auto-start."
