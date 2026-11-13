
// ============================================================
// LAVINA — HIPERTERMIA MAGNÉTICA EM NANOPARTÍCULAS DE Fe3O4
// Modelo baseado nas equações (2) e (3) do artigo ACS AMI 2025.
// Considera apenas relaxação de Néel: tau = tau_N.
// ============================================================

const MU0 = 4 * Math.PI * 1e-7;
const KB = 1.380649e-23;
const TAU0 = 1e-10;

const RHO_MAGNETITE = 5170; // kg/m³
const MS_MASS = 80;         // emu/g
const MS_VOLUME = MS_MASS * 1000 * 5.17; // A/m

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d1117, 0.006);

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

camera.position.set(72, 48, 105);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x0d1117, 1);

container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;

// Iluminação
scene.add(new THREE.AmbientLight(0xffffff, 0.75));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(60, 80, 100);
scene.add(keyLight);

const blueLight = new THREE.PointLight(0x3b82f6, 1.0, 250);
blueLight.position.set(-60, -30, -50);
scene.add(blueLight);

// Volume de visualização
const BOX = 62;

const box = new THREE.LineSegments(
  new THREE.WireframeGeometry(
    new THREE.BoxGeometry(BOX, BOX, BOX)
  ),
  new THREE.LineBasicMaterial({
    color: 0x526174,
    transparent: true,
    opacity: 0.55
  })
);

scene.add(box);

// Eixos
const axes = new THREE.AxesHelper(42);
axes.material.transparent = true;
axes.material.opacity = 0.35;
scene.add(axes);

// ============================================================
// CONSTRUÇÃO DAS SETAS
// ============================================================

function makeArrow(color, length, radius, headLength, headRadius) {
  const group = new THREE.Group();

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    metalness: 0.25,
    emissive: color,
    emissiveIntensity: 0.12
  });

  const shaftLength = Math.max(0.01, length - headLength);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, shaftLength, 12),
    material
  );

  shaft.position.y = shaftLength / 2;

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(headRadius, headLength, 16),
    material
  );

  head.position.y = shaftLength + headLength / 2;

  group.add(shaft);
  group.add(head);

  return group;
}

// ============================================================
// NANOPARTÍCULAS DE MAGNETITA
// ============================================================

const particles = [];

const particleMaterial = new THREE.MeshStandardMaterial({
  color: 0x7d91a8,
  roughness: 0.38,
  metalness: 0.45
});

const particleGeometry = new THREE.SphereGeometry(3.0, 24, 20);

const up = new THREE.Vector3(0, 1, 0);

function createParticles() {
  const count = 19;

  for (let i = 0; i < count; i++) {
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 46,
      (Math.random() - 0.5) * 46,
      (Math.random() - 0.5) * 46
    );

    const sphere = new THREE.Mesh(
      particleGeometry,
      particleMaterial
    );

    sphere.position.copy(pos);
    scene.add(sphere);

    const moment = makeArrow(
      0x35c978,
      13,
      0.55,
      3.8,
      1.7
    );

    moment.position.copy(pos);
    scene.add(moment);

    particles.push({
      sphere,
      moment
    });
  }
}

createParticles();

// ============================================================
// CAMPO MAGNÉTICO ALTERNADO
// ============================================================

const fieldArrow = makeArrow(
  0x58a6ff,
  29,
  0.85,
  7,
  3.0
);

fieldArrow.position.set(0, 0, 0);
scene.add(fieldArrow);

const fieldLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -34, 0),
    new THREE.Vector3(0, 34, 0)
  ]),
  new THREE.LineDashedMaterial({
    color: 0x58a6ff,
    dashSize: 2,
    gapSize: 1,
    transparent: true,
    opacity: 0.5
  })
);

fieldLine.computeLineDistances();
scene.add(fieldLine);

// Rótulo do campo
const labelCanvas = document.createElement('canvas');
labelCanvas.width = 512;
labelCanvas.height = 128;

const lctx = labelCanvas.getContext('2d');

lctx.fillStyle = '#58a6ff';
lctx.font = 'bold 54px Segoe UI';
lctx.textAlign = 'center';
lctx.fillText('H(t) — campo AC', 256, 78);

const labelTexture = new THREE.CanvasTexture(labelCanvas);

const labelSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false
  })
);

labelSprite.scale.set(37, 9, 1);
labelSprite.position.set(0, 39, 0);

scene.add(labelSprite);

// ============================================================
// HUD
// ============================================================

const hudScene = new THREE.Scene();

const hudCamera = new THREE.OrthographicCamera(
  -container.clientWidth / 2,
  container.clientWidth / 2,
  container.clientHeight / 2,
  -container.clientHeight / 2,
  0.1,
  10
);

hudCamera.position.z = 5;

const hudCanvas = document.createElement('canvas');
hudCanvas.width = 440;
hudCanvas.height = 150;

const hctx = hudCanvas.getContext('2d');

const hudTexture = new THREE.CanvasTexture(hudCanvas);

const hudSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: hudTexture,
    transparent: true,
    depthTest: false
  })
);

hudSprite.scale.set(440, 150, 1);
hudScene.add(hudSprite);

// Marca LAVINA
const wmCanvas = document.createElement('canvas');
wmCanvas.width = 340;
wmCanvas.height = 90;

const wctx = wmCanvas.getContext('2d');

wctx.fillStyle = '#fff';
wctx.font = '800 32px Segoe UI';
wctx.textAlign = 'right';
wctx.fillText('LAVINA', 330, 36);

wctx.fillStyle = '#58a6ff';
wctx.font = '700 14px Segoe UI';
wctx.fillText('IFGW • UNICAMP', 330, 62);

const wmTexture = new THREE.CanvasTexture(wmCanvas);

const wmSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: wmTexture,
    transparent: true,
    depthTest: false
  })
);

wmSprite.scale.set(250, 66, 1);
hudScene.add(wmSprite);

function layoutHUD() {
  const w = container.clientWidth;
  const h = container.clientHeight;

  hudCamera.left = -w / 2;
  hudCamera.right = w / 2;
  hudCamera.top = h / 2;
  hudCamera.bottom = -h / 2;

  hudCamera.updateProjectionMatrix();

  const scale = Math.min(1, w / 800);

  hudSprite.scale.set(
    440 * scale,
    150 * scale,
    1
  );

  hudSprite.position.set(
    -w / 2 + 230 * scale + 14,
    h / 2 - 85 * scale - 14,
    0
  );

  wmSprite.position.set(
    w / 2 - 135 * scale - 12,
    h / 2 - 42 * scale - 12,
    0
  );
}

function drawHUD(field, moment, phase) {
  hctx.clearRect(0, 0, 440, 150);

  hctx.fillStyle = 'rgba(13,17,23,.88)';
  hctx.strokeStyle = '#58a6ff';
  hctx.lineWidth = 3;

  hctx.beginPath();
  hctx.roundRect(0, 0, 440, 150, 12);
  hctx.fill();
  hctx.stroke();

  hctx.textAlign = 'left';
  hctx.fillStyle = '#58a6ff';
  hctx.font = 'bold 21px Segoe UI';
  hctx.fillText('CAMPO MAGNÉTICO ALTERNADO', 18, 34);

  hctx.fillStyle = '#c9d1d9';
  hctx.font = '17px Segoe UI';
  hctx.fillText(`H(t) ∝ ${field.toFixed(2)}`, 18, 68);

  hctx.fillStyle = '#35c978';
  hctx.fillText(
    `M(t) ∝ ${moment.toFixed(2)}   |   φ = ${phase.toFixed(1)}°`,
    18,
    101
  );

  hctx.fillStyle = '#8b949e';
  hctx.font = '13px Segoe UI';
  hctx.fillText(
    'Animação esquemática — tempo visual desacelerado',
    18,
    130
  );

  hudTexture.needsUpdate = true;
}

layoutHUD();

// ============================================================
// CÁLCULOS FÍSICOS — SISTEMA SI
// ============================================================

function calculateModel() {
  const T = Number(tempSlider.value);
  const dNm = Number(diameterSlider.value);
  const Kerg = Number(anisotropySlider.value) * 1e5;
  const H0Oe = Number(fieldSlider.value);
  const f = Number(frequencySlider.value) * 1e3;

  // Volume magnético da nanopartícula
  const radius = dNm * 1e-9 / 2;

  const V = (4 / 3) * Math.PI * Math.pow(radius, 3);

  // Conversão da anisotropia:
  // 1 erg/cm³ = 0.1 J/m³
  const K = Kerg * 0.1;

  // Equação (2): relaxação de Néel
  const tauN = TAU0 * Math.exp(
    K * V / (KB * T)
  );

  // Conversão Oe -> A/m
  const H0 = H0Oe * (1000 / (4 * Math.PI));

  // Susceptibilidade de equilíbrio
  const chi0 = (
    MU0 * MS_VOLUME * MS_VOLUME * V
  ) / (3 * KB * T);

  const omega = 2 * Math.PI * f;

  const omegaTau = omega * tauN;

  const phase = Math.atan(omegaTau);

  // Equação (3): potência volumétrica
  const pv = (
    MU0 *
    Math.PI *
    chi0 *
    H0 * H0 *
    f *
    (omegaTau / (1 + omegaTau * omegaTau))
  );

  // Conversão para potência específica
  const spaWkg = pv / RHO_MAGNETITE;

  return {
    T,
    dNm,
    Kerg,
    H0Oe,
    f,
    V,
    K,
    tauN,
    H0,
    chi0,
    omegaTau,
    phase,
    pv,
    spaWkg
  };
}

// ============================================================
// FORMATAÇÃO DOS RESULTADOS
// ============================================================

function formatTime(t) {
  if (!Number.isFinite(t)) return '∞';

  if (t < 1e-12) return (t * 1e15).toPrecision(3) + ' fs';
  if (t < 1e-9) return (t * 1e12).toPrecision(3) + ' ps';
  if (t < 1e-6) return (t * 1e9).toPrecision(3) + ' ns';
  if (t < 1e-3) return (t * 1e6).toPrecision(3) + ' µs';
  if (t < 1) return (t * 1e3).toPrecision(3) + ' ms';

  return t.toPrecision(3) + ' s';
}

function formatPower(x) {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';

  const a = Math.abs(x);

  if (a >= 1e6) return (x / 1e6).toPrecision(3) + ' MW/m³';
  if (a >= 1e3) return (x / 1e3).toPrecision(3) + ' kW/m³';
  if (a >= 1) return x.toPrecision(3) + ' W/m³';
  if (a >= 1e-3) return (x * 1e3).toPrecision(3) + ' mW/m³';

  return x.toExponential(2) + ' W/m³';
}

// ============================================================
// ATUALIZAÇÃO DA INTERFACE
// ============================================================

function updateReadouts() {
  const m = calculateModel();

  document.getElementById('tSliderVal').textContent = m.T;
  document.getElementById('diameterVal').textContent = m.dNm.toFixed(1);
  document.getElementById('anisotropyVal').textContent = (m.Kerg / 1e5).toFixed(1);
  document.getElementById('fieldVal').textContent = m.H0Oe;
  document.getElementById('frequencyVal').textContent = (m.f / 1e3).toFixed(0);

  document.getElementById('tauLabel').textContent = formatTime(m.tauN);
  document.getElementById('omegaTauLabel').textContent = m.omegaTau.toExponential(2);
  document.getElementById('powerLabel').textContent = formatPower(m.pv);
  document.getElementById('spaLabel').textContent = (m.spaWkg / 1000).toPrecision(3) + ' W/g';
  document.getElementById('phaseLabel').textContent = (m.phase * 180 / Math.PI).toFixed(2) + '°';
  document.getElementById('chiLabel').textContent = m.chi0.toExponential(2);

  const eq = document.getElementById('equationDisplay');

  eq.innerHTML =
    `$$\\tau_N=\\tau_0\\exp\\left(\\frac{K_{\\rm eff}V_{\\rm mag}}{k_BT}\\right)$$` +
    `<div class="equation-separator"></div>` +
    `$$P=\\mu_0\\pi\\chi_0H_0^2f\\frac{2\\pi f\\tau}{1+(2\\pi f\\tau)^2}$$` +
    `<div class="equation-caption">\\(\\tau=\\tau_N\\), \\(\\chi_0=\\mu_0M_s^2V_{\\rm mag}/(3k_BT)\\)</div>`;

  if (window.MathJax?.typesetPromise) {
    MathJax.typesetPromise([eq]).catch(() => {});
  }

  return m;
}

// Elementos da interface
const tempSlider = document.getElementById('tempSlider');
const diameterSlider = document.getElementById('diameterSlider');
const anisotropySlider = document.getElementById('anisotropySlider');
const fieldSlider = document.getElementById('fieldSlider');
const frequencySlider = document.getElementById('frequencySlider');

[
  tempSlider,
  diameterSlider,
  anisotropySlider,
  fieldSlider,
  frequencySlider
].forEach(el => {
  el.addEventListener('input', updateReadouts);
});

// ============================================================
// ACCORDION
// ============================================================

document.getElementById('infoToggleBtn').addEventListener('click', () => {
  const box = document.getElementById('infoBox');
  const icon = document.getElementById('accordionIcon');

  if (box.style.maxHeight) {
    box.style.maxHeight = null;
    icon.textContent = '+';
  } else {
    box.style.maxHeight = box.scrollHeight + 'px';
    icon.textContent = '−';
  }
});

// ============================================================
// ANIMAÇÃO DO CAMPO E DA MAGNETIZAÇÃO
// ============================================================

let visualTime = 0;

// Frequência visual reduzida para facilitar a observação.
// Não é a frequência experimental utilizada no cálculo.
const VISUAL_OMEGA = 1.35;

const clock = new THREE.Clock();

let lastModel = calculateModel();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  visualTime += dt;

  lastModel = calculateModel();

  // Campo alternado
  const h = Math.cos(VISUAL_OMEGA * visualTime);

  // Magnetização com atraso de fase
  const m = Math.cos(
    VISUAL_OMEGA * visualTime - lastModel.phase
  ) / Math.sqrt(1 + lastModel.omegaTau ** 2);

  const fieldSign = h >= 0 ? 1 : -1;
  const momentSign = m >= 0 ? 1 : -1;

  // Seta do campo magnético
  fieldArrow.visible = Math.abs(h) > 0.025;

  fieldArrow.scale.set(
    1,
    Math.max(0.025, Math.abs(h)),
    1
  );

  fieldArrow.quaternion.setFromUnitVectors(
    up,
    new THREE.Vector3(0, fieldSign, 0)
  );

  // Momentos magnéticos das nanopartículas
  particles.forEach(p => {
    const localPhase =
      visualTime * VISUAL_OMEGA - lastModel.phase;

    const localM = Math.cos(localPhase);

    const sign = localM >= 0 ? 1 : -1;

    const amplitude = Math.max(
      0.025,
      Math.abs(localM) / Math.sqrt(1 + lastModel.omegaTau ** 2)
    );

    const v = new THREE.Vector3(0, sign, 0);

    const q = new THREE.Quaternion().setFromUnitVectors(
      up,
      v
    );

    p.moment.quaternion.slerp(q, Math.min(1, dt * 7));

    p.moment.scale.set(1, amplitude, 1);

    p.moment.position.copy(p.sphere.position);
  });

  drawHUD(
    h,
    m,
    lastModel.phase * 180 / Math.PI
  );

  controls.update();

  renderer.clear();
  renderer.render(scene, camera);

  renderer.clearDepth();
  renderer.render(hudScene, hudCamera);
}

updateReadouts();
animate();

// ============================================================
// REDIMENSIONAMENTO
// ============================================================

window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);

  layoutHUD();
});

// ============================================================
// GRAVAÇÃO DE VÍDEO
// ============================================================

const recordBtn = document.getElementById('recordBtn');

let mediaRecorder = null;
let chunks = [];

recordBtn.addEventListener('click', () => {
  if (mediaRecorder?.state === 'recording') return;

  const seconds = Math.max(
    1,
    Math.min(
      60,
      parseInt(document.getElementById('recordDuration').value, 10) || 5
    )
  );

  const stream = renderer.domElement.captureStream(30);

  let mime = 'video/webm;codecs=vp9';

  if (!MediaRecorder.isTypeSupported(mime)) {
    mime = 'video/webm';
  }

  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')) {
    mime = 'video/mp4;codecs=avc1.42E01E';
  }

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: mime
  });

  chunks = [];

  mediaRecorder.ondataavailable = e => {
    if (e.data.size) {
      chunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, {
      type: mime
    });

    const url = URL.createObjectURL(blob);

    const raw =
      document.getElementById('recordFilename').value.trim() ||
      'lavina-hipertermia-magnetita';

    const ext = mime.includes('mp4') ? 'mp4' : 'webm';

    const a = document.createElement('a');

    a.href = url;
    a.download = `${raw}.${ext}`;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 30000);

    recordBtn.textContent = 'Gravar';
    recordBtn.classList.remove('recording');
    recordBtn.disabled = false;
  };

  mediaRecorder.start();

  recordBtn.disabled = true;
  recordBtn.classList.add('recording');

  let elapsed = 0;

  recordBtn.textContent = `Gravando... (0s / ${seconds}s)`;

  const timer = setInterval(() => {
    elapsed++;

    recordBtn.textContent =
      `Gravando... (${elapsed}s / ${seconds}s)`;

    if (elapsed >= seconds) {
      clearInterval(timer);

      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }
  }, 1000);
});
