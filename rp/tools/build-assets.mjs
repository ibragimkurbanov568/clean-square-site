// Сборка ресурсов: сырые CC0-файлы (см. assets/LICENSES.md) → оптимизированные в public/assets.
// Запуск: RAW=/путь/к/raw node tools/build-assets.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const RAW = process.env.RAW || 'assets/raw';
const OUT = 'public/assets';
fs.mkdirSync(`${OUT}/tex`, { recursive: true }); fs.mkdirSync(`${OUT}/chars`, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// текстуры: цвет/нормаль/шероховатость → webp
const TEX = { asphalt: ['Asphalt026C', 1024], concrete: ['Concrete034', 512], paving: ['PavingStones070', 512], grass: ['Grass004', 512], bricks: ['Bricks076C', 512], plaster: ['Plaster001', 512], ground: ['Ground054', 512], tiles: ['Tiles093', 512] };
for (const [name, [id, size]] of Object.entries(TEX)) {
  for (const [suf, key] of [['Color', 'c'], ['NormalGL', 'n'], ['Roughness', 'r']]) {
    const src = path.join(RAW, 'tex', id, `${id}_1K-JPG_${suf}.jpg`); if (!fs.existsSync(src)) continue;
    await sharp(src).resize(size, size).webp({ quality: key === 'n' ? 90 : 80 }).toFile(`${OUT}/tex/${name}_${key}.webp`);
  }
}

// уменьшает все текстуры документа до max px и перекодирует в webp
async function shrinkTextures(doc, max) {
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage(); if (!img) continue;
    const buf = await sharp(Buffer.from(img)).resize(max, max, { fit: 'inside' }).webp({ quality: 82 }).toBuffer();
    t.setImage(new Uint8Array(buf)).setMimeType('image/webp'); if (t.getURI()) t.setURI(t.getURI().replace(/\.\w+$/, '.webp'));
  }
  doc.createExtension(ALL_EXTENSIONS.find(e => e.EXTENSION_NAME === 'EXT_texture_webp')).setRequired(true);
}
// в исходниках часть ссылок на картинки указывает на «*_png.png», которых нет: подставляем файл без суффикса
function fixUris(file) {
  const dir = path.dirname(file), j = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const im of j.images || []) if (im.uri && !fs.existsSync(path.join(dir, im.uri))) {
    const alt = im.uri.replace('_png.png', '.png'); if (fs.existsSync(path.join(dir, alt))) fs.copyFileSync(path.join(dir, alt), path.join(dir, im.uri));
  }
  return file;
}
async function writeGlb(doc, file) { await doc.transform(dedup(), prune()); await io.write(file, doc); console.log(file, (fs.statSync(file).size / 1024).toFixed(0) + ' KB'); }

// персонажи: базовые тела (без встроенной причёски) + причёски, привязанные к кости головы
const UBC = path.join(RAW, 'ubc', 'Universal Base Characters[Standard]');
for (const [src, out] of [['Superhero_Male_FullBody', 'male'], ['Superhero_Female_FullBody', 'female']]) {
  const doc = await io.read(fixUris(path.join(UBC, 'Base Characters', 'Godot - UE', src + '.gltf')));
  doc.getRoot().listAnimations().forEach(a => a.dispose());
  await shrinkTextures(doc, 1024); await writeGlb(doc, `${OUT}/chars/${out}.glb`);
}
const HAIR = path.join(UBC, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)');
for (const f of fs.readdirSync(HAIR).filter(f => f.endsWith('.gltf'))) {
  const doc = await io.read(fixUris(path.join(HAIR, f))); doc.getRoot().listAnimations().forEach(a => a.dispose());
  await shrinkTextures(doc, 512); await writeGlb(doc, `${OUT}/chars/${f.replace('.gltf', '').toLowerCase()}.glb`);
}

// анимации: только нужные клипы, без сетки манекена
const KEEP = ['Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Driving_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Interact', 'PickUp_Table', 'Fixing_Kneeling', 'Punch_Jab', 'Punch_Cross', 'Hit_Chest', 'Death01', 'Pistol_Idle_Loop', 'Pistol_Aim_Neutral', 'Pistol_Shoot', 'Pistol_Reload', 'Swim_Fwd_Loop', 'Swim_Idle_Loop', 'Dance_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Roll', 'Push_Loop'];
{
  const doc = await io.read(path.join(RAW, 'ual', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb'));
  const root = doc.getRoot();
  root.listAnimations().forEach(a => { if (!KEEP.includes(a.getName())) a.dispose(); });
  root.listNodes().forEach(n => { if (n.getMesh()) { n.getSkin() && n.setSkin(null); n.setMesh(null); } });
  root.listMeshes().forEach(m => m.dispose()); root.listSkins().forEach(s => s.dispose());
  root.listMaterials().forEach(m => m.dispose()); root.listTextures().forEach(t => t.dispose());
  await doc.transform(resample());
  await writeGlb(doc, `${OUT}/chars/anims.glb`);
}
