import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { Line2 } from 'https://unpkg.com/three@0.164.1/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'https://unpkg.com/three@0.164.1/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'https://unpkg.com/three@0.164.1/examples/jsm/lines/LineMaterial.js';

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

const PRESETS = {
  flow01: {
    startShape: 'triangle', endShape: 'diamond', startSize: 1.15, endSize: 0.82, startRotation: -8, endRotation: 42,
    thickness: 0.052, density: 56, trailAngle: 22, rotX: 12, rotY: -18, rotZ: 6, globalScale: 1.02, trailLength: 8.8,
    fade: 0.22, background: BRAND_COLORS.darkGreen, start: BRAND_COLORS.mediumGreen, end: BRAND_COLORS.darkGreen
  },
  convergence: {
    startShape: 'diamond', endShape: 'diamond', startSize: 1.42, endSize: 0.62, startRotation: 0, endRotation: 112,
    thickness: 0.058, density: 62, trailAngle: 300, rotX: 18, rotY: -14, rotZ: 14, globalScale: 0.98, trailLength: 9.3,
    fade: 0.3, background: BRAND_COLORS.lightGray, start: BRAND_COLORS.lightGray, end: BRAND_COLORS.darkGreen
  },
  signal: {
    startShape: 'triangle', endShape: 'triangle', startSize: 0.9, endSize: 1.46, startRotation: -66, endRotation: 14,
    thickness: 0.048, density: 48, trailAngle: 70, rotX: 8, rotY: -24, rotZ: -4, globalScale: 1.08, trailLength: 7.1,
    fade: 0.16, background: BRAND_COLORS.mediumGray, start: BRAND_COLORS.coral, end: BRAND_COLORS.mediumGray
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
  trailAngle: document.getElementById('trailAngle'),
  startRotation: document.getElementById('startRotation'),
  endRotation: document.getElementById('endRotation'),
  thickness: document.getElementById('thickness'),
  density: document.getElementById('density'),
  fade: document.getElementById('fade'),
  rotX: document.getElementById('rotX'),
  rotY: document.getElementById('rotY'),
  rotZ: document.getElementById('rotZ'),
  bgSwatches: document.getElementById('bgSwatches'),
  startSwatches: document.getElementById('startSwatches'),
  endSwatches: document.getElementById('endSwatches'),
  presetFlow01: document.getElementById('presetFlow01'),
  presetConvergence: document.getElementById('presetConvergence'),
  presetSignal: document.getElementById('presetSignal'),
  exportPng: document.getElementById('exportPng'),
  exportSvg: document.getElementById('exportSvg')
};

const state = {
  backgroundColor: BRAND_COLORS.darkGreen,
  startColor: BRAND_COLORS.mediumGreen,
  endColor: BRAND_COLORS.darkGreen,
  renderMode: 'graphic2d',
  time: 0,
  hasAppliedDefault3DView: false
};

const DEFAULT_3D_ORIENTATION = Object.freeze({
  rotX: 26,
  rotY: -34,
  rotZ: 12
});

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
let camera2D;
let camera3D;
let activeCamera;
let root;
let trailGroup;
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
camera2D = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100);
camera2D.position.set(0, 0, 10);
camera2D.lookAt(0, 0, 0);
camera3D = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
camera3D.position.set(0, 0, 12);
camera3D.lookAt(0, 0, 0);
activeCamera = camera2D;
root = new THREE.Group();
trailGroup = new THREE.Group();
root.add(trailGroup);
scene.add(root);

function polygonByName(name) {
  const rounded = (vertices, radius) => roundedPolygon(vertices, radius, 7);

  if (name === 'triangle') {
    return rounded([
      new THREE.Vector2(0, 1),
      new THREE.Vector2(-0.95, -0.78),
      new THREE.Vector2(0.95, -0.78)
    ], 0.17);
  }

  return rounded([
    new THREE.Vector2(0, 1),
    new THREE.Vector2(-0.88, 0),
    new THREE.Vector2(0, -1),
    new THREE.Vector2(0.88, 0)
  ], 0.16);
}

function roundedPolygon(vertices, radius, arcSegments = 12) {
  if (vertices.length < 3 || radius <= 0) {
    return vertices.map((point) => point.clone());
  }

  const result = [];
  for (let i = 0; i < vertices.length; i += 1) {
    const prev = vertices[(i - 1 + vertices.length) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    const inVec = prev.clone().sub(curr);
    const outVec = next.clone().sub(curr);
    const inLen = inVec.length();
    const outLen = outVec.length();

    if (inLen < 1e-5 || outLen < 1e-5) {
      result.push(curr.clone());
      continue;
    }

    const inDir = inVec.clone().divideScalar(inLen);
    const outDir = outVec.clone().divideScalar(outLen);
    const cornerAngle = Math.acos(THREE.MathUtils.clamp(inDir.dot(outDir), -1, 1));
    const safeAngle = Math.max(cornerAngle, 0.01);
    const maxRadius = Math.min(radius, inLen * 0.45, outLen * 0.45);
    const tangentDistance = maxRadius / Math.tan(safeAngle / 2);

    const start = curr.clone().add(inDir.multiplyScalar(tangentDistance));
    const end = curr.clone().add(outDir.multiplyScalar(tangentDistance));

    for (let seg = 0; seg <= arcSegments; seg += 1) {
      const t = seg / arcSegments;
      const a = start.clone().multiplyScalar((1 - t) * (1 - t));
      const b = curr.clone().multiplyScalar(2 * (1 - t) * t);
      const c = end.clone().multiplyScalar(t * t);
      result.push(a.add(b).add(c));
    }
  }

  return result;
}

function alignPointSets(a, b) {
  if (a.length !== b.length || a.length === 0) {
    return b;
  }

  let bestOffset = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset < b.length; offset += 1) {
    let score = 0;
    for (let i = 0; i < a.length; i += 1) {
      const j = (i + offset) % b.length;
      score += a[i].distanceToSquared(b[j]);
    }
    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  const aligned = [];
  for (let i = 0; i < b.length; i += 1) {
    aligned.push(b[(i + bestOffset) % b.length].clone());
  }
  return aligned;
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

function clearGroup(group) {
  while (group.children.length > 0) {
    const child = group.children[group.children.length - 1];
    group.remove(child);
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      child.material.dispose();
    }
  }
}

function frameTrailInView() {
  const previousScale = trailGroup.scale.clone();
  trailGroup.scale.setScalar(1);
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  trailGroup.scale.copy(previousScale);
  if (box.isEmpty()) {
    if (state.renderMode === 'vector3d') {
      camera3D.position.set(2.2, 1.4, 12);
      camera3D.near = 0.1;
      camera3D.far = 200;
      camera3D.lookAt(0, 0, 0);
      camera3D.updateProjectionMatrix();
    } else {
      camera2D.left = -6;
      camera2D.right = 6;
      camera2D.top = 6;
      camera2D.bottom = -6;
      camera2D.position.set(0, 0, 10);
      camera2D.near = 0.1;
      camera2D.far = 100;
      camera2D.lookAt(0, 0, 0);
      camera2D.updateProjectionMatrix();
    }
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);

  const size = box.getSize(new THREE.Vector3());
  if (state.renderMode === 'vector3d') {
    const aspect = Math.max(0.01, camera3D.aspect);
    const paddedHalfHeight = Math.max(2.4, size.y * 0.7);
    const paddedHalfWidth = Math.max(2.4, size.x * 0.7);
    const fitHeight = paddedHalfHeight;
    const fitWidth = paddedHalfWidth / aspect;
    const fit = Math.max(fitHeight, fitWidth);
    const distance = fit / Math.tan(THREE.MathUtils.degToRad(camera3D.fov * 0.5)) + size.z * 1.2 + 2.4;

    camera3D.position.set(distance * 0.18, distance * 0.12, distance);
    camera3D.near = 0.1;
    camera3D.far = Math.max(120, distance + size.length() * 6);
    camera3D.lookAt(0, 0, 0);
    camera3D.updateProjectionMatrix();
  } else {
    const halfW = Math.max(2.4, size.x * 0.64);
    const halfH = Math.max(2.4, size.y * 0.64);
    const aspect = Math.max(0.01, camera2D.aspect);

    if (halfW / halfH > aspect) {
      camera2D.left = -halfW;
      camera2D.right = halfW;
      camera2D.top = halfW / aspect;
      camera2D.bottom = -halfW / aspect;
    } else {
      camera2D.left = -halfH * aspect;
      camera2D.right = halfH * aspect;
      camera2D.top = halfH;
      camera2D.bottom = -halfH;
    }

    camera2D.position.set(0, 0, 10);
    camera2D.near = 0.1;
    camera2D.far = 100;
    camera2D.lookAt(0, 0, 0);
    camera2D.updateProjectionMatrix();
  }
}

function toHexUpper(color) {
  return color.toUpperCase();
}

function backgroundChoices() {
  return BACKGROUND_COLOR_KEYS.map((key) => BRAND_COLORS[key]);
}

function allowedTrailColors(backgroundColor) {
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
  controls.startSwatches.innerHTML = '';
  controls.endSwatches.innerHTML = '';

  backgroundChoices().forEach((color) => {
    const active = toHexUpper(state.backgroundColor) === toHexUpper(color);
    controls.bgSwatches.appendChild(makeSwatch(color, `Background ${color}`, () => {
      state.backgroundColor = color;
      syncTrailPalette();
      syncTrailEndpointRule('background');
      renderSwatches();
      buildTrail();
    }, active));
  });

  const trailPalette = [
    state.backgroundColor,
    ...allowedTrailColors(state.backgroundColor)
  ];

  trailPalette.forEach((color) => {
    const isActive = toHexUpper(state.startColor) === toHexUpper(color);
    controls.startSwatches.appendChild(makeSwatch(color, `Start ${color}`, () => {
      state.startColor = color;
      syncTrailEndpointRule('start');
      renderSwatches();
      buildTrail();
    }, isActive));
  });

  trailPalette.forEach((color) => {
    const isActive = toHexUpper(state.endColor) === toHexUpper(color);
    controls.endSwatches.appendChild(makeSwatch(color, `End ${color}`, () => {
      state.endColor = color;
      syncTrailEndpointRule('end');
      renderSwatches();
      buildTrail();
    }, isActive));
  });
}

function syncTrailEndpointRule(changedSide = 'background') {
  const bg = toHexUpper(state.backgroundColor);
  const startMatches = toHexUpper(state.startColor) === bg;
  const endMatches = toHexUpper(state.endColor) === bg;

  if (!startMatches && !endMatches) {
    if (changedSide === 'start') {
      state.endColor = state.backgroundColor;
    } else {
      state.startColor = state.backgroundColor;
    }
  }
}

function syncTrailPalette() {
  const allowed = new Set([toHexUpper(state.backgroundColor), ...allowedTrailColors(state.backgroundColor).map(toHexUpper)]);
  if (!allowed.has(toHexUpper(state.startColor))) {
    state.startColor = state.backgroundColor;
  }
  if (!allowed.has(toHexUpper(state.endColor))) {
    state.endColor = state.backgroundColor;
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
  return { startColor: state.startColor, endColor: state.endColor };
}

function buildTrail() {
  clearGroup(trailGroup);
  root.position.set(0, 0, 0);

  const renderMode = controls.renderMode.value;
  const is3DMode = renderMode === 'vector3d';
  state.renderMode = renderMode;
  activeCamera = is3DMode ? camera3D : camera2D;

  const endpointColors = resolveEndpointColors();
  const params = {
    startShape: controls.startShape.value,
    endShape: controls.endShape.value,
    startSize: clampNum(controls.startSize.value, 0.35, 2.6),
    endSize: clampNum(controls.endSize.value, 0.35, 2.6),
    globalScale: clampNum(controls.globalScale.value, 0.5, 2.2),
    trailLength: clampNum(controls.trailLength.value, 3, 16),
    trailAngle: THREE.MathUtils.degToRad(clampNum(controls.trailAngle.value, 0, 360)),
    startRot: THREE.MathUtils.degToRad(clampNum(controls.startRotation.value, -180, 180)),
    endRot: THREE.MathUtils.degToRad(clampNum(controls.endRotation.value, -180, 180)),
    thickness: clampNum(controls.thickness.value, 0.015, 0.12),
    density: Math.round(clampNum(controls.density.value, 16, 96)),
    fade: clampNum(controls.fade.value, 0, 0.75),
    rotX: is3DMode ? THREE.MathUtils.degToRad(clampNum(controls.rotX.value, -180, 180)) : 0,
    rotY: is3DMode ? THREE.MathUtils.degToRad(clampNum(controls.rotY.value, -180, 180)) : 0,
    rotZ: is3DMode ? THREE.MathUtils.degToRad(clampNum(controls.rotZ.value, -180, 180)) : 0,
    startColor: new THREE.Color(endpointColors.startColor),
    endColor: new THREE.Color(endpointColors.endColor)
  };

  trailGroup.position.set(0, 0, 0);
  trailGroup.rotation.set(params.rotX, params.rotY, params.rotZ);
  const pronouncedGlobalScale = THREE.MathUtils.lerp(0.35, 3.2, (params.globalScale - 0.5) / 1.7);
  trailGroup.scale.setScalar(pronouncedGlobalScale);

  const sampleCount = 192;
  const startBase = resamplePolygon(polygonByName(params.startShape), sampleCount);
  const endBaseRaw = resamplePolygon(polygonByName(params.endShape), sampleCount);
  const endBase = alignPointSets(startBase, endBaseRaw);
  const direction2D = new THREE.Vector2(Math.cos(params.trailAngle), Math.sin(params.trailAngle));
  const direction3D = new THREE.Vector3(0.72, 0.28, 1).normalize();
  const trailSteps = Math.min(240, Math.max(params.density, Math.round(params.density * 1.8)));

  generatedTrails = [];

  for (let i = 0; i < trailSteps; i += 1) {
    const t = trailSteps === 1 ? 0 : i / (trailSteps - 1);
    const size = THREE.MathUtils.lerp(params.startSize, params.endSize, t);
    const shapeRot = THREE.MathUtils.lerp(params.startRot, params.endRot, t);
    const color = new THREE.Color().lerpColors(params.startColor, params.endColor, t);

    const offset = THREE.MathUtils.lerp(-params.trailLength / 2, params.trailLength / 2, t);
    const center = is3DMode
      ? direction3D.clone().multiplyScalar(offset)
      : new THREE.Vector3(direction2D.x * offset, direction2D.y * offset, 0);

    const shapePoints = interpolateShape(startBase, endBase, t).map((point) => {
      const rotated = point.clone().rotateAround(new THREE.Vector2(), shapeRot).multiplyScalar(size);
      return new THREE.Vector3(rotated.x + center.x, rotated.y + center.y, center.z);
    });

    const opacity = THREE.MathUtils.lerp(1, Math.max(0.2, 1 - params.fade), t);

    const positions = [];
    shapePoints.forEach((p) => {
      positions.push(p.x, p.y, p.z);
    });
    const first = shapePoints[0];
    positions.push(first.x, first.y, first.z);

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const material = new LineMaterial({
      color,
      transparent: true,
      opacity,
      linewidth: params.thickness * 0.22,
      worldUnits: true
    });
    material.resolution.set(viewport.clientWidth, viewport.clientHeight);

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    trailGroup.add(line);

    generatedTrails.push({
      points: shapePoints,
      color: color.getStyle(),
      thickness: params.thickness,
      opacity
    });
  }

  applyBackgroundColor();
  frameTrailInView();
}

function resize() {
  const { clientWidth, clientHeight } = viewport;
  renderer.setSize(clientWidth, clientHeight, false);
  const aspect = clientWidth / clientHeight;
  camera2D.aspect = aspect;
  camera2D.updateProjectionMatrix();
  camera3D.aspect = aspect;
  camera3D.updateProjectionMatrix();

  trailGroup.children.forEach((child) => {
    if (child.material && child.material.resolution) {
      child.material.resolution.set(clientWidth, clientHeight);
    }
  });

  frameTrailInView();
}

function updateFrame(delta) {
  state.time += delta;
}

function animate() {
  requestAnimationFrame(animate);
  updateFrame(clock.getDelta());
  renderer.render(scene, activeCamera);
}

function downloadFile(name, dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = name;
  link.click();
}

function exportPng() {
  renderer.render(scene, activeCamera);
  downloadFile('nexxa-trail.png', renderer.domElement.toDataURL('image/png'));
}

function exportSvg() {
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const projectedPaths = generatedTrails.map((trail) => {
    const projected = trail.points.map((point) => {
      const world = trailGroup.localToWorld(point.clone());
      const clip = world.project(activeCamera);
      return {
        x: (clip.x * 0.5 + 0.5) * width,
        y: (1 - (clip.y * 0.5 + 0.5)) * height
      };
    });

    const d = projected.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    return `<path d="${d} Z" fill="none" stroke="${trail.color}" stroke-opacity="${trail.opacity.toFixed(3)}" stroke-width="${(trail.thickness * 56).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"/>`;
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
  controls.trailAngle.value = preset.trailAngle;
  controls.startRotation.value = preset.startRotation;
  controls.endRotation.value = preset.endRotation;
  controls.thickness.value = preset.thickness;
  controls.density.value = preset.density;
  controls.fade.value = preset.fade;
  controls.rotX.value = preset.rotX;
  controls.rotY.value = preset.rotY;
  controls.rotZ.value = preset.rotZ;

  state.backgroundColor = preset.background;
  state.startColor = preset.start;
  state.endColor = preset.end;
  syncTrailPalette();
  syncTrailEndpointRule('background');
  renderSwatches();
  buildTrail();
}

function syncModeUi() {
  const is3DMode = controls.renderMode.value === 'vector3d';
  controls.trailAngle.disabled = is3DMode;
  controls.rotX.disabled = !is3DMode;
  controls.rotY.disabled = !is3DMode;
  controls.rotZ.disabled = !is3DMode;

  if (is3DMode && !state.hasAppliedDefault3DView) {
    controls.rotX.value = DEFAULT_3D_ORIENTATION.rotX;
    controls.rotY.value = DEFAULT_3D_ORIENTATION.rotY;
    controls.rotZ.value = DEFAULT_3D_ORIENTATION.rotZ;
    state.hasAppliedDefault3DView = true;
    buildTrail();
  }
}

[
  controls.renderMode,
  controls.startShape,
  controls.endShape,
  controls.startSize,
  controls.endSize,
  controls.globalScale,
  controls.trailLength,
  controls.trailAngle,
  controls.startRotation,
  controls.endRotation,
  controls.thickness,
  controls.density,
  controls.fade,
  controls.rotX,
  controls.rotY,
  controls.rotZ
].forEach((el) => {
  el.addEventListener('input', buildTrail);
});

controls.renderMode.addEventListener('input', syncModeUi);

controls.presetFlow01.addEventListener('click', () => applyPreset('flow01'));
controls.presetConvergence.addEventListener('click', () => applyPreset('convergence'));
controls.presetSignal.addEventListener('click', () => applyPreset('signal'));
controls.exportPng.addEventListener('click', exportPng);
controls.exportSvg.addEventListener('click', exportSvg);
window.addEventListener('resize', resize);

renderSwatches();
resize();
syncModeUi();
buildTrail();
animate();
