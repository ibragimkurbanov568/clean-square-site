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

Код и библиотеки: three.js (MIT), Rapier (Apache-2.0). Город, здания и интерфейс созданы для игры (процедурно); машины, деревья, предметы и звуки — см. таблицы ниже.

<!-- auto: каталоги -->

## Машины (Sketchfab через Objaverse, CC-BY 4.0)

Модели показаны под вымышленными названиями. Изменено: масштаб до реальных размеров, упрощение сетки, текстуры 512–1024 px WebP, сжатие meshopt.

| Файл | В игре | Оригинал | Автор | Лицензия |
|---|---|---|---|---|
| `cars/v03.glb` | Волжанин Классик 03 | [Soviet Car. VAZ-2103 Zhiguli](https://sketchfab.com/3d-models/0afaec0b8352486b836e921c77381859) | assg709 | CC-BY 4.0 |
| `cars/v07.glb` | Волжанин Классик 07 | [Old Car - VAZ 2107](https://sketchfab.com/3d-models/91270dab9d1a47c7ba7ffaaf8c8b0beb) | prephonat | CC-BY 4.0 |
| `cars/v05.glb` | Волжанин Классик 05 | [Lada Riva 1986](https://sketchfab.com/3d-models/300e85f5786f48b3abd5f8ab3851c3a1) | pinokio21 | CC-BY 4.0 |
| `cars/v04.glb` | Волжанин Универсал 04 | [VAZ-2104 FREE](https://sketchfab.com/3d-models/ba563a31b4754a66a5f0e7f893145922) | SevKa | CC-BY 4.0 |
| `cars/v09p.glb` | Волжанин Патруль 09 | [Vaz 2109 Police](https://sketchfab.com/3d-models/b81e6c505db745aab15b93c2d2f0024a) | EvgenyS | CC-BY 4.0 |
| `cars/n24.glb` | Нева Нева 24 | [(Low-poly) GAZ-24 Volga (free download)](https://sketchfab.com/3d-models/784ffea507354f70adf94d7fe0fd4b2a) | KrStolorz | CC-BY 4.0 |
| `cars/n21.glb` | Нева Нева 21 | [Game-ready asset "GAZ 21 Volga"](https://sketchfab.com/3d-models/12c336887d8d4abd908a464fc656cdfd) | Daniel_Baku | CC-BY 4.0 |
| `cars/dn.glb` | Дэсан Нексус | [Daewoo - Nexia\Cielo](https://sketchfab.com/3d-models/90006f59fd594d2b95f1469f651491f1) | SevKa | CC-BY 4.0 |
| `cars/l15.glb` | Лоран Лоран Н | [Renault Logan 2015 FBX (FREE TO USE)](https://sketchfab.com/3d-models/20235fc4ceb2442ebad4f60de961e4f4) | itsvipergfx | CC-BY 4.0 |
| `cars/l04.glb` | Лоран Лоран | [Renault Logan 2004](https://sketchfab.com/3d-models/e4f9463f6e004b90bb977d12f6375b9c) | goooddenis | CC-BY 4.0 |
| `cars/ldx.glb` | Лоран Лоран Кросс | [2011 Dacia (Renault) Duster](https://sketchfab.com/3d-models/30bc2e09de66426bb67be72c95fa2476) | razor24 | CC-BY 4.0 |
| `cars/k3.glb` | Кайдзен Тройка | [Mazda 3 Sedan  (.fbx)](https://sketchfab.com/3d-models/87208c2766804afea1466d9253d8a2f3) | Bandit.545 | CC-BY 4.0 |
| `cars/kac.glb` | Кайдзен Аккорд | [Honda Accord 2008](https://sketchfab.com/3d-models/1e3be91c28104f6489b42248884327fe) | David_Holiday | CC-BY 4.0 |
| `cars/stc.glb` | Сеул-Моторс Кросс | [2015 Hyundai Tucson](https://sketchfab.com/3d-models/7674a3bd168a451daf73fc0a33d39589) | razor24 | CC-BY 4.0 |
| `cars/ssp.glb` | Сеул-Моторс Спорт | [Kia Sportage (SL 2011-2014)](https://sketchfab.com/3d-models/f15205a444fb42f7a2ebf6765a36026a) | farhad.Guli | CC-BY 4.0 |
| `cars/sav.glb` | Штальберг Авант | [Audi A4 B5.5 Avant](https://sketchfab.com/3d-models/2f6aea1435bd4ad093146c019c8e0fb6) | Tomasoo | CC-BY 4.0 |
| `cars/s5.glb` | Штальберг Пятёрка | [(Low-poly) BMW E34 (free download)](https://sketchfab.com/3d-models/1baa016f2c814cd7ace8ea86a927fa4a) | KrStolorz | CC-BY 4.0 |
| `cars/s124.glb` | Штальберг Е 124 | [Mercedes-Benz E-class W124 (unfinished)](https://sketchfab.com/3d-models/4b468dbe4b6d4ca994bc7066b90781e2) | San.Dro | CC-BY 4.0 |
| `cars/s212.glb` | Штальберг Е-класс | [Mercedes E Class W212](https://sketchfab.com/3d-models/119c5e10733142b197aa53b86f6aeb04) | better_peter | CC-BY 4.0 |
| `cars/u469.glb` | Уралец 469 | [UAZ 001 УАЗ](https://sketchfab.com/3d-models/09016f12adde42e996c29209635e2b92) | hawol | CC-BY 4.0 |
| `cars/raf.glb` | Рижанин Скорая РФ | [Раф "Скорая помощь" / Raf "Ambulance"](https://sketchfab.com/3d-models/c4d356968b8046249da720d73206e699) | grox777 | CC-BY 4.0 |
| `cars/gz03.glb` | Горьковчанин Скорая | [ГАЗ-3221 Скорая помощь / GAZ-3221 Ambulance R.2](https://sketchfab.com/3d-models/f3daf79ea4e843c8a159e8ead7af6e74) | grox777 | CC-BY 4.0 |
| `cars/gzn.glb` | Горьковчанин Фургон Next | [GAZelle Next [FREE]](https://sketchfab.com/3d-models/6f5f115cb8fc4bb2933b317f505d5708) | lybnineg | CC-BY 4.0 |
| `cars/paz.glb` | Павлово Автобус ПА-5 | [ПАЗ-3205](https://sketchfab.com/3d-models/e73c8b9cf1d94ab586a88e2771b856a0) | oldkestas | CC-BY 4.0 |
| `cars/laz.glb` | Львовчанин Автобус Л-695 | [Laz 695](https://sketchfab.com/3d-models/ddfd0b9846c24a058874521e9d170bcb) | whisper.alt | CC-BY 4.0 |
| `cars/paz652.glb` | Павлово Автобус ПА-652 | [ПАЗ-652](https://sketchfab.com/3d-models/c45145941d114c85a575681079c61aff) | oldkestas | CC-BY 4.0 |
| `cars/kmz.glb` | Камский Грузовик 53 | [Kamaz 5330](https://sketchfab.com/3d-models/e86a62f4b8c84e03b2c6e32c51474bc7) | davidbroutian | CC-BY 4.0 |
| `cars/tram.glb` | Горэлектротранс Трамвай Х | [Soviet tram x-series](https://sketchfab.com/3d-models/dd4aeab12b4b4c3891156d7662b79cc2) | net_3d | CC-BY 4.0 |

## Деревья и предметы улицы

Poly Haven — CC0 (https://polyhaven.com/models), деревья — Sketchfab через Objaverse, CC-BY 4.0. Изменено: масштаб, упрощение, WebP, meshopt.

| Файл | Оригинал | Автор | Лицензия |
|---|---|---|---|
| `props/lamp.glb` | Poly Haven | Josh Dean | CC0 |
| `props/lamp2.glb` | Poly Haven | Josh Dean | CC0 |
| `props/bin.glb` | Poly Haven | GurJas Studios | CC0 |
| `props/manhole.glb` | Poly Haven | Raunox | CC0 |
| `props/ubox.glb` | Poly Haven | James Ray Cock | CC0 |
| `props/ubox2.glb` | Poly Haven | James Ray Cock | CC0 |
| `props/pbox.glb` | Poly Haven | Rico Cilliers, Yann Kervran | CC0 |
| `props/aircon.glb` | Poly Haven | Monsta3D | CC0 |
| `props/barrier.glb` | Poly Haven | Amal Kumar | CC0 |
| `props/trashbag.glb` | Poly Haven | Benny Weimer | CC0 |
| `props/cardboard.glb` | Poly Haven | Rahul Chaudhary | CC0 |
| `props/crate.glb` | Poly Haven | James Ray Cock | CC0 |
| `props/pcrate.glb` | Poly Haven | PierreB3D | CC0 |
| `props/planter.glb` | Poly Haven | James Ray Cock | CC0 |
| `props/picnic.glb` | Poly Haven | Ulan Cabanilla | CC0 |
| `props/tyre.glb` | Poly Haven | MP | CC0 |
| `props/tree_urban.glb` | [Fast Urban Tree](https://sketchfab.com/3d-models/c6c7cebef37544ee8a80780034a03737) | rodrigogelmi | CC-BY 4.0 |
| `props/tree_poplar.glb` | [POPLAR TREE - HIGHT TEXTURE LOW-POLY MODEL](https://sketchfab.com/3d-models/ec7c1d301bbc43dca5fe5f0650148d13) | evseevdaniil0011 | CC-BY 4.0 |
| `props/tree_leafy.glb` | [Tree For Games](https://sketchfab.com/3d-models/f91d3c3c527d47fdb217c291e4c7df4b) | dangry | CC-BY 4.0 |
| `props/tree_oak.glb` | [Oak tree](https://sketchfab.com/3d-models/3dc59560f2d24345bdbe65c44636453b) | massive-graphisme | CC-BY 4.0 |

## Звуки (Freesound, CC0 1.0)

Изменено: обрезка, петли с перекрёстным затуханием, нормализация громкости, MP3.

| Файл | Оригинал | Автор |
|---|---|---|
| `snd/amb_city.mp3` | [Traffic medium city dry road xy 90 degrees recording.wav](https://freesound.org/people/nickpursehouse/sounds/110310/) | nickpursehouse |
| `snd/amb_street.mp3` | [Semi-quiet street in city, cars passing by, Light rain and raindrops from trees, Distant traffic noise](https://freesound.org/people/Pfannkuchn/sounds/258165/) | Pfannkuchn |
| `snd/amb_night_city.mp3` | [201110 Distant sirens, urban, night, quiet, roof 11pm.flac](https://freesound.org/people/TRP/sounds/568975/) | TRP |
| `snd/amb_yard.mp3` | [Ambience - Backyard of a suburban street](https://freesound.org/people/khenshom/sounds/518929/) | khenshom |
| `snd/amb_kids.mp3` | [Children’s playground](https://freesound.org/people/artemditkovsky/sounds/860290/) | artemditkovsky |
| `snd/amb_crickets.mp3` | [Night ambience with crickets](https://freesound.org/people/KikeVilaplana/sounds/436528/) | KikeVilaplana |
| `snd/amb_river.mp3` | [Stream River Water Up Close](https://freesound.org/people/jackthemurray/sounds/433589/) | jackthemurray |
| `snd/amb_birds.mp3` | [Early Summer Morning Ambience with Birds, Berlin](https://freesound.org/people/Pfannkuchn/sounds/457616/) | Pfannkuchn |
| `snd/amb_crowd.mp3` | [Generic Exterior Walla](https://freesound.org/people/brunoboselli/sounds/634880/) | brunoboselli |
| `snd/rain.mp3` | [Slowly Raining Loop](https://freesound.org/people/unfa/sounds/177479/) | unfa |
| `snd/rain_heavy.mp3` | [Rain heavy 2 (rural)](https://freesound.org/people/jmbphilmes/sounds/200272/) | jmbphilmes |
| `snd/rain_roof.mp3` | [Hard Rain on Car Roof.wav](https://freesound.org/people/eRobb4/sounds/344460/) | eRobb4 |
| `snd/wind.mp3` | [Strong Wind](https://freesound.org/people/florianreichelt/sounds/459981/) | florianreichelt |
| `snd/wind_trees.mp3` | [wind_forest_08_strong_l_01.wav](https://freesound.org/people/teadrinker/sounds/403051/) | teadrinker |
| `snd/thunder1.mp3` | [Thunder strike](https://freesound.org/people/AyaDrevis/sounds/652690/) | AyaDrevis |
| `snd/thunder2.mp3` | [Closeup Thunder Strike 01](https://freesound.org/people/loganzsound/sounds/840628/) | loganzsound |
| `snd/eng_idle.mp3` | [car_idle_ext_loop.wav](https://freesound.org/people/AndrewAlexander/sounds/369054/) | AndrewAlexander |
| `snd/eng_low.mp3` | [SFX_Car_Engine_Outside_RPMLow.wav](https://freesound.org/people/GiocoSound/sounds/401556/) | GiocoSound |
| `snd/eng_motor.mp3` | [Motor Loop.wav](https://freesound.org/people/soundjoao/sounds/325808/) | soundjoao |
| `snd/eng_bus.mp3` | [Bus Engine Idling](https://freesound.org/people/bikesnbassboi/sounds/540398/) | bikesnbassboi |
| `snd/eng_interior.mp3` | [Car interior driving 02.wav](https://freesound.org/people/Daphne_in_Wonderland/sounds/383476/) | Daphne_in_Wonderland |
| `snd/eng_start.mp3` | [SFX_Car_Engine_Outside_Start.wav](https://freesound.org/people/GiocoSound/sounds/401558/) | GiocoSound |
| `snd/horn1.mp3` | [05 Horn.wav](https://freesound.org/people/15HPanska_Ruttner_Jan/sounds/461679/) | 15HPanska_Ruttner_Jan |
| `snd/horn2.mp3` | [car horn honking.wav](https://freesound.org/people/99021905683/sounds/571348/) | 99021905683 |
| `snd/horn3.mp3` | [CarHorn_Takes](https://freesound.org/people/BaggoNotes/sounds/719428/) | BaggoNotes |
| `snd/siren_police.mp3` | [Police Siren](https://freesound.org/people/TitanKaempfer/sounds/746302/) | TitanKaempfer |
| `snd/siren_amb.mp3` | [Ambulance siren](https://freesound.org/people/sofialomba/sounds/469412/) | sofialomba |
| `snd/ped_tick.mp3` | [Pedestrian_Road_Crossing_Australia_Press_Button_Waiting_and_Go_Beep.wav](https://freesound.org/people/roisin.gleeson/sounds/699144/) | roisin.gleeson |
| `snd/ped_beep.mp3` | [Traffic Light Beep.wav](https://freesound.org/people/mincedbeats/sounds/593968/) | mincedbeats |
| `snd/steps.mp3` | [Footsteps on concrete](https://freesound.org/people/florianreichelt/sounds/459964/) | florianreichelt |
| `snd/door_open.mp3` | [Car Door Handle.wav](https://freesound.org/people/RutgerMuller/sounds/50697/) | RutgerMuller |
| `snd/door_close.mp3` | [Car_Door_Closing_Dull_04](https://freesound.org/people/BlondPanda/sounds/778421/) | BlondPanda |
| `snd/crash1.mp3` | [Car Crash (with Glass)](https://freesound.org/people/magnuswaker/sounds/592388/) | magnuswaker |
| `snd/crash2.mp3` | [Car Crash](https://freesound.org/people/squareal/sounds/237375/) | squareal |
| `snd/skid.mp3` | [Tires Squeaking.aif](https://freesound.org/people/RutgerMuller/sounds/104026/) | RutgerMuller |
| `snd/bus_brake.mp3` | [Jbrake_sim_96k.wav](https://freesound.org/people/vacuumfan7072/sounds/422442/) | vacuumfan7072 |
| `snd/bus_door.mp3` | [Bus-doors-sound-effect.mp3](https://freesound.org/people/reviewsoffers/sounds/472605/) | reviewsoffers |
| `snd/tram_bell.mp3` | [FXSaSc Berlin Tram Train Ring Bell Alexanderplatz.wav](https://freesound.org/people/Profispiesser/sounds/543825/) | Profispiesser |
| `snd/dog.mp3` | [Dogs Barking in Distance_Rural.wav](https://freesound.org/people/rvandemark/sounds/581478/) | rvandemark |
| `snd/pigeons.mp3` | [pidgeons cooing city park.wav](https://freesound.org/people/pawsound/sounds/154865/) | pawsound |
| `snd/car_pass1.mp3` | [Car passing by.wav](https://freesound.org/people/hinzebeat/sounds/171447/) | hinzebeat |
| `snd/car_pass2.mp3` | [Passing Car (Wet road)](https://freesound.org/people/Breviceps/sounds/462862/) | Breviceps |
