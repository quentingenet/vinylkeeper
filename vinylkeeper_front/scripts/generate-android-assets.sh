#!/usr/bin/env bash
# Android icons and splash screens, from the brand sources in resources/ (a black record on white,
# drawn from public/images/vinylKeeper.svg). Needs ImageMagick ("magick"). Run from vinylkeeper_front:
#   npm run assets:android
# then rebuild the app. Changing the brand colour starts with the sources, not with this script.
set -euo pipefail

cd "$(dirname "$0")/.."
RES=android/app/src/main/res
BG="#ffffff"

for source in icon-only icon-foreground splash; do
  [ -f "resources/$source.png" ] || { echo "resources/$source.png is missing" >&2; exit 1; }
done

# Launcher icons: legacy square, legacy round, and the foreground of the adaptive icon (its background is a colour)
declare -A LAUNCHER=([mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192)
declare -A FOREGROUND=([mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432)
for density in "${!LAUNCHER[@]}"; do
  size=${LAUNCHER[$density]}
  dir="$RES/mipmap-$density"
  magick resources/icon-only.png -resize "${size}x${size}" "$dir/ic_launcher.png"
  magick resources/icon-only.png -resize "${size}x${size}" \
    \( -size "${size}x${size}" xc:black -fill white -draw "circle $((size / 2)),$((size / 2)) $((size / 2)),0" \) \
    -alpha off -compose CopyOpacity -composite "$dir/ic_launcher_round.png"
  magick resources/icon-foreground.png -resize "${FOREGROUND[$density]}x${FOREGROUND[$density]}" \
    "$dir/ic_launcher_foreground.png"
done
printf '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' \
  "$BG" > "$RES/values/ic_launcher_background.xml"

# Splash screens: the record alone in the middle (about a quarter of the short side, as in resources/splash.png)
splash() { # width height destination
  local short=$(( $1 < $2 ? $1 : $2 ))
  magick resources/splash.png -resize "${short}x" -gravity center \
    -background "$BG" -extent "${1}x${2}" "$3"
}
splash 480 320 "$RES/drawable/splash.png"
for spec in mdpi:320:480 hdpi:480:800 xhdpi:720:1280 xxhdpi:960:1600 xxxhdpi:1280:1920; do
  IFS=: read -r density w h <<<"$spec"
  splash "$w" "$h" "$RES/drawable-port-$density/splash.png"
  splash "$h" "$w" "$RES/drawable-land-$density/splash.png"
done
echo "Android icons and splash screens generated in $RES"
