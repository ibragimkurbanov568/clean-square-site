// Рендер: WebGL, камера, небо со сменой суток, солнце/луна, туман, постобработка (свечение)
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { clamp, lerp, smooth } from '../core/util';

export type Quality = 'low' | 'mid' | 'high';
export const R = {
  renderer: null as unknown as THREE.WebGLRenderer, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(60, 1, .1, 2600),
  sun: new THREE.DirectionalLight(0xffffff, 3), hemi: new THREE.HemisphereLight(0xbfd8ff, 0x3a3a30, 1), sky: null as unknown as Sky,
  composer: null as EffectComposer | null, bloom: null as UnrealBloomPass | null, quality: 'high' as Quality,
  // общие униформы для шейдеров города
  U: { uNight: { value: 0 }, uTime: { value: 0 }, uWet: { value: 0 }, uSkyCol: { value: new THREE.Color() }, uSnow: { value: 0 } },
  night: 0, stars: null as THREE.Points | null, moon: null as THREE.Mesh | null, clouds: null as THREE.Mesh | null,
};

export function detectQuality(): Quality {
  const coarse = matchMedia('(pointer:coarse)').matches, mem = (navigator as any).deviceMemory || 8;
  return coarse ? (mem <= 3 ? 'low' : 'mid') : 'high';
}
export function initRender(canvas: HTMLCanvasElement, q: Quality) {
  R.quality = q;
  const r = R.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'high', powerPreference: 'high-performance', stencil: false });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1;
  r.shadowMap.enabled = q !== 'low'; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = R.scene; sc.fog = new THREE.Fog(0xbfd0e0, 120, q === 'low' ? 520 : q === 'mid' ? 750 : 1100);
  R.cam.far = q === 'low' ? 700 : 1400;
  // небо Preetham из примеров three.js
  const sky = R.sky = new Sky(); sky.scale.setScalar(2400); sc.add(sky);
  const su = sky.material.uniforms; su.turbidity.value = 6; su.rayleigh.value = 1.6; su.mieCoefficient.value = .004; su.mieDirectionalG.value = .8;
  const sun = R.sun; sun.castShadow = q !== 'low'; const ss = q === 'high' ? 2048 : 1024; sun.shadow.mapSize.set(ss, ss);
  const sh = sun.shadow.camera; sh.left = -70; sh.right = 70; sh.top = 70; sh.bottom = -70; sh.near = 1; sh.far = 400; sun.shadow.bias = -.0005; sun.shadow.normalBias = .04;
  sc.add(sun, sun.target, R.hemi);
  // звёзды и луна
  const sp: number[] = []; for (let i = 0; i < 1500; i++) { const a = Math.random() * Math.PI * 2, e = Math.acos(Math.random() * .95); sp.push(Math.cos(a) * Math.sin(e) * 2000, Math.cos(e) * 2000, Math.sin(a) * Math.sin(e) * 2000); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  R.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); sc.add(R.stars);
  R.moon = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 12), new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false, transparent: true })); sc.add(R.moon);
  if (q !== 'low') {
    const comp = R.composer = new EffectComposer(r); comp.addPass(new RenderPass(sc, R.cam));
    R.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .5, .92); comp.addPass(R.bloom); comp.addPass(new OutputPass());
  }
  resize(); addEventListener('resize', resize);
}
export function resize() {
  const q = R.quality, pr = Math.min(devicePixelRatio, q === 'high' ? 1.75 : q === 'mid' ? 1.25 : .9);
  R.renderer.setPixelRatio(pr); R.renderer.setSize(innerWidth, innerHeight, false);
  R.cam.aspect = innerWidth / innerHeight; R.cam.updateProjectionMatrix();
  if (R.composer) { R.composer.setPixelRatio(pr); R.composer.setSize(innerWidth, innerHeight); R.bloom!.resolution.set(innerWidth / 2, innerHeight / 2); }
}
// время суток: 0..24; погода: облачность 0..1, дождь 0..1
const sunCol = new THREE.Color(), tmp = new THREE.Color(), fogDay = new THREE.Color(0xa9bdd2), fogSet = new THREE.Color(0xd8a080), fogNight = new THREE.Color(0x0b1220), fogRain = new THREE.Color(0x7d8894);
export function updateSky(hour: number, cloud: number, rain: number, focus: THREE.Vector3) {
  const a = (hour - 6) / 24 * Math.PI * 2, elev = Math.sin(a), azi = Math.cos(a);
  const sunDir = new THREE.Vector3(azi * .8, elev, .45).normalize();
  const day = smooth(-.12, .18, elev), sunset = smooth(.35, 0, Math.abs(elev)) * smooth(-.2, .05, elev);
  R.night = 1 - day; R.U.uNight.value = smooth(.15, -.08, elev);
  const su = R.sky.material.uniforms; su.sunPosition.value.copy(sunDir.clone().multiplyScalar(1000)); su.rayleigh.value = lerp(1.6, 3, sunset) * (1 - cloud * .5); su.turbidity.value = 4 + cloud * 12;
  // солнце днём, луна ночью (свет от луны слабый и холодный)
  const moonDir = sunDir.clone().negate(); const useMoon = elev < -.05;
  const ld = useMoon ? moonDir : sunDir;
  R.sun.position.copy(focus).addScaledVector(ld, 220); R.sun.target.position.copy(focus);
  sunCol.setRGB(1, lerp(.95, .62, sunset), lerp(.9, .45, sunset)); if (useMoon) sunCol.setRGB(.55, .65, .9);
  R.sun.color.copy(sunCol); R.sun.intensity = useMoon ? .22 * (1 - cloud * .7) : clamp(elev * 5, 0, 1) * lerp(3.2, 1.1, cloud) ;
  R.hemi.intensity = lerp(.18, .95, day) * lerp(1, .8, rain);
  R.hemi.color.setRGB(lerp(.3, .75, day), lerp(.38, .85, day), lerp(.6, 1, day));
  R.hemi.groundColor.setRGB(lerp(.05, .32, day), lerp(.05, .3, day), lerp(.07, .26, day));
  const f = R.scene.fog as THREE.Fog; tmp.copy(fogDay).lerp(fogSet, sunset * .8).lerp(fogNight, 1 - day).lerp(fogRain, rain * day * .8); f.color.copy(tmp);
  f.near = lerp(220, 30, rain); f.far = lerp(R.quality === 'low' ? 520 : R.quality === 'mid' ? 750 : 1100, 320, rain);
  R.scene.background = null; R.sky.visible = true;
  R.U.uSkyCol.value.copy(tmp);
  (R.stars!.material as THREE.PointsMaterial).opacity = (1 - day) * (1 - cloud) * .9; R.stars!.position.copy(focus);
  R.moon!.position.copy(focus).addScaledVector(moonDir, 1800); (R.moon!.material as THREE.MeshBasicMaterial).opacity = (1 - day) * (1 - cloud * .8);
  R.renderer.toneMappingExposure = lerp(1.05, .82, day) * lerp(1, .9, rain);
  // ночью сильнее свечение окон и фонарей
  if (R.bloom) { R.bloom.strength = lerp(.2, .45, 1 - day); R.bloom.threshold = lerp(.95, .82, 1 - day); }
  envTimer -= 1; if (envTimer <= 0) { envTimer = 600; updateEnv(); }
}
// отражения: окружение из текущего неба (обновляется раз в ~10 с)
let envTimer = 0, pmrem: THREE.PMREMGenerator | null = null, envRT: THREE.WebGLRenderTarget | null = null;
const envScene = new THREE.Scene();
function updateEnv() {
  if (R.quality === 'low') return; pmrem = pmrem || new THREE.PMREMGenerator(R.renderer);
  if (!envScene.children.length) { const s = new Sky(); s.scale.setScalar(1000); s.material = R.sky.material; envScene.add(s); const gnd = new THREE.Mesh(new THREE.CircleGeometry(900, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a2c2e })); gnd.position.y = -20; envScene.add(gnd); }
  (envScene.children[1] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.color.setScalar(.05 + .15 * (1 - R.night));
  const old = envRT; envRT = pmrem.fromScene(envScene, 0, 1, 2000); R.scene.environment = envRT.texture; R.scene.environmentIntensity = .12 + .3 * (1 - R.night); old?.dispose();
}
export function render() { if (R.composer) R.composer.render(); else R.renderer.render(R.scene, R.cam); }
