// Дописывает в assets/LICENSES.md таблицы авторов машин, предметов/деревьев и звуков из каталогов сборки.
import fs from 'node:fs';
const F = 'assets/LICENSES.md', MARK = '<!-- auto: каталоги -->';
const j = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const cars = j('public/assets/cars/catalog.json'), props = j('public/assets/props/catalog.json'), snd = j('public/assets/snd/credits.json');
const esc = s => String(s || '').replace(/\|/g, '/');
let out = `${MARK}\n\n## Машины (Sketchfab через Objaverse, CC-BY 4.0)\n\nМодели показаны под вымышленными названиями. Изменено: масштаб до реальных размеров, упрощение сетки, текстуры 512–1024 px WebP, сжатие meshopt.\n\n| Файл | В игре | Оригинал | Автор | Лицензия |\n|---|---|---|---|---|\n`;
for (const c of cars) out += `| \`cars/${c.id}.glb\` | ${esc(c.brand)} ${esc(c.name)} | [${esc(c.title)}](${c.url}) | ${esc(c.author)} | ${c.license} |\n`;
out += `\n## Деревья и предметы улицы\n\nPoly Haven — CC0 (https://polyhaven.com/models), деревья — Sketchfab через Objaverse, CC-BY 4.0. Изменено: масштаб, упрощение, WebP, meshopt.\n\n| Файл | Оригинал | Автор | Лицензия |\n|---|---|---|---|\n`;
for (const p of props) out += `| \`props/${p.id}.glb\` | ${p.url ? `[${esc(p.title)}](${p.url})` : esc(p.source)} | ${esc(p.author)} | ${p.license} |\n`;
out += `\n## Звуки (Freesound, CC0 1.0)\n\nИзменено: обрезка, петли с перекрёстным затуханием, нормализация громкости, MP3.\n\n| Файл | Оригинал | Автор |\n|---|---|---|\n`;
for (const [id, s] of Object.entries(snd)) out += `| \`snd/${id}.mp3\` | [${esc(s.title)}](${s.url}) | ${esc(s.user)} |\n`;
const cur = fs.readFileSync(F, 'utf8'), head = cur.includes(MARK) ? cur.slice(0, cur.indexOf(MARK)) : cur.trimEnd() + '\n\n';
fs.writeFileSync(F, head + out);
console.log('ok', cars.length, props.length, Object.keys(snd).length);
