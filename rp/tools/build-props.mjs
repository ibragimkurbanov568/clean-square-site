// Предметы улицы (Poly Haven, CC0) и деревья (Objaverse, CC-BY): реальный масштаб, основание на земле, упрощение, сжатие.
// Запуск: RAW=/путь/к/raw node tools/build-props.mjs   (RAW/ph/<id>/<id>.gltf и RAW/trees/<uid>.glb)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, textureCompress, getBounds, reorder, quantize, metalRough } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const RAW = process.env.RAW || 'assets/raw', OUT = 'public/assets/props';
fs.mkdirSync(OUT, { recursive: true });
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
// h — высота в метрах (масштаб по ней), tris — бюджет, tex — текстуры, drop — убрать сетки с такими именами (земля под деревом и т.п.)
const LIST = [
  { id: 'lamp', src: 'ph/street_lamp_01/street_lamp_01.gltf', h: 8.5, tris: 3000, tex: 512, src2: 'Poly Haven', author: 'Josh Dean', license: 'CC0' },
  { id: 'lamp2', src: 'ph/street_lamp_02/street_lamp_02.gltf', h: 4.2, tris: 2500, tex: 512, author: 'Josh Dean', license: 'CC0' },
  { id: 'bin', src: 'ph/metal_trash_can/metal_trash_can.gltf', h: .95, tris: 1500, tex: 512, author: 'GurJas Studios', license: 'CC0' },
  { id: 'seat', src: 'ph/modular_street_seating/modular_street_seating.gltf', h: .8, tris: 2500, tex: 512, author: 'Stuart Attenborrow', license: 'CC0' },
  { id: 'bench', src: 'ph/painted_wooden_bench/painted_wooden_bench.gltf', h: .9, tris: 1000, tex: 512, author: 'Kirill Sannikov', license: 'CC0' },
  { id: 'manhole', src: 'ph/water_manhole_cover/water_manhole_cover.gltf', h: .07, tris: 600, tex: 512, author: 'Raunox', license: 'CC0' },
  { id: 'ubox', src: 'ph/utility_box_01/utility_box_01.gltf', h: 1.12, tris: 1200, tex: 512, author: 'James Ray Cock', license: 'CC0' },
  { id: 'ubox2', src: 'ph/utility_box_02/utility_box_02.gltf', h: 1.12, tris: 1200, tex: 512, author: 'James Ray Cock', license: 'CC0' },
  { id: 'pbox', src: 'ph/power_box_01/power_box_01.gltf', h: .5, tris: 1500, tex: 512, author: 'Rico Cilliers, Yann Kervran', license: 'CC0' },
  { id: 'aircon', src: 'ph/exterior_aircon_unit/exterior_aircon_unit.gltf', h: .93, tris: 1500, tex: 512, author: 'Monsta3D', license: 'CC0' },
  { id: 'barrier', src: 'ph/concrete_road_barrier/concrete_road_barrier.gltf', h: .84, tris: 1500, tex: 512, author: 'Amal Kumar', license: 'CC0' },
  { id: 'trashbag', src: 'ph/trashbag/trashbag.gltf', h: .55, tris: 800, tex: 512, author: 'Benny Weimer', license: 'CC0' },
  { id: 'cardboard', src: 'ph/cardboard_box_01/cardboard_box_01.gltf', h: .34, tris: 600, tex: 512, author: 'Rahul Chaudhary', license: 'CC0' },
  { id: 'crate', src: 'ph/wooden_crate_01/wooden_crate_01.gltf', h: .35, tris: 800, tex: 512, author: 'James Ray Cock', license: 'CC0' },
  { id: 'pcrate', src: 'ph/plastic_crate_01/plastic_crate_01.gltf', h: .26, tris: 1200, tex: 512, author: 'PierreB3D', license: 'CC0' },
  { id: 'planter', src: 'ph/planter_box_01/planter_box_01.gltf', h: .42, tris: 1200, tex: 512, author: 'James Ray Cock', license: 'CC0' },
  { id: 'picnic', src: 'ph/wooden_picnic_table/wooden_picnic_table.gltf', h: .75, tris: 1500, tex: 512, author: 'Ulan Cabanilla', license: 'CC0' },
  { id: 'tyre', src: 'ph/old_tyre/old_tyre.gltf', h: .6, tris: 800, tex: 512, author: 'MP', license: 'CC0' },
  { id: 'shutter', src: 'ph/rollershutter_door/rollershutter_door.gltf', h: 2.4, tris: 600, tex: 512, author: 'MP', license: 'CC0' },
  { id: 'fence', src: 'ph/modular_chainlink_fence/modular_chainlink_fence.gltf', h: 2.2, tris: 3000, tex: 512, author: 'James Ray Cock, Amal Kumar', license: 'CC0' },
  { id: 'shrub', src: 'ph/shrub_02/shrub_02.gltf', h: 1.9, tris: 2500, tex: 512, author: 'Rico Cilliers', license: 'CC0' },
  { id: 'shrub2', src: 'ph/shrub_04/shrub_04.gltf', h: .8, tris: 1500, tex: 512, author: 'Rico Cilliers', license: 'CC0' },
  { id: 'stump', src: 'ph/tree_stump_01/tree_stump_01.gltf', h: .5, tris: 800, tex: 512, author: 'Rob Tuytel', license: 'CC0' },
  { id: 'pot', src: 'ph/potted_plant_01/potted_plant_01.gltf', h: 1.35, tris: 1500, tex: 512, author: 'Rico Cilliers', license: 'CC0' },
  // деревья (Objaverse, CC-BY)
  { id: 'tree_urban', src: 'trees/c6c7cebef3.glb', h: 9, tris: 4000, tex: 1024, tree: true },
  { id: 'tree_poplar', src: 'trees/ec7c1d301b.glb', h: 17, tris: 3000, tex: 1024, tree: true },
  { id: 'tree_maple', src: 'trees/4b27adcf92.glb', h: 10, tris: 4000, tex: 1024, tree: true, drop: /plane|ground|grass|soil/i },
  { id: 'tree_birch', src: 'trees/43a94afe9f.glb', h: 12, tris: 4000, tex: 1024, tree: true },
  { id: 'tree_leafy', src: 'trees/f91d3c3c52.glb', h: 8, tris: 4000, tex: 1024, tree: true },
  { id: 'tree_oak', src: 'trees/3dc59560f2.glb', h: 12, tris: 4000, tex: 1024, tree: true },
];
const tinfo = fs.existsSync(path.join(RAW, 'trees/info.json')) ? JSON.parse(fs.readFileSync(path.join(RAW, 'trees/info.json'), 'utf8')) : {};
const catalog = [];
for (const c of LIST) {
  const src = path.join(RAW, c.src); if (!fs.existsSync(src)) { console.log('нет', src); continue; }
  const doc = await io.read(src), root = doc.getRoot(), scene = root.listScenes()[0];
  root.listAnimations().forEach(a => a.dispose());
  if (c.drop) for (const n of root.listNodes()) if (c.drop.test(n.getName()) && n.getMesh()) n.setMesh(null);
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) if (p.getMode() !== 4) p.dispose();
  await doc.transform(metalRough());
  // листва: прозрачность «вырезом» (быстрее и без проблем сортировки)
  for (const m of root.listMaterials()) if (m.getAlphaMode() === 'BLEND' && (c.tree || /leaf|leaves|folia|crown|top|shrub|bush|branch/i.test(m.getName()))) { m.setAlphaMode('MASK'); m.setAlphaCutoff(.45); m.setDoubleSided(true); }
  let b = getBounds(scene); const k = c.h / (b.max[1] - b.min[1]);
  const wrap = doc.createNode('prop'); for (const n of scene.listChildren()) { scene.removeChild(n); wrap.addChild(n); } scene.addChild(wrap); wrap.setScale([k, k, k]);
  b = getBounds(scene); wrap.setTranslation([-(b.min[0] + b.max[0]) / 2, -b.min[1], -(b.min[2] + b.max[2]) / 2]);
  b = getBounds(scene); const dims = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
  let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const ix = p.getIndices(); tris += (ix ? ix.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  if (tris > c.tris) await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: c.tris / tris, error: c.tree ? .05 : .02 }));
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) for (const a of ['TANGENT', 'TEXCOORD_1', 'COLOR_0']) p.setAttribute(a, null);
  await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [c.tex, c.tex], quality: 80 }), reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const file = `${OUT}/${c.id}.glb`; await io.write(file, doc);
  let t2 = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const ix = p.getIndices(); t2 += (ix ? ix.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  const ti = c.tree ? Object.values(tinfo).find(v => c.src.includes(v.uid?.slice(0, 10))) : null;
  catalog.push({ id: c.id, dims: dims.map(v => +v.toFixed(3)), tris: Math.round(t2), tree: !!c.tree, author: c.author || ti?.user || '', title: ti?.name || '', url: ti?.url || '', license: c.license || 'CC-BY 4.0', source: c.tree ? 'Sketchfab/Objaverse' : 'Poly Haven' });
  console.log(c.id, dims.map(v => v.toFixed(2)).join('×'), Math.round(tris), '→', Math.round(t2), (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
}
fs.writeFileSync(`${OUT}/catalog.json`, JSON.stringify(catalog, null, 1));
