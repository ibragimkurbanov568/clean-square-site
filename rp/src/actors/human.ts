// Люди: базовые модели Quaternius (CC0) + причёски + одежда шейдером по зонам костей + анимации из библиотеки
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { pick } from '../core/util';

const BASE = import.meta.env.BASE_URL + 'assets/chars/';
const loader = new GLTFLoader();
export const HUM = { male: null as GLTF | null, female: null as GLTF | null, hair: {} as Record<string, GLTF>, clips: {} as Record<string, THREE.AnimationClip>, height: 1.8 };
export const HAIRS = { male: ['hair_buzzed', 'hair_simpleparted', 'hair_beard', ''], female: ['hair_long', 'hair_buns', 'hair_buzzedfemale'] };
export async function loadHumans(onProgress: (k: number) => void) {
  const files = ['male', 'female', 'anims', 'eyebrows_regular', 'eyebrows_female', 'hair_buzzed', 'hair_simpleparted', 'hair_beard', 'hair_long', 'hair_buns', 'hair_buzzedfemale'];
  let done = 0; const res: Record<string, GLTF> = {};
  await Promise.all(files.map(f => loader.loadAsync(BASE + f + '.glb').then(g => { res[f] = g; onProgress(++done / files.length); })));
  HUM.male = res.male; HUM.female = res.female;
  for (const f of files.slice(3)) HUM.hair[f] = res[f];
  for (const c of res.anims.animations) HUM.clips[c.name] = c;
  // убираем из клипов смещение корня по горизонтали (ходим сами)
  for (const c of Object.values(HUM.clips)) for (const t of c.tracks) if (t.name.startsWith('root.position')) { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = 0; v[i + 2] = 0; } }
  const box = new THREE.Box3().setFromObject(res.male.scene); HUM.height = box.max.y - box.min.y;
}

export interface Look { sex: 'male' | 'female'; hair: string; hairCol: number; skin: number; top: number; bottom: number; shoes: number; sleeves: boolean; brows?: boolean }
export const TOPS = [0x2b4a7a, 0x7a2b2b, 0x3a3a3a, 0xd8d8d0, 0x4f6b3a, 0x8a6a3a, 0x1c1c1f, 0x6b3a7a, 0xc27c2a, 0x2a6b6b, 0x9a9aa0, 0x55402e];
export const BOTTOMS = [0x1f2a44, 0x2a2a2d, 0x4a4a50, 0x3a3226, 0x5a5a3a, 0x16233a, 0x6a6a70];
export const SHOES = [0x1a1a1a, 0x3a2a1a, 0xd8d8d8, 0x2a3a5a, 0x5a1a1a];
export const HAIRCOLS = [0x1a1410, 0x3a2616, 0x6a4a2a, 0xb08a52, 0x8a3a1a, 0x9a9a9a, 0xd8c08a];
export function randomLook(r = Math.random): Look {
  const sex = r() < .5 ? 'male' : 'female';
  return { sex, hair: pick(HAIRS[sex], r), hairCol: pick(HAIRCOLS, r), skin: r(), top: pick(TOPS, r), bottom: pick(BOTTOMS, r), shoes: pick(SHOES, r), sleeves: r() < .6, brows: true };
}

// маски одежды по доминирующей кости вершины: верх, рукав (предплечье), низ, обувь
function clothMask(mesh: THREE.SkinnedMesh) {
  const g = mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = mesh.skeleton.bones, n = si.count, a = new Float32Array(n * 4);
  const zone = (name: string) => /head|neck/i.test(name) ? -1 : /hand|thumb|index|middle|ring|pinky/i.test(name) ? -1 : /lowerarm/i.test(name) ? 1 : /upperarm|clavicle|spine/i.test(name) ? 0 : /pelvis|thigh|calf/i.test(name) ? 2 : /foot|ball/i.test(name) ? 3 : 2;
  for (let i = 0; i < n; i++) {
    let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    const z = zone(bones[best]?.name || ''); if (z >= 0) a[i * 4 + z] = 1;
  }
  g.setAttribute('aCloth', new THREE.BufferAttribute(a, 4));
}
const SKIN_TONES = [new THREE.Color(1, .92, .85), new THREE.Color(.92, .78, .66), new THREE.Color(.75, .58, .45), new THREE.Color(.5, .36, .27)];
function clothedMaterial(src: THREE.MeshStandardMaterial, look: Look) {
  const m = src.clone(); const u = { cTop: { value: new THREE.Color(look.top) }, cBot: { value: new THREE.Color(look.bottom) }, cShoe: { value: new THREE.Color(look.shoes) }, uSleeve: { value: look.sleeves ? 1 : 0 }, cSkin: { value: new THREE.Color() } };
  const k = look.skin * 3, i0 = Math.floor(k), f = k - i0; u.cSkin.value.copy(SKIN_TONES[i0]).lerp(SKIN_TONES[Math.min(3, i0 + 1)], f);
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute vec4 aCloth; varying vec4 vCloth;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloth = aCloth;');
    sh.fragmentShader = 'varying vec4 vCloth; uniform vec3 cTop, cBot, cShoe, cSkin; uniform float uSleeve;\nfloat clothK;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec4 cw = vec4(step(.5, vCloth.x), step(.5, vCloth.y)*uSleeve, step(.5, vCloth.z), step(.5, vCloth.w));
        clothK = clamp(cw.x + cw.y + cw.z + cw.w, 0., 1.);
        vec3 cc = cTop*(cw.x + cw.y) + cBot*cw.z + cShoe*cw.w;
        #ifdef USE_MAP
        float fab = .86 + .07*sin(vMapUv.x*1400.)*sin(vMapUv.y*1400.) + .07*sin(vMapUv.y*300.);
        #else
        float fab = 1.;
        #endif
        diffuseColor.rgb = mix(diffuseColor.rgb * cSkin * 1.08, cc * fab, clothK);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .92, clothK);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, clothK));');
  };
  return m;
}

export interface Human { root: THREE.Group; model: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>; cur: string; look: Look }
export function createHuman(look: Look): Human {
  const src = look.sex === 'male' ? HUM.male! : HUM.female!, model = skClone(src.scene), root = new THREE.Group(); root.add(model);
  let skel: THREE.Skeleton | null = null, bonesByName: Record<string, THREE.Bone> = {};
  model.traverse(o => {
    const m = o as THREE.SkinnedMesh; if (o instanceof THREE.Bone) bonesByName[o.name] = o;
    if (m.isSkinnedMesh) {
      m.castShadow = true; m.frustumCulled = false; skel = m.skeleton;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (/Superhero/i.test(mat.name)) { if (!m.geometry.attributes.aCloth) clothMask(m); m.material = clothedMaterial(mat, look); }
      else if (/Hair/i.test(mat.name)) m.visible = false; // встроенная причёска базовой модели скрыта, ставим свою
    }
  });
  // причёска и брови привязаны к кости головы — перепривязываем к скелету персонажа
  const attach = (name: string, color?: number) => {
    const g = HUM.hair[name]; if (!g || !skel) return; const h = skClone(g.scene);
    h.traverse(o => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh) {
      const bones = m.skeleton.bones.map(b => bonesByName[b.name] || b); m.bind(new THREE.Skeleton(bones, m.skeleton.boneInverses), m.bindMatrix);
      m.frustumCulled = false; m.castShadow = true; if (color !== undefined) { const mm = (m.material as THREE.MeshStandardMaterial).clone(); mm.color.setHex(color); m.material = mm; }
    } });
    model.add(h);
  };
  if (look.hair) attach(look.hair, look.hairCol);
  if (look.brows !== false) attach(look.sex === 'male' ? 'eyebrows_regular' : 'eyebrows_female', look.hairCol);
  const mixer = new THREE.AnimationMixer(model), actions: Record<string, THREE.AnimationAction> = {};
  for (const [n, c] of Object.entries(HUM.clips)) { const a = mixer.clipAction(c); if (!/Loop/.test(n)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } actions[n] = a; }
  const h: Human = { root, model, mixer, actions, cur: '', look };
  play(h, 'Idle_Loop', 0);
  return h;
}
export function play(h: Human, name: string, fade = .2, speed = 1) {
  const a = h.actions[name]; if (!a) return; a.timeScale = speed; if (h.cur === name) return;
  const prev = h.actions[h.cur]; a.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (prev) prev.fadeOut(fade); h.cur = name;
}
export function disposeHuman(h: Human) { h.mixer.stopAllAction(); h.root.removeFromParent(); h.root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).onBeforeCompile) (m.material as THREE.Material).dispose(); }); }
