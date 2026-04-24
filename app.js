import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const canvas = document.getElementById('scene');
const viewport = document.querySelector('.viewport');
const fallbackEl = document.getElementById('sceneFallback');

const controls = {
  startShape: document.getElementById('startShape'),
  endShape: document.getElementById('endShape'),
  startSize: document.getElementById('startSize'),
  endSize: document.getElementById('endSize'),
  startRotation: document.getElementById('startRotation'),
  endRotation: document.getElementById('endRotation'),
  thickness: document.getElementById('thickness'),
  curvature: document.getElementById('curvature'),
  density: document.getElementById('density'),
  rotX: document.getElementById('rotX'),
  rotY: document.getElementById('rotY'),
  rotZ: document.getElementById('rotZ'),
  startColor: document.getElementById('startColor'),
  endColor: document.getElementById('endColor'),
  bgColor: document.getElementById('bgColor'),
  exportPng: document.getElementById('exportPng'),
  exportSvg: document.getElementById('exportSvg')
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

const lightA = new THREE.DirectionalLight(0xffffff, 1.0);
lightA.position.set(3, 2, 6);
scene.add(lightA);

const lightB = new THREE.DirectionalLight(0x85ff98, 0.35);
lightB.position.set(-2, -1.5, -3);
scene.add(lightB);

scene.add(new THREE.AmbientLight(0xffffff, 0.22));

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
    child.geometry.dispose();
    child.material.dispose();
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
  const radius = Math.max(sphere.radius, 1);
  const fitHeightDistance = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = 1.3 * Math.max(fitHeightDistance, fitWidthDistance);

  camera.position.set(0, 0, distance);
  camera.near = Math.max(0.1, distance - radius * 3);
  camera.far = distance + radius * 3;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function applyBackgroundColor() {
  const color = controls.bgColor.value;
  scene.background = new THREE.Color(color);
  viewport.style.backgroundColor = color;
  canvas.style.backgroundColor = color;
}

function buildTrail() {
  clearRoot();
  root.position.set(0, 0, 0);

  const params = {
    startShape: controls.startShape.value,
    endShape: controls.endShape.value,
    startSize: Number(controls.startSize.value),
    endSize: Number(controls.endSize.value),
    startRot: THREE.MathUtils.degToRad(Number(controls.startRotation.value)),
    endRot: THREE.MathUtils.degToRad(Number(controls.endRotation.value)),
    thickness: Number(controls.thickness.value),
    curvature: Number(controls.curvature.value),
    density: Number(controls.density.value),
    rotX: THREE.MathUtils.degToRad(Number(controls.rotX.value)),
    rotY: THREE.MathUtils.degToRad(Number(controls.rotY.value)),
    rotZ: THREE.MathUtils.degToRad(Number(controls.rotZ.value)),
    startColor: new THREE.Color(controls.startColor.value),
    endColor: new THREE.Color(controls.endColor.value)
  };

  root.rotation.set(params.rotX, params.rotY, params.rotZ);

  const sampleCount = 84;
  const startBase = resamplePolygon(polygonByName(params.startShape), sampleCount);
  const endBase = resamplePolygon(polygonByName(params.endShape), sampleCount);

  generatedTrails = [];

  for (let i = 0; i < params.density; i += 1) {
    const t = params.density === 1 ? 0 : i / (params.density - 1);
    const size = THREE.MathUtils.lerp(params.startSize, params.endSize, t);
    const shapeRot = THREE.MathUtils.lerp(params.startRot, params.endRot, t);
    const color = new THREE.Color().lerpColors(params.startColor, params.endColor, t);

    const centerX = Math.sin(t * Math.PI * 1.4) * params.curvature * 1.45;
    const centerY = Math.sin(t * Math.PI * 2.25 + 0.65) * params.curvature * 0.7;
    const centerZ = THREE.MathUtils.lerp(4.3, -4.3, t);

    const shapePoints = interpolateShape(startBase, endBase, t).map((point) => {
      const rotated = point.clone().rotateAround(new THREE.Vector2(), shapeRot).multiplyScalar(size);
      return new THREE.Vector3(rotated.x + centerX, rotated.y + centerY, centerZ);
    });

    const curve = new THREE.CatmullRomCurve3(shapePoints, true, 'catmullrom', 0.7);
    const tube = new THREE.TubeGeometry(curve, sampleCount, params.thickness, 7, true);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.28,
      transparent: true,
      opacity: 0.98
    });

    const mesh = new THREE.Mesh(tube, material);
    root.add(mesh);

    generatedTrails.push({ points: shapePoints, color: color.getStyle(), thickness: params.thickness });
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

function animate() {
  requestAnimationFrame(animate);
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
    return `<path d="${d} Z" fill="none" stroke="${trail.color}" stroke-width="${(trail.thickness * 60).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${controls.bgColor.value}"/>
  ${projectedPaths.join('\n  ')}
</svg>`;

  downloadFile('nexxa-trail.svg', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

Object.values(controls).forEach((el) => {
  if (el instanceof HTMLElement && ['INPUT', 'SELECT'].includes(el.tagName)) {
    el.addEventListener('input', buildTrail);
  }
});

controls.exportPng.addEventListener('click', exportPng);
controls.exportSvg.addEventListener('click', exportSvg);
window.addEventListener('resize', resize);

resize();
applyBackgroundColor();
buildTrail();
animate();
