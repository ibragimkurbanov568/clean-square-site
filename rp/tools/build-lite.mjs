// Облегчённый набор ресурсов для «однофайловой» мобильной версии (всё внутри одной HTML-страницы, до ~16 МБ):
// меньше машин и предметов, текстуры 256–512 px, только используемые анимации. Звук — tools/build-lite-snd.py.
// Запуск: node tools/build-lite.mjs <папка-вывода>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = process.argv[2] || 'lite', SRC = 'public/assets';
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
export const LITE_CARS = ['v07', 'v03', 'n24', 'l15', 'k3', 'v09p', 'raf', 'paz', 'u469'];
export const LITE_PROPS = ['tree_oak', 'tree_leafy', 'lamp', 'bin', 'ubox', 'manhole', 'aircon', 'trashbag', 'planter', 'barrier'];
const USED_ANIMS = /^(Idle_Loop|Walk_Loop|Jog_Fwd_Loop|Sprint_Loop|Jump_Start|Jump_Loop|Death01|PickUp_Table|Punch_Jab|Punch_Cross|Idle_Talking_Loop|Sitting_Idle_Loop|Driving_Loop)$/;
let total = 0;
async function slim(src, dst, tex, { tris = 0, anims = null } = {}) {
  const doc = await io.read(src), root = doc.getRoot();
  if (anims) for (const a of root.listAnimations()) if (!anims.test(a.getName())) a.dispose();
  const steps = [dedup(), prune()];
  if (tris) { let t = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices()?.getCount() || 0) / 3; if (t > tris) steps.unshift(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: tris / t, error: .03 })); }
  if (tex) steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex], quality: 72 }));
  await doc.transform(...steps);
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  fs.mkdirSync(dst.replace(/\/[^/]+$/, ''), { recursive: true }); await io.write(dst, doc);
  const kb = fs.statSync(dst).size; total += kb; console.log(dst, (fs.statSync(src).size / 1024).toFixed(0), '→', (kb / 1024).toFixed(0), 'KB');
}
const cat = f => JSON.parse(fs.readFileSync(`${SRC}/${f}/catalog.json`, 'utf8'));
fs.mkdirSync(`${OUT}/cars`, { recursive: true }); fs.mkdirSync(`${OUT}/props`, { recursive: true }); fs.mkdirSync(`${OUT}/tex`, { recursive: true });
for (const id of LITE_CARS) await slim(`${SRC}/cars/${id}.glb`, `${OUT}/cars/${id}.glb`, 256, { tris: 9000 });
fs.writeFileSync(`${OUT}/cars/catalog.json`, JSON.stringify(cat('cars').filter(c => LITE_CARS.includes(c.id))));
for (const id of LITE_PROPS) await slim(`${SRC}/props/${id}.glb`, `${OUT}/props/${id}.glb`, id.startsWith('tree') ? 512 : 256);
fs.writeFileSync(`${OUT}/props/catalog.json`, JSON.stringify(cat('props').filter(c => LITE_PROPS.includes(c.id))));
for (const f of fs.readdirSync(`${SRC}/chars`)) if (f.endsWith('.glb')) await slim(`${SRC}/chars/${f}`, `${OUT}/chars/${f}`, f.startsWith('anims') ? 0 : 512, { anims: f.startsWith('anims') ? USED_ANIMS : null });
for (const f of fs.readdirSync(`${SRC}/tex`)) { const o = `${OUT}/tex/${f}`; await sharp(`${SRC}/tex/${f}`).resize(f.startsWith('asphalt') ? 512 : 256).webp({ quality: 75 }).toFile(o); total += fs.statSync(o).size; }
console.log('total', (total / 1048576).toFixed(2), 'MB');
