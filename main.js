
/* ============================================================
   LAVINA — HIPERTERMIA MAGNÉTICA
   Nanopartículas Fe3O4 e Co0.02Fe2.98O4

   Referência:
   Control of Anisotropy and Magnetic Hyperthermia Effect
   by Addition of Cobalt on Magnetite Nanoparticles
   ACS Applied Materials & Interfaces (2025).

   Equações (2) e (3) do artigo.

   Modelo didático:
   - Relaxação de Néel
   - Resposta magnética linear
   - Potência dissipada
   - Animação esquemática das ondas térmicas

   A dinâmica visual não representa uma simulação atomística.
   ============================================================ */

(() => {
  "use strict";

  // ----------------------------------------------------------
  // 1. VERIFICAÇÃO INICIAL
  // ----------------------------------------------------------

  const container = document.getElementById("canvas-container");

  if (!container) {
    console.error("Não foi encontrado #canvas-container.");
    return;
  }

  if (typeof THREE === "undefined") {
    container.innerHTML =
      '<div style="color:#ff7777;padding:20px">Erro: Three.js não foi carregado.</div>';
    console.error("Three.js não foi carregado.");
    return;
  }

  if (!THREE.OrbitControls) {
    console.warn("OrbitControls não foi carregado.");
  }

  // ----------------------------------------------------------
  // 2. CONSTANTES FÍSICAS
  // ----------------------------------------------------------

  const MU0 = 4 * Math.PI * 1e-7;
  const KB = 1.380649e-23;

  const RHO_MAGNETITE = 5170; // kg/m³
  const RHO_G_CM3 = 5.17;    // g/cm³

  const DEFAULT_TAU0 = 1e-10;

  // 1 erg/cm³ = 0.1 J/m³
  // 1 Oe = 1000/(4π) A/m

  // ----------------------------------------------------------
  // 3. DADOS EXPERIMENTAIS
  // ----------------------------------------------------------

  const EXPERIMENTAL_DATA = {
    "0": {
      name: "Fe3O4",
      formula: "Fe₃O₄",

      Ms0: 91.8,
      MsUncertainty: 0.5,

      alpha: 0.29,
      alphaUncertainty: 0.01,

      sigmaMT: 0.61,
      MrMs: 0.87,
      MrMsUncertainty: 0.02,
      sigmaHc: 0.9,

      Keff: {
        MT: 4.1e5,
        Mr: 1.2e5,
        Hc: 3.1e5
      },

      KeffUncertainty: {
        MT: null,
        Mr: 0.1e5,
        Hc: 0.7e5
      },

      diameter: 7.9
    },

    "0.020": {
      name: "Co0.02Fe2.98O4",
      formula: "Co₀,₀₂Fe₂,₉₈O₄",

      Ms0: 100,
      MsUncertainty: 1,

      alpha: 0.40,
      alphaUncertainty: 0.01,

      sigmaMT: 0.74,
      MrMs: 0.69,
      MrMsUncertainty: 0.02,
      sigmaHc: 0.9,

      Keff: {
        MT: 5.9e5,
        Mr: 1.6e5,
        Hc: 4.2e5
      },

      KeffUncertainty: {
        MT: null,
        Mr: 0.2e5,
        Hc: 0.2e5
      },

      diameter: 8.4
    }
  };

  const METHOD_NAMES = {
    MT: "M(T)",
    Mr: "Mr(T) / Ms",
    Hc: "Hc(T)"
  };

  // ----------------------------------------------------------
  // 4. ELEMENTOS HTML
  // ----------------------------------------------------------

  const compositionSelect =
    document.getElementById("compositionSelect");

  const anisotropyMethod =
    document.getElementById("anisotropyMethod");

  const tempSlider =
    document.getElementById("tempSlider");

  const diameterSlider =
    document.getElementById("diameterSlider");

  const fieldSlider =
    document.getElementById("fieldSlider");

  const frequencySlider =
    document.getElementById("frequencySlider");

  const tau0Input =
    document.getElementById("tau0Input");

  const recordBtn =
    document.getElementById("recordBtn");

  // ----------------------------------------------------------
  // 5. FUNÇÕES AUXILIARES
  // ----------------------------------------------------------

  function getValue(element, fallback) {
    if (!element) return fallback;

    const value = Number(element.value);

    return Number.isFinite(value) ? value : fallback;
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function formatScientific(value, digits = 2) {
    if (!Number.isFinite(value)) {
      return "∞";
    }

    return value.toExponential(digits);
  }

  function formatTime(value) {
    if (!Number.isFinite(value)) return "∞";

    if (value < 1e-12) {
      return (value * 1e15).toPrecision(3) + " fs";
    }

    if (value < 1e-9) {
      return (value * 1e12).toPrecision(3) + " ps";
    }

    if (value < 1e-6) {
      return (value * 1e9).toPrecision(3) + " ns";
    }

    if (value < 1e-3) {
      return (value * 1e6).toPrecision(3) + " µs";
    }

    if (value < 1) {
      return (value * 1e3).toPrecision(3) + " ms";
    }

    return value.toPrecision(3) + " s";
  }

  function formatPower(value) {
    if (!Number.isFinite(value)) return "—";

    if (value === 0) return "0 W/m³";

    const a = Math.abs(value);

    if (a >= 1e6) {
      return (value / 1e6).toPrecision(3) + " MW/m³";
    }

    if (a >= 1e3) {
      return (value / 1e3).toPrecision(3) + " kW/m³";
    }

    if (a >= 1) {
      return value.toPrecision(3) + " W/m³";
    }

    if (a >= 1e-3) {
      return (value * 1e3).toPrecision(3) + " mW/m³";
    }

    return value.toExponential(2) + " W/m³";
  }

  // ----------------------------------------------------------
  // 6. PARÂMETROS SELECIONADOS
  // ----------------------------------------------------------

  function getExperimentalParameters() {
    const composition =
      compositionSelect?.value || "0";

    const method =
      anisotropyMethod?.value || "MT";

    const data =
      EXPERIMENTAL_DATA[composition] ||
      EXPERIMENTAL_DATA["0"];

    return {
      ...data,
      composition,
      method,
      methodName: METHOD_NAMES[method],
      KeffExperimental: data.Keff[method],
      KeffSI: data.Keff[method] * 0.1,
      KeffUncertainty: data.KeffUncertainty[method]
    };
  }

  // ----------------------------------------------------------
  // 7. CÁLCULO DO MODELO FÍSICO
  // ----------------------------------------------------------

  function calculateModel() {
    const experimental = getExperimentalParameters();

    const T = getValue(tempSlider, 300);
    const dNm = getValue(diameterSlider, experimental.diameter);

    const H0Oe = getValue(fieldSlider, 250);
    const fKHz = getValue(frequencySlider, 624);

    const tau0 = getValue(tau0Input, DEFAULT_TAU0);

    const f = fKHz * 1e3;

    // Volume esférico da nanopartícula.
    const radius = dNm * 1e-9 / 2;

    const V = (4 / 3) * Math.PI * radius ** 3;

    // Anisotropia em J/m³.
    const K = experimental.KeffSI;

    // Equação (2): relaxação de Néel.
    const exponent = K * V / (KB * T);

    const tauN = exponent > 700
      ? Infinity
      : tau0 * Math.exp(exponent);

    // Magnetização de saturação:
    // A Tabela 2 apresenta Ms(0).
    // Utilizada aqui como aproximação constante.
    // Não equivale a Ms medida em temperatura ambiente.

    // Conversão:
    // emu/g × g/cm³ × 1000 = A/m.
    const MsVolume =
      experimental.Ms0 * RHO_G_CM3 * 1000;

    // Campo magnético em A/m.
    const H0 = H0Oe * 1000 / (4 * Math.PI);

    // Susceptibilidade inicial.
    const chi0 =
      MU0 * MsVolume ** 2 * V / (3 * KB * T);

    const omega = 2 * Math.PI * f;

    const omegaTau = omega * tauN;

    const phase = Math.atan(omegaTau);

    // Fator de dissipação:
    // x / (1 + x²), com proteção numérica.
    let lossFactor = 0;

    if (Number.isFinite(omegaTau)) {
      if (omegaTau > 1) {
        const inverse = 1 / omegaTau;

        lossFactor =
          inverse / (1 + inverse * inverse);
      } else {
        lossFactor =
          omegaTau / (1 + omegaTau * omegaTau);
      }
    }

    // Equação (3): potência volumétrica.
    const pv =
      MU0 *
      Math.PI *
      chi0 *
      H0 ** 2 *
      f *
      lossFactor;

    // Estimativa de potência específica.
    const spaWkg = pv / RHO_MAGNETITE;
    const spaWg = spaWkg / 1000;

    // Amplitude relativa da resposta linear.
    const responseAmplitude =
      Number.isFinite(omegaTau)
        ? 1 / Math.sqrt(1 + omegaTau ** 2)
        : 0;

    return {
      T,
      dNm,
      H0Oe,
      H0,
      f,
      V,
      K,
      tau0,
      tauN,
      chi0,
      omegaTau,
      phase,
      pv,
      spaWkg,
      spaWg,
      lossFactor,
      responseAmplitude,

      Ms0: experimental.Ms0,
      MsVolume,
      KeffExperimental: experimental.KeffExperimental,
      KeffUncertainty: experimental.KeffUncertainty,

      composition: experimental.composition,
      sampleName: experimental.name,
      formula: experimental.formula,
      method: experimental.method,
      methodName: experimental.methodName,
      alpha: experimental.alpha
    };
  }

  // ----------------------------------------------------------
  // 8. ATUALIZAÇÃO DOS PARÂMETROS EXPERIMENTAIS
  // ----------------------------------------------------------

  function updateExperimentalReadouts() {
    const p = getExperimentalParameters();

    const uncertainty = p.KeffUncertainty === null
      ? ""
      : " ± " +
        (p.KeffUncertainty / 1e5).toFixed(1);

    setText(
      "msValue",
      `${p.Ms0.toFixed(1)} ± ${p.MsUncertainty} emu/g`
    );

    setText(
      "keffValue",
      `${(p.KeffExperimental / 1e5).toFixed(1)}${uncertainty} × 10⁵ erg/cm³`
    );

    setText(
      "experimentalDiameter",
      p.diameter.toFixed(1) + " nm"
    );

    setText(
      "alphaValue",
      `${p.alpha.toFixed(2)} ± ${p.alphaUncertainty.toFixed(2)}`
    );

    // Atualiza o diâmetro com o valor médio da composição.
    if (diameterSlider) {
      diameterSlider.value = p.diameter;
    }

    setText("diameterVal", p.diameter.toFixed(1));

    updateReadouts();
  }

  // ----------------------------------------------------------
  // 9. ATUALIZAÇÃO DOS RESULTADOS
  // ----------------------------------------------------------

  function updateReadouts() {
    const m = calculateModel();

    setText("tSliderVal", m.T.toFixed(0));
    setText("diameterVal", m.dNm.toFixed(1));
    setText("fieldVal", m.H0Oe.toFixed(0));
    setText("frequencyVal", (m.f / 1e3).toFixed(0));

    setText("tauLabel", formatTime(m.tauN));

    setText(
      "omegaTauLabel",
      formatScientific(m.omegaTau)
    );

    setText(
      "phaseLabel",
      (m.phase * 180 / Math.PI).toFixed(2) + "°"
    );

    setText(
      "chiLabel",
      formatScientific(m.chi0)
    );

    setText(
      "powerLabel",
      formatPower(m.pv)
    );

    setText(
      "spaLabel",
      Number.isFinite(m.spaWg)
        ? m.spaWg.toPrecision(3) + " W/g"
        : "—"
    );

    return m;
  }

  // ----------------------------------------------------------
  // 10. EVENTOS DOS CONTROLES
  // ----------------------------------------------------------

  [
    tempSlider,
    diameterSlider,
    fieldSlider,
    frequencySlider,
    tau0Input
  ].forEach(element => {
    element?.addEventListener("input", updateReadouts);
    element?.addEventListener("change", updateReadouts);
  });

  compositionSelect?.addEventListener(
    "change",
    updateExperimentalReadouts
  );

  anisotropyMethod?.addEventListener(
    "change",
    updateExperimentalReadouts
  );

  // ----------------------------------------------------------
  // 11. CENA THREE.JS
  // ----------------------------------------------------------

  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.002);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    1000
  );

  camera.position.set(72, 48, 105);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  );

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  renderer.setClearColor(0x0d1117, 1);

  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  container.appendChild(renderer.domElement);

  let controls = null;

  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(
      camera,
      renderer.domElement
    );

    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 35;
    controls.maxDistance = 220;
    controls.update();
  }

  // ----------------------------------------------------------
  // 12. ILUMINAÇÃO
  // ----------------------------------------------------------

  scene.add(
    new THREE.AmbientLight(0xffffff, 0.9)
  );

  const directionalLight =
    new THREE.DirectionalLight(0xffffff, 1.4);

  directionalLight.position.set(50, 80, 100);
  scene.add(directionalLight);

  const blueLight =
    new THREE.PointLight(0x3388ff, 1.2, 180);

  blueLight.position.set(-45, 25, 35);
  scene.add(blueLight);

  const orangeLight =
    new THREE.PointLight(0xff7b35, 0.8, 100);

  orangeLight.position.set(0, 0, 0);
  scene.add(orangeLight);

  // ----------------------------------------------------------
  // 13. CAIXA DE VISUALIZAÇÃO
  // ----------------------------------------------------------

  const boxGeometry =
    new THREE.BoxGeometry(62, 62, 62);

  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(boxGeometry),
    new THREE.LineBasicMaterial({
      color: 0x526174,
      transparent: true,
      opacity: 0.45
    })
  );

  scene.add(box);

  // ----------------------------------------------------------
  // 14. VETORES
  // ----------------------------------------------------------

  function createArrow(color, length, radius = 0.5) {
    const group = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      metalness: 0.15,
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

    head.position.y =
      shaftLength + headLength / 2;

    group.add(shaft);
    group.add(head);

    return group;
  }

  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  // ----------------------------------------------------------
  // 15. NANOPARTÍCULAS
  // ----------------------------------------------------------

  const particles = [];

  const particleGeometry =
    new THREE.SphereGeometry(2.5, 32, 24);

  const particleMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x8da5bd,
      metalness: 0.45,
      roughness: 0.25
    });

  const heroMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xb3c9dc,
      metalness: 0.5,
      roughness: 0.2,
      emissive: 0x18344c,
      emissiveIntensity: 0.55
    });

  let heroParticle = null;

  function createParticle(position, isHero = false) {
    const sphere = new THREE.Mesh(
      particleGeometry,
      isHero ? heroMaterial : particleMaterial
    );

    sphere.position.copy(position);

    if (isHero) {
      sphere.scale.setScalar(1.8);
    }

    scene.add(sphere);

    const moment = createArrow(
      0x35d07f,
      isHero ? 17 : 10,
      isHero ? 0.65 : 0.4
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

  createParticle(
    new THREE.Vector3(0, 0, 0),
    true
  );

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

  secondaryPositions.forEach(position => {
    createParticle(
      new THREE.Vector3(
        position[0],
        position[1],
        position[2]
      )
    );
  });

  // ----------------------------------------------------------
  // 16. CAMPO MAGNÉTICO ALTERNADO
  // ----------------------------------------------------------

  const fieldArrow = createArrow(
    0x58a6ff,
    30,
    0.85
  );

  scene.add(fieldArrow);

  const fieldLineGeometry =
    new THREE.BufferGeometry().setFromPoints([
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
  // 17. RÓTULO DO CAMPO
  // ----------------------------------------------------------

  const labelCanvas = document.createElement("canvas");

  labelCanvas.width = 512;
  labelCanvas.height = 128;

  const labelContext = labelCanvas.getContext("2d");

  labelContext.fillStyle = "#58a6ff";
  labelContext.font = "bold 48px Arial";
  labelContext.textAlign = "center";

  labelContext.fillText(
    "H(t) — CAMPO AC",
    256,
    78
  );

  const labelTexture =
    new THREE.CanvasTexture(labelCanvas);

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
  // 18. ONDAS TÉRMICAS
  // ----------------------------------------------------------

  const heatWaves = [];

  const waveGeometry =
    new THREE.SphereGeometry(1, 36, 24);

  const WAVE_LIFETIME = 2.5;

  let emissionClock = 0;

  function emitHeatWave(intensity) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xff9c45,
      wireframe: true,
      transparent: true,
      opacity: 0.25 + 0.65 * intensity,
      depthWrite: false
    });

    const wave = new THREE.Mesh(
      waveGeometry,
      material
    );

    wave.position.copy(heroParticle.sphere.position);
    wave.scale.setScalar(1);

    scene.add(wave);

    heatWaves.push({
      mesh: wave,
      age: 0,
      intensity
    });
  }

  function updateHeatWaves(dt, model) {
    const power = Number.isFinite(model.pv)
      ? Math.max(0, model.pv)
      : 0;

    const intensity = power > 0
      ? THREE.MathUtils.clamp(
          Math.log10(1 + power) / 7,
          0.08,
          1
        )
      : 0;

    emissionClock += dt;

    const interval = 1.4 - 0.65 * intensity;

    if (emissionClock >= interval) {
      emissionClock = 0;
      emitHeatWave(intensity);
    }

    for (let i = heatWaves.length - 1; i >= 0; i--) {
      const wave = heatWaves[i];

      wave.age += dt;

      const progress = Math.min(
        wave.age / WAVE_LIFETIME,
        1
      );

      const radius =
        1 + progress * (18 + 9 * wave.intensity);

      wave.mesh.position.copy(
        heroParticle.sphere.position
      );

      wave.mesh.scale.setScalar(radius);

      wave.mesh.material.opacity =
        (1 - progress) *
        (0.25 + 0.65 * wave.intensity);

      if (progress >= 1) {
        scene.remove(wave.mesh);
        wave.mesh.material.dispose();

        heatWaves.splice(i, 1);
      }
    }

    orangeLight.intensity =
      0.2 + 1.2 * intensity;
  }

  // ----------------------------------------------------------
  // 19. HUD — INFORMAÇÕES DA ANIMAÇÃO
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

  const hudCanvas = document.createElement("canvas");

  hudCanvas.width = 440;
  hudCanvas.height = 150;

  const hctx = hudCanvas.getContext("2d");

  const hudTexture =
    new THREE.CanvasTexture(hudCanvas);

  const hudSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: hudTexture,
      transparent: true,
      depthTest: false
    })
  );

  hudSprite.scale.set(440, 150, 1);
  hudScene.add(hudSprite);

  // ----------------------------------------------------------
  // 20. MARCA LAVINA
  // ----------------------------------------------------------

  const wmCanvas = document.createElement("canvas");

  wmCanvas.width = 340;
  wmCanvas.height = 90;

  const wctx = wmCanvas.getContext("2d");

  wctx.fillStyle = "#ffffff";
  wctx.font = "bold 32px Arial";
  wctx.textAlign = "right";
  wctx.fillText("LAVINA", 330, 36);

  wctx.fillStyle = "#58a6ff";
  wctx.font = "bold 14px Arial";
  wctx.fillText("IFGW • UNICAMP", 330, 62);

  const wmTexture =
    new THREE.CanvasTexture(wmCanvas);

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
  // 21. DESENHO DO HUD
  // ----------------------------------------------------------

  function drawHUD(h, m, phase) {
    hctx.clearRect(0, 0, 440, 150);

    hctx.fillStyle = "rgba(13,17,23,0.92)";
    hctx.strokeStyle = "#58a6ff";
    hctx.lineWidth = 3;

    hctx.beginPath();

    if (typeof hctx.roundRect === "function") {
      hctx.roundRect(1, 1, 438, 148, 12);
    } else {
      hctx.rect(1, 1, 438, 148);
    }

    hctx.fill();
    hctx.stroke();

    hctx.textAlign = "left";

    hctx.fillStyle = "#58a6ff";
    hctx.font = "bold 21px Arial";

    hctx.fillText(
      "CAMPO MAGNÉTICO ALTERNADO",
      18,
      34
    );

    hctx.fillStyle = "#c9d1d9";
    hctx.font = "17px Arial";

    hctx.fillText(
      "H(t) ∝ " + h.toFixed(2),
      18,
      68
    );

    hctx.fillStyle = "#35d07f";

    hctx.fillText(
      "M(t) ∝ " + m.toFixed(2) +
      "   |   φ = " + phase.toFixed(1) + "°",
      18,
      101
    );

    hctx.fillStyle = "#8b949e";
    hctx.font = "13px Arial";

    hctx.fillText(
      "Animação esquemática — tempo visual desacelerado",
      18,
      130
    );

    hudTexture.needsUpdate = true;
  }

  // ----------------------------------------------------------
  // 22. POSICIONAMENTO DO HUD
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
  // 23. ACORDEÃO DE INFORMAÇÕES
  // ----------------------------------------------------------

  const infoButton =
    document.getElementById("infoToggleBtn");

  infoButton?.addEventListener("click", () => {
    const infoBox =
      document.getElementById("infoBox");

    const icon =
      document.getElementById("accordionIcon");

    if (!infoBox) return;

    if (infoBox.style.maxHeight) {
      infoBox.style.maxHeight = null;

      if (icon) icon.textContent = "+";
    } else {
      infoBox.style.maxHeight =
        infoBox.scrollHeight + "px";

      if (icon) icon.textContent = "−";
    }
  });

  // ----------------------------------------------------------
  // 24. ANIMAÇÃO
  // ----------------------------------------------------------

  const clock = new THREE.Clock();

  let visualTime = 0;

  // Frequência visual desacelerada.
  // Não altera a frequência física usada nas equações.
  const VISUAL_OMEGA = 1.35;

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);

    visualTime += dt;

    const model = calculateModel();

    // Campo magnético alternado.
    const h = Math.cos(
      VISUAL_OMEGA * visualTime
    );

    // Magnetização defasada.
    const phase = model.phase;

    const m =
      model.responseAmplitude *
      Math.cos(
        VISUAL_OMEGA * visualTime - phase
      );

    // Seta azul do campo aplicado.
    const fieldSign = h >= 0 ? 1 : -1;

    fieldArrow.visible =
      Math.abs(h) > 0.015;

    fieldArrow.quaternion.setFromUnitVectors(
      Y_AXIS,
      new THREE.Vector3(0, fieldSign, 0)
    );

    fieldArrow.scale.set(
      1,
      Math.max(0.025, Math.abs(h)),
      1
    );

    // Resposta das partículas e dos momentos magnéticos.
    particles.forEach(particle => {
      const localM =
        model.responseAmplitude *
        Math.cos(
          VISUAL_OMEGA * visualTime - phase
        );

      const displacement =
        particle.isHero ? 4 : 1;

      // Oscilação visual da nanopartícula.
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

      const targetQuaternion =
        new THREE.Quaternion().setFromUnitVectors(
          Y_AXIS,
          direction
        );

      particle.moment.quaternion.copy(
        targetQuaternion
      );

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

    if (controls) {
      controls.update();
    }

    // Renderização da cena.
    renderer.clear();
    renderer.render(scene, camera);

    // HUD sobre a cena 3D.
    renderer.clearDepth();
    renderer.render(hudScene, hudCamera);
  }

  // ----------------------------------------------------------
  // 25. REDIMENSIONAMENTO
  // ----------------------------------------------------------

  function resize() {
    const width = container.clientWidth;
    const height = Math.max(
      container.clientHeight,
      1
    );

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

    layoutHUD();
  }

  window.addEventListener("resize", resize);

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
  }

  // ----------------------------------------------------------
  // 26. GRAVAÇÃO DE VÍDEO
  // ----------------------------------------------------------

  if (
    recordBtn &&
    renderer.domElement.captureStream &&
    typeof MediaRecorder !== "undefined"
  ) {
    let recorder = null;
    let chunks = [];
    let recordingTimer = null;

    recordBtn.addEventListener("click", () => {
      if (
        recorder &&
        recorder.state === "recording"
      ) {
        return;
      }

      const durationInput =
        document.getElementById("recordDuration");

      const filenameInput =
        document.getElementById("recordFilename");

      const seconds = Math.max(
        1,
        Math.min(
          60,
          parseInt(durationInput?.value || "10", 10) || 10
        )
      );

      const stream =
        renderer.domElement.captureStream(30);

      let mime = "video/webm;codecs=vp9";

      if (!MediaRecorder.isTypeSupported(mime)) {
        mime = "video/webm";
      }

      if (
        MediaRecorder.isTypeSupported(
          "video/mp4;codecs=avc1.42E01E"
        )
      ) {
        mime = "video/mp4;codecs=avc1.42E01E";
      }

      try {
        recorder = new MediaRecorder(stream, {
          mimeType: mime
        });
      } catch (error) {
        console.error("Erro ao iniciar gravação:", error);

        stream.getTracks().forEach(track => track.stop());

        return;
      }

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
          "lavina-hipertermia";

        const extension = mime.includes("mp4")
          ? "mp4"
          : "webm";

        const link = document.createElement("a");

        link.href = url;
        link.download = filename + "." + extension;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 30000);

        recordBtn.textContent = "Gravar animação";
        recordBtn.disabled = false;

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();

      recordBtn.disabled = true;
      recordBtn.textContent = "Gravando...";

      let elapsed = 0;

      recordingTimer = setInterval(() => {
        elapsed++;

        recordBtn.textContent =
          `Gravando... (${elapsed}s / ${seconds}s)`;

        if (elapsed >= seconds) {
          clearInterval(recordingTimer);

          if (recorder.state === "recording") {
            recorder.stop();
          }
        }
      }, 1000);
    });
  }

  // ----------------------------------------------------------
  // 27. INICIALIZAÇÃO
  // ----------------------------------------------------------

  updateExperimentalReadouts();
  updateReadouts();

  camera.lookAt(0, 0, 0);

  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }

  animate();

  console.log(
    "LAVINA: simulação de hipertermia magnética inicializada."
  );

})();
