#!/bin/sh
# Склеивает исходники из src/ в один самодостаточный index.html
set -e
cd "$(dirname "$0")"
cat src/00-head.html src/01-config-strings.js src/02-utils-save-audio.js src/03-input-sprites.js src/03b-art.js \
    src/04-data.js src/05-systems.js src/06-render.js src/07-ui-meta-main.js > index.html
echo "index.html: $(wc -c < index.html) bytes"
