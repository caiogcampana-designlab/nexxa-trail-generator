import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const BRAND_COLORS = Object.freeze({
  darkGreen: '#00231F',
  mediumGreen: '#4FC56E',
  lightGreen: '#B4E9B4',
  mediumGray: '#BFBFBF',
  lightGray: '#E7E7E7',
  coral: '#EC7464'
});

const BACKGROUND_COLOR_KEYS = ['darkGreen', 'mediumGreen', 'lightGreen', 'mediumGray', 'lightGray'];
const OPPOSITE_BY_BACKGROUND = {
  [BRAND_COLORS.darkGreen]: [BRAND_COLORS.mediumGreen, BRAND_COLORS.lightGreen, BRAND_COLORS.mediumGray, BRAND_COLORS.lightGray, BRAND_COLORS.coral],
  [BRAND_COLORS.mediumGreen]: [BRAND_COLORS.darkGreen, BRAND_COLORS.lightGray],
  [BRAND_COLORS.lightGreen]: [BRAND_COLORS.darkGreen, BRAND_COLORS.mediumGreen, BRAND_COLORS.coral],
  [BRAND_COLORS.mediumGray]: [BRAND_COLORS.darkGreen, BRAND_COLORS.lightGray, BRAND_COLORS.coral],
  [BRAND_COLORS.lightGray]: [BRAND_COLORS.darkGreen, BRAND_COLORS.mediumGreen, BRAND_COLORS.mediumGray, BRAND_COLORS.coral]
};

const EASING = {
  linear: (t) => t,
  easeIn: (t) => t ** 2,
  easeOut: (t) => 1 - (1 - t) ** 2,
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)
};

const PRESETS = {
  flow01: {
    startShape: 'triangle', endShape: 'diamond', startSize: 1.15, endSize: 0.82, startRotation: -8, endRotation: 74,
    thickness: 0.052, curvature: 0.95, density: 56, rotX: 17, rotY: -23, rotZ: 9, globalScale: 1.02, trailLength: 8.4,
    progression: 'easeInOut', fade: 0.22, blendSide: 'end', background: BRAND_COLORS.darkGreen, opposite: BRAND_COLORS.mediumGreen
  },
  convergence: {
    startShape: 'diamond', endShape: 'diamond', startSize: 1.42, endSize: 0.62, startRotation: 0, endRotation: 112,
    thickness: 0.058, curvature: 0.62, density: 62, rotX: 22, rotY: -16, rotZ: 19, globalScale: 0.98, trailLength: 9.3,
    progression: 'easeIn', fade: 0.3, blendSide: 'start', background: BRAND_COLORS.lightGray, opposite: BRAND_COLORS.darkGreen
  },
  signal: {
    startShape: 'triangle', endShape: 'triangle', startSize: 0.9, endSize: 1.46, startRotation: -66, endRotation: 14,
    thickness: 0.048, curvature: 1.3, density: 48, rotX: 10, rotY: -30, rotZ: -4, globalScale: 1.08, trailLength: 7.1,
    progression: 'easeOut', fade: 0.16, blendSide: 'end', background: BRAND_COLORS.mediumGray, opposite: BRAND_COLORS.coral
  }
};

const canvas = document.getElementById('scene');
const viewport = document.querySelector('.viewport');
const fallbackEl = document.getElementById('sceneFallback');

const controls = {
  renderMode: document.getElementById('renderMode'),
  startShape: document.getElementById('startShape'),
  endShape: document.getElementById('endShape'),
  startSize: document.getElementById('startSize'),
  endSize: document.getElementById('endSize'),
  globalScale: document.getElementById('globalScale'),
  trailLength: document.getElementById('trailLength'),
  startRotation: document.getElementById('startRotation'),
  endRotation: document.getElementById('endRotation'),
  thickness: document.getElementById('thickness'),
  curvature: document.getElementById('curvature'),
  density: document.getElementById('density'),
  progression: document.getElementById('progression'),
  fade: document.getElementById('fade'),
  blendSide: document.getElementById('blendSide'),
  rotX: document.getElementById('rotX'),
  rotY: document.getElementById('rotY'),
  rotZ: document.getElementById('rotZ'),
  bgSwatches: document.getElementById('bgSwatches'),
  oppositeSwatches: document.getElementById('oppositeSwatches'),
  presetFlow01: document.getElementById('presetFlow01'),
  presetConvergence: document.getElementById('presetConvergence'),
  presetSignal: document.getElementById('presetSignal'),
  smartRandom: document.getElementById('smartRandom'),
  exportPng: document.getElementById('exportPng'),
  exportSvg: document.getElementById('exportSvg')
};

const state = {
  backgroundColor: BRAND_COLORS.darkGreen,
  oppositeColor: BRAND_COLORS.mediumGreen,
  time: 0
};

function showFallback(message) {
  fallbackEl.textContent = message;
  fallbackEl.classList.remove('hidden');
  canvas.classList.add('hidden');
}

if (!window.WebGLRenderingContext) {
  showFallback('WebGL is not available in this browser. Please use a modern browser with hardware acceleration enabled.');
  throw new Error('WebGL unsupported');
}

let renderer;
let scene;
let camera;
let root;
let generatedTrails = [];
const clock = new THREE.Clock();

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
} catch (error) {
  showFallback('Unable to initialize WebGL rendering. Check browser graphics settings and reload.');
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
root = new THREE.Group();
scene.add(root);

function polygonByName(name) {
  if (name === 'triangle') {
    return [
      new THREE.Vector2(0, 1),
      new THREE.Vector2(-0.95, -0.78),
      new THREE.Vector2(0.95, -0.78)
    ];
  }

  return [
    new THREE.Vector2(0, 1),
    new THREE.Vector2(-0.88, 0),
    new THREE.Vector2(0, -1),
    new THREE.Vector2(0.88, 0)
  ];
}

function resamplePolygon(vertices, samples) {
  const edges = [];
  let perimeter = 0;

  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const length = a.distanceTo(b);
    edges.push({ a, b, length });
    perimeter += length;
  }

  const points = [];
  for (let i = 0; i < samples; i += 1) {
    let dist = (i / samples) * perimeter;
    for (const edge of edges) {
      if (dist <= edge.length) {
        const alpha = edge.length === 0 ? 0 : dist / edge.length;
        points.push(new THREE.Vector2().lerpVectors(edge.a, edge.b, alpha));
        break;
      }
      dist -= edge.length;
    }
  }
  return points;
}

function interpolateShape(a, b, t) {
  return a.map((point, i) => new THREE.Vector2().lerpVectors(point, b[i], t));
}

function clearRoot() {
  while (root.children.length > 0) {
    const child = root.children[root.children.length - 1];
    root.remove(child);
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      child.material.dispose();
    }
  }
}

function frameTrailInView() {
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) {
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 1.1);
  const fitHeightDistance = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = 1.25 * Math.max(fitHeightDistance, fitWidthDistance);

  camera.position.set(0, 0, distance);
  camera.near = Math.max(0.1, distance - radius * 3);
  camera.far = distance + radius * 3;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function toHexUpper(color) {
  return color.toUpperCase();
}

function backgroundChoices() {
  return BACKGROUND_COLOR_KEYS.map((key) => BRAND_COLORS[key]);
}

function allowedOppositeColors(backgroundColor) {
  return OPPOSITE_BY_BACKGROUND[toHexUpper(backgroundColor)] ?? [BRAND_COLORS.darkGreen];
}

function makeSwatch(color, title, onSelect, isActive, isDisabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'swatch';
  button.style.setProperty('--swatch-color', color);
  button.title = title;
  button.setAttribute('aria-label', title);
  button.setAttribute('aria-pressed', String(isActive));
  button.disabled = isDisabled;
  if (!isDisabled) {
    button.addEventListener('click', onSelect);
  }
  return button;
}

function renderSwatches() {
  controls.bgSwatches.innerHTML = '';
  controls.oppositeSwatches.innerHTML = '';

  backgroundChoices().forEach((color) => {
    const active = toHexUpper(state.backgroundColor) === toHexUpper(color);
    controls.bgSwatches.appendChild(makeSwatch(color, `Background ${color}`, () => {
      state.backgroundColor = color;
      syncOppositeColor();
      renderSwatches();
      buildTrail();
    }, active));
  });

  allowedOppositeColors(state.backgroundColor).forEach((color) => {
    const active = toHexUpper(state.oppositeColor) === toHexUpper(color);
    controls.oppositeSwatches.appendChild(makeSwatch(color, `Opposite ${color}`, () => {
      state.oppositeColor = color;
      renderSwatches();
      buildTrail();
    }, active));
  });
}

function syncOppositeColor() {
  const allowed = allowedOppositeColors(state.backgroundColor);
  if (!allowed.includes(toHexUpper(state.oppositeColor))) {
    state.oppositeColor = allowed[0];
  }
}

function applyBackgroundColor() {
  const color = state.backgroundColor;
  scene.background = new THREE.Color(color);
  viewport.style.backgroundColor = color;
  canvas.style.backgroundColor = color;
}

function clampNum(value, min, max) {
  return THREE.MathUtils.clamp(Number(value), min, max);
}

function resolveEndpointColors() {
  const blendIntoBackgroundAtStart = controls.blendSide.value === 'start';
  return blendIntoBackgroundAtStart
    ? { startColor: state.backgroundColor, endColor: state.oppositeColor }
    : { startColor: state.oppositeColor, endColor: state.backgroundColor };
}

function buildTrail() {
  clearRoot();
  root.position.set(0, 0, 0);

  const endpointColors = resolveEndpointColors();
  const params = {
    startShape: controls.startShape.value,
    endShape: controls.endShape.value,
    startSize: clampNum(controls.startSize.value, 0.35, 2.6),
    endSize: clampNum(controls.endSize.value, 0.35, 2.6),
    globalScale: clampNum(controls.globalScale.value, 0.7, 1.8),
    trailLength: clampNum(controls.trailLength.value, 5, 12),
    startRot: THREE.MathUtils.degToRad(clampNum(controls.startRotation.value, -180, 180)),
    endRot: THREE.MathUtils.degToRad(clampNum(controls.endRotation.value, -180, 180)),
    thickness: clampNum(controls.thickness.value, 0.015, 0.12),
    renderMode: controls.renderMode.value,
    curvature: clampNum(controls.curvature.value, 0, 2.2),
    density: Math.round(clampNum(controls.density.value, 16, 86)),
    progression: controls.progression.value,
    fade: clampNum(controls.fade.value, 0, 0.75),
    rotX: THREE.MathUtils.degToRad(clampNum(controls.rotX.value, -180, 180)),
    rotY: THREE.MathUtils.degToRad(clampNum(controls.rotY.value, -180, 180)),
    rotZ: THREE.MathUtils.degToRad(clampNum(controls.rotZ.value, -180, 180)),
    startColor: new THREE.Color(endpointColors.startColor),
    endColor: new THREE.Color(endpointColors.endColor)
  };

  const isGraphic2d = params.renderMode === 'graphic2d';
  root.rotation.set(isGraphic2d ? 0 : params.rotX, isGraphic2d ? 0 : params.rotY, isGraphic2d ? 0 : params.rotZ);
  root.scale.setScalar(params.globalScale);

  const sampleCount = 84;
  const startBase = resamplePolygon(polygonByName(params.startShape), sampleCount);
  const endBase = resamplePolygon(polygonByName(params.endShape), sampleCount);
  const ease = EASING[params.progression] ?? EASING.linear;

  generatedTrails = [];

  for (let i = 0; i < params.density; i += 1) {
    const tRaw = params.density === 1 ? 0 : i / (params.density - 1);
    const t = ease(tRaw);
    const size = THREE.MathUtils.lerp(params.startSize, params.endSize, t);
    const shapeRot = THREE.MathUtils.lerp(params.startRot, params.endRot, t);
    const color = new THREE.Color().lerpColors(params.startColor, params.endColor, t);

    const spacingProgress = THREE.MathUtils.lerp(params.trailLength / 2, -params.trailLength / 2, tRaw);
    const centerX = Math.sin(t * Math.PI * 1.2) * params.curvature * 1.05;
    const centerY = Math.sin(t * Math.PI * 2.0 + 0.55) * params.curvature * 0.52 + spacingProgress * (isGraphic2d ? 0.34 : 0.12);
    const centerZ = isGraphic2d ? 0 : spacingProgress;

    const shapePoints = interpolateShape(startBase, endBase, t).map((point) => {
      const taper = isGraphic2d ? THREE.MathUtils.lerp(1.2, 0.62, tRaw) : 1;
      const rotated = point.clone().rotateAround(new THREE.Vector2(), shapeRot).multiplyScalar(size * taper);
      return new THREE.Vector3(rotated.x + centerX, rotated.y + centerY, centerZ);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(shapePoints);
    const opacity = THREE.MathUtils.lerp(
      isGraphic2d ? 0.96 : 1,
      Math.max(isGraphic2d ? 0.12 : 0.2, 1 - params.fade),
      tRaw
    );

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity
    });

    const line = new THREE.LineLoop(geometry, material);
    root.add(line);

    generatedTrails.push({
      points: shapePoints,
      color: color.getStyle(),
      thickness: params.thickness,
      opacity,
      renderMode: params.renderMode
    });
  }

  applyBackgroundColor();
  frameTrailInView();
}

function resize() {
  const { clientWidth, clientHeight } = viewport;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  frameTrailInView();
}

function updateFrame(delta) {
  state.time += delta;
}

function animate() {
  requestAnimationFrame(animate);
  updateFrame(clock.getDelta());
  renderer.render(scene, camera);
}

function downloadFile(name, dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = name;
  link.click();
}

function exportPng() {
  renderer.render(scene, camera);
  downloadFile('nexxa-trail.png', renderer.domElement.toDataURL('image/png'));
}

function exportSvg() {
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const projectedPaths = generatedTrails.map((trail) => {
    const projected = trail.points.map((point) => {
      const world = root.localToWorld(point.clone());
      const clip = world.project(camera);
      return {
        x: (clip.x * 0.5 + 0.5) * width,
        y: (1 - (clip.y * 0.5 + 0.5)) * height
      };
    });

    const d = projected.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const strokeScale = trail.renderMode === 'graphic2d' ? 56 : 48;
    return `<path d="${d} Z" fill="none" stroke="${trail.color}" stroke-opacity="${trail.opacity.toFixed(3)}" stroke-width="${(trail.thickness * strokeScale).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${state.backgroundColor}"/>
  ${projectedPaths.join('\n  ')}
</svg>`;

  downloadFile('nexxa-trail.svg', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) {
    return;
  }

  controls.startShape.value = preset.startShape;
  controls.endShape.value = preset.endShape;
  controls.startSize.value = preset.startSize;
  controls.endSize.value = preset.endSize;
  controls.globalScale.value = preset.globalScale;
  controls.trailLength.value = preset.trailLength;
  controls.startRotation.value = preset.startRotation;
  controls.endRotation.value = preset.endRotation;
  controls.thickness.value = preset.thickness;
  controls.curvature.value = preset.curvature;
  controls.density.value = preset.density;
  controls.progression.value = preset.progression;
  controls.fade.value = preset.fade;
  controls.blendSide.value = preset.blendSide;
  controls.rotX.value = preset.rotX;
  controls.rotY.value = preset.rotY;
  controls.rotZ.value = preset.rotZ;

  state.backgroundColor = preset.background;
  state.oppositeColor = preset.opposite;
  syncOppositeColor();
  renderSwatches();
  buildTrail();
}

function smartRandom() {
  const backgrounds = backgroundChoices();
  const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  state.backgroundColor = randomBackground;

  const allowedOpposites = allowedOppositeColors(randomBackground);
  state.oppositeColor = allowedOpposites[Math.floor(Math.random() * allowedOpposites.length)];

  controls.startShape.value = Math.random() > 0.5 ? 'triangle' : 'diamond';
  controls.endShape.value = Math.random() > 0.5 ? 'triangle' : 'diamond';
  controls.startSize.value = (0.7 + Math.random() * 1.2).toFixed(2);
  controls.endSize.value = (0.7 + Math.random() * 1.2).toFixed(2);
  controls.globalScale.value = (0.85 + Math.random() * 0.45).toFixed(2);
  controls.trailLength.value = (6.2 + Math.random() * 4.5).toFixed(1);
  controls.startRotation.value = Math.round(-90 + Math.random() * 180);
  controls.endRotation.value = Math.round(-90 + Math.random() * 180);
  controls.thickness.value = (0.038 + Math.random() * 0.028).toFixed(3);
  controls.curvature.value = (0.35 + Math.random() * 1.35).toFixed(2);
  controls.density.value = Math.round(36 + Math.random() * 32);
  controls.fade.value = (0.08 + Math.random() * 0.36).toFixed(2);
  controls.blendSide.value = Math.random() > 0.5 ? 'start' : 'end';
  controls.progression.value = ['linear', 'easeIn', 'easeOut', 'easeInOut'][Math.floor(Math.random() * 4)];
  controls.rotX.value = Math.round(-25 + Math.random() * 50);
  controls.rotY.value = Math.round(-40 + Math.random() * 80);
  controls.rotZ.value = Math.round(-25 + Math.random() * 50);

  renderSwatches();
  buildTrail();
}

[
  controls.renderMode,
  controls.startShape,
  controls.endShape,
  controls.startSize,
  controls.endSize,
  controls.globalScale,
  controls.trailLength,
  controls.startRotation,
  controls.endRotation,
  controls.thickness,
  controls.curvature,
  controls.density,
  controls.progression,
  controls.fade,
  controls.blendSide,
  controls.rotX,
  controls.rotY,
  controls.rotZ
].forEach((el) => {
  el.addEventListener('input', buildTrail);
});

controls.presetFlow01.addEventListener('click', () => applyPreset('flow01'));
controls.presetConvergence.addEventListener('click', () => applyPreset('convergence'));
controls.presetSignal.addEventListener('click', () => applyPreset('signal'));
controls.smartRandom.addEventListener('click', smartRandom);
controls.exportPng.addEventListener('click', exportPng);
controls.exportSvg.addEventListener('click', exportSvg);
window.addEventListener('resize', resize);

renderSwatches();
resize();
buildTrail();
animate();
