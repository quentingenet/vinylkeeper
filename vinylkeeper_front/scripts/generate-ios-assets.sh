#!/usr/bin/env bash
# iOS app icon and launch image, from the same brand sources as Android (resources/). Needs ImageMagick
# ("magick"). Run from vinylkeeper_front:
#   npm run assets:ios
# then rebuild the app.
set -euo pipefail

cd "$(dirname "$0")/.."
ASSETS=ios/App/App/Assets.xcassets
BG="#ffffff"

for source in icon-only splash; do
  [ -f "resources/$source.png" ] || { echo "resources/$source.png is missing" >&2; exit 1; }
done
[ -d "$ASSETS" ] || { echo "$ASSETS is missing: run npx cap add ios first" >&2; exit 1; }

# App icon: a single 1024 px image, Xcode derives the other sizes. Apple refuses an icon with an alpha channel,
# so it is flattened on the background colour and written without one.
magick resources/icon-only.png -resize 1024x1024 -background "$BG" -flatten -alpha off \
  "PNG24:$ASSETS/AppIcon.appiconset/AppIcon-512@2x.png"

# Launch image: a 2732 px square that the launch screen scales to fill a portrait iPhone, which shows only a
# middle band of it. The record is drawn smaller than in the source so that it keeps about a quarter of the
# screen width, as on Android.
for name in splash-2732x2732 splash-2732x2732-1 splash-2732x2732-2; do
  magick resources/splash.png -resize 45% -gravity center -background "$BG" -extent 2732x2732 -alpha off \
    "PNG24:$ASSETS/Splash.imageset/$name.png"
done
echo "iOS icon and launch image generated in $ASSETS"
