// Маркеры: светящиеся кольца-столбы у дверей и целей заданий, стрелка над целью
import * as THREE from 'three';
import { R } from './render';

export interface Marker { id: string; obj: THREE.Group; x: number; z: number; r: number; color: number; label: string; icon: string; kind: string; data?: any }
const beamTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); })();
export const Markers = {
  list: [] as Marker[],
  add(id: string, x: number, z: number, color: number, label: string, icon = '●', kind = 'poi', r = 1.6, data?: any) {
    this.remove(id);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .07, 6, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color, toneMapped: false })); ring.position.y = .08; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3.2, 24, 1, true), new THREE.MeshBasicMaterial({ color, map: beamTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
    beam.position.y = 1.6; g.add(beam);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.35, .7, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color, toneMapped: false })); arrow.position.y = 3.6; g.add(arrow);
    R.scene.add(g); const m: Marker = { id, obj: g, x, z, r, color, label, icon, kind, data }; this.list.push(m); return m;
  },
  remove(id: string) { const i = this.list.findIndex(m => m.id === id); if (i >= 0) { this.list[i].obj.removeFromParent(); this.list.splice(i, 1); } },
  get(id: string) { return this.list.find(m => m.id === id); },
  update(t: number, cam: THREE.Vector3) {
    for (const m of this.list) { const a = m.obj.children[2]; a.position.y = 3.6 + Math.sin(t * 3) * .25; a.rotation.y = t * 2; const d = m.obj.position.distanceTo(cam); m.obj.visible = d < 350; m.obj.scale.setScalar(m.kind === 'job' ? 1 + Math.min(2, d / 120) * .0 : 1); }
  },
  inside(x: number, z: number) { return this.list.filter(m => Math.hypot(m.x - x, m.z - z) < m.r + .4); },
};
