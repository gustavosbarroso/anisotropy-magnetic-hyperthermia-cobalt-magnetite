
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ============================================================
// CONSTANTES FÍSICAS
// ============================================================

const CONSTANTS = {
    mu0: 4 * Math.PI * 1e-7,
    kB: 1.380649e-23,
    tau0: 1e-10,
    density: 5170,       // kg/m³ — densidade da magnetita
    Ms: 80 * 5170,       // A/m — 80 emu/g convertidos usando a densidade
    ergCm3ToJm3: 0.1,
    oeToAm: 1000 / (4 * Math.PI)
};

// ============================================================
// ELEMENTOS DA INTERFACE
// ============================================================

const elements = {
    temperature: document.getElementById('temperature'),
    diameter: document.getElementById('diameter'),
    anisotropy: document.getElementById('anisotropy'),
    field: document.getElementById('field'),
    frequency: document.getElementById('frequency'),

    temperatureValue: document.getElementById('temperatureValue'),
    diameterValue: document.getElementById('diameterValue'),
    anisotropyValue: document.getElementById('anisotropyValue'),
    fieldValue: document.getElementById('fieldValue'),
    frequencyValue: document.getElementById('frequencyValue'),

    tauResult: document.getElementById('tauResult'),
    chiResult: document.getElementById('chiResult'),
    spaResult: document.getElementById('spaResult'),
    phaseResult: document.getElementById('phaseResult'),
    energyResult: document.getElementById('energyResult'),

    visualTime: document.getElementById('visualTime'),
    playButton: document.getElementById('playButton'),
    playIcon: document.getElementById('playIcon'),
    playLabel: document.getElementById('playLabel'),
    restartButton: document.getElementById('restartButton'),
    resetButton: document.getElementById('resetButton'),
    recordText: document.getElementById('recordText')
};

// ============================================================
// ESTADO DA SIMULAÇÃO
// ============================================================

let running = true;
let elapsedTime = 0;
let lastFrameTime = 0;
let currentResults = null;

const DEFAULTS = {
    temperature: 300,
    diameter: 9,
    anisotropy: 1,
    field: 250,
    frequency: 624
};

// ============================================================
// CÁLCULOS FÍSICOS
// ============================================================

function getParameters() {
    return {
        T: Number(elements.temperature.value),
        diameter: Number(elements.diameter.value) * 1e-9,
        K: Number(elements.anisotropy.value) * 1e5
            * CONSTANTS.ergCm3ToJm3,
        H0: Number(elements.field.value) * CONSTANTS.oeToAm,
        f: Number(elements.frequency.value) * 1e3
    };
}

function calculatePhysics() {
    const p = getParameters();

    // Volume magnético de uma nanopartícula esférica
    const Vmag = (4 / 3) * Math.PI * Math.pow(p.diameter / 2, 3);

    // Equação (2): relaxação de Néel
    const exponent = (p.K * Vmag) / (CONSTANTS.kB * p.T);

    // Limite numérico para evitar overflow
    const tauN = CONSTANTS.tau0 * Math.exp(
        Math.min(exponent, 700)
    );

    // Aproximação utilizada: tau = tauN
    const tau = tauN;

    // Frequência angular
    const omega = 2 * Math.PI * p.f;

    // Susceptibilidade magnética inicial
    const chi0 =
        (CONSTANTS.mu0 * Math.pow(CONSTANTS.Ms, 2) * Vmag) /
        (3 * CONSTANTS.kB * p.T);

    // Equação (3): potência dissipada por unidade de volume
    const omegaTau = omega * tau;

    const Pvol =
        CONSTANTS.mu0 *
        Math.PI *
        chi0 *
        Math.pow(p.H0, 2) *
        p.f *
        (omegaTau / (1 + Math.pow(omegaTau, 2)));

    // Conversão da potência volumétrica para potência específica
    // W/m³ dividido por kg/m³ = W/kg
    // W/kg dividido por 1000 = W/g
    const SPA = Pvol / CONSTANTS.density / 1000;

    // Defasagem da resposta magnética
    const phase = Math.atan(omegaTau);

    return {
        ...p,
        Vmag,
        tauN,
        chi0,
        Pvol,
        SPA,
        phase,
        phaseDegrees: phase * 180 / Math.PI
    };
}

// ============================================================
// FORMATAÇÃO
// ============================================================

function formatScientific(value, digits = 3) {
    if (!Number.isFinite(value)) return '—';

    return value.toExponential(digits - 1)
        .replace('.', ',')
        .replace('e+', ' × 10^')
        .replace('e-', ' × 10^-');
}

function formatSPA(value) {
    if (!Number.isFinite(value)) return '—';

    if (Math.abs(value) >= 0.01) {
        return value.toFixed(3).replace('.', ',');
    }

    return formatScientific(value, 3);
}

function formatEnergy(value) {
    if (!Number.isFinite(value)) return '—';

    if (Math.abs(value) < 0.001) {
        return value.toExponential(3).replace('.', ',');
    }

    return value.toFixed(5).replace('.', ',');
}

// ============================================================
// ATUALIZAÇÃO DA INTERFACE
// ============================================================

function updateInterface() {
    const result = calculatePhysics();
    currentResults = result;

    elements.temperatureValue.textContent =
        `${result.T} K`;

    elements.diameterValue.textContent =
        `${(result.diameter * 1e9).toFixed(1).replace('.', ',')} nm`;

    elements.anisotropyValue.textContent =
        `${(result.K / 0.1 / 1e5).toFixed(1).replace('.', ',')} × 10⁵ erg/cm³`;

    elements.fieldValue.textContent =
        `${Number(elements.field.value)} Oe`;

    elements.frequencyValue.textContent =
        `${Number(elements.frequency.value)} kHz`;

    elements.tauResult.textContent =
        formatScientific(result.tauN);

    elements.chiResult.textContent =
        formatScientific(result.chi0);

    elements.spaResult.textContent =
        formatSPA(result.SPA);

    elements.phaseResult.textContent =
        result.phaseDegrees.toFixed(1).replace('.', ',');

    updateEnergy();
    updateRecord();
}

function updateEnergy() {
    if (!currentResults) return;

    // Energia específica acumulada:
    // E_spec = SPA * tempo
    // (W/g) * s = J/g
    const energy = currentResults.SPA * elapsedTime;

    elements.energyResult.textContent =
        `${formatEnergy(energy)} J/g`;

    elements.visualTime.textContent =
        `t = ${elapsedTime.toFixed(2).replace('.', ',')} s`;
}

function updateRecord() {
    if (!currentResults) return;

    elements.recordText.textContent =
        `Fe₃O₄ · d = ${(currentResults.diameter * 1e9).toFixed(1)} nm · ` +
        `H₀ = ${Number(elements.field.value)} Oe · ` +
        `f = ${Number(elements.frequency.value)} kHz. ` +
        `SPA teórico = ${formatSPA(currentResults.SPA)} W/g.`;
}

// ============================================================
// CENA THREE.JS
// ============================================================

const container = document.getElementById('three-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111116);

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

camera.position.set(0, 8, 17);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

container.appendChild(renderer.domElement);

// ============================================================
// ILUMINAÇÃO
// ============================================================

const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 2);
mainLight.position.set(5, 8, 6);
scene.add(mainLight);

const blueLight = new THREE.PointLight(0x2878ff, 35, 30);
blueLight.position.set(-6, 3, 4);
scene.add(blueLight);

// ============================================================
// PLANO DE FUNDO E REFERÊNCIAS
// ============================================================

const grid = new THREE.GridHelper(
    20,
    20,
    0x303f52,
    0x222b36
);

grid.position.y = -3.1;
scene.add(grid);

// Eixo horizontal de referência
const axisMaterial = new THREE.LineBasicMaterial({
    color: 0x3b4654,
    transparent: true,
    opacity: 0.5
});

const axisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-9, 0, 0),
    new THREE.Vector3(9, 0, 0)
]);

scene.add(new THREE.Line(axisGeometry, axisMaterial));

// ============================================================
// NANOPARTÍCULAS
// ============================================================

const particleGroup = new THREE.Group();
scene.add(particleGroup);

const particleGeometry = new THREE.SphereGeometry(0.24, 24, 24);

const particleMaterial = new THREE.MeshStandardMaterial({
    color: 0x7196bd,
    metalness: 0.35,
    roughness: 0.35
});

const particles = [];
const particleArrows = [];

const rows = 5;
const columns = 5;
const spacing = 1.25;

for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
        const x = (j - (columns - 1) / 2) * spacing;
        const y = (i - (rows - 1) / 2) * spacing;

        const particle = new THREE.Mesh(
            particleGeometry,
            particleMaterial.clone()
        );

        particle.position.set(x, y, 0);
        particleGroup.add(particle);
        particles.push(particle);

        const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(x, y, 0),
            0.65,
            0xf0883e,
            0.2,
            0.12
        );

        particleGroup.add(arrow);
        particleArrows.push(arrow);
    }
}

// ============================================================
// CAMPO MAGNÉTICO APLICADO
// ============================================================

const fieldArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 3.7, 0),
    2.2,
    0x58a6ff,
    0.55,
    0.3
);

scene.add(fieldArrow);

const fieldLabel = createLabel('H(t)', '#58a6ff');
fieldLabel.position.set(0, 4.6, 0);
scene.add(fieldLabel);

// ============================================================
// RÓTULOS 3D
// ============================================================

function createLabel(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 80;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 38px Arial';
    context.fillStyle = color;
    context.textAlign = 'center';
    context.fillText(text, 128, 52);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.7, 0.55, 1);

    return sprite;
}

const momentLabel = createLabel('m(t)', '#f0883e');
momentLabel.position.set(7.1, -2.8, 0);
scene.add(momentLabel);

// ============================================================
// ANIMAÇÃO
// ============================================================

// A frequência visual é reduzida para permitir observar a oscilação.
// Os cálculos físicos continuam usando a frequência selecionada.

const visualFrequency = 0.35;

function updateMagneticAnimation(time) {
    const result = currentResults || calculatePhysics();

    const visualOmega = 2 * Math.PI * visualFrequency;

    // Campo alternado visual
    const fieldValue = Math.sin(visualOmega * time);

    const fieldDirection = new THREE.Vector3(
        fieldValue >= 0 ? 1 : -1,
        0,
        0
    );

    fieldArrow.setDirection(fieldDirection);

    const fieldLength = Math.max(
        0.08,
        Math.abs(fieldValue) * 2.2
    );

    fieldArrow.setLength(
        fieldLength,
        Math.min(0.55, fieldLength * 0.3),
        Math.min(0.3, fieldLength * 0.15)
    );

    // Defasagem calculada com a frequência física do campo
    const magneticResponse = Math.sin(
        visualOmega * time - result.phase
    );

    const momentDirection = new THREE.Vector3(
        magneticResponse >= 0 ? 1 : -1,
        0,
        0
    );

    // Atualização dos momentos magnéticos
    for (let i = 0; i < particleArrows.length; i++) {
        const arrow = particleArrows[i];

        const localVariation = 0.92 + 0.08 * Math.sin(
            visualOmega * time + i * 0.35
        );

        arrow.setDirection(momentDirection);

        arrow.setLength(
            0.65 * Math.abs(magneticResponse) * localVariation + 0.04,
            0.2,
            0.12
        );

        // Pequena variação visual da partícula
        particles[i].scale.setScalar(
            1 + 0.025 * Math.abs(magneticResponse)
        );
    }
}

// ============================================================
// CONTROLES DE EXECUÇÃO
// ============================================================

function setRunning(value) {
    running = value;

    elements.playIcon.textContent = running ? 'Ⅱ' : '▶';
    elements.playLabel.textContent = running ? 'Pausar' : 'Continuar';
}

elements.playButton.addEventListener('click', () => {
    setRunning(!running);
});

elements.restartButton.addEventListener('click', () => {
    elapsedTime = 0;
    updateEnergy();

    elements.recordText.textContent =
        'Tempo reiniciado. Os parâmetros físicos foram mantidos.';
});

elements.resetButton.addEventListener('click', () => {
    elements.temperature.value = DEFAULTS.temperature;
    elements.diameter.value = DEFAULTS.diameter;
    elements.anisotropy.value = DEFAULTS.anisotropy;
    elements.field.value = DEFAULTS.field;
    elements.frequency.value = DEFAULTS.frequency;

    elapsedTime = 0;

    updateInterface();
    setRunning(true);

    elements.recordText.textContent =
        'Parâmetros físicos restaurados para os valores iniciais.';
});

// ============================================================
// EVENTOS DOS SLIDERS
// ============================================================

[
    elements.temperature,
    elements.diameter,
    elements.anisotropy,
    elements.field,
    elements.frequency
].forEach(input => {
    input.addEventListener('input', () => {
        updateInterface();
    });
});

// ============================================================
// LOOP PRINCIPAL
// ============================================================

function animate(timestamp) {
    requestAnimationFrame(animate);

    if (!lastFrameTime) {
        lastFrameTime = timestamp;
    }

    let deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    // Evita saltos grandes após interrupções da aba
    deltaTime = Math.min(deltaTime, 0.1);

    if (running) {
        elapsedTime += deltaTime;
    }

    updateMagneticAnimation(timestamp / 1000);

    if (running) {
        updateEnergy();
    }

    renderer.render(scene, camera);
}

// ============================================================
// REDIMENSIONAMENTO
// ============================================================

function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

window.addEventListener('resize', resizeRenderer);

// ============================================================
// INICIALIZAÇÃO
// ============================================================

updateInterface();
resizeRenderer();
requestAnimationFrame(animate);
