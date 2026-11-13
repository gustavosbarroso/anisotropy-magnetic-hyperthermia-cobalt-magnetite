
/* ============================================================
   LAVINA — HIPERTERMIA MAGNÉTICA EM NANOPARTÍCULAS DE Fe3O4
   Modelo baseado nas equações (2) e (3) do artigo ACS AMI 2025

   Equação (2): relaxação de Néel
   Equação (3): potência dissipada

   A animação é esquemática. A frequência visual é reduzida
   para permitir observar a oscilação e as ondas térmicas.
   ============================================================ */

(() => {
  'use strict';

  // ----------------------------------------------------------
  // 1. VERIFICAÇÃO DA BIBLIOTECA E DO CONTAINER
  // ----------------------------------------------------------

  if (typeof THREE === 'undefined') {
    console.error('Three.js não foi carregado.');
    return;
  }

  const container = document.getElementById('canvas-container');

  if (!container) {
    console.error('Container #canvas-container não encontrado.');
    return;
  }

  const OrbitControlsClass =
    THREE.OrbitControls || window.OrbitControls;

  // ----------------------------------------------------------
  // 2. CONSTANTES FÍSICAS
  // ----------------------------------------------------------

  const MU0 = 4 * Math.PI * 1e-7;
  const KB = 1.380649e-23;
  const TAU0 = 1e-10;

  const RHO_MAGNETITE = 5170;
  const MS_MASS = 80;
  const MS_VOLUME = MS_MASS * 1000 * 5.17;

  // ----------------------------------------------------------
  // 3. ELEMENTOS DA INTERFACE
  // ----------------------------------------------------------

  const tempSlider = document.getElementById('tempSlider');
  const diameterSlider = document.getElementById('diameterSlider');
  const anisotropySlider = document.getElementById('anisotropySlider');
  const fieldSlider = document.getElementById('fieldSlider');
  const frequencySlider = document.getElementById('frequencySlider');

  // ----------------------------------------------------------
  // 4. CENA THREE.JS
  // ----------------------------------------------------------

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.0025);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    1000
  );

  camera.position.set(72, 48, 105);

  // CORREÇÃO PRINCIPAL: câmera direcionada ao centro.
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0d1117, 1);

  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  container.appendChild(renderer.domElement);

  let controls = null;

  if (OrbitControlsClass) {
    controls = new OrbitControlsClass(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 35;
    controls.maxDistance = 220;
    controls.update();
  } else {
    console.warn('OrbitControls não foi encontrado. A cena funcionará sem órbita.');
  }

  // ----------------------------------------------------------
  // 5. ILUMINAÇÃO
  // ----------------------------------------------------------

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const directional = new THREE.DirectionalLight(0xffffff, 1.5);
  directional.position.set(50, 80, 100);
  scene.add(directional);

  const blueLight = new THREE.PointLight(0x3388ff, 1.5, 200);
  blueLight.position.set(-50, 20, 40);
  scene.add(blueLight);

  const orangeLight = new THREE.PointLight(0xff7b35, 0.8, 70);
  orangeLight.position.set(0, 0, 0);
  scene.add(orangeLight);

  // ----------------------------------------------------------
  // 6. VOLUME DE VISUALIZAÇÃO
  // ----------------------------------------------------------

  const BOX_SIZE = 62;

  const boxGeometry = new THREE.BoxGeometry(
    BOX_SIZE,
    BOX_SIZE,
    BOX_SIZE
  );

  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(boxGeometry),
    new THREE.LineBasicMaterial({
      color: 0x526174,
      transparent: true,
      opacity: 0.45
    })
  );

  scene.add(box);

  const axes = new THREE.AxesHelper(42);
  axes.material.transparent = true;
  axes.material.opacity = 0.3;
  scene.add(axes);

  // ----------------------------------------------------------
  // 7. FUNÇÃO PARA CRIAR VETORES
  // ----------------------------------------------------------

  function createArrow(color, length, radius = 0.5) {
    const group = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.25,
      metalness: 0.2,
      roughness: 0.35
    });

    const shaftLength = length * 0.72;
    const headLength = length * 0.28;

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius,
        radius,
        shaftLength,
        16
      ),
      material
    );

    shaft.position.y = shaftLength / 2;

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(
        radius * 2.8,
        headLength,
        20
      ),
      material
    );

    head.position.y = shaftLength + headLength / 2;

    group.add(shaft);
    group.add(head);

    return group;
  }

  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  // ----------------------------------------------------------
  // 8. NANOPARTÍCULAS
  // ----------------------------------------------------------

  const particles = [];

  const particleGeometry = new THREE.SphereGeometry(
    2.5,
    32,
    24
  );

  const particleMaterial = new THREE.MeshStandardMaterial({
    color: 0x91a4b8,
    metalness: 0.45,
    roughness: 0.28
  });

  const heroMaterial = new THREE.MeshStandardMaterial({
    color: 0xa9c0d8,
    metalness: 0.5,
    roughness: 0.2,
    emissive: 0x18344c,
    emissiveIntensity: 0.5
  });

  let heroParticle = null;

  function createParticle(position, isHero = false) {
    const sphere = new THREE.Mesh(
      particleGeometry,
      isHero ? heroMaterial : particleMaterial
    );

    sphere.position.copy(position);

    if (isHero) {
      sphere.scale.setScalar(1.75);
    }

    scene.add(sphere);

    const moment = createArrow(
      0x35d07f,
      isHero ? 17 : 11,
      isHero ? 0.65 : 0.42
    );

    moment.position.copy(position);
    scene.add(moment);

    const particle = {
      sphere,
      moment,
      basePosition: position.clone(),
      isHero
    };

    particles.push(particle);

    if (isHero) {
      heroParticle = particle;
    }

    return particle;
  }

  // Partícula central.
  createParticle(new THREE.Vector3(0, 0, 0), true);

  // Partículas secundárias.
  const secondaryPositions = [
    [-19, 13, -13],
    [19, 15, 12],
    [-18, -15, 15],
    [18, -14, -15],
    [-8, 23, 16],
    [10, -23, -12],
    [25, 3, -4],
    [-25, 2, 5],
    [8, 8, 25],
    [-9, -8, -25],
    [23, 19, -19],
    [-22, -20, -18],
    [0, 24, 0],
    [0, -24, 0]
  ];

  secondaryPositions.forEach(pos => {
    createParticle(new THREE.Vector3(pos[0], pos[1], pos[2]));
  });

  // ----------------------------------------------------------
  // 9. CAMPO MAGNÉTICO ALTERNADO
  // ----------------------------------------------------------

  const fieldArrow = createArrow(
    0x58a6ff,
    30,
    0.85
  );

  scene.add(fieldArrow);

  const fieldLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -36, 0),
    new THREE.Vector3(0, 36, 0)
  ]);

  const fieldLine = new THREE.Line(
    fieldLineGeometry,
    new THREE.LineDashedMaterial({
      color: 0x58a6ff,
      dashSize: 2,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.5
    })
  );

  fieldLine.computeLineDistances();
  scene.add(fieldLine);

  // ----------------------------------------------------------
  // 10. RÓTULO DO CAMPO
  // ----------------------------------------------------------

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;

  const labelContext = labelCanvas.getContext('2d');

  labelContext.fillStyle = '#58a6ff';
  labelContext.font = 'bold 48px Arial';
  labelContext.textAlign = 'center';
  labelContext.fillText('H(t) — CAMPO AC', 256, 78);

  const labelTexture = new THREE.CanvasTexture(labelCanvas);

  const fieldLabel = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthTest: false
    })
  );

  fieldLabel.scale.set(38, 9, 1);
  fieldLabel.position.set(0, 41, 0);
  scene.add(fieldLabel);

  // ----------------------------------------------------------
  // 11. ONDAS TÉRMICAS
  // ----------------------------------------------------------

  // Ondas esféricas concêntricas representando a dissipação
  // térmica no meio. São uma representação esquemática.

  const heatWaves = [];

  const waveGeometry = new THREE.SphereGeometry(
    1,
    36,
    24
  );

  const waveMaterialBase = new THREE.MeshBasicMaterial({
    color: 0xff9c45,
    wireframe: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false
  });

  let emissionClock = 0;

  function emitHeatWave(intensity) {
    const material = waveMaterialBase.clone();

    material.opacity = 0.25 + 0.65 * intensity;

    const wave = new THREE.Mesh(
      waveGeometry,
      material
    );

    wave.position.copy(heroParticle.sphere.position);
    wave.scale.setScalar(1.0);

    scene.add(wave);

    heatWaves.push({
      mesh: wave,
      age: 0,
      lifetime: 2.6,
      intensity
    });
  }

  function updateHeatWaves(dt, model) {
    const power = Number.isFinite(model.pv)
      ? Math.max(0, model.pv)
      : 0;

    // Escala logarítmica para tornar a intensidade perceptível.
    const intensity = power > 0
      ? THREE.MathUtils.clamp(
          Math.log10(1 + power) / 7,
          0.08,
          1
        )
      : 0;

    emissionClock += dt;

    const interval = 1.5 - 0.75 * intensity;

    if (emissionClock >= interval) {
      emissionClock = 0;
      emitHeatWave(intensity);
    }

    for (let i = heatWaves.length - 1; i >= 0; i--) {
      const wave = heatWaves[i];

      wave.age += dt;

      const progress = Math.min(
        wave.age / wave.lifetime,
        1
      );

      const radius =
        1 + progress * (19 + 8 * wave.intensity);

      wave.mesh.position.copy(heroParticle.sphere.position);
      wave.mesh.scale.setScalar(radius);

      wave.mesh.material.opacity =
        (1 - progress) * (0.25 + 0.65 * wave.intensity);

      if (progress >= 1) {
        scene.remove(wave.mesh);
        wave.mesh.material.dispose();
        heatWaves.splice(i, 1);
      }
    }

    orangeLight.intensity = 0.25 + 1.2 * intensity;
  }

  // ----------------------------------------------------------
  // 12. CÁLCULO FÍSICO
  // ----------------------------------------------------------

  function getValue(element, fallback) {
    if (!element) return fallback;

    const value = Number(element.value);

    return Number.isFinite(value) ? value : fallback;
  }

  function calculateModel() {
    const T = getValue(tempSlider, 300);
    const dNm = getValue(diameterSlider, 9);
    const KInput = getValue(anisotropySlider, 1);
    const H0Oe = getValue(fieldSlider, 250);
    const fKHz = getValue(frequencySlider, 624);

    const f = fKHz * 1e3;

    const radius = dNm * 1e-9 / 2;

    const V = (4 / 3) * Math.PI * Math.pow(radius, 3);

    // 1 erg/cm³ = 0.1 J/m³
    const K = KInput * 1e5 * 0.1;

    const exponent = K * V / (KB * T);

    // Proteção contra overflow numérico.
    const tauN = exponent > 700
      ? Infinity
      : TAU0 * Math.exp(exponent);

    // Conversão Oe -> A/m.
    const H0 = H0Oe * 1000 / (4 * Math.PI);

    const chi0 = (
      MU0 * MS_VOLUME * MS_VOLUME * V
    ) / (3 * KB * T);

    const omega = 2 * Math.PI * f;
    const omegaTau = omega * tauN;

    const phase = Math.atan(omegaTau);

    let lossFactor = 0;

    if (Number.isFinite(omegaTau)) {
      if (omegaTau > 1e150) {
        lossFactor = 1 / omegaTau;
      } else {
        lossFactor =
          omegaTau / (1 + omegaTau * omegaTau);
      }
    }

    // Equação (3).
    const pv =
      MU0 *
      Math.PI *
      chi0 *
      H0 * H0 *
      f *
      lossFactor;

    const spaWkg = pv / RHO_MAGNETITE;

    return {
      T,
      dNm,
      KInput,
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

  // ----------------------------------------------------------
  // 13. FORMATAÇÃO
  // ----------------------------------------------------------

  function formatTime(t) {
    if (!Number.isFinite(t)) return '∞';

    if (t < 1e-12) return (t * 1e15).toPrecision(3) + ' fs';
    if (t < 1e-9) return (t * 1e12).toPrecision(3) + ' ps';
    if (t < 1e-6) return (t * 1e9).toPrecision(3) + ' ns';
    if (t < 1e-3) return (t * 1e6).toPrecision(3) + ' µs';
    if (t < 1) return (t * 1e3).toPrecision(3) + ' ms';

    return t.toPrecision(3) + ' s';
  }

  function formatPower(value) {
    if (!Number.isFinite(value)) return '—';
    if (value === 0) return '0 W/m³';

    const a = Math.abs(value);

    if (a >= 1e6) return (value / 1e6).toPrecision(3) + ' MW/m³';
    if (a >= 1e3) return (value / 1e3).toPrecision(3) + ' kW/m³';
    if (a >= 1) return value.toPrecision(3) + ' W/m³';
    if (a >= 1e-3) return (value * 1e3).toPrecision(3) + ' mW/m³';

    return value.toExponential(2) + ' W/m³';
  }

  // ----------------------------------------------------------
  // 14. ATUALIZAÇÃO DOS RESULTADOS NA INTERFACE
  // ----------------------------------------------------------

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function updateReadouts() {
    const m = calculateModel();

    setText('tSliderVal', m.T);
    setText('diameterVal', m.dNm.toFixed(1));
    setText('anisotropyVal', m.KInput.toFixed(1));
    setText('fieldVal', m.H0Oe);
    setText('frequencyVal', (m.f / 1e3).toFixed(0));

    setText('tauLabel', formatTime(m.tauN));

    setText(
      'omegaTauLabel',
      Number.isFinite(m.omegaTau)
        ? m.omegaTau.toExponential(2)
        : '∞'
    );

    setText('powerLabel', formatPower(m.pv));

    setText(
      'spaLabel',
      (m.spaWkg / 1000).toPrecision(3) + ' W/g'
    );

    setText(
      'phaseLabel',
      (m.phase * 180 / Math.PI).toFixed(2) + '°'
    );

    setText('chiLabel', m.chi0.toExponential(2));

    const eq = document.getElementById('equationDisplay');

    if (eq) {
      eq.innerHTML =
        '$$\\tau_N=\\tau_0\\exp\\left(\\frac{K_{\\rm eff}V_{\\rm mag}}{k_BT}\\right)$$' +
        '<div class="equation-separator"></div>' +
        '$$P=\\mu_0\\pi\\chi_0H_0^2f\\frac{2\\pi f\\tau}{1+(2\\pi f\\tau)^2}$$' +
        '<div class="equation-caption">\\(\\tau=\\tau_N\\), \\(\\chi_0=\\mu_0M_s^2V_{\\rm mag}/(3k_BT)\\)</div>';

      if (window.MathJax?.typesetPromise) {
        MathJax.typesetPromise([eq]).catch(() => {});
      }
    }

    return m;
  }

  [
    tempSlider,
    diameterSlider,
    anisotropySlider,
    fieldSlider,
    frequencySlider
  ].forEach(element => {
    if (element) {
      element.addEventListener('input', updateReadouts);
    }
  });

  // ----------------------------------------------------------
  // 15. HUD
  // ----------------------------------------------------------

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

  function drawHUD(h, m, phase) {
    hctx.clearRect(0, 0, 440, 150);

    hctx.fillStyle = 'rgba(13,17,23,0.92)';
    hctx.strokeStyle = '#58a6ff';
    hctx.lineWidth = 3;

    hctx.beginPath();

    if (typeof hctx.roundRect === 'function') {
      hctx.roundRect(1, 1, 438, 148, 12);
    } else {
      hctx.rect(1, 1, 438, 148);
    }

    hctx.fill();
    hctx.stroke();

    hctx.textAlign = 'left';

    hctx.fillStyle = '#58a6ff';
    hctx.font = 'bold 21px Arial';
    hctx.fillText('CAMPO MAGNÉTICO ALTERNADO', 18, 34);

    hctx.fillStyle = '#c9d1d9';
    hctx.font = '17px Arial';
    hctx.fillText('H(t) ∝ ' + h.toFixed(2), 18, 68);

    hctx.fillStyle = '#35d07f';
    hctx.fillText(
      'M(t) ∝ ' + m.toFixed(2) +
      '   |   φ = ' + phase.toFixed(1) + '°',
      18,
      101
    );

    hctx.fillStyle = '#8b949e';
    hctx.font = '13px Arial';
    hctx.fillText(
      'Animação esquemática — tempo visual desacelerado',
      18,
      130
    );

    hudTexture.needsUpdate = true;
  }

  // ----------------------------------------------------------
  // 16. MARCA LAVINA
  // ----------------------------------------------------------

  const wmCanvas = document.createElement('canvas');
  wmCanvas.width = 340;
  wmCanvas.height = 90;

  const wctx = wmCanvas.getContext('2d');

  wctx.fillStyle = '#ffffff';
  wctx.font = 'bold 32px Arial';
  wctx.textAlign = 'right';
  wctx.fillText('LAVINA', 330, 36);

  wctx.fillStyle = '#58a6ff';
  wctx.font = 'bold 14px Arial';
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

  // ----------------------------------------------------------
  // 17. POSICIONAMENTO DO HUD
  // ----------------------------------------------------------

  function layoutHUD() {
    const w = container.clientWidth;
    const h = container.clientHeight;

    hudCamera.left = -w / 2;
    hudCamera.right = w / 2;
    hudCamera.top = h / 2;
    hudCamera.bottom = -h / 2;

    hudCamera.updateProjectionMatrix();

    const scale = Math.min(1, w / 850);

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

  layoutHUD();

  // ----------------------------------------------------------
  // 18. ACCORDION
  // ----------------------------------------------------------

  const infoButton = document.getElementById('infoToggleBtn');

  if (infoButton) {
    infoButton.addEventListener('click', () => {
      const infoBox = document.getElementById('infoBox');
      const icon = document.getElementById('accordionIcon');

      if (!infoBox) return;

      if (infoBox.style.maxHeight) {
        infoBox.style.maxHeight = null;
        if (icon) icon.textContent = '+';
      } else {
        infoBox.style.maxHeight = infoBox.scrollHeight + 'px';
        if (icon) icon.textContent = '−';
      }
    });
  }

  // ----------------------------------------------------------
  // 19. ANIMAÇÃO
  // ----------------------------------------------------------

  const clock = new THREE.Clock();

  let visualTime = 0;

  // Frequência visual independente da frequência física.
  const VISUAL_OMEGA = 1.35;

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);

    visualTime += dt;

    const model = calculateModel();

    // Campo magnético alternado.
    const h = Math.cos(VISUAL_OMEGA * visualTime);

    const omegaTau = model.omegaTau;

    const responseAmplitude = Number.isFinite(omegaTau)
      ? 1 / Math.sqrt(1 + omegaTau * omegaTau)
      : 0;

    const phase = Number.isFinite(model.phase)
      ? model.phase
      : Math.PI / 2;

    // Resposta da magnetização com defasagem.
    const m = responseAmplitude * Math.cos(
      VISUAL_OMEGA * visualTime - phase
    );

    // Seta azul: campo aplicado.
    const fieldSign = h >= 0 ? 1 : -1;

    fieldArrow.visible = Math.abs(h) > 0.015;

    fieldArrow.quaternion.setFromUnitVectors(
      Y_AXIS,
      new THREE.Vector3(0, fieldSign, 0)
    );

    fieldArrow.scale.set(
      1,
      Math.max(0.025, Math.abs(h)),
      1
    );

    // Oscilação esquemática das partículas.
    particles.forEach(particle => {
      const localM = responseAmplitude * Math.cos(
        VISUAL_OMEGA * visualTime - phase
      );

      const displacement = particle.isHero ? 4.0 : 1.0;

      particle.sphere.position.copy(
        particle.basePosition
      );

      particle.sphere.position.y +=
        displacement * localM;

      // Vetor de magnetização.
      const direction = new THREE.Vector3(
        0,
        localM >= 0 ? 1 : -1,
        0
      );

      const targetQuaternion = new THREE.Quaternion()
        .setFromUnitVectors(Y_AXIS, direction);

      particle.moment.quaternion.copy(targetQuaternion);

      particle.moment.scale.set(
        1,
        Math.max(0.025, Math.abs(localM)),
        1
      );

      particle.moment.position.copy(
        particle.sphere.position
      );
    });

    // Ondas térmicas.
    updateHeatWaves(dt, model);

    // HUD.
    drawHUD(
      h,
      m,
      phase * 180 / Math.PI
    );

    if (controls) controls.update();

    // Renderização da cena 3D.
    renderer.clear();
    renderer.render(scene, camera);

    // Renderização do HUD por cima da cena.
    renderer.clearDepth();
    renderer.render(hudScene, hudCamera);
  }

  // ----------------------------------------------------------
  // 20. REDIMENSIONAMENTO
  // ----------------------------------------------------------

  function resize() {
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 1);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);

    layoutHUD();
  }

  window.addEventListener('resize', resize);

  // ----------------------------------------------------------
  // 21. GRAVAÇÃO DE VÍDEO
  // ----------------------------------------------------------

  const recordBtn = document.getElementById('recordBtn');

  if (recordBtn && renderer.domElement.captureStream &&
      typeof MediaRecorder !== 'undefined') {

    let recorder = null;
    let chunks = [];
    let recordingTimer = null;

    recordBtn.addEventListener('click', () => {
      if (recorder && recorder.state === 'recording') return;

      const durationInput =
        document.getElementById('recordDuration');

      const filenameInput =
        document.getElementById('recordFilename');

      const seconds = Math.max(
        1,
        Math.min(
          60,
          parseInt(durationInput?.value || '5', 10) || 5
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

      recorder = new MediaRecorder(stream, {
        mimeType: mime
      });

      chunks = [];

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: mime
        });

        const url = URL.createObjectURL(blob);

        const filename =
          filenameInput?.value.trim() ||
          'lavina-hipertermia-magnetita';

        const extension = mime.includes('mp4')
          ? 'mp4'
          : 'webm';

        const link = document.createElement('a');

        link.href = url;
        link.download = filename + '.' + extension;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 30000);

        recordBtn.textContent = 'Gravar';
        recordBtn.disabled = false;
        recordBtn.classList.remove('recording');

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();

      recordBtn.disabled = true;
      recordBtn.classList.add('recording');
      recordBtn.textContent = 'Gravando...';

      let elapsed = 0;

      recordingTimer = setInterval(() => {
        elapsed++;

        recordBtn.textContent =
          `Gravando... (${elapsed}s / ${seconds}s)`;

        if (elapsed >= seconds) {
          clearInterval(recordingTimer);

          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 1000);
    });
  }

  // ----------------------------------------------------------
  // 22. INICIALIZAÇÃO FINAL
  // ----------------------------------------------------------

  updateReadouts();

  // Posiciona a câmera e garante que a cena comece visível.
  camera.lookAt(0, 0, 0);

  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }

  animate();

  console.log(
    'LAVINA: simulação de hipertermia magnética inicializada.'
  );

})();
