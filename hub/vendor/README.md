`three.min.js` — Three.js r169 и дополнения из официальных примеров (EffectComposer, RenderPass,
UnrealBloomPass, OutputPass, SMAAPass, ShaderPass, VignetteShader, Sky, Lensflare, RoomEnvironment),
собранные в один глобальный объект `THREE`. Лицензия MIT (см. `THREE-LICENSE`).

Пересборка:

    npm i three@0.169.0 esbuild@0.24.0
    npx esbuild three-entry.js --bundle --minify --format=iife --legal-comments=eof --outfile=three.min.js
