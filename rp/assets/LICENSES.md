# Лицензии ресурсов

Все внешние ресурсы — со свободными лицензиями. Сырые файлы не хранятся в репозитории: их скачивают заново и собирают командой `RAW=… npm run assets` (см. `tools/build-assets.mjs`).

| Файлы в сборке | Источник | Автор | Лицензия | Что изменено |
|---|---|---|---|---|
| `public/assets/chars/male.glb`, `female.glb`, `hair_*.glb`, `eyebrows_*.glb` | https://quaternius.itch.io/universal-base-characters (Standard) | Quaternius | CC0 1.0 | Убраны анимации, текстуры уменьшены до 1024/512 px и перекодированы в WebP; одежда накладывается шейдером игры |
| `public/assets/chars/anims.glb` | https://quaternius.itch.io/universal-animation-library (Standard) | Quaternius | CC0 1.0 | Оставлены 30 клипов, удалена сетка манекена, пересэмплировано |
| `public/assets/tex/asphalt_*` | https://ambientcg.com/view?id=Asphalt026C | ambientCG | CC0 1.0 | 1024 px, WebP |
| `public/assets/tex/concrete_*` | https://ambientcg.com/view?id=Concrete034 | ambientCG | CC0 1.0 | 512 px, WebP |
| `public/assets/tex/paving_*` | https://ambientcg.com/view?id=PavingStones070 | ambientCG | CC0 1.0 | 512 px, WebP |
| `public/assets/tex/grass_*` | https://ambientcg.com/view?id=Grass004 | ambientCG | CC0 1.0 | 512 px, WebP |
| `public/assets/tex/bricks_*` | https://ambientcg.com/view?id=Bricks076C | ambientCG | CC0 1.0 | 512 px, WebP |
| `public/assets/tex/plaster_*` | https://ambientcg.com/view?id=Plaster001 | ambientCG | CC0 1.0 | 512 px, WebP |
| `public/assets/tex/ground_*` | https://ambientcg.com/view?id=Ground054 | ambientCG | CC0 1.0 | 512 px, WebP |
| `public/assets/tex/tiles_*` | https://ambientcg.com/view?id=Tiles093 | ambientCG | CC0 1.0 | 512 px, WebP |

Код и библиотеки: three.js (MIT), Rapier (Apache-2.0). Город, здания, машины, интерфейс, звук — созданы для игры (процедурно).
