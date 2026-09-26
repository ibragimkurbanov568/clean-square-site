// Материалы города: земля (дороги, разметка, тротуары, дворы — одним шейдером), фасады с процедурными окнами
import * as THREE from 'three';
import { R } from './render';
import { CITY, HALF, PITCH } from './citygen';

const loader = new THREE.TextureLoader();
const BASE = import.meta.env.BASE_URL + 'assets/tex/';
export const TEX: Record<string, THREE.Texture> = {};
export async function loadTextures(onProgress: (k: number) => void) {
  const names = ['asphalt_c', 'asphalt_n', 'asphalt_r', 'paving_c', 'paving_n', 'grass_c', 'grass_n', 'tiles_c', 'concrete_c', 'concrete_n', 'ground_c', 'bricks_c', 'plaster_c'];
  let done = 0;
  await Promise.all(names.map(n => new Promise<void>(res => loader.load(BASE + n + '.webp', t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = R.quality === 'high' ? 8 : 4; if (n.endsWith('_c')) t.colorSpace = THREE.SRGBColorSpace;
    TEX[n] = t; done++; onProgress(done / names.length); res();
  }, undefined, () => { TEX[n] = new THREE.Texture(); done++; res(); }))));
}

// карта районов 13×13 → текстура для шейдера земли
export function districtTexture(codes: number[][]) {
  const N = CITY.N, d = new Uint8Array(N * N * 4);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) d[(j * N + i) * 4] = codes[i][j] * 20;
  const t = new THREE.DataTexture(d, N, N); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}

const GROUND_HEAD = /* glsl */`
varying vec3 vWp;
uniform sampler2D tAC, tAN, tAR, tPC, tPN, tGC, tGN, tTC, tCC, tCN, tDC, tDist;
uniform float uHalf, uPitch, uRoad, uN, uNight, uWet, uTime, uSnow;
vec3 gN; float gRough;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
`;
const GROUND_FRAG = /* glsl */`
vec2 wp = vWp.xz; float P = uPitch, hr = uRoad*.5;
vec2 l = mod(wp + uHalf, P), dd = min(l, P - l);
float lim = uHalf + hr;
bool inC = abs(wp.x) < lim + 4. && abs(wp.y) < lim + 4.;
// дороги сетки + трассы: на восток по центральной поперечной улице и на юг по центральной продольной
float cLine = -uHalf + floor(uN*.5)*P;
bool rx = (dd.x < hr && abs(wp.x) < lim && abs(wp.y) < lim) || (abs(wp.x - cLine) < hr && wp.y < 0.);
bool rz = (dd.y < hr && abs(wp.y) < lim && abs(wp.x) < lim) || (abs(wp.y - cLine) < hr && wp.x > 0.);
bool road = rx || rz;
bool walk = !road && inC && (dd.x < hr + 4. || dd.y < hr + 4.);
vec3 col; vec3 tn = vec3(.5,.5,1.); gRough = .9;
float big = vnoise(wp*.05)*.5 + vnoise(wp*.013)*.5;
if (road) {
  vec2 uv = wp*.22; col = texture2D(tAC, uv).rgb * (.82 + .3*big); tn = texture2D(tAN, uv).rgb; gRough = texture2D(tAR, uv).r;
  float wear = .55 + .45*vnoise(wp*.7);
  float m = 0.;
  if (!(rx && rz)) {
    bool vert = rx; float ox = vert ? (l.x < P*.5 ? l.x : l.x - P) : (l.y < P*.5 ? l.y : l.y - P);
    if (vert && abs(wp.x - cLine) < hr && abs(wp.y) > lim) ox = wp.x - cLine;
    if (!vert && abs(wp.y - cLine) < hr && abs(wp.x) > lim) ox = wp.y - cLine;
    float along = vert ? wp.y : wp.x, toX = vert ? dd.y : dd.x, ax = abs(ox);
    m += step(abs(ax - .16), .07);                                    // двойная сплошная
    m += step(abs(ax - 3.5), .07) * step(fract(along/9.), .45);         // прерывистая между полосами
    m += step(abs(ax - 6.55), .09);                                   // край
    if (toX > hr + .8 && toX < hr + 4.4 && ax < 6.3) m += step(fract((ox + 20.)/1.1), .55);   // зебра
    float lineC = (vert ? floor((wp.y + uHalf)/P + .5) : floor((wp.x + uHalf)/P + .5))*P - uHalf, before = sign(lineC - along);
    if (toX > hr + 4.9 && toX < hr + 5.35 && ox*before*(vert ? -1. : 1.) > 0. && ax < 6.5) m += 1.;   // стоп-линия
  }
  col = mix(col, vec3(.86,.86,.82), clamp(m,0.,1.)*wear); gRough = mix(gRough, .6, clamp(m,0.,1.));
} else if (walk) {
  float toR = min(dd.x < hr + 4. ? dd.x : 99., dd.y < hr + 4. ? dd.y : 99.);
  vec2 uv = wp*.35; col = texture2D(tPC, uv).rgb * vec3(.95,.93,.9) * (.85 + .25*big); tn = texture2D(tPN, uv).rgb; gRough = .85;
  if (toR < hr + .35) { col = vec3(.62,.62,.6) * (.8+.2*big); tn = vec3(.5,.5,1.); }  // бордюр
} else if (inC && abs(wp.x) < lim && abs(wp.y) < lim) {
  vec2 bi = floor((wp + uHalf)/P); float code = floor(texture2D(tDist, (bi + .5)/uN).r*255./20. + .5);
  float toR = min(dd.x, dd.y);
  if (code == 1. || code == 6.) { vec2 uv = wp*.3; col = texture2D(tTC, uv).rgb*.9; gRough = .7; }
  else if (code == 2.) { vec2 uv = wp*.12; col = texture2D(tCC, uv).rgb*(.75+.3*big); tn = texture2D(tCN, uv).rgb; }
  else if (code == 5. || toR < hr + 9.) { vec2 uv = wp*.22; col = texture2D(tAC, uv).rgb*(.85+.25*big); tn = texture2D(tAN, uv).rgb; }
  else { vec2 uv = wp*.25; col = mix(texture2D(tGC, uv).rgb*vec3(.9,1.,.85), texture2D(tDC, wp*.2).rgb, smoothstep(.55,.8, vnoise(wp*.08))*(code == 4. ? .6 : .45)); tn = texture2D(tGN, uv).rgb; gRough = .95; }
} else {
  vec2 uv = wp*.2; col = mix(texture2D(tGC, uv).rgb*vec3(.95,1.,.85), texture2D(tDC, wp*.15).rgb, smoothstep(.5,.85, vnoise(wp*.02)*.7 + big*.3)*.6); tn = texture2D(tGN, uv).rgb; gRough = .95;
}
// мокрый асфальт: темнее, глаже, лужи
float puddle = smoothstep(.62, .7, vnoise(wp*.09)) * (road || walk ? 1. : .3);
float wet = uWet * (road || walk ? 1. : .5);
col *= 1. - .38*wet; gRough = mix(gRough, .08, wet*(.55 + .45*puddle)); tn = mix(tn, vec3(.5,.5,1.), wet*puddle);
col = mix(col, vec3(.92,.94,.97), uSnow * (road ? .45 : .95));
diffuseColor.rgb *= col;
vec3 n3 = tn*2. - 1.; gN = normalize(vec3(n3.x, n3.z, n3.y));
`;
export function groundMaterial(dist: THREE.Texture) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, R.U, {
      tAC: { value: TEX.asphalt_c }, tAN: { value: TEX.asphalt_n }, tAR: { value: TEX.asphalt_r }, tPC: { value: TEX.paving_c }, tPN: { value: TEX.paving_n },
      tGC: { value: TEX.grass_c }, tGN: { value: TEX.grass_n }, tTC: { value: TEX.tiles_c }, tCC: { value: TEX.concrete_c }, tCN: { value: TEX.concrete_n }, tDC: { value: TEX.ground_c }, tDist: { value: dist },
      uHalf: { value: HALF }, uPitch: { value: PITCH }, uRoad: { value: CITY.ROAD }, uN: { value: CITY.N },
    });
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GROUND_HEAD)
      .replace('#include <map_fragment>', GROUND_FRAG)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gN, 0.)).xyz);');
  };
  return m;
}

// Фасады. Атрибуты: color — цвет стены, aB = (высота этажа, стиль, зерно, флаги), aC = (высота здания, ширина грани, шаг окон)
// стили: 0 панель, 1 хрущёвка, 2 сталинка, 3 офис, 4 дом, 5 склад, 6 гараж, 9 глухая стена/детали
const FAC_HEAD = /* glsl */`
varying vec4 vB; varying vec3 vC; varying vec2 vU;
uniform sampler2D tCC, tBC, tPlC; uniform float uNight, uTime, uWet, uSnow;
vec3 fEm; float fRough; float fMetal;
float fh1(float n){ return fract(sin(n)*43758.5453); }
`;
const FAC_FRAG = /* glsl */`
float fh = vB.x, st = floor(vB.y + .5), seed = vB.z, fl = vB.w;
bool shop = mod(fl, 2.) > .5, roof = mod(floor(fl/2.), 2.) > .5, plain = mod(floor(fl/4.), 2.) > .5, front = mod(floor(fl/8.), 2.) > .5;
float H = vC.x, mw = vC.z; vec2 uv = vU;
vec3 wall = diffuseColor.rgb; fEm = vec3(0.); fRough = .92; fMetal = 0.;
vec3 tex = texture2D(tCC, uv*.18).rgb;
if (st == 1. && fh1(seed) > .5) tex = texture2D(tBC, uv*vec2(.5,.9)).rgb * 1.6;
if (st == 2. || st == 4.) tex = texture2D(tPlC, uv*.25).rgb;
vec3 col = wall * (tex*1.25);
if (roof) { col = vec3(.24,.24,.25) * mix(vec3(1.), tex*1.2, .4); fRough = .95; }
else if (!plain) {
  float fi = floor(uv.y/fh), fv = fract(uv.y/fh), ci = floor(uv.x/mw), cu = fract(uv.x/mw);
  vec4 win = st == 0. ? vec4(.2,.8,.3,.82) : st == 1. ? vec4(.25,.75,.3,.8) : st == 2. ? vec4(.28,.72,.18,.82) : st == 3. ? vec4(.04,.96,.08,.94) : st == 4. ? vec4(.33,.67,.35,.78) : st == 5. ? vec4(.1,.9,.72,.9) : vec4(0.);
  bool top = uv.y > H - .9;
  bool inWin = cu > win.x && cu < win.y && fv > win.z && fv < win.w && !top && uv.x > .6 && uv.y > .5;
  if (st == 5.) inWin = inWin && fi == floor((H-1.)/fh);
  if (st == 6.) inWin = false;
  // первый этаж: витрины магазинов, двери подъездов
  bool ground = fi < 1.;
  if (ground && (st == 0. || st == 1.) && front && mod(ci + seed, 4.) == 1. && !shop) { if (cu > .25 && cu < .75 && fv < .72) { col = vec3(.25,.16,.1); inWin = false; } }
  if (ground && shop && front) {
    inWin = cu > .06 && cu < .94 && fv > .08 && fv < .78;
    if (fv > .82 && fv < .97) { vec3 sc = vec3(fh1(seed*3.1+floor(ci/4.)), fh1(seed*7.7+floor(ci/4.)), .6); col = mix(col, sc*.9 + .1, .9); fEm += sc * (.2 + uNight*.8); }
  }
  // швы панелей
  if (st == 0. || st == 1.) { float s1 = step(fract(uv.x/(mw*(st == 0. ? 1. : 2.))), .012) + step(fract(uv.y/fh), .015); col *= 1. - .25*clamp(s1, 0., 1.); }
  if (st == 2. && (fract(uv.y/fh) < .05 || top)) col *= 1.12;
  if (st == 5.) col *= .9 + .1*step(fract(uv.x/.3), .5);
  if (inWin) {
    float id = ci*17.31 + fi*131.7 + seed*7.13;
    float lit = step(fh1(id), mix(.0, .33, uNight));
    float frame = step(abs(cu - (win.x+win.y)*.5), .012) + step(fv, win.z + .025) + step(win.w - .02, fv);
    vec3 glass = st == 3. ? vec3(.10,.14,.18) : vec3(.07,.08,.1);
    col = mix(glass, vec3(.85,.85,.8), clamp(frame, 0., 1.)*(st == 3. ? .3 : 1.));
    fRough = frame > .5 ? .6 : .06; fMetal = frame > .5 ? 0. : .7;
    if (lit > .5 && frame < .5) {
      float k = fh1(id*1.7); vec3 lc = k < .55 ? vec3(1.,.72,.42) : k < .85 ? vec3(1.,.9,.72) : vec3(.55,.7,1.)*(.7+.3*sin(uTime*9. + id));
      if (shop && ground) lc = vec3(1.,.95,.85);
      fEm += lc * (.45 + fh1(id*3.3)*.5); col = lc*.25;
    }
  }
}
col = mix(col, vec3(.93,.95,.98), uSnow * (roof ? 1. : 0.));
col *= 1. - .25*uWet*(roof ? 0. : 1.);
diffuseColor.rgb = col;
`;
export function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, R.U, { tCC: { value: TEX.concrete_c }, tBC: { value: TEX.bricks_c }, tPlC: { value: TEX.plaster_c } });
    sh.vertexShader = 'attribute vec4 aB; attribute vec3 aC; varying vec4 vB; varying vec3 vC; varying vec2 vU;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvB = aB; vC = aC; vU = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FAC_HEAD)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FAC_FRAG)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = fRough;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = fMetal;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += fEm;');
  };
  return m;
}
// ветер для деревьев
export function windMaterial(base: THREE.MeshStandardMaterial) {
  base.onBeforeCompile = sh => {
    sh.uniforms.uTime = R.U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec3 ip = vec3(instanceMatrix[3][0], 0., instanceMatrix[3][2]);
      #else
      vec3 ip = vec3(0.);
      #endif
      float sw = max(0., transformed.y - 1.5) * .018;
      transformed.x += sin(uTime*1.3 + ip.x*.05 + ip.z*.03) * sw; transformed.z += cos(uTime*1.1 + ip.z*.05) * sw*.7;`);
  };
  return base;
}
