// Реалистичные машины из Objaverse (Sketchfab, CC-BY): нормализация масштаба и осей, упрощение, сжатие текстур.
// Запуск: RAW=/путь/к/raw node tools/build-cars.mjs  (сырые .glb лежат в RAW/cars/<uid-префикс>.glb)
// Каталог с названиями (вымышленными), размерами и авторами пишется в public/assets/cars/catalog.json
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, textureCompress, getBounds, reorder, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const RAW = process.env.RAW || 'assets/raw', OUT = 'public/assets/cars';
fs.mkdirSync(OUT, { recursive: true });
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

// src — префикс uid, len — реальная длина (м), flip — развернуть на 180°, tris — бюджет треугольников, tex — размер текстур
// названия вымышленные: эмблемы настоящих марок в игре не используются
export const LIST = [
  { src: '0afaec0b83', id: 'v03', name: 'Классик 03', brand: 'Волжанин', kind: 'car', len: 4.12, tris: 25000, tex: 1024, err: 0.02, price: 70000, power: 72, vmax: 145, mass: 1030 },
  { src: '91270dab9d', id: 'v07', name: 'Классик 07', brand: 'Волжанин', kind: 'car', len: 4.13, tris: 18000, tex: 512, price: 95000, power: 75, vmax: 150, mass: 1060 },
  { src: '300e85f578', id: 'v05', name: 'Классик 05', brand: 'Волжанин', kind: 'car', len: 4.13, tris: 12000, tex: 512, price: 80000, power: 69, vmax: 145, mass: 1020 },
  { src: 'ba563a31b4', id: 'v04', name: 'Универсал 04', brand: 'Волжанин', kind: 'car', len: 4.12, tris: 18000, tex: 512, price: 60000, power: 69, vmax: 140, mass: 1060 },
  { src: 'b81e6c505d', id: 'v09p', name: 'Патруль 09', brand: 'Волжанин', kind: 'police', len: 4.0, tris: 10000, tex: 512, price: 0, power: 70, vmax: 155, mass: 950 },
  { src: '784ffea507', id: 'n24', name: 'Нева 24', brand: 'Нева', kind: 'car', len: 4.73, tris: 18000, tex: 512, price: 150000, power: 95, vmax: 145, mass: 1420 },
  { src: '12c336887d', id: 'n21', name: 'Нева 21', brand: 'Нева', kind: 'car', len: 4.83, tris: 12000, tex: 512, price: 400000, power: 70, vmax: 130, mass: 1460 },
  { src: '90006f59fd', id: 'dn', name: 'Нексус', brand: 'Дэсан', kind: 'car', len: 4.48, tris: 18000, tex: 512, price: 220000, power: 85, vmax: 175, mass: 1025 },
  { src: '20235fc4ce', id: 'l15', name: 'Лоран Н', brand: 'Лоран', kind: 'car', len: 4.35, tris: 18000, tex: 512, err: 0.04, price: 650000, power: 102, vmax: 180, mass: 1100 },
  { src: 'e4f9463f6e', id: 'l04', name: 'Лоран', brand: 'Лоран', kind: 'car', len: 4.25, tris: 18000, tex: 512, price: 230000, power: 75, vmax: 165, mass: 1050 },
  { src: '30bc2e09de', id: 'ldx', name: 'Лоран Кросс', brand: 'Лоран', kind: 'car', len: 4.31, tris: 18000, tex: 512, price: 900000, power: 114, vmax: 170, mass: 1280 },
  { src: '87208c2766', id: 'k3', name: 'Тройка', brand: 'Кайдзен', kind: 'car', len: 4.58, tris: 14000, tex: 512, price: 1400000, power: 150, vmax: 210, mass: 1300 },
  { src: '1e3be91c28', id: 'kac', name: 'Аккорд', brand: 'Кайдзен', kind: 'car', len: 4.93, tris: 18000, tex: 512, err: 0.04, price: 1200000, power: 180, vmax: 220, mass: 1500 },
  { src: '7674a3bd16', id: 'stc', name: 'Кросс', brand: 'Сеул-Моторс', kind: 'car', len: 4.48, tris: 18000, tex: 512, price: 1900000, power: 150, vmax: 190, mass: 1560 },
  { src: 'f15205a444', id: 'ssp', name: 'Спорт', brand: 'Сеул-Моторс', kind: 'car', len: 4.44, tris: 18000, tex: 512, err: 0.03, price: 1500000, power: 150, vmax: 185, mass: 1500 },
  { src: '2f6aea1435', id: 'sav', name: 'Авант', brand: 'Штальберг', kind: 'car', len: 4.52, tris: 18000, tex: 512, price: 800000, power: 150, vmax: 215, mass: 1450 },
  { src: '1baa016f2c', id: 's5', name: 'Пятёрка', brand: 'Штальберг', kind: 'car', len: 4.72, tris: 18000, tex: 512, price: 450000, power: 190, vmax: 225, mass: 1450 },
  { src: '4b468dbe4b', id: 's124', name: 'Е 124', brand: 'Штальберг', kind: 'car', len: 4.74, tris: 18000, tex: 512, price: 550000, power: 150, vmax: 210, mass: 1400 },
  { src: '119c5e1073', id: 's212', name: 'Е-класс', brand: 'Штальберг', kind: 'car', len: 4.87, tris: 30000, tex: 1024, err: 0.04, price: 4200000, power: 250, vmax: 245, mass: 1700 },
  { src: '09016f12ad', id: 'u469', name: '469', brand: 'Уралец', kind: 'car', len: 4.02, tris: 11000, tex: 512, price: 350000, power: 80, vmax: 115, mass: 1650 },
  { src: 'c4d35696', id: 'raf', name: 'Скорая РФ', brand: 'Рижанин', kind: 'ambulance', len: 4.98, tris: 7000, tex: 512, price: 0, power: 95, vmax: 120, mass: 1800 },
  { src: 'f3daf79ea4', id: 'gz03', name: 'Скорая', brand: 'Горьковчанин', kind: 'ambulance', len: 5.54, tris: 8000, tex: 512, price: 0, power: 107, vmax: 125, mass: 2200 },
  { src: '6f5f115cb8', id: 'gzn', name: 'Фургон Next', brand: 'Горьковчанин', kind: 'van', len: 5.63, tris: 18000, tex: 512, err: 0.05, price: 2500000, power: 150, vmax: 130, mass: 2500 },
  { src: 'e73c8b9cf1', id: 'paz', name: 'Автобус ПА-5', brand: 'Павлово', kind: 'bus', len: 6.93, tris: 18000, tex: 512, price: 0, power: 130, vmax: 90, mass: 5000 },
  { src: 'ddfd0b9846', id: 'laz', name: 'Автобус Л-695', brand: 'Львовчанин', kind: 'bus', len: 9.19, tris: 18000, tex: 512, price: 0, power: 180, vmax: 80, mass: 8000 },
  { src: 'c45145941d', id: 'paz652', name: 'Автобус ПА-652', brand: 'Павлово', kind: 'bus', len: 7.15, tris: 18000, tex: 512, price: 0, power: 90, vmax: 70, mass: 5000 },
  { src: 'e86a62f4b8', id: 'kmz', name: 'Грузовик 53', brand: 'Камский', kind: 'truck', len: 7.4, tris: 18000, tex: 512, price: 0, power: 210, vmax: 85, mass: 8000 },
  { src: 'dd4aeab12b', id: 'tram', name: 'Трамвай Х', brand: 'Горэлектротранс', kind: 'tram', len: 10.0, tris: 18000, tex: 512, price: 0, power: 120, vmax: 50, mass: 15000 },
];
const FLIP = JSON.parse(fs.existsSync('tools/car-flip.json') ? fs.readFileSync('tools/car-flip.json', 'utf8') : '{}');
const info = fs.existsSync(path.join(RAW, 'cars/info.json')) ? JSON.parse(fs.readFileSync(path.join(RAW, 'cars/info.json'), 'utf8')) : {};
const catalog = [];
for (const c of LIST) {
  const src = path.join(RAW, 'cars', c.src + '.glb'); if (!fs.existsSync(src)) { console.log('нет файла', src); continue; }
  const doc = await io.read(src), root = doc.getRoot(), scene = root.listScenes()[0];
  root.listAnimations().forEach(a => a.dispose()); root.listSkins().forEach(s => s.dispose());
  // линии и точки в игре не нужны
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) if (p.getMode() !== 4) p.dispose();
  // корневой узел-обёртка: масштаб, поворот (длина → Z, перед → +Z), центрирование, колёса на земле
  let b = getBounds(scene), sx = b.max[0] - b.min[0], sz = b.max[2] - b.min[2];
  const alongX = sx > sz, len = Math.max(sx, sz), k = c.len / len;
  const wrap = doc.createNode('car');
  for (const n of scene.listChildren()) { scene.removeChild(n); wrap.addChild(n); }
  scene.addChild(wrap);
  const yaw = (alongX ? Math.PI / 2 : 0) + (FLIP[c.id] ? Math.PI : 0);
  wrap.setScale([k, k, k]); wrap.setRotation([0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)]);
  b = getBounds(scene); const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
  wrap.setTranslation([-cx, -b.min[1], -cz]);
  const outer = doc.createNode('root'); scene.removeChild(wrap); outer.addChild(wrap); scene.addChild(outer);
  b = getBounds(scene); const dims = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
  // упрощение до бюджета
  let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const ix = p.getIndices(); tris += (ix ? ix.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  if (tris > c.tris) { await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: c.tris / tris, error: c.err || .01 })); }
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) for (const a of ['TANGENT', 'TEXCOORD_1', 'TEXCOORD_2', 'COLOR_1']) p.setAttribute(a, null);
  await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [c.tex, c.tex], quality: 82 }));
  let tris2 = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const ix = p.getIndices(); tris2 += (ix ? ix.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const file = `${OUT}/${c.id}.glb`; await io.write(file, doc);
  const meta = info[c.src] || {};
  catalog.push({ ...c, dims: dims.map(v => +v.toFixed(3)), trisOut: Math.round(tris2), kb: Math.round(fs.statSync(file).size / 1024), author: meta.user || '', title: meta.name || '', url: meta.url || '', license: 'CC-BY 4.0' });
  console.log(c.id, dims.map(v => v.toFixed(2)).join('×'), Math.round(tris), '→', Math.round(tris2), (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
}
fs.writeFileSync(`${OUT}/catalog.json`, JSON.stringify(catalog, null, 1));
