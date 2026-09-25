#!/bin/sh
# Склеивает хаб в один самодостаточный index.html (Three.js встроен, работает офлайн)
set -e
cd "$(dirname "$0")"
{
  cat src/00-head.html
  printf '<script>\n'; cat vendor/three.min.js; printf '\n</script>\n<script>\n'
  cat src/01-core.js src/02-cars.js src/03-world.js src/04-drive.js src/04b-race.js src/05-ui.js
  printf '</script>\n</body>\n</html>\n'
} > index.html
echo "index.html: $(wc -c < index.html) bytes"
