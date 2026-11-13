"use strict";

// ============================================================
// CONSTANTES FÍSICAS E PARÂMETROS DA TABELA 2
// ============================================================

const MU0 = 4 * Math.PI * 1e-7;
const KB = 1.380649e-23;
const TAU0 = 1e-10;

// Densidade aproximada adotada para a conversão de Ms.
// Hipótese do modelo: 5170 kg/m³ para os dois casos.
const DENSITY = 5170;

// Conversões
const ERG_CM3_TO_J_M3 = 0.1;
const OE_TO_AM = 1000 / (4 * Math.PI);

// Valores de K_eff em unidades de 10^5 erg/cm³.
// As incertezas são as reportadas na Tabela 2.
const SAMPLES = {
    "0": {
        name: "Fe3O4",
        formula: "Fe₃O₄",
        diameter: 7.9,
        ms: 91.8,
        msError: 0.5,
        alpha: 0.29,
        methods: {
            MT: { k: 4.1, error: 0.61 },
            MR: { k: 1.2, error: 0.1 },
            HC: { k: 3.1, error: 0.7 }
        }
    },

    "0.020": {
        name: "Co0.02Fe2.98O4",
        formula: "Co₀.₀₂Fe₂.₉₈O₄",
        diameter: 8.4,
        ms: 100.0,
        msError: 1.0,
        alpha: 0.40,
        methods: {
            MT: { k: 5.9, error: 0.74 },
            MR: { k: 1.6, error: 0.2 },
            HC: { k: 4.2, error: 0.2 }
        }
    }
};

const METHOD_NAMES = {
    MT: "M(T)",
    MR: "Mr(T)/Ms",
    HC: "Hc(T)"
};

let selectedComposition = "0";
let selectedMethod = "MT";

let currentT = 300;
let currentDiameter = 7.9;
let currentH0 = 250;
let currentFrequency = 624;

let currentK = 4.1;
let currentMsMass = 91.8;
let currentTau = 0;
let currentPower = 0;
let currentSPA = 0;
let currentPhase = 0;
let currentChi = 0;

let manualKEnabled = false;

// ============================================================
// ELEMENTOS DA INTERFACE
// ============================================================

const compositionSelect = document.getElementById("compositionSelect");
const methodSelect = document.getElementById("methodSelect");

const manualK = document.getElementById("manualK");
const keffSlider = document.getElementById("keffSlider");

const tempSlider = document.getElementById("tempSlider");
const diameterSlider = document.getElementById("diameterSlider");
const fieldSlider = document.getElementById("fieldSlider");
const frequencySlider = document.getElementById("frequencySlider");

const $ = id => document.getElementById(id);

function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";

    return value.toLocaleString("pt-BR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits
    });
}

function formatScientific(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    if (value === 0) return "0";

    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);

    return `formatNumber(mantissa,digits)×10{toSuperscript(exponent)}`;
}

function toSuperscript(number) {
    const chars = {
        "0": "⁰", "1": "¹", "2": "²", "3": "³",
        "4": "⁴", "5": "⁵", "6": "⁶",
        "7": "⁷", "8": "⁸", "9": "⁹",
        "-": "⁻", "+": "⁺"
    };

    return String(number).split("").map(c => chars[c] || c).join("");
}

function getCurrentSample() {
    return SAMPLES[selectedComposition];
}

function getCurrentK() {
    if (manualKEnabled) {
        return parseFloat(keffSlider.value);
    }

    const sample = getCurrentSample();
    return sample.methods[selectedMethod].k;
}

// ============================================================
// ATUALIZAÇÃO DOS PARÂMETROS DA TABELA
// ============================================================

function updateSampleParameters() {
    const sample = getCurrentSample();
    const method = sample.methods[selectedMethod];

    currentMsMass = sample.ms;

    if (!manualKEnabled) {
        currentK = method.k;
        keffSlider.value = method.k;
    } else {
        currentK = parseFloat(keffSlider.value);
    }

    currentDiameter = parseFloat(diameterSlider.value);

    $("keffTableValue").textContent =
        `${formatNumber(method.k, 2)} × 10⁵ erg/cm³`;

    $("keffUncertainty").textContent =
        `± ${formatNumber(method.error, 2)} × 10⁵`;

    $("msValue").textContent =
        `${formatNumber(sample.ms, 1)} ± ${formatNumber(sample.msError, 1)} emu/g`;

    $("diameterTableValue").textContent =
        `${formatNumber(sample.diameter, 1)} nm`;

    $("alphaValue").textContent = formatNumber(sample.alpha, 2);

    $("keffSliderValue").textContent = formatNumber(currentK, 2);

    $("diameterValue").textContent =
        formatNumber(currentDiameter, 1);

    updatePhysics();
}

function updateManualKInterface() {
    manualKEnabled = manualK.checked;
    keffSlider.disabled = !manualKEnabled;

    if (!manualKEnabled) {
        updateSampleParameters();
    } else {
        currentK = parseFloat(keffSlider.value);
        $("keffSliderValue").textContent = formatNumber(currentK, 2);
        updatePhysics();
    }
}

// ============================================================
// MODELO FÍSICO
// ============================================================

function calculatePhysics() {
    const diameterM = currentDiameter * 1e-9;
    const radiusM = diameterM / 2;

    const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);

    // K_eff: 10^5 erg/cm³ -> J/m³
    const keffSI = currentK * 1e5 * ERG_CM3_TO_J_M3;

    // Ms: emu/g -> A m²/kg; multiplicação pela densidade -> A/m
    const msVolume = currentMsMass * DENSITY;

    // Relaxação de Néel
    const exponent = keffSI * volume / (KB * currentT);

    let tauN;

    if (exponent > 700) {
        tauN = Infinity;
    } else {
        tauN = TAU0 * Math.exp(exponent);
    }

    // Campo e frequência
    const H0 = currentH0 * OE_TO_AM;
    const frequency = currentFrequency * 1e3;
    const omega = 2 * Math.PI * frequency;

    const omegaTau = omega * tauN;

    // Susceptibilidade inicial
    const chi0 =
        (MU0 * Math.pow(msVolume, 2) * volume) /
        (3 * KB * currentT);

    // Defasagem do momento magnético
    const phase = Math.atan(omegaTau);

    // Equação de dissipação
    let powerVolume = 0;

    if (Number.isFinite(tauN)) {
        const denominator = 1 + omegaTau * omegaTau;

        powerVolume =
            MU0 * Math.PI * chi0 *
            H0 * H0 * frequency *
            omegaTau / denominator;
    }

    // Conversão para potência específica (W/g)
    const powerPerKg = powerVolume / DENSITY;
    const spa = powerPerKg / 1000;

    return {
        volume,
        keffSI,
        msVolume,
        tauN,
        H0,
        frequency,
        omega,
        omegaTau,
        chi0,
        phase,
        powerVolume,
        spa
    };
}

function formatTime(tau) {
    if (tau === Infinity) return "∞";
    if (!Number.isFinite(tau)) return "—";
    if (tau === 0) return "0 s";

    if (tau < 1e-12) return `${formatNumber(tau * 1e15, 2)} fs`;
    if (tau < 1e-9) return `${formatNumber(tau * 1e12, 2)} ps`;
    if (tau < 1e-6) return `${formatNumber(tau * 1e9, 2)} ns`;
    if (tau < 1e-3) return `${formatNumber(tau * 1e6, 2)} µs`;
    if (tau < 1) return `${formatNumber(tau * 1e3, 2)} ms`;

    return `${formatNumber(tau, 2)} s`;
}

function updatePhysics() {
    currentK = getCurrentK();

    const result = calculatePhysics();

    currentTau = result.tauN;
    currentPower = result.powerVolume;
    currentSPA = result.spa;
    currentPhase = result.phase;
    currentChi = result.chi0;

    $("keffSliderValue").textContent = formatNumber(currentK, 2);

    $("tauValue").textContent = formatTime(result.tauN);
    $("omegaTauValue").textContent =
        formatScientific(result.omegaTau, 2);

    $("phaseValue").textContent =
        `${formatNumber(result.phase * 180 / Math.PI, 1)}°`;

    $("chiValue").textContent =
        formatScientific(result.chi0, 2);

    $("powerVolumeValue").textContent =
        `${formatScientific(result.powerVolume, 2)} W/m³`;

    $("spaValue").textContent =
        `${formatNumber(result.spa, 3)} W/g`;

    updateHUD();
}

// ============================================================
// THREE.JS — CENA PRINCIPAL
// ============================================================

const container = $("canvas-container");

if (!window.THREE) {
    $("loading").textContent = "Erro: Three.js não foi carregado.";
    throw new Error("Three.js indisponível.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
scene.fog = new THREE.FogExp2(0x0d1117, 0.006);

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    1000
);

camera.position.set(52, 35, 85);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 35;
controls.maxDistance = 180;

// ============================================================
// ILUMINAÇÃO
// ============================================================

scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
keyLight.position.set(60, 80, 60);
scene.add(keyLight);

const blueLight = new THREE.PointLight(0x287bff, 1.5, 150);
blueLight.position.set(-35, 25, 20);
scene.add(blueLight);

const warmLight = new THREE.PointLight(0xff7139, 0.8, 100);
warmLight.position.set(20, -20, -30);
scene.add(warmLight);

// ============================================================
// VOLUME DE SIMULAÇÃO
// ============================================================

const BOX_SIZE = 54;

const boxGeometry = new THREE.BoxGeometry(
    BOX_SIZE,
    BOX_SIZE,
    BOX_SIZE
);

const boxEdges = new THREE.EdgesGeometry(boxGeometry);

const boxMaterial = new THREE.LineBasicMaterial({
    color: 0x66788a,
    transparent: true,
    opacity: 0.55
});

const box = new THREE.LineSegments(boxEdges, boxMaterial);
scene.add(box);

// Eixos discretos
const axes = new THREE.AxesHelper(18);
axes.material.transparent = true;
axes.material.opacity = 0.35;
scene.add(axes);

// ============================================================
// CAMPO MAGNÉTICO ALTERNADO
// ============================================================

const fieldOrigin = new THREE.Vector3(0, -34, 0);

const fieldArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    fieldOrigin,
    27,
    0x58a6ff,
    5,
    2.8
);

scene.add(fieldArrow);

const fieldLinePoints = [
    new THREE.Vector3(0, -31, 0),
    new THREE.Vector3(0, 31, 0)
];

const fieldLineGeometry = new THREE.BufferGeometry()
    .setFromPoints(fieldLinePoints);

const fieldLine = new THREE.Line(
    fieldLineGeometry,
    new THREE.LineDashedMaterial({
        color: 0x58a6ff,
        dashSize: 2,
        gapSize: 2,
        transparent: true,
        opacity: 0.4
    })
);

fieldLine.computeLineDistances();
scene.add(fieldLine);

// ============================================================
// NANOPARTÍCULAS
// ============================================================

const PARTICLE_COUNT = 15;
const PARTICLE_RADIUS = 2.1;

const sphereGeometry = new THREE.SphereGeometry(
    PARTICLE_RADIUS,
    32,
    24
);

const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0x428bd2,
    roughness: 0.28,
    metalness: 0.32,
    emissive: 0x102b4a,
    emissiveIntensity: 0.35
});

const particles = [];

const momentMaterial = new THREE.MeshStandardMaterial({
    color: 0x2ea043,
    roughness: 0.3,
    metalness: 0.25,
    emissive: 0x123d20,
    emissiveIntensity: 0.25
});

function createMomentArrow() {
    const group = new THREE.Group();

    const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 6.5, 12),
        momentMaterial
    );

    const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 2.1, 16),
        momentMaterial
    );

    shaft.position.y = 0;
    head.position.y = 4.25;

    group.add(shaft);
    group.add(head);

    return group;
}

// ============================================================
// ONDAS DE DISSIPAÇÃO TÉRMICA
// ============================================================

const heatWaveGeometry = new THREE.RingGeometry(0.88, 1.0, 48);

function createHeatWave() {
    const material = new THREE.MeshBasicMaterial({
        color: 0xff7139,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const ring = new THREE.Mesh(heatWaveGeometry, material);

    // Plano horizontal ao redor da nanopartícula
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;

    return {
        mesh: ring,
        age: 0,
        active: false,
        duration: 1.8,
        initialScale: 1
    };
}

function createParticlePosition(index) {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const y = 1 - (index / (PARTICLE_COUNT - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * index;

    const spread = 20;

    return new THREE.Vector3(
        Math.cos(theta) * radius * spread,
        y * spread,
        Math.sin(theta) * radius * spread
    );
}

function createParticle(index) {
    const position = createParticlePosition(index);

    const mesh = new THREE.Mesh(
        sphereGeometry,
        sphereMaterial.clone()
    );

    mesh.position.copy(position);
    scene.add(mesh);

    const arrow = createMomentArrow();
    arrow.position.copy(position);
    scene.add(arrow);

    const initialDirection = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
    ).normalize();

    const waves = [];

    for (let i = 0; i < 3; i++) {
        const wave = createHeatWave();
        wave.mesh.position.copy(position);
        scene.add(wave.mesh);
        waves.push(wave);
    }

    particles.push({
        mesh,
        arrow,
        position,
        initialDirection,
        currentDirection: initialDirection.clone(),
        waves,
        emissionTimer: Math.random() * 1.2,
        pulseOffset: Math.random() * Math.PI * 2
    });
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
    createParticle(i);
}

// ============================================================
// HUD — PAINEL FLUTUANTE NO ESTILO DA REFERÊNCIA
// ============================================================

const hudScene = new THREE.Scene();

let hudWidth = 300;
let hudHeight = 185;

const hudCanvas = document.createElement("canvas");
hudCanvas.width = hudWidth * 2;
hudCanvas.height = hudHeight * 2;

const hudCtx = hudCanvas.getContext("2d");
const hudTexture = new THREE.CanvasTexture(hudCanvas);

const hudMaterial = new THREE.SpriteMaterial({
    map: hudTexture,
    transparent: true,
    depthTest: false
});

const hudSprite = new THREE.Sprite(hudMaterial);
hudSprite.scale.set(hudWidth, hudHeight, 1);
hudScene.add(hudSprite);

const hudCamera = new THREE.OrthographicCamera(
    -container.clientWidth / 2,
    container.clientWidth / 2,
    container.clientHeight / 2,
    -container.clientHeight / 2,
    0.1,
    10
);

hudCamera.position.z = 5;

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function updateHUD() {
    const ctx = hudCtx;
    const w = hudCanvas.width;
    const h = hudCanvas.height;

    ctx.clearRect(0, 0, w, h);

    roundRect(ctx, 4, 4, w - 8, h - 8, 20);

    ctx.fillStyle = "rgba(13,17,23,0.91)";
    ctx.fill();

    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.fillStyle = "#58a6ff";
    ctx.font = "bold 30px Segoe UI";
    ctx.fillText("HIPERTERMIA MAGNÉTICA", 28, 24);

    ctx.fillStyle = "#c9d1d9";
    ctx.font = "23px Segoe UI";
    ctx.fillText(
        `H(t) = ${formatNumber(currentH0, 0)} Oe`,
        28, 75
    );

    ctx.fillStyle = "#2ea043";
    ctx.fillText(
        `M(t) — φ = ${formatNumber(currentPhase * 180 / Math.PI, 1)}°`,
        28, 112
    );

    ctx.fillStyle = "#ff9b62";
    ctx.fillText(
        `SPA = ${formatNumber(currentSPA, 3)} W/g`,
        28, 149
    );

    hudTexture.needsUpdate = true;
}

function updateHUDLayout() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    hudCamera.left = -width / 2;
    hudCamera.right = width / 2;
    hudCamera.top = height / 2;
    hudCamera.bottom = -height / 2;
    hudCamera.updateProjectionMatrix();

    const scale = Math.min(1, width / 850);

    hudSprite.scale.set(
        hudWidth * scale,
        hudHeight * scale,
        1
    );

    hudSprite.position.set(
        -width / 2 + (hudWidth * scale) / 2 + 20,
        height / 2 - (hudHeight * scale) / 2 - 20,
        0
    );
}

updateHUD();
updateHUDLayout();

// ============================================================
// MARCA LAVINA
// ============================================================

const watermarkCanvas = document.createElement("canvas");
watermarkCanvas.width = 420;
watermarkCanvas.height = 120;

const watermarkCtx = watermarkCanvas.getContext("2d");
const watermarkTexture = new THREE.CanvasTexture(watermarkCanvas);

const watermark = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: watermarkTexture,
        transparent: true,
        depthTest: false
    })
);

watermark.scale.set(210, 60, 1);
hudScene.add(watermark);

function drawWatermark() {
    const ctx = watermarkCtx;

    ctx.clearRect(0, 0, 420, 120);
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 62px Segoe UI";
    ctx.fillText("LAVINA", 405, 5);

    ctx.fillStyle = "#58a6ff";
    ctx.font = "bold 25px Segoe UI";
    ctx.fillText("IFGW • UNICAMP", 405, 76);

    watermarkTexture.needsUpdate = true;
}

function updateWatermarkLayout() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scale = Math.min(1, width / 850);

    watermark.scale.set(210 * scale, 60 * scale, 1);

    watermark.position.set(
        width / 2 - 115 * scale,
        height / 2 - 45 * scale,
        0
    );
}

drawWatermark();
updateWatermarkLayout();

// ============================================================
// ANIMAÇÃO DAS ONDAS TÉRMICAS
// ============================================================

function emitHeatWave(particle) {
    const wave = particle.waves.find(w => !w.active);

    if (!wave) return;

    wave.active = true;
    wave.age = 0;
    wave.mesh.visible = true;
    wave.mesh.position.copy(particle.position);
    wave.mesh.scale.setScalar(0.7);
    wave.mesh.material.opacity = 0.8;
}

function updateHeatWaves(particle, delta, heatIntensity) {
    const emissionInterval =
        THREE.MathUtils.lerp(1.7, 0.38, heatIntensity);

    particle.emissionTimer -= delta;

    if (particle.emissionTimer <= 0) {
        emitHeatWave(particle);
        particle.emissionTimer = emissionInterval;
    }

    for (const wave of particle.waves) {
        if (!wave.active) continue;

        wave.age += delta;

        const progress = wave.age / wave.duration;

        if (progress >= 1) {
            wave.active = false;
            wave.mesh.visible = false;
            wave.mesh.material.opacity = 0;
            continue;
        }

        const expansion = 0.7 + progress * 5.2;
        wave.mesh.scale.setScalar(expansion);

        wave.mesh.material.opacity =
            0.75 * Math.pow(1 - progress, 1.3) *
            Math.min(1, heatIntensity * 2.5 + 0.15);
    }
}

// ============================================================
// DINÂMICA VISUAL DOS MOMENTOS MAGNÉTICOS
// ============================================================

const UP_AXIS = new THREE.Vector3(0, 1, 0);

const clock = new THREE.Clock();

let visualTime = 0;

// A frequência visual é propositalmente desacelerada.
// Ela não altera a frequência física usada no cálculo.
const VISUAL_OMEGA = 2.2;

function updateParticleAnimation(particle, delta) {
    const physical = calculatePhysics();

    const visualField = Math.sin(VISUAL_OMEGA * visualTime);

    const visualPhase = Number.isFinite(physical.phase)
        ? physical.phase
        : Math.PI / 2;

    const responseAmplitude =
        1 / Math.sqrt(1 + physical.omegaTau * physical.omegaTau);

    const visualMagnetization =
        responseAmplitude *
        Math.sin(VISUAL_OMEGA * visualTime - visualPhase);

    const target = new THREE.Vector3(
        particle.initialDirection.x * 0.48,
        visualMagnetization,
        particle.initialDirection.z * 0.48
    ).normalize();

    particle.currentDirection.lerp(target, 1 - Math.exp(-delta * 3.5));
    particle.currentDirection.normalize();

    particle.arrow.position.copy(particle.position);

    particle.arrow.quaternion.setFromUnitVectors(
        UP_AXIS,
        particle.currentDirection
    );

    // Campo alternado: seta muda de sentido e comprimento.
    const fieldDirection = new THREE.Vector3(
        0,
        Math.sign(visualField || 1),
        0
    );

    fieldArrow.setDirection(fieldDirection);

    const fieldLength = 9 + 18 * Math.abs(visualField);
    fieldArrow.setLength(fieldLength, 4.5, 2.5);

    // Pulsação luminosa da partícula associada à dissipação.
    const pulse =
        0.5 + 0.5 * Math.sin(
            VISUAL_OMEGA * visualTime * 2 + particle.pulseOffset
        );

    const thermalIntensity = Math.min(
        1,
        Math.max(0, Math.log10(1 + Math.max(currentSPA, 0)) / 3)
    );

    particle.mesh.material.emissive.setRGB(
        0.05 + 0.55 * thermalIntensity * pulse,
        0.08 + 0.12 * thermalIntensity * pulse,
        0.15
    );

    particle.mesh.material.emissiveIntensity =
        0.3 + 1.1 * thermalIntensity * pulse;

    particle.mesh.scale.setScalar(
        1 + 0.035 * pulse * thermalIntensity
    );

    updateHeatWaves(particle, delta, thermalIntensity);
}

// ============================================================
// ATUALIZAÇÃO DOS CONTROLES
// ============================================================

compositionSelect.addEventListener("change", () => {
    selectedComposition = compositionSelect.value;

    const sample = getCurrentSample();

    diameterSlider.value = sample.diameter;
    $("diameterValue").textContent =
        formatNumber(sample.diameter, 1);

    updateSampleParameters();
});

methodSelect.addEventListener("change", () => {
    selectedMethod = methodSelect.value;

    if (!manualKEnabled) {
        updateSampleParameters();
    } else {
        const method = getCurrentSample().methods[selectedMethod];

        $("keffTableValue").textContent =
            `${formatNumber(method.k, 2)} × 10⁵ erg/cm³`;

        $("keffUncertainty").textContent =
            `± ${formatNumber(method.error, 2)} × 10⁵`;
    }
});

manualK.addEventListener("change", updateManualKInterface);

keffSlider.addEventListener("input", () => {
    currentK = parseFloat(keffSlider.value);
    $("keffSliderValue").textContent = formatNumber(currentK, 2);
    updatePhysics();
});

tempSlider.addEventListener("input", () => {
    currentT = parseFloat(tempSlider.value);
    $("tempValue").textContent = formatNumber(currentT, 0);
    updatePhysics();
});

diameterSlider.addEventListener("input", () => {
    currentDiameter = parseFloat(diameterSlider.value);
    $("diameterValue").textContent =
        formatNumber(currentDiameter, 1);
    updatePhysics();
});

fieldSlider.addEventListener("input", () => {
    currentH0 = parseFloat(fieldSlider.value);
    $("fieldValue").textContent = formatNumber(currentH0, 0);
    updatePhysics();
});

frequencySlider.addEventListener("input", () => {
    currentFrequency = parseFloat(frequencySlider.value);
    $("frequencyValue").textContent =
        formatNumber(currentFrequency, 0);
    updatePhysics();
});

// ============================================================
// ACORDEÃO
// ============================================================

$("infoToggleBtn").addEventListener("click", () => {
    const box = $("infoBox");
    const icon = $("accordionIcon");

    if (box.style.maxHeight) {
        box.style.maxHeight = null;
        icon.textContent = "+";
    } else {
        box.style.maxHeight = box.scrollHeight + "px";
        icon.textContent = "−";
    }
});

// ============================================================
// REDIMENSIONAMENTO
// ============================================================

function resizeScene() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

    updateHUDLayout();
    updateWatermarkLayout();
}

window.addEventListener("resize", resizeScene);

// ============================================================
// GRAVAÇÃO DE VÍDEO
// ============================================================

let mediaRecorder = null;
let recordedChunks = [];

$("recordBtn").addEventListener("click", () => {
    if (!renderer.domElement.captureStream || !window.MediaRecorder) {
        alert("A gravação não é suportada neste navegador.");
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") return;

    const duration = Math.max(
        1,
        Math.min(60, parseInt($("recordDuration").value, 10) || 10)
    );

    const stream = renderer.domElement.captureStream(30);

    let mimeType = "";

    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeType = "video/webm;codecs=vp8";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm";
    }

    const options = mimeType ? { mimeType } : undefined;

    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (error) {
        alert("Não foi possível iniciar a gravação.");
        return;
    }

    recordedChunks = [];

    mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, {
            type: mimeType || "video/webm"
        });

        const url = URL.createObjectURL(blob);

        const filename =
            $("recordFilename").value.trim() ||
            `hipertermia-x${selectedComposition.replace(".", "_")}`;

        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.webm`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 5000);

        $("recordBtn").textContent = "Gravar";
        $("recordBtn").classList.remove("recording");
        $("recordBtn").disabled = false;
    };

    mediaRecorder.start();

    $("recordBtn").textContent = "Gravando...";
    $("recordBtn").classList.add("recording");
    $("recordBtn").disabled = true;

    setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    }, duration * 1000);
});

// ============================================================
// LOOP PRINCIPAL
// ============================================================

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);
    visualTime += delta;

    for (const particle of particles) {
        updateParticleAnimation(particle, delta);
    }

    controls.update();

    renderer.clear();
    renderer.render(scene, camera);

    renderer.clearDepth();
    renderer.render(hudScene, hudCamera);
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

function initialize() {
    selectedComposition = compositionSelect.value;
    selectedMethod = methodSelect.value;

    const sample = getCurrentSample();

    currentDiameter = sample.diameter;
    diameterSlider.value = sample.diameter;
    $("diameterValue").textContent = formatNumber(sample.diameter, 1);

    $("tempValue").textContent = currentT;
    $("fieldValue").textContent = currentH0;
    $("frequencyValue").textContent = currentFrequency;

    updateSampleParameters();

    $("loading").style.display = "none";

    resizeScene();
    animate();
}

initialize();
