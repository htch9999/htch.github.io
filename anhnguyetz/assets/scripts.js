/**
 * Galaxy Love 2.0 - Main Script (Clean Version)
 * Author: Devpan (rewritten clean by Antigravity)
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ============================================================
// SCENE SETUP
// ============================================================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0015);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100000
);
camera.position.set(0, 20, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector("#container").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.dampingFactor = 0.2;
controls.autoRotate = true;   // Xoay nhẹ trước khi click
controls.autoRotateSpeed = 0.3;
controls.target.set(0, 0, 0);
controls.enableZoom = true;
controls.minDistance = 15;
controls.maxDistance = 300;
controls.zoomSpeed = 0.3;
controls.rotateSpeed = 0.3;
controls.update();

// ============================================================
// URL PARAMETER HELPERS
// ============================================================
function decodeBase64Unicode(str) {
  try {
    return decodeURIComponent(
      atob(str).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
  } catch (e) { return ""; }
}

function getHeartImagesFromURL() {
  const params = new URLSearchParams(window.location.search);
  const useLocal = params.get("use_local") === "1";

  const id = params.get("id");
  const remoteUrls = id ? decodeBase64Unicode(id).split(",").map(s => s.trim()).filter(Boolean) : [];

  if (useLocal) {
    try {
      const stored = sessionStorage.getItem("galaxy_local_images");
      const localUrls = stored ? JSON.parse(stored).filter(Boolean) : [];
      return [...remoteUrls, ...localUrls];
    } catch (e) { return remoteUrls; }
  }
  return remoteUrls;
}

function getRingTextsFromURL() {
  const texts = new URLSearchParams(window.location.search).get("texts");
  return texts
    ? decodeBase64Unicode(texts).split(",").map(s => s.trim()).filter(Boolean)
    : ["Chạm Vào Tinh Cầu", "Love"];
}

function getMusicFromURL() {
  return new URLSearchParams(window.location.search).get("music") || "./a.mp3";
}

const heartImages = getHeartImagesFromURL();
const ringTexts = getRingTextsFromURL();
const selectedMusic = getMusicFromURL();
window.loves = { data: { ringTexts } };

// ============================================================
// AUDIO PLAYER
// ============================================================
if (selectedMusic) {
  const audio = document.createElement("audio");
  audio.src = selectedMusic;
  audio.loop = true;
  audio.muted = false;
  audio.style.display = "none";
  document.body.appendChild(audio);

  const btn = document.createElement("button");
  btn.id = "toggle-audio";
  btn.className = "text-white btn-audio-toggle";
  Object.assign(btn.style, { position: "fixed", bottom: "10px", left: "10px", zIndex: "999" });

  const icon = document.createElement("i");
  icon.id = "audio-icon";
  icon.className = "fa-solid fa-volume-high";
  btn.appendChild(icon);
  document.body.appendChild(btn);

  const playOnInteraction = () => {
    audio.play().catch(() => { });
    document.removeEventListener("click", playOnInteraction);
  };
  document.addEventListener("click", playOnInteraction);

  btn.addEventListener("click", () => {
    if (audio.muted) { audio.muted = false; icon.className = "fa-solid fa-volume-high"; }
    else { audio.muted = true; icon.className = "fa-solid fa-volume-xmark"; }
  });
}

// ============================================================
// GLOW SPRITE HELPER
// ============================================================
function createGlowMaterial(color, size = 128, opacity = 0.55) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  return sprite;
}

const centralGlow = createGlowMaterial("rgba(255,255,255,0.8)", 156, 0); // Vô hình ban đầu, sẽ fade-in sau click
centralGlow.scale.set(8, 8, 1);
scene.add(centralGlow);

// 15 Ambient orbs (cầu vồng) - luôn hiện thị toàn bộ thời gian
const ambientGlows = [];
for (let i = 0; i < 15; i++) {
  const hue = 360 * Math.random();
  const glow = createGlowMaterial(`hsla(${hue},80%,50%,0.6)`, 256);
  glow.scale.set(100, 100, 1);
  glow.position.set(
    175 * (Math.random() - 0.5),
    175 * (Math.random() - 0.5),
    175 * (Math.random() - 0.5)
  );
  scene.add(glow);
  ambientGlows.push(glow);
}

// ============================================================
// GALAXY
// ============================================================
const GAL = {
  count: 100000, arms: 6, radius: 100, spin: 0.5,
  randomness: 0.2, randomnessPower: 20,
  insideColor: new THREE.Color(0xd63ed6),
  outsideColor: new THREE.Color(0x48b8b8),
};

const galaxyVS = `
  uniform float uSize; uniform float uTime;
  uniform float uRippleTime; uniform float uRippleSpeed; uniform float uRippleWidth;
  varying vec3 vColor;
  void main(){
    vColor = color;
    vec4 mp = modelMatrix * vec4(position, 1.0);
    if(uRippleTime > 0.0){
      float rr = (uTime - uRippleTime) * uRippleSpeed;
      float pd = length(mp.xyz);
      float st = 1.0 - smoothstep(rr - uRippleWidth, rr + uRippleWidth, pd);
      st *= smoothstep(rr + uRippleWidth, rr - uRippleWidth, pd);
      if(st > 0.0) vColor += vec3(st * 2.0);
    }
    vec4 vp = viewMatrix * mp;
    gl_Position = projectionMatrix * vp;
    gl_PointSize = uSize / -vp.z;
  }`;

const galaxyFS = `
  varying vec3 vColor;
  uniform float uOpacity;
  void main(){
    float d = length(gl_PointCoord - vec2(0.5));
    if(d > 0.5) discard;
    gl_FragColor = vec4(vColor, uOpacity);
  }`;

const posArr = new Float32Array(3 * GAL.count);
const colArr = new Float32Array(3 * GAL.count);
let pIdx = 0;

for (let i = 0; i < GAL.count; i++) {
  const r = Math.pow(Math.random(), GAL.randomnessPower) * GAL.radius;
  const arm = ((i % GAL.arms) / GAL.arms) * Math.PI * 2;
  const ang = arm + r * GAL.spin;
  const ox = (Math.random() - 0.5) * GAL.randomness * r;
  const oy = (Math.random() - 0.5) * GAL.randomness * r * 0.5;
  const oz = (Math.random() - 0.5) * GAL.randomness * r;
  if (r < 30 && Math.random() < 0.7) continue;
  const l = 3 * pIdx;
  posArr[l] = Math.cos(ang) * r + ox;
  posArr[l + 1] = oy;
  posArr[l + 2] = Math.sin(ang) * r + oz;
  const c = new THREE.Color(0xff66ff);
  c.lerp(new THREE.Color(0x66ffff), r / GAL.radius);
  c.multiplyScalar(0.7 + 0.3 * Math.random());
  colArr[l] = c.r; colArr[l + 1] = c.g; colArr[l + 2] = c.b;
  pIdx++;
}

const galaxyGeo = new THREE.BufferGeometry();
galaxyGeo.setAttribute("position", new THREE.BufferAttribute(posArr.slice(0, 3 * pIdx), 3));
galaxyGeo.setAttribute("color", new THREE.BufferAttribute(colArr.slice(0, 3 * pIdx), 3));

const galaxyMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uSize: { value: 50 * renderer.getPixelRatio() },
    uRippleTime: { value: -1 }, uRippleSpeed: { value: 40 }, uRippleWidth: { value: 20 },
    uOpacity: { value: 0 },
  },
  vertexShader: galaxyVS, fragmentShader: galaxyFS,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true,
});
const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
scene.add(galaxy);

// ============================================================
// PLANET
// ============================================================
function createPlanetTexture(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  
  // Nền mịn màng hơn
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#a259f7"); 
  grad.addColorStop(0.5, "#f06292"); 
  grad.addColorStop(1, "#3fd8c7");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Tạo các vùng màu hòa quyện (không có cạnh gắt)
  const pal = ["#e1aaff", "#f8bbd0", "#f48fb1", "#ffffff", "#b2ff59"];
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 80 + 150 * Math.random();
    const col = pal[Math.floor(Math.random() * pal.length)];
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, col + "88"); // Độ trong suốt thấp hơn để hòa quyện
    g2.addColorStop(1, col + "00");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

const stormVS = `
  varying vec2 vUv; 
  varying vec3 vNormal;
  void main(){ 
    vUv=uv; 
    vNormal = normalize(normalMatrix * normal);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); 
  }`;
const stormFS = `
  uniform float time; 
  uniform sampler2D baseTexture; 
  varying vec2 vUv;
  varying vec3 vNormal;
  
  void main(){
    vec2 uv = vUv;
    // Hiệu ứng cuộn nhẹ nhàng thay vì xoắn gắt gây seam
    uv.x += sin(uv.y * 3.0 + time * 0.2) * 0.02;
    uv.y += cos(uv.x * 3.0 + time * 0.2) * 0.02;
    
    vec4 tc = texture2D(baseTexture, uv);
    
    // Noise mịn màng để tạo độ sâu
    float l = dot(vNormal, vec3(0.0, 0.0, 1.0));
    tc.rgb *= (0.8 + 0.2 * l); // Thêm chút bóng đổ giả lập
    
    gl_FragColor = tc;
  }`;

const planetRadius = 10;
const planetMaterial = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, baseTexture: { value: createPlanetTexture() } },
  vertexShader: stormVS, fragmentShader: stormFS,
});
const planet = new THREE.Mesh(new THREE.SphereGeometry(planetRadius, 48, 48), planetMaterial);
planet.name = "main-planet";
scene.add(planet);

// Planet outer glow
const glowVS = `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const glowFS = `varying vec3 vN; uniform vec3 glowColor; void main(){ float i=pow(0.7-dot(vN,vec3(0,0,1)),2.0); gl_FragColor=vec4(glowColor,1.0)*i; }`;
planet.add(new THREE.Mesh(
  new THREE.SphereGeometry(1.05 * planetRadius, 48, 48),
  new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0xe0b3ff) } },
    vertexShader: glowVS, fragmentShader: glowFS,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true,
  })
));

// ============================================================
// HEART IMAGE POINT CLOUDS
// ============================================================
function createNeonTexture(imgEl, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const ratio = imgEl.width / imgEl.height;
  let dw, dh, dx, dy;
  if (ratio > 1) { dw = size; dh = size / ratio; dx = 0; dy = (size - dh) / 2; }
  else { dh = size; dw = size * ratio; dx = (size - dw) / 2; dy = 0; }
  ctx.clearRect(0, 0, size, size);
  const r = 0.1 * size;
  ctx.save(); ctx.beginPath();
  ctx.moveTo(dx + r, dy); ctx.lineTo(dx + dw - r, dy);
  ctx.arcTo(dx + dw, dy, dx + dw, dy + r, r); ctx.lineTo(dx + dw, dy + dh - r);
  ctx.arcTo(dx + dw, dy + dh, dx + dw - r, dy + dh, r); ctx.lineTo(dx + r, dy + dh);
  ctx.arcTo(dx, dy + dh, dx, dy + dh - r, r); ctx.lineTo(dx, dy + r);
  ctx.arcTo(dx, dy, dx + r, dy, r); ctx.closePath(); ctx.clip();
  ctx.drawImage(imgEl, dx, dy, dw, dh); ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const heartPointClouds = [];
const numGroups = heartImages.length;
const maxDensity = 15000, minDensity = 4000, maxGroupsForScale = 20;
let pointsPerGroup;
if (numGroups <= 1) pointsPerGroup = maxDensity;
else if (numGroups >= maxGroupsForScale) pointsPerGroup = minDensity;
else {
  const t = (numGroups - 1) / (maxGroupsForScale - 1);
  pointsPerGroup = Math.floor(maxDensity * (1 - t) + minDensity * t);
}

// Nếu số nhóm vượt quá 20 ảnh, cảnh báo Console và giới hạn tối đa
const activeGroups = Math.min(numGroups, 30); // Cho phép tối đa 30 nhưng khuyên dùng < 20
if (activeGroups * pointsPerGroup > GAL.count) {
  pointsPerGroup = Math.floor(GAL.count / activeGroups);
}

for (let g = 0; g < numGroups; g++) {
  const posArr = new Float32Array(3 * pointsPerGroup);
  const colNear = new Float32Array(3 * pointsPerGroup); // WHITE - dùng cho NormalBlending
  const colFar = new Float32Array(3 * pointsPerGroup); // Màu galaxy - dùng cho AdditiveBlending
  let o = 0;
  for (let i = 0; i < pointsPerGroup; i++) {
    const r = Math.pow(Math.random(), GAL.randomnessPower) * GAL.radius;
    if (r < 30) continue;
    const arm = (((g * pointsPerGroup + i) % GAL.arms) / GAL.arms) * Math.PI * 2;
    const ang = arm + r * GAL.spin;
    const ox = (Math.random() - 0.5) * GAL.randomness * r;
    const oy = (Math.random() - 0.5) * GAL.randomness * r * 0.5;
    const oz = (Math.random() - 0.5) * GAL.randomness * r;
    const l = 3 * o;
    posArr[l] = Math.cos(ang) * r + ox;
    posArr[l + 1] = oy;
    posArr[l + 2] = Math.sin(ang) * r + oz;
    // Near: màu trắng → texture hiện đúng màu thật
    colNear[l] = 1; colNear[l + 1] = 1; colNear[l + 2] = 1;
    // Far: màu galaxy (tím/xanh) → glow additive effect
    const fc = GAL.insideColor.clone();
    fc.lerp(GAL.outsideColor, r / GAL.radius);
    fc.multiplyScalar(0.7 + 0.3 * Math.random());
    colFar[l] = fc.r; colFar[l + 1] = fc.g; colFar[l + 2] = fc.b;
    o++;
  }
  if (o === 0) continue;

  // geometryNear = same positions, vertex color WHITE → ảnh rõ màu thật
  const geoNear = new THREE.BufferGeometry();
  geoNear.setAttribute("position", new THREE.BufferAttribute(posArr.slice(0, 3 * o), 3));
  geoNear.setAttribute("color", new THREE.BufferAttribute(colNear.slice(0, 3 * o), 3));

  // geometryFar = same positions, vertex color galaxy → glow tím/xanh
  const geoFar = new THREE.BufferGeometry();
  geoFar.setAttribute("position", new THREE.BufferAttribute(posArr.slice(0, 3 * o), 3));
  geoFar.setAttribute("color", new THREE.BufferAttribute(colFar.slice(0, 3 * o), 3));

  // Tính tâm để đặt world position cho cloud
  const posAttr = geoFar.getAttribute("position");
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < posAttr.count; i++) {
    cx += posAttr.getX(i); cy += posAttr.getY(i); cz += posAttr.getZ(i);
  }
  cx /= posAttr.count; cy /= posAttr.count; cz /= posAttr.count;
  geoFar.translate(-cx, -cy, -cz);
  geoNear.translate(-cx, -cy, -cz);

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = heartImages[g];
  img.onload = () => {
    const tex = createNeonTexture(img, 256);

    // matNear: NormalBlending, transparent:false → ảnh hiện đúng màu thật, rõ nét
    // alphaTest cắt vùng trong suốt (viền bo tròn), không cần blend
    // depthWrite/depthTest = true ĐỂ các sprite không đè chéo nhau gây chói bẩn
    const matNear = new THREE.PointsMaterial({
      size: 1.8, map: tex, transparent: false, alphaTest: 0.2,
      depthWrite: true, depthTest: true,
      blending: THREE.NormalBlending, vertexColors: true,
    });

    // matFar: AdditiveBlending → glow hiệu ứng tím/xanh khi nhìn từ xa
    const matFar = new THREE.PointsMaterial({
      size: 1.8, map: tex, transparent: true, alphaTest: 0.2,
      depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });

    // Khởi tạo với geoFar + matFar (trạng thái ban đầu: xa)
    const cloud = new THREE.Points(geoFar, matFar);
    cloud.position.set(cx, cy, cz);
    cloud.userData.matNear = matNear;
    cloud.userData.matFar = matFar;
    cloud.userData.geometryNear = geoNear;
    cloud.userData.geometryFar = geoFar;
    scene.add(cloud);
    heartPointClouds.push(cloud);
  };
}


// ============================================================
// AMBIENT LIGHT & STARFIELD
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

const starCount = 20000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(3 * starCount);
for (let i = 0; i < starCount; i++) {
  starPos[3 * i] = 900 * (Math.random() - 0.5);
  starPos[3 * i + 1] = 900 * (Math.random() - 0.5);
  starPos[3 * i + 2] = 900 * (Math.random() - 0.5);
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starField = new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: 0.7, transparent: true, opacity: 0.7, depthWrite: false,
}));
starField.name = "starfield";
scene.add(starField);
const originalStarCount = starGeo.getAttribute("position").count;
starGeo.setDrawRange(0, Math.floor(0.1 * originalStarCount));

// ============================================================
// TEXT RINGS
// ============================================================
function createTextRings() {
  window.textRings = [];
  const numRings = ringTexts.length;
  const baseR = 1.1 * planetRadius;

  for (let ri = 0; ri < numRings; ri++) {
    const text = ringTexts[ri % ringTexts.length] + "   ";
    const ringR = baseR + 5 * ri;
    const canvasH = 200;
    const fontSize = Math.min(120, 0.9 * canvasH);

    const measureCtx = document.createElement("canvas").getContext("2d");
    measureCtx.font = `bold ${fontSize}px Arial, sans-serif`;
    const textW = measureCtx.measureText(text).width;
    const circum = 2 * Math.PI * ringR * 180;
    const repeats = Math.ceil(circum / (textW || 1));
    let fullText = "";
    for (let i = 0; i < repeats; i++) fullText += text;
    let totalW = textW * repeats;
    if (totalW < 1 || !fullText) { fullText = text; totalW = textW || 1; }

    const texCanvas = document.createElement("canvas");
    texCanvas.width = Math.ceil(Math.max(1, totalW));
    texCanvas.height = canvasH;
    const tctx = texCanvas.getContext("2d");
    tctx.clearRect(0, 0, texCanvas.width, canvasH);
    tctx.font = `bold ${fontSize}px Arial, sans-serif`;
    tctx.textAlign = "left";
    tctx.textBaseline = "alphabetic";
    tctx.shadowColor = "rgba(255,111,164,0.8)";
    tctx.shadowBlur = 12;
    tctx.lineWidth = 6;
    tctx.strokeStyle = "rgba(255,111,164,0.8)";
    tctx.strokeText(fullText, 0, 0.8 * canvasH);
    tctx.shadowBlur = 16; tctx.lineWidth = 10;
    tctx.strokeStyle = "#e0b3ff";
    tctx.fillStyle = "white";
    tctx.fillText(fullText, 0, 0.8 * canvasH);

    const ringTex = new THREE.CanvasTexture(texCanvas);
    ringTex.wrapS = THREE.RepeatWrapping;
    ringTex.repeat.x = totalW / circum;
    ringTex.needsUpdate = true;

    const ringMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(ringR, ringR, 1, 128, 1, true),
      new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0, side: THREE.DoubleSide, alphaTest: 0.01 })
    );
    ringMesh.rotation.y = Math.PI / 2;

    const group = new THREE.Group();
    group.add(ringMesh);
    group.userData = {
      angleOffset: 0, speed: 0.008,
      tiltAmplitude: Math.PI / 3, rollAmplitude: Math.PI / 6, pitchAmplitude: Math.PI / 8,
      tiltPhase: 2 * Math.PI * Math.random(), rollPhase: 2 * Math.PI * Math.random(), pitchPhase: 2 * Math.PI * Math.random(),
      tiltSpeed: 0.5, rollSpeed: 0.3, pitchSpeed: 0.4, isTextRing: true,
    };
    group.rotation.x = (ri / numRings) * Math.PI;
    scene.add(group);
    window.textRings.push(group);
  }
}

function animatePlanetSystem(t) {
  if (!window.textRings) return;
  window.textRings.forEach((group, i) => {
    const ud = group.userData;
    ud.angleOffset += ud.speed;
    const tilt = Math.sin(t * ud.tiltSpeed + ud.tiltPhase) * ud.tiltAmplitude;
    const roll = Math.cos(t * ud.rollSpeed + ud.rollPhase) * ud.rollAmplitude;
    const pitch = Math.sin(t * ud.pitchSpeed + ud.pitchPhase) * ud.pitchAmplitude;
    group.rotation.x = (i / window.textRings.length) * Math.PI + tilt;
    group.rotation.z = roll;
    group.rotation.y = ud.angleOffset + pitch;
    group.position.y = 0.3 * Math.sin(t * ud.tiltSpeed * 0.7 + ud.tiltPhase);
  });
}

createTextRings();

// ============================================================
// SHOOTING STARS
// ============================================================
let shootingStars = [];

function createRandomCurve() {
  const p0 = new THREE.Vector3(100 * Math.random() - 200, 200 * Math.random() - 100, 200 * Math.random() - 100);
  const p3 = new THREE.Vector3(600 + 200 * Math.random(), p0.y + (200 * Math.random() - 100), p0.z + (200 * Math.random() - 100));
  const p1 = new THREE.Vector3(p0.x + 200 + 100 * Math.random(), p0.y + (100 * Math.random() - 50), p0.z + (100 * Math.random() - 50));
  const p2 = new THREE.Vector3(p3.x - 200 + 100 * Math.random(), p3.y + (100 * Math.random() - 50), p3.z + (100 * Math.random() - 50));
  return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
}

function createShootingStar() {
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
  );
  const glowH = new THREE.Mesh(
    new THREE.SphereGeometry(3, 32, 32),
    new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec3 vN; uniform float time; void main(){float i=pow(0.7-dot(vN,vec3(0,0,1)),2.0);gl_FragColor=vec4(1,1,1,i*(0.8+sin(time*5.0)*0.2));}`,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide
    })
  );
  head.add(glowH);

  const curve = createRandomCurve();
  const trailPoints = Array.from({ length: 100 }, (_, i) => curve.getPoint(i / 99));
  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x99eaff, transparent: true, opacity: 0.7, linewidth: 2 }));

  const group = new THREE.Group();
  group.add(head); group.add(trail);
  group.userData = { curve, progress: 0, speed: 0.001 + 0.001 * Math.random(), life: 0, maxLife: 300, head, trail, trailLength: 100, trailPoints };
  scene.add(group);
  shootingStars.push(group);
}

// ============================================================
// HINT ICON
// ============================================================
let hintIcon, hintText;

function createHintIcon() {
  hintIcon = new THREE.Group();
  hintIcon.name = "hint-icon-group";
  camera.add(hintIcon);
  scene.add(camera);

  const arrow = new THREE.Shape();
  const h = 1.5;
  arrow.moveTo(0, 0); arrow.lineTo(-0.3, -h * 0.7); arrow.lineTo(-0.1875, -h * 0.7);
  arrow.lineTo(-0.375, -h); arrow.lineTo(0.375, -h); arrow.lineTo(0.1875, -h * 0.7);
  arrow.lineTo(0.3, -h * 0.7); arrow.closePath();

  const arrowMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(arrow),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  arrowMesh.position.y = h / 2;
  // Bỏ rotation.x = Math.PI/2 để giữ nguyên mặt phẳng XY hướng về màn hình

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.8, 2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
  );

  hintIcon.userData.ringMesh = ring;
  hintIcon.add(arrowMesh);
  hintIcon.add(ring);
  
  // Đưa ra góc phải bên dưới một chút
  hintIcon.position.set(2.5, -2.2, -10);
  hintIcon.scale.set(0.4, 0.4, 0.4);
  
  // Tính toán góc nghiêng 2D để nó chỉ thẳng vào giữa màn hình (0,0) từ góc phải dưới (2.5, -2.2)
  const angleZ = Math.atan2(2.2, -2.5) - Math.PI / 2; 

  // Xoay nhẹ theo góc nhìn 3D Isometric để trông thật hơn (nghiêng về sau)
  hintIcon.rotation.set(0.4, -0.3, angleZ);

  hintIcon.userData.initialPosition = hintIcon.position.clone();
}

function createHintText() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; // Khớp tỉ lệ 2:1 của PlaneGeometry (16, 8)
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  
  // Font to, dày và cực kì rõ nét
  ctx.font = "900 80px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 1. Lớp viền nền đen/tối: tách biệt hẳn chữ khỏi nền sáng phía sau
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
  ctx.strokeText("Chạm Vào Tinh Cầu", 512, 256);

  // 2. Lớp Glow màu hồng neon
  ctx.shadowColor = "#ff33a1";
  ctx.shadowBlur = 30;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffb3b3";
  ctx.strokeText("Chạm Vào Tinh Cầu", 512, 256);

  // 3. Lớp chữ chính màu trắng sáng
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Chạm Vào Tinh Cầu", 512, 256);

  // 4. Lớp chữ sắc nét (tắt phân tán bóng)
  ctx.shadowBlur = 0;
  ctx.fillText("Chạm Vào Tinh Cầu", 512, 256);
  
  const tex = new THREE.CanvasTexture(canvas);
  hintText = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  // Attach to camera to match hintIcon
  camera.add(hintText);
  hintText.position.set(0, 3, -15);
}

function animateHintIcon(t) {
  if (!hintIcon) return;
  if (introStarted) {
    hintIcon.visible = false;
    if (hintText) hintText.visible = false;
    return;
  }
  hintIcon.visible = true;

  const basePos = hintIcon.userData.initialPosition;
  if (basePos) {
    // bounce locally
    const bounce = Math.sin(t * 2.5) * 0.2;
    // local displacement along its own local Y axis
    hintIcon.position.copy(basePos);
    hintIcon.translateY(bounce);
  }

  const ring = hintIcon.userData.ringMesh;
  const scale = 1 + 0.1 * Math.sin(t * 2.5);
  ring.scale.set(scale, scale, 1);
  ring.material.opacity = 0.5 + 0.2 * Math.sin(t * 2.5);
  if (hintText) {
    hintText.visible = true;
    hintText.material.opacity = 0.7 + 0.3 * Math.sin(3 * t);
    hintText.position.y = 3 + 0.1 * Math.sin(2 * t);
  }
}

// ============================================================
// FULLSCREEN & INTERACTION
// ============================================================
function requestFullScreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let introStarted = false;
let fadeOpacity = 0;
let fadeInProgress = false;

function startCameraAnimation() {
  const from = camera.position.clone();
  controls.enabled = false;
  let progress = 0;
  (function step() {
    progress += 0.00101;
    let pos;
    if (progress < 0.2) {
      const p = progress / 0.2;
      pos = { x: from.x, y: from.y + (0 - from.y) * p, z: from.z };
    } else if (progress < 0.75) {
      const p = (progress - 0.2) / 0.55;
      pos = { x: from.x, y: 0, z: from.z + (160 - from.z) * p };
    } else if (progress < 1.15) {
      const p = (progress - 0.75) / 0.4;
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * p);
      pos = { x: from.x + (-40 - from.x) * ease, y: 100 * ease, z: 160 + (-60) * ease };
    } else {
      camera.position.set(-40, 100, 100);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
      controls.enabled = true;
      return;
    }
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(0, 0, 0);
    requestAnimationFrame(step);
  })();
}

function onCanvasClick(event) {
  if (introStarted) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.intersectObject(planet).length > 0) {
    requestFullScreen();
    introStarted = true;
    fadeInProgress = true;
    document.body.classList.add("intro-started");
    startCameraAnimation();
    starGeo.setDrawRange(0, originalStarCount);
  }
}

renderer.domElement.addEventListener("click", onCanvasClick);

// ============================================================
// MAIN ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  const t = 0.001 * performance.now();

  controls.update();
  planet.material.uniforms.time.value = 0.5 * t;
  galaxy.material.uniforms.uTime.value = t;

  // Hint icon animation
  animateHintIcon(t);

  if (introStarted) {
    scene.traverse((child) => {
      if (child.userData.isTextRing || (child.parent && child.parent.userData && child.parent.userData.isTextRing) || child === planet || child === centralGlow || child.type === "Scene") {
        if (child.material && child.material.opacity !== undefined) {
          child.material.opacity = 1;
          child.material.transparent = false;
        }
      } else {
        if (child.material && child.material.opacity !== undefined) {
          child.material.transparent = true;
          child.material.opacity = fadeOpacity;
        }
      }
      if (child.material && child.material.color) {
        child.material.color.set(0xffffff);
      }
    });
  } else {
    fadeOpacity = 0.1;
    scene.traverse((child) => {
      if (child.name !== "starfield") {
        if (child.userData.isTextRing || (child.parent && child.parent.userData && child.parent.userData.isTextRing)) {
          if (child.material && child.material.opacity !== undefined) {
            child.material.transparent = false;
            child.material.opacity = 1;
          }
          if (child.material && child.material.color) {
            child.material.color.set(0xffffff);
          }
        } else if (!(child === planet || child === centralGlow || child === hintIcon || child.type === "Scene" || child.parent && child.parent.isGroup)) {
          if (child.material && child.material.opacity !== undefined) {
            child.material.transparent = true;
            child.material.opacity = 0.1;
          }
        }
      } else {
        if (child.isPoints && child.material && child.material.opacity !== undefined) {
          child.material.transparent = false;
          child.material.opacity = 1;
        }
      }
    });
  }

  if (introStarted && fadeInProgress && fadeOpacity < 1) {
    fadeOpacity += 0.02;
    if (fadeOpacity > 1) fadeOpacity = 1;
  }
  
  // Áp dụng giá trị opacity bổ sung
  galaxy.material.uniforms.uOpacity.value = fadeOpacity;
  centralGlow.material.opacity = fadeOpacity * 0.25;

  // LOD check cho ảnh tim: Giống y nguyên code gốc
  heartPointClouds.forEach(cloud => {
    if (!introStarted) {
        // Trước khi click, thiết lập hiển thị ban đầu
        if (cloud.material !== cloud.userData.matFar) {
          cloud.material = cloud.userData.matFar;
          cloud.geometry = cloud.userData.geometryFar;
        }
        cloud.userData.matFar.opacity = 0.1; // Sẽ bị update ở scene traversal nhưng gán cho an toàn
    } else {
        const posAttr = cloud.userData.geometryFar.getAttribute("position");
        const cloudPos = cloud.position;
        let isNear = false;

        for (let vi = 0; vi < posAttr.count; vi++) {
          const wx = posAttr.getX(vi) + cloudPos.x;
          const wy = posAttr.getY(vi) + cloudPos.y;
          const wz = posAttr.getZ(vi) + cloudPos.z;
          if (camera.position.distanceTo(new THREE.Vector3(wx, wy, wz)) < 10) {
            isNear = true;
            break;
          }
        }

        if (isNear) {
          if (cloud.material !== cloud.userData.matNear) {
            cloud.material = cloud.userData.matNear;
            cloud.geometry = cloud.userData.geometryNear;
          }
          // Đảm bảo loại bỏ opacity nếu camera ở gần
          cloud.userData.matNear.transparent = false;
          cloud.userData.matNear.opacity = 1.0;
        } else {
          if (cloud.material !== cloud.userData.matFar) {
            cloud.material = cloud.userData.matFar;
            cloud.geometry = cloud.userData.geometryFar;
          }
          // Khi ở xa, opacity nhẹ nhưng vẫn hiện
          cloud.userData.matFar.transparent = true;
          cloud.userData.matFar.opacity = Math.max(0.1, fadeOpacity * 0.6); // giảm chói sáng một chút
        }
    }
  });

  // Animate planet system (text rings)
  animatePlanetSystem(t);

  // Shooting stars
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    const ud = s.userData;
    ud.life++;
    let alpha = 1;
    if (ud.life < 30) alpha = ud.life / 30;
    else if (ud.life > ud.maxLife - 30) alpha = (ud.maxLife - ud.life) / 30;
    ud.progress += ud.speed;
    if (ud.progress > 1) {
      scene.remove(s);
      shootingStars.splice(i, 1);
      continue;
    }
    const pt = ud.curve.getPoint(ud.progress);
    s.position.copy(pt);
    ud.head.material.opacity = alpha;
    ud.head.children[0].material.uniforms.time.value = t;

    const tp = ud.trailPoints;
    tp[0].copy(pt);
    for (let j = 1; j < ud.trailLength; j++) {
      tp[j].copy(ud.curve.getPoint(Math.max(0, ud.progress - 0.01 * j)));
    }
    ud.trail.geometry.setFromPoints(tp);
    ud.trail.material.opacity = 0.7 * alpha;
  }
  if (shootingStars.length < 3 && Math.random() < 0.02) createShootingStar();

  renderer.render(scene, camera);
}

// ============================================================
// INIT
// ============================================================
createShootingStar();
createHintIcon();
createHintText();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.target.set(0, 0, 0);
  controls.update();
});

animate();
