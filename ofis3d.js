// AFRA Panel — Çalışanlar: 3B ofis (three.js). index.html dinamik import ile yükler.
// mount(host, api) → {update(data), setSpin(on), zoom(dir), dispose()}
// data = {workers:[{id,name,...}], states:{id:{st,last,next,prog}}, runs:[...], col:{st:hex}, lbl:{st:metin}, fmtIn(ms), fmtAgo(t), summary:{...}}
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js";

const SHIRTS = [0x2563eb, 0x0d9488, 0x7c3aed, 0xdb2777, 0xea580c, 0x0891b2, 0x4f46e5, 0x16a34a];
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac, 0x8d5524, 0xf1c27d, 0xe0ac69];
const HAIR = [0x2b1d14, 0x3b2a1a, 0x111111, 0x6b4423, 0x1f1a17, 0x4a3426, 0x0f0f0f];
const DESKS = [[-4.8, -1.6], [-1.6, -1.6], [1.6, -1.6], [4.8, -1.6], [-3.2, 2.2], [0, 2.2], [3.2, 2.2], [6.4, 2.2], [-6.4, 2.2]];

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function canvasTex(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, ctx: c.getContext("2d"), t }; }
const hex = n => "#" + n.toString(16).padStart(6, "0");
function fitText(ctx, s, max) { s = String(s || ""); if (ctx.measureText(s).width <= max) return s; while (s.length > 1 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1); return s + "…"; }

export async function mount(host, api) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const cv = renderer.domElement; cv.style.cssText = "display:block;width:100%;height:100%;outline:none";
  host.appendChild(cv);

  const scene = new THREE.Scene();
  const hour = new Date().getHours(), night = hour < 7 || hour >= 19, dusk = hour >= 17 && hour < 19;
  scene.background = new THREE.Color(night ? 0x0d1424 : 0xdfe7f1);
  scene.fog = new THREE.Fog(scene.background, 26, 44);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  // ışıklar
  scene.add(new THREE.HemisphereLight(night ? 0x9fb4ff : 0xffffff, 0xb7a58a, night ? 0.55 : 0.9));
  const sun = new THREE.DirectionalLight(night ? 0xbfd0ff : (dusk ? 0xffc48a : 0xfff4e0), night ? 0.7 : 1.6);
  sun.position.set(-9, 12, 6); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: 1, far: 40 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.PointLight(0xfff1d6, night ? 18 : 8, 22, 1.6); fill.position.set(2, 3.1, 1); scene.add(fill);

  const disposables = [];
  const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.05, ...o }); disposables.push(m); return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) => { const g = new THREE.BoxGeometry(w, h, d); disposables.push(g); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };
  const cyl = (rt, rb, h, mat, x, y, z, parent = scene, seg = 20) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); disposables.push(g); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const sph = (r, mat, x, y, z, parent = scene) => { const g = new THREE.SphereGeometry(r, 24, 16); disposables.push(g); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

  // zemin (parke)
  { const { c, ctx, t } = canvasTex(1024, 1024); ctx.fillStyle = "#c9a77c"; ctx.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 64) for (let x = (y / 64 % 2) * 128; x < 1024 + 256; x += 256) {
      const v = 180 + Math.floor(Math.random() * 30); ctx.fillStyle = `rgb(${v + 20},${v - 20},${v - 70})`; ctx.fillRect(x - 256, y + 1, 254, 62); }
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 3); disposables.push(t);
    const g = new THREE.PlaneGeometry(22, 16); disposables.push(g);
    const fl = new THREE.Mesh(g, M(0xffffff, { map: t, roughness: 0.55 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl); }
  // halı
  { const g = new THREE.PlaneGeometry(15, 7.4); disposables.push(g); const r = new THREE.Mesh(g, M(0x3b4a63, { roughness: 1 })); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.005, 0.3); r.receiveShadow = true; scene.add(r); }
  // duvarlar
  const wallM = M(night ? 0xc9d1de : 0xf3f1ec, { roughness: 0.95 });
  box(22, 3.4, 0.2, wallM, 0, 1.7, -6, scene, false); box(0.2, 3.4, 16, wallM, -11, 1.7, 0, scene, false);
  box(22, 0.12, 0.24, M(0x9aa3ad), 0, 0.06, -5.88, scene, false); box(0.24, 0.12, 16, M(0x9aa3ad), -10.88, 0.06, 0, scene, false);
  // pencereler (sol duvar)
  { const skyTop = night ? "#0b1530" : dusk ? "#f59e0b" : "#7cc4ff", skyBot = night ? "#1e293b" : dusk ? "#fde68a" : "#e0f2fe";
    const { ctx, t } = canvasTex(256, 256); const gr = ctx.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, skyTop); gr.addColorStop(1, skyBot); ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 256);
    if (night) { ctx.fillStyle = "#fff"; for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 256, Math.random() * 150, 1.5, 1.5); }
    else { ctx.fillStyle = "rgba(255,255,255,.8)"; [[60, 70, 30], [170, 50, 24], [120, 110, 18]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.arc(x + r, y + 6, r * .8, 0, 7); ctx.arc(x - r, y + 8, r * .7, 0, 7); ctx.fill(); }); }
    ctx.fillStyle = night ? "#0f172a" : "#64748b"; for (let i = 0; i < 9; i++) { const w = 18 + Math.random() * 20, h = 30 + Math.random() * 70; ctx.fillRect(i * 30, 256 - h, w, h); if (night) { ctx.fillStyle = "#fde68a"; for (let k = 0; k < 6; k++) ctx.fillRect(i * 30 + 3 + Math.random() * (w - 6), 256 - h + 5 + Math.random() * (h - 10), 3, 3); ctx.fillStyle = "#0f172a"; } }
    disposables.push(t);
    const wm = new THREE.MeshBasicMaterial({ map: t }); disposables.push(wm);
    [-4.5, 0, 4.5].forEach(z => { const g = new THREE.PlaneGeometry(3, 1.7); disposables.push(g); const p = new THREE.Mesh(g, wm); p.rotation.y = Math.PI / 2; p.position.set(-10.88, 1.85, z); scene.add(p);
      const fr = M(0xe5e7eb); box(0.08, 0.08, 3.1, fr, -10.84, 2.72, z, scene, false); box(0.08, 0.08, 3.1, fr, -10.84, 0.98, z, scene, false); box(0.08, 1.8, 0.08, fr, -10.84, 1.85, z, scene, false); box(0.08, 1.8, 0.08, fr, -10.84, 1.85, z - 1.52, scene, false); box(0.08, 1.8, 0.08, fr, -10.84, 1.85, z + 1.52, scene, false); }); }
  // duvar ekranı (pano)
  const tv = canvasTex(1024, 560); disposables.push(tv.t);
  { box(4.4, 2.5, 0.12, M(0x111827, { roughness: 0.4 }), 0, 1.95, -5.86, scene, false);
    const g = new THREE.PlaneGeometry(4.2, 2.3); disposables.push(g); const mm = new THREE.MeshBasicMaterial({ map: tv.t, toneMapped: false }); disposables.push(mm);
    const p = new THREE.Mesh(g, mm); p.position.set(0, 1.95, -5.79); scene.add(p); }
  // dolap + saksılar
  { const sh = M(0x8b5e3c); box(2.6, 1.9, 0.5, sh, -7.2, 0.95, -5.6); [0.45, 1.0, 1.55].forEach(y => box(2.5, 0.04, 0.45, M(0x6b4423), -7.2, y, -5.5, scene, false));
    const cols = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6]; for (let i = 0; i < 16; i++) box(0.08 + Math.random() * 0.06, 0.32 + Math.random() * 0.1, 0.3, M(cols[i % 5]), -8.3 + i * 0.14, 0.66 + (i > 7 ? 0.55 : 0), -5.5, scene, false);
    const pot = M(0xd6d3d1), leaf = M(0x15803d, { roughness: 0.9 }), leaf2 = M(0x22c55e, { roughness: 0.9 });
    [[-10, -5], [9.6, -5], [-10, 6.5], [8.6, 5.6]].forEach(([x, z], i) => { cyl(0.28, 0.22, 0.5, pot, x, 0.25, z); sph(0.45, i % 2 ? leaf : leaf2, x, 0.85, z); sph(0.32, leaf, x + 0.2, 1.15, z - 0.1); sph(0.28, leaf2, x - 0.18, 1.2, z + 0.12); });
    // su sebili
    cyl(0.22, 0.22, 1.0, M(0xe5e7eb), 8.4, 0.5, -5.3); cyl(0.17, 0.17, 0.45, M(0x60a5fa, { transparent: true, opacity: 0.65, roughness: 0.1 }), 8.4, 1.22, -5.3);
  }

  // masalar + çalışanlar
  const deskWood = M(0xd4b48c, { roughness: 0.6 }), metal = M(0x4b5563, { metalness: 0.5, roughness: 0.4 }), black = M(0x1f2937, { roughness: 0.5 });
  const chairM = M(0x334155), pants = M(0x1e293b), shoe = M(0x111111);
  const stations = new Map(); const pickables = [];
  function makeStation(w, i) {
    const [x, z] = DESKS[i % DESKS.length];
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    // masa
    box(1.7, 0.06, 0.85, deskWood, 0, 0.75, 0, g); [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]].forEach(([a, b]) => box(0.05, 0.72, 0.05, metal, a, 0.36, b, g));
    box(1.6, 0.35, 0.03, M(0xb89470), 0, 0.55, -0.4, g);
    // monitör
    box(0.08, 0.28, 0.06, metal, 0, 0.92, -0.25, g); box(0.3, 0.02, 0.18, metal, 0, 0.79, -0.25, g);
    box(0.78, 0.48, 0.04, black, 0, 1.18, -0.27, g);
    const scr = canvasTex(320, 200); disposables.push(scr.t);
    const sm = new THREE.MeshBasicMaterial({ map: scr.t, toneMapped: false }); disposables.push(sm);
    const sg = new THREE.PlaneGeometry(0.72, 0.42); disposables.push(sg); const screen = new THREE.Mesh(sg, sm); screen.position.set(0, 1.18, -0.248); g.add(screen);
    box(0.5, 0.02, 0.16, M(0x374151), 0, 0.79, 0.1, g); box(0.07, 0.02, 0.1, M(0x374151), 0.38, 0.79, 0.12, g);
    // kupa + durum lambası
    cyl(0.04, 0.035, 0.09, M(SHIRTS[(i + 3) % SHIRTS.length]), -0.6, 0.83, 0.05, g, 12);
    cyl(0.05, 0.07, 0.03, metal, 0.65, 0.795, -0.25, g, 12); cyl(0.012, 0.012, 0.22, metal, 0.65, 0.9, -0.25, g, 8);
    const lampM = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5 }); disposables.push(lampM);
    const lamp = sph(0.055, lampM, 0.65, 1.04, -0.25, g);
    const glowM = new THREE.SpriteMaterial({ color: 0x22c55e, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex }); disposables.push(glowM);
    const glow = new THREE.Sprite(glowM); glow.scale.set(0.6, 0.6, 1); glow.position.set(0.65, 1.04, -0.25); g.add(glow);
    // sandalye + kişi (ikisi birlikte yaslanır)
    const seat = new THREE.Group(); seat.position.set(0, 0, 0.72); g.add(seat);
    cyl(0.03, 0.03, 0.4, metal, 0, 0.22, 0, seat, 8); cyl(0.28, 0.28, 0.03, metal, 0, 0.03, 0, seat, 5);
    box(0.5, 0.07, 0.48, chairM, 0, 0.46, 0, seat); const back = box(0.48, 0.55, 0.06, chairM, 0, 0.78, 0.24, seat); back.rotation.x = -0.08;
    const shirt = M(SHIRTS[i % SHIRTS.length]), skin = M(SKINS[i % SKINS.length], { roughness: 0.6 }), hair = M(HAIR[i % HAIR.length], { roughness: 0.9 });
    const body = new THREE.Group(); body.position.set(0, 0.5, 0.02); seat.add(body);
    // bacaklar
    [-0.1, 0.1].forEach(a => { box(0.13, 0.13, 0.42, pants, a, 0.02, -0.2, body); box(0.12, 0.42, 0.12, pants, a, -0.2, -0.4, body); box(0.13, 0.07, 0.2, shoe, a, -0.44, -0.46, body); });
    const torso = new THREE.Group(); body.add(torso);
    { const cg = new THREE.CapsuleGeometry(0.17, 0.3, 6, 14); disposables.push(cg); const t = new THREE.Mesh(cg, shirt); t.position.y = 0.33; t.scale.z = 0.75; t.castShadow = true; torso.add(t); }
    const head = new THREE.Group(); head.position.set(0, 0.72, 0); torso.add(head);
    sph(0.13, skin, 0, 0.06, 0, head); cyl(0.05, 0.05, 0.08, skin, 0, -0.06, 0, head, 10);
    { const hg = new THREE.SphereGeometry(0.135, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.9); disposables.push(hg); const h = new THREE.Mesh(hg, hair); h.position.y = 0.075; h.rotation.x = 0.35; h.castShadow = true; head.add(h); }
    const arms = [];
    [-1, 1].forEach(s => { const sh = new THREE.Group(); sh.position.set(s * 0.21, 0.52, 0); torso.add(sh);
      const up = box(0.09, 0.09, 0.3, shirt, 0, -0.12, -0.08, sh); up.rotation.x = 0.9;
      const el = new THREE.Group(); el.position.set(0, -0.2, -0.2); sh.add(el);
      box(0.08, 0.08, 0.3, skin, s * -0.03, 0, -0.14, el); sph(0.045, skin, s * -0.05, 0, -0.3, el); arms.push({ sh, el, s }); });
    // isim etiketi
    const tag = canvasTex(512, 168); disposables.push(tag.t);
    const tm = new THREE.SpriteMaterial({ map: tag.t, transparent: true, depthWrite: false, toneMapped: false }); disposables.push(tm);
    const sprite = new THREE.Sprite(tm); sprite.scale.set(2.35, 0.77, 1); sprite.position.set(0, 2.5, 0); sprite.renderOrder = 10; g.add(sprite);
    // ünlem/soru işareti
    const mark = canvasTex(128, 128); disposables.push(mark.t);
    const mkm = new THREE.SpriteMaterial({ map: mark.t, transparent: true, depthWrite: false, toneMapped: false }); disposables.push(mkm);
    const mk = new THREE.Sprite(mkm); mk.scale.set(0.42, 0.42, 1); mk.position.set(0.35, 1.75, 0.7); mk.visible = false; g.add(mk);
    // çalışırken yükselen veri küpleri
    const bits = []; const bm = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, toneMapped: false }); disposables.push(bm);
    const bg = new THREE.BoxGeometry(0.05, 0.05, 0.05); disposables.push(bg);
    for (let k = 0; k < 10; k++) { const b = new THREE.Mesh(bg, bm); b.visible = false; b.userData.ph = Math.random(); b.userData.x = (Math.random() - .5) * 0.7; g.add(b); bits.push(b); }
    // seçim halkası
    const ringG = new THREE.RingGeometry(1.15, 1.25, 48); disposables.push(ringG); const ringM = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false }); disposables.push(ringM);
    const ring = new THREE.Mesh(ringG, ringM); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.012, 0.25); g.add(ring);
    g.traverse(o => { if (o.isMesh) { o.userData.wid = w.id; pickables.push(o); } }); sprite.userData.wid = w.id; pickables.push(sprite);
    const st = { w, g, seat, body, torso, head, arms, lamp, lampM, glowM, scr, tag, mk, mark, bits, ring, ringM, phase: Math.random() * 10, state: null, lastScr: 0, lastTag: 0, markKind: "" };
    stations.set(w.id, st); return st;
  }
  // parıltı dokusu
  var glowTex; { const { ctx, t } = canvasTex(64, 64); const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64); glowTex = t; disposables.push(t); }

  let data = null, hoverId = null, selId = null, spin = true, az = 0.55, pol = 0.98, rad = 12.5, azT = az, dragging = null, t0 = performance.now(), alive = true;
  const target = new THREE.Vector3(0, 0.9, 0.4);

  function drawTag(st, now) {
    const { ctx, c, t } = st.tag, s = st.state || { st: "yok" }, col = data.col[s.st] || "#64748b", hov = hoverId === st.w.id || selId === st.w.id;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = hov ? "rgba(15,23,42,.96)" : "rgba(15,23,42,.86)"; rr(ctx, 6, 6, 500, 132, 22); ctx.fill();
    ctx.lineWidth = hov ? 6 : 4; ctx.strokeStyle = col; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(236, 138); ctx.lineTo(256, 162); ctx.lineTo(276, 138); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "600 38px system-ui,Segoe UI,Arial"; ctx.fillText(fitText(ctx, st.w.name, 460), 28, 56);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(40, 96, 10, 0, 7); ctx.fill();
    ctx.font = "600 30px system-ui,Segoe UI,Arial"; ctx.fillText(data.lbl[s.st] || s.st, 60, 106);
    const w0 = ctx.measureText(data.lbl[s.st] || s.st).width;
    ctx.fillStyle = "#94a3b8"; ctx.font = "26px system-ui,Segoe UI,Arial";
    const sub = s.st === "calisiyor" ? "~%" + Math.round((s.prog || 0) * 100) : s.next ? "sıradaki " + data.fmtIn(s.next - now) : "";
    ctx.fillText(fitText(ctx, sub, 420 - w0), 80 + w0, 106);
    t.needsUpdate = true;
  }
  function drawScreen(st, now) {
    const { ctx, c, t } = st.scr, s = st.state || { st: "yok" }, col = data.col[s.st] || "#64748b";
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = col; ctx.fillRect(0, 0, c.width, 26);
    ctx.fillStyle = "#0b1220"; ctx.font = "600 16px system-ui,Arial"; ctx.fillText(fitText(ctx, st.w.name, 300), 10, 19);
    if (s.st === "calisiyor") {
      ctx.font = "13px ui-monospace,Consolas,monospace"; const off = Math.floor(now / 140);
      for (let k = 0; k < 8; k++) { const n = (off + k) * 7919 % 97; ctx.fillStyle = ["#67e8f9", "#a5b4fc", "#86efac", "#fcd34d"][n % 4]; ctx.fillRect(12 + (n % 3) * 14, 38 + k * 15, 40 + n * 2, 8); }
      ctx.fillStyle = "#1e293b"; ctx.fillRect(12, 168, 296, 14); ctx.fillStyle = col; ctx.fillRect(12, 168, 296 * (s.prog || 0), 14);
    } else {
      ctx.fillStyle = col; ctx.font = "700 30px system-ui,Arial"; ctx.fillText(data.lbl[s.st] || s.st, 14, 80);
      ctx.fillStyle = "#cbd5e1"; ctx.font = "16px system-ui,Arial";
      ctx.fillText("Son: " + (s.last ? data.fmtAgo(s.last.finished_at) : "—"), 14, 112);
      ctx.fillText("Sıradaki: " + (s.next ? data.fmtIn(s.next - now) : "—"), 14, 136);
      // küçük grafik: son 10 çalışma
      const rs = data.runs.filter(r => r.worker_id === st.w.id).slice(0, 12).reverse();
      rs.forEach((r, k) => { ctx.fillStyle = data.col[r.status] || "#64748b"; ctx.fillRect(14 + k * 24, 158, 18, 22); });
    }
    t.needsUpdate = true;
  }
  function drawMark(st, kind) {
    if (st.markKind === kind) return; st.markKind = kind; st.mk.visible = !!kind; if (!kind) return;
    const { ctx, t } = st.mark; ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = kind === "!" ? "#ef4444" : kind === "?" ? "#fb923c" : kind === "z" ? "#94a3b8" : "#22d3ee";
    ctx.beginPath(); ctx.arc(64, 64, 56, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "700 80px system-ui,Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(kind === "z" ? "z" : kind, 64, 70); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; t.needsUpdate = true;
  }
  function drawTV(now) {
    const { ctx, c, t } = tv, W = c.width, H = c.height, d = data;
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0b1530"); g.addColorStop(1, "#1e1b4b"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e0f2fe"; ctx.font = "700 44px system-ui,Arial"; ctx.fillText("AFRA Panel · Çalışanlar", 36, 66);
    ctx.font = "600 46px ui-monospace,Consolas,monospace"; ctx.textAlign = "right"; ctx.fillStyle = "#7dd3fc"; ctx.fillText(new Date(now).toLocaleTimeString("tr-TR"), W - 36, 66); ctx.textAlign = "left";
    const k = d.summary, boxes = [["Çalışan", d.workers.length, "#e2e8f0"], ["Şu an çalışan", k.running, "#22d3ee"], ["24 sa rapor", k.r24, "#a5b4fc"], ["Dikkat", k.attention, k.attention ? "#f87171" : "#86efac"]];
    boxes.forEach(([l, v, cl], i) => { const x = 36 + i * 240; ctx.fillStyle = "rgba(255,255,255,.06)"; rr(ctx, x, 96, 222, 124, 16); ctx.fill();
      ctx.fillStyle = "#94a3b8"; ctx.font = "26px system-ui,Arial"; ctx.fillText(l, x + 18, 134); ctx.fillStyle = cl; ctx.font = "700 56px system-ui,Arial"; ctx.fillText(String(v), x + 18, 196); });
    if (k.up) { ctx.fillStyle = "#cbd5e1"; ctx.font = "28px system-ui,Arial"; ctx.fillText("Sıradaki: ", 36, 270); const w0 = ctx.measureText("Sıradaki: ").width;
      ctx.fillStyle = "#fff"; ctx.font = "600 28px system-ui,Arial"; ctx.fillText(fitText(ctx, k.up.name + " · " + d.fmtIn(k.up.t - now), 900 - w0), 36 + w0, 270); }
    d.runs.slice(0, 4).forEach((r, i) => { const y = 316 + i * 58; ctx.fillStyle = d.col[r.status] || "#64748b"; ctx.fillRect(36, y, 8, 42);
      const nm = (d.workers.find(w => w.id === r.worker_id) || {}).name || r.worker_id;
      ctx.fillStyle = "#fff"; ctx.font = "600 24px system-ui,Arial"; ctx.fillText(fitText(ctx, nm, 380), 58, y + 18);
      ctx.fillStyle = "#94a3b8"; ctx.font = "22px system-ui,Arial"; ctx.fillText(fitText(ctx, d.fmtAgo(r.finished_at) + " · " + (r.summary || ""), 900), 58, y + 42); });
    t.needsUpdate = true;
  }

  function update(d) {
    data = d;
    d.workers.forEach((w, i) => { const st = stations.get(w.id) || makeStation(w, i); st.w = w; st.state = d.states[w.id] || { st: "yok" }; st.lastTag = 0; st.lastScr = 0;
      const c = new THREE.Color(d.col[st.state.st] || "#64748b"); st.lampM.color.copy(c); st.lampM.emissive.copy(c); st.glowM.color.copy(c); });
    for (const [id, st] of stations) if (!d.workers.find(w => w.id === id)) { st.g.visible = false; }
  }

  // kamera ve etkileşim
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(e) { const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false).find(h => h.object.userData.wid && h.object.parent && h.object.parent.visible !== false); return hit ? hit.object.userData.wid : null; }
  const onDown = e => { dragging = { x: e.clientX, y: e.clientY, az: azT, pol, moved: false }; cv.setPointerCapture(e.pointerId); };
  const onMove = e => {
    if (dragging) { const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y; if (Math.abs(dx) + Math.abs(dy) > 5) dragging.moved = true;
      azT = Math.max(-0.35, Math.min(1.45, dragging.az - dx * 0.006)); pol = Math.max(0.55, Math.min(1.3, dragging.pol - dy * 0.004)); return; }
    const id = pick(e); if (id !== hoverId) { hoverId = id; cv.style.cursor = id ? "pointer" : "grab"; for (const s of stations.values()) s.lastTag = 0; }
  };
  const onUp = e => { const d = dragging; dragging = null; if (d && !d.moved) { const id = pick(e); if (id) { selId = id; for (const s of stations.values()) s.lastTag = 0; api.onPick(id); } } };
  cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointerleave", () => { if (!dragging && hoverId) { hoverId = null; for (const s of stations.values()) s.lastTag = 0; } });
  cv.style.cursor = "grab"; cv.style.touchAction = "pan-y";

  function resize() { const w = host.clientWidth || 800, h = host.clientHeight || 560; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 640 ? 50 : 38; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  let lastFrame = performance.now(), secTick = 0;
  function frame(now) {
    if (!alive) return;
    requestAnimationFrame(frame);
    if (!document.body.contains(cv) || document.hidden) { lastFrame = now; return; }
    const dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now; const T = (now - t0) / 1000, wall = Date.now();
    if (spin && !dragging && !hoverId) azT = 0.55 + Math.sin(T * 0.09) * 0.75;
    az += (azT - az) * Math.min(1, dt * 3);
    const r = rad * (host.clientWidth < 640 ? 1.25 : 1);
    camera.position.set(target.x + r * Math.sin(pol) * Math.sin(az), target.y + r * Math.cos(pol), target.z + r * Math.sin(pol) * Math.cos(az)); camera.lookAt(target);
    if (data) {
      const doSec = now - secTick > 1000; if (doSec) { secTick = now; drawTV(wall); }
      for (const st of stations.values()) {
        if (!st.g.visible) continue; const s = st.state || { st: "yok" }, k = s.st, ph = T + st.phase;
        // pozlar
        let lean = 0, headX = 0, headY = 0, typing = 0;
        if (k === "calisiyor") { typing = 1; headX = 0.12 + Math.sin(ph * 8) * 0.03; }
        else if (k === "hata") { lean = 0.55; headX = 0.9; }
        else if (k === "atlandi") { lean = -0.28; headX = -0.25; headY = Math.sin(ph * 0.4) * 0.3; }
        else if (k === "uyari" || k === "gecikti") { headY = Math.sin(ph * 1.3) * 0.7; headX = 0.05; typing = 0.25; }
        else { headY = Math.sin(ph * 0.5) * 0.25; typing = (Math.sin(ph * 0.7) > 0.3) ? 0.6 : 0; }
        st.torso.rotation.x += (lean - st.torso.rotation.x) * Math.min(1, dt * 3);
        st.seat.rotation.x += ((k === "atlandi" ? -0.12 : 0) - st.seat.rotation.x) * Math.min(1, dt * 3);
        st.head.rotation.x += (headX - st.head.rotation.x) * Math.min(1, dt * 4); st.head.rotation.y += (headY - st.head.rotation.y) * Math.min(1, dt * 4);
        st.torso.scale.y = 1 + Math.sin(ph * 2) * 0.012;
        st.arms.forEach((a, j) => { const tap = typing ? Math.max(0, Math.sin(ph * 18 + j * 2.1)) * 0.22 * typing : 0;
          const behind = k === "atlandi"; a.sh.rotation.x += ((behind ? -2.6 : (k === "hata" ? -0.4 : 0)) - a.sh.rotation.x) * Math.min(1, dt * 3);
          a.el.rotation.x = behind ? -1.2 : -tap; });
        // lamba
        const blink = (k === "hata" || k === "uyari" || k === "gecikti") ? (Math.sin(T * 6) > 0 ? 1 : 0.25) : (k === "calisiyor" ? 0.7 + Math.sin(T * 10) * 0.3 : 0.9);
        st.lampM.emissiveIntensity = 0.4 + blink * 1.6; st.glowM.opacity = 0.15 + blink * 0.45;
        // işaret
        drawMark(st, k === "hata" ? "!" : k === "gecikti" ? "?" : k === "atlandi" ? "z" : "");
        if (st.mk.visible) st.mk.position.y = 1.8 + Math.sin(T * 3) * 0.06;
        // veri küpleri
        st.bits.forEach(b => { b.visible = k === "calisiyor"; if (!b.visible) return; const p = (b.userData.ph + T * 0.35) % 1; b.position.set(b.userData.x, 1.45 + p * 1.3, -0.27); b.rotation.set(T * 2, T * 3, 0); b.scale.setScalar(1 - p * 0.7); });
        // seçim halkası
        const want = (selId === st.w.id ? 0.9 : 0) || (hoverId === st.w.id ? 0.5 : 0); st.ringM.opacity += (want - st.ringM.opacity) * Math.min(1, dt * 6);
        st.ringM.color.set(data.col[k] || "#38bdf8");
        // tuval güncellemeleri
        if (now - st.lastTag > 1000) { st.lastTag = now; drawTag(st, wall); }
        if (now - st.lastScr > (k === "calisiyor" ? 150 : 1000)) { st.lastScr = now; drawScreen(st, wall); }
      }
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    update,
    setSpin(on) { spin = on; },
    zoom(dir) { rad = Math.max(6.5, Math.min(20, rad + dir * 2)); },
    select(id) { selId = id; for (const s of stations.values()) s.lastTag = 0; },
    canvas: cv,
    dispose() { alive = false; ro.disconnect(); disposables.forEach(x => x.dispose && x.dispose()); renderer.dispose(); renderer.forceContextLoss(); cv.remove(); }
  };
}
