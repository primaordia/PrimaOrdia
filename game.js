import * as THREE from "./vendor/three.module.js";

const canvas = document.querySelector("#battlefield");
const squadEl = document.querySelector("#squad");
const heroDockEl = document.querySelector("#heroDock");
const abilitiesPanelEl = document.querySelector("#abilitiesPanel");
const countdownOverlayEl = document.querySelector("#countdownOverlay");
const selectedNameEl = document.querySelector("#selectedName");
const selectedStatsEl = document.querySelector("#selectedStats");
const hudEl = document.querySelector(".hud");
const logEl = document.querySelector("#log");
const preIntroScreenEl = document.querySelector("#preIntroScreen");
const preIntroBtn = document.querySelector("#preIntroBtn");
const introScreenEl = document.querySelector("#introScreen");
const startGameBtn = document.querySelector("#startGameBtn");
const scoreEl = document.querySelector("#score");
const goldEl = document.querySelector("#gold");
const waveEl = document.querySelector("#wave");
const menuBtn = document.querySelector("#menuBtn");
const actionMenuEl = document.querySelector("#actionMenu");
const introBtn = document.querySelector("#introBtn");
const soundBtn = document.querySelector("#soundBtn");
const musicBtn = document.querySelector("#musicBtn");
const rallyBtn = document.querySelector("#rallyBtn");
const restartBtn = document.querySelector("#restartBtn");

const worldSize = 34;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const faceTextures = new Map();
const heroVisualScale = 1.35;
const missionDuration = 90;
const heroUpkeepCost = 10;
const heroReviveCost = 50;
const heroSleepDuration = 10;
const sausageRainRadius = 2.66;
const campRewards = [25, 50, 100];
const campBuffs = [
  { name: "Heal Team", cost: 25 },
  { name: "Attack Boost", cost: 35 },
  { name: "Defense Boost", cost: 35 }
];
const abilityDamageScale = 2.5;
const combatStatScale = 2.5;
const enemyHpScale = 2.5;
const abilityCooldownDurations = {
  "Fairy Dust": 6,
  "Solar Burst": 5,
  "Wing Dash": 8,
  "Sparkly Heal": 3,
  "Berry Shield": 12,
  "Stinky Breath": 3,
  "Void Barrage": 5,
  "Shadow Step": 5,
  "Sausage Party": 7,
  "Inner Light": 1,
  "Space Fart": 3,
  "Selfless Belch": 5
};
const heroStartSlots = { leela: 0, frank: 1, poliana: 2, feenix: 3 };
const biomeThemes = [
  { name: "Nebula Grove", sky: 0x050816, fog: 0x050816, ground: 0x28314f, patch: [0x32406f, 0x1c2442, 0x46345f], water: 0x285f8c, mountain: 0x5d658c, tree: [0x273e65, 0x44577d, 0x38436d] },
  { name: "Asteroid Dunes", sky: 0x070612, fog: 0x070612, ground: 0x5b496c, patch: [0x6c5f8c, 0x3e3157, 0x7b6281], water: 0x355c7f, mountain: 0x7b7690, tree: [0x4d5378, 0x656990, 0x3c4569] },
  { name: "Moonbase", sky: 0x03050d, fog: 0x03050d, ground: 0x5f626b, patch: [0x747887, 0x454b5b, 0x2f3548], water: 0x334f76, mountain: 0x8a8e9c, tree: [0x5e6c89, 0x74809a, 0x49546e] },
  { name: "Red Planet", sky: 0x09040b, fog: 0x09040b, ground: 0x7f3b42, patch: [0x9d4c5c, 0x522b42, 0xb35b60], water: 0x2f5f75, mountain: 0x944f65, tree: [0x72506e, 0x93596f, 0x5d3d5a] }
];

let renderer;
let scene;
let camera;
let ground;
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let viewportIsPortrait = viewportHeight > viewportWidth;
let cameraZoom = 1.2;
const cameraPan = new THREE.Vector3(0, 0, 0);
const activePointers = new Map();
const cameraControls = {
  moved: false,
  tapEvent: null,
  lastSingle: null,
  pinchDistance: 0,
  pinchZoom: 1.2,
  pinchCenter: null
};
let selectedId = "aegis";
let gold = 60;
let scoreAdjustments = 0;
let heroDamageScore = 0;
let wave = 1;
let spawnTimer = 0;
let missionTimer = missionDuration;
let missionCountdown = 0;
let missionPending = false;
let medkitSpawnTimer = 0;
let state = "intro";
let gameStarted = false;
let units = [];
let markers = [];
let medkits = [];
let scenery = [];
let terrainZones = [];
let currentBiome = biomeThemes[0];
let popups = [];
let upkeepWidgets = [];
let hoverPopup = null;
let hoveredUnitId = null;
let hoveredMedkitId = null;
let highlightedMedkit = null;
let restartCountdown = 0;
let autoRestartTimeout = null;
let uiRefreshTimer = 0;
let actionMenuOpen = false;
let targetingAbility = null;
let audioContext = null;
let masterAudioGain = null;
let soundEnabled = true;
let musicEnabled = true;
const masterAudioVolume = 5;
const soundEffectsVolume = 1;
const musicVolume = 0.32;
const audioAssets = {
  spaceFart: new Audio("assets/audio/space-fart.mp3"),
  selflessBelch: new Audio("assets/audio/selfless-belch.mp3"),
  innerLight: new Audio("assets/audio/inner-light.mp3"),
  sparklyHeal: new Audio("assets/audio/sparkly-heal.mp3"),
  starFairyAttack: new Audio("assets/audio/star-fairy-attack.mp3"),
  paladinAttack: new Audio("assets/audio/paladin-attack.mp3"),
  enemyAttack: new Audio("assets/audio/enemy-attack.mp3"),
  backgroundMusic: new Audio("assets/audio/background-music-1.mp3")
};
let backgroundMusicPrepared = false;

const heroTemplates = [
  {
    id: "leela",
    name: "Leela",
    color: 0x68c7df,
    accent: 0xf2b5d4,
    hp: 155,
    atk: 14,
    def: 1,
    range: 4,
    speed: 5.25,
    role: "Star Fairy",
    archetype: "guardian",
    portrait: "assets/heroes/leela.png",
    faceTexture: "assets/heroes/leela-face.png",
    abilities: ["Fairy Dust", "Wing Dash", "Sparkly Heal"]
  },
  {
    id: "feenix",
    name: "Feenix",
    color: 0xee7d45,
    accent: 0xffd467,
    hp: 105,
    atk: 22,
    def: 1,
    range: 2,
    speed: 5.7,
    role: "Berry Phoenix",
    archetype: "mystic",
    portrait: "assets/heroes/feenix.png",
    faceTexture: "assets/heroes/feenix-face.png",
    abilities: ["Solar Burst", "Berry Shield", "Stinky Breath"]
  },
  {
    id: "poliana",
    name: "Poliana",
    color: 0x8ed36e,
    accent: 0x9c59d1,
    hp: 118,
    atk: 16,
    def: 1,
    speed: 6.35,
    role: "Void Ranger",
    archetype: "ranger",
    portrait: "assets/heroes/poliana.png",
    faceTexture: "assets/heroes/poliana-face.png",
    range: 6,
    abilities: ["Void Barrage", "Shadow Step", "Sausage Party"]
  },
  {
    id: "frank",
    name: "Frank",
    color: 0xf4f0dc,
    accent: 0xf3cf55,
    hp: 165,
    atk: 12,
    def: 3,
    range: 1,
    speed: 5.1,
    role: "Space Paladin",
    archetype: "paladin",
    portrait: "assets/heroes/frank.png",
    abilities: ["Inner Light", "Space Fart", "Selfless Belch"]
  }
];

const enemyTemplates = [
  { name: "Grub Raider", color: 0xa54939, accent: 0x3a1e18, hp: 62, atk: 4, def: 0, range: 1.8, speed: 2.9, archetype: "raider" },
  { name: "Stone Brute", color: 0x8c6f55, accent: 0x4a3a2f, hp: 98, atk: 6, def: 1, range: 1.7, speed: 2.25, archetype: "brute" },
  { name: "Hex Imp", color: 0x9b62bd, accent: 0x67d7a2, hp: 48, atk: 5, def: 0, range: 4.5, speed: 3.25, archetype: "caster" }
];

init();
syncUi();
animate();
prepareBackgroundMusic();
startBackgroundMusic();
requestAnimationFrame(startBackgroundMusic);
window.addEventListener("load", startBackgroundMusic, { once: true });
window.addEventListener("pageshow", startBackgroundMusic);
setTimeout(startBackgroundMusic, 350);

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050816);
  scene.fog = new THREE.Fog(0x050816, 38, 72);

  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 27, 28);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xf8efd6, 0x30402e, 3.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1c6, 3.4);
  sun.position.set(-10, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  scene.add(sun);

  addSpaceBackdrop();
  createWorld();
  resize();

  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", removeHoverPopup);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  menuBtn.addEventListener("click", toggleActionMenu);
  document.addEventListener("pointerdown", closeActionMenuFromPointer);
  document.addEventListener("pointerdown", startBackgroundMusic);
  document.addEventListener("touchstart", startBackgroundMusic, { passive: true });
  document.addEventListener("click", startBackgroundMusic);
  introScreenEl.addEventListener("pointerdown", startBackgroundMusic);
  introScreenEl.addEventListener("touchstart", startBackgroundMusic, { passive: true });
  preIntroBtn.addEventListener("pointerdown", startBackgroundMusic);
  preIntroBtn.addEventListener("touchstart", startBackgroundMusic, { passive: true });
  preIntroBtn.addEventListener("click", showIntroFromPreIntro);
  introBtn.addEventListener("click", showIntro);
  startGameBtn.addEventListener("pointerdown", startBackgroundMusic);
  startGameBtn.addEventListener("touchstart", startBackgroundMusic, { passive: true });
  startGameBtn.addEventListener("click", hideIntro);
  soundBtn.addEventListener("click", toggleSound);
  musicBtn.addEventListener("click", toggleMusic);
  rallyBtn.addEventListener("click", rallyHeroes);
  restartBtn.addEventListener("click", () => {
    setActionMenuOpen(false);
    resetGame();
  });
}

function addSpaceBackdrop() {
  const positions = [];
  const colors = [];
  const starColors = [new THREE.Color(0xffffff), new THREE.Color(0xbfd9ff), new THREE.Color(0xfff0b8), new THREE.Color(0xd7c4ff)];
  for (let i = 0; i < 520; i += 1) {
    const radius = THREE.MathUtils.randFloat(54, 92);
    const theta = Math.random() * Math.PI * 2;
    const y = THREE.MathUtils.randFloat(12, 64);
    positions.push(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
    const color = starColors[i % starColors.length];
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false })
  );
  stars.renderOrder = -20;
  scene.add(stars);

  addPlanet(-22, 24, -34, 3.6, 0x7a5cff, 0x2d214f);
  addPlanet(25, 34, -42, 5.2, 0xd97957, 0x5c2735);
  addPlanet(16, 18, 36, 2.4, 0x5ec4d3, 0x173946);
}

function addPlanet(x, y, z, radius, color, ringColor) {
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86 })
  );
  planet.position.set(x, y, z);
  scene.add(planet);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.25, radius * 1.72, 48),
    new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.48, side: THREE.DoubleSide })
  );
  ring.position.copy(planet.position);
  ring.rotation.set(Math.PI / 2.5, 0.25, 0.35);
  scene.add(ring);
}

function setActionMenuOpen(open) {
  actionMenuOpen = open;
  actionMenuEl.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
}

function toggleActionMenu(event) {
  event.stopPropagation();
  setActionMenuOpen(!actionMenuOpen);
}

function showIntroFromPreIntro() {
  preIntroScreenEl.classList.add("hidden");
  document.body.classList.remove("pre-intro-active");
  showIntro();
}

function showIntro() {
  setActionMenuOpen(false);
  document.body.classList.add("intro-active");
  introScreenEl.classList.remove("hidden");
  startBackgroundMusic();
}

function hideIntro() {
  introScreenEl.classList.add("hidden");
  document.body.classList.remove("intro-active");
  if (!gameStarted) {
    gameStarted = true;
    resetGame();
  }
  startBackgroundMusic();
}

function introVisible() {
  return !introScreenEl.classList.contains("hidden");
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) {
    Object.entries(audioAssets).forEach(([name, asset]) => {
      if (name === "backgroundMusic") return;
      asset.pause();
      asset.currentTime = 0;
    });
  }
  applyAudioVolumes();
  syncUi();
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (!musicEnabled) {
    audioAssets.backgroundMusic.pause();
    audioAssets.backgroundMusic.currentTime = 0;
  }
  applyAudioVolumes();
  if (musicEnabled) startBackgroundMusic();
  syncUi();
}

function applyAudioVolumes() {
  if (masterAudioGain && audioContext) {
    masterAudioGain.gain.setValueAtTime(soundEnabled ? masterAudioVolume * soundEffectsVolume : 0, audioContext.currentTime);
  }
  Object.entries(audioAssets).forEach(([name, asset]) => {
    asset.volume = name === "backgroundMusic"
      ? (musicEnabled ? musicVolume : 0)
      : (soundEnabled ? soundEffectsVolume : 0);
  });
}

function closeActionMenuFromPointer(event) {
  if (!actionMenuOpen || event.target.closest(".action-menu")) return;
  setActionMenuOpen(false);
}

function createWorld() {
  const groundMat = new THREE.MeshStandardMaterial({ color: currentBiome.ground, roughness: 0.88, metalness: 0.02 });
  ground = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = "ground";
  scene.add(ground);

  randomizeScenery();
  addRuneStones();
  addSpawnGate();
}

function addScenery(object) {
  scenery.push(object);
  scene.add(object);
  return object;
}

function clearScenery() {
  scenery.forEach((object) => scene.remove(object));
  scenery = [];
  terrainZones = [];
}

function randomizeScenery() {
  clearScenery();
  currentBiome = biomeThemes[Math.floor(Math.random() * biomeThemes.length)];
  scene.background = new THREE.Color(currentBiome.sky);
  scene.fog.color.setHex(currentBiome.fog);
  ground.material.color.setHex(currentBiome.ground);
  addTerrainPatches();
  addForestRing();
  addEdgeDetailTiles();
  addRandomMountains();
  addRandomWater();
  addRandomSettlements();
  addSpaceSurfaceDetails();
  addCrystalFields();
  addOrbitalDebris();
}

function addTerrainPatches() {
  const patchMats = [
    new THREE.MeshStandardMaterial({ color: currentBiome.patch[0], roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: currentBiome.patch[1], roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: currentBiome.patch[2], roughness: 0.95 })
  ];

  const patches = [
    { x: -8, z: -3, sx: 7, sz: 4, r: 0.2, mat: 0 },
    { x: 7, z: 3, sx: 6, sz: 3, r: -0.25, mat: 1 },
    { x: -5, z: 9, sx: 4, sz: 3, r: 0.7, mat: 2 },
    { x: 3, z: -9, sx: 7, sz: 3, r: -0.45, mat: 1 }
  ];

  patches.forEach((patch) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(patch.sx, patch.sz), patchMats[patch.mat]);
    mesh.rotation.set(-Math.PI / 2, 0, patch.r);
    mesh.position.set(patch.x, 0.035, patch.z);
    mesh.receiveShadow = true;
    addScenery(mesh);
  });
}

function addForestRing() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3325, roughness: 0.9 });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: currentBiome.tree[0], roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: currentBiome.tree[1], roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: currentBiome.tree[2], roughness: 0.85 })
  ];
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x566354, roughness: 0.9 });

  for (let i = 0; i < 54; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 12.2 + Math.random() * 4.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (i % 4 === 0) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.45), rockMat);
      rock.position.set(x, 0.3, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      addScenery(rock);
      continue;
    }

    addTree(x, z, trunkMat, leafMats[i % leafMats.length], 0.82 + Math.random() * 0.42);
  }

  const clusters = THREE.MathUtils.randInt(4, 7);
  for (let cluster = 0; cluster < clusters; cluster += 1) {
    const center = randomFieldPositions(1, 0)[0];
    const trees = THREE.MathUtils.randInt(5, 9);
    for (let i = 0; i < trees; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.4;
      addTree(center.x + Math.cos(angle) * radius, center.z + Math.sin(angle) * radius, trunkMat, leafMats[(cluster + i) % leafMats.length], 0.72 + Math.random() * 0.34);
    }
  }
}

function addEdgeDetailTiles() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3325, roughness: 0.9 });
  const leafMats = currentBiome.tree.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c6458, roughness: 0.9 });
  const patchMats = currentBiome.patch.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  const edge = worldSize / 2 - 1.15;
  const sides = [
    { axis: "z", sign: -1 },
    { axis: "z", sign: 1 },
    { axis: "x", sign: -1 },
    { axis: "x", sign: 1 }
  ];

  sides.forEach((side, sideIndex) => {
    for (let i = 0; i < 16; i += 1) {
      const along = THREE.MathUtils.randFloat(-edge + 1.2, edge - 1.2);
      const inset = THREE.MathUtils.randFloat(0.2, 2.2);
      const x = side.axis === "x" ? side.sign * (edge - inset) : along;
      const z = side.axis === "z" ? side.sign * (edge - inset) : along;

      if (i % 5 === 0) {
        const patch = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4 + Math.random() * 1.8, 0.9 + Math.random() * 1.5),
          patchMats[(sideIndex + i) % patchMats.length]
        );
        patch.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        patch.position.set(x, 0.038, z);
        patch.receiveShadow = true;
        addScenery(patch);
      }

      if (i % 3 === 0) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + Math.random() * 0.42), rockMat);
        rock.position.set(x + THREE.MathUtils.randFloatSpread(0.8), 0.28, z + THREE.MathUtils.randFloatSpread(0.8));
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.scale.y = 0.65 + Math.random() * 0.5;
        rock.castShadow = true;
        rock.receiveShadow = true;
        addScenery(rock);
        continue;
      }

      addTree(
        x + THREE.MathUtils.randFloatSpread(0.7),
        z + THREE.MathUtils.randFloatSpread(0.7),
        trunkMat,
        leafMats[(sideIndex + i) % leafMats.length],
        0.62 + Math.random() * 0.36
      );
    }
  });
}

function addTree(x, z, trunkMat, leafMat, scale) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.2, 7), trunkMat);
  trunk.position.y = 0.6;
  trunk.castShadow = true;
  tree.add(trunk);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.78 + Math.random() * 0.28, 1.8, 7), leafMat);
  crown.position.y = 1.65;
  crown.castShadow = true;
  tree.add(crown);

  const lowerCrown = new THREE.Mesh(new THREE.ConeGeometry(0.92 + Math.random() * 0.2, 1.2, 7), leafMat);
  lowerCrown.position.y = 1.18;
  lowerCrown.castShadow = true;
  tree.add(lowerCrown);

  tree.position.set(x, 0, z);
  tree.rotation.y = Math.random() * Math.PI;
  tree.scale.setScalar(scale);
  addScenery(tree);
  terrainZones.push({ type: "trees", shape: "circle", x, z, radius: 0.95 * scale });
}

function addRandomMountains() {
  const mountainMat = new THREE.MeshStandardMaterial({ color: currentBiome.mountain, roughness: 0.9 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xdce4df, roughness: 0.78 });
  const count = THREE.MathUtils.randInt(8, 14);

  for (let i = 0; i < count; i += 1) {
    const clusterAngle = Math.floor(i / 3) * 1.9 + Math.random() * 0.9;
    const radius = THREE.MathUtils.randFloat(9.8, 16.5);
    const angle = clusterAngle + THREE.MathUtils.randFloat(-0.32, 0.32);
    const group = new THREE.Group();
    const height = THREE.MathUtils.randFloat(2.2, 4.6);
    const mountainRadius = 1.3 + Math.random();
    const base = new THREE.Mesh(new THREE.ConeGeometry(mountainRadius, height, 6), mountainMat);
    base.position.y = height * 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46 + Math.random() * 0.18, height * 0.32, 6), snowMat);
    cap.position.y = height * 0.86;
    cap.castShadow = true;
    group.add(cap);

    group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    group.rotation.y = Math.random() * Math.PI;
    addScenery(group);
    terrainZones.push({ type: "mountain", shape: "circle", x: group.position.x, z: group.position.z, radius: mountainRadius * 1.2 });
    terrainZones.push({ type: "mountainTop", shape: "circle", x: group.position.x, z: group.position.z, radius: mountainRadius * 0.38 });
  }
}

function addRandomWater() {
  const waterMat = new THREE.MeshStandardMaterial({ color: currentBiome.water, emissive: 0x0b2b36, emissiveIntensity: 0.18, roughness: 0.35, metalness: 0.08, transparent: true, opacity: 0.82 });
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x8b7a58, roughness: 0.95 });
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0x9fd8df, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  if (Math.random() < 0.55) {
    const width = THREE.MathUtils.randFloat(3, 5);
    const height = worldSize * 0.9;
    const rotation = THREE.MathUtils.randFloat(-0.55, 0.55);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(width, height), waterMat);
    river.rotation.set(-Math.PI / 2, 0, rotation);
    river.position.set(THREE.MathUtils.randFloat(-5, 5), 0.045, THREE.MathUtils.randFloat(-1.5, 1.5));
    river.receiveShadow = true;
    addScenery(river);
    const bankA = new THREE.Mesh(new THREE.PlaneGeometry(0.22, height), bankMat);
    const bankB = new THREE.Mesh(new THREE.PlaneGeometry(0.22, height), bankMat);
    [bankA, bankB].forEach((bank, index) => {
      bank.rotation.copy(river.rotation);
      const side = index === 0 ? -1 : 1;
      bank.position.set(
        river.position.x + Math.cos(rotation) * side * width * 0.58,
        0.052,
        river.position.z - Math.sin(rotation) * side * width * 0.58
      );
      addScenery(bank);
    });
    for (let i = 0; i < 8; i += 1) {
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 18), rippleMat);
      ripple.rotation.x = -Math.PI / 2;
      ripple.scale.set(1.7, 0.55, 1);
      ripple.position.set(river.position.x + THREE.MathUtils.randFloatSpread(width * 0.7), 0.06, river.position.z + THREE.MathUtils.randFloatSpread(height * 0.75));
      addScenery(ripple);
    }
    terrainZones.push({ type: "water", shape: "rect", x: river.position.x, z: river.position.z, width, height, rotation });
    return;
  }

  const lakeCount = THREE.MathUtils.randInt(1, 3);
  for (let i = 0; i < lakeCount; i += 1) {
    const radius = THREE.MathUtils.randFloat(1.5, 3.3);
    const scaleX = 1.45;
    const scaleZ = 0.72 + Math.random() * 0.35;
    const lake = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), waterMat);
    lake.scale.set(scaleX, scaleZ, 1);
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(THREE.MathUtils.randFloat(-9, 9), 0.048, THREE.MathUtils.randFloat(-8, 8));
    lake.receiveShadow = true;
    addScenery(lake);
    const bank = new THREE.Mesh(new THREE.RingGeometry(radius * 0.96, radius * 1.08, 36), bankMat);
    bank.scale.copy(lake.scale);
    bank.rotation.x = -Math.PI / 2;
    bank.position.set(lake.position.x, 0.052, lake.position.z);
    addScenery(bank);
    for (let r = 0; r < 3; r += 1) {
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.2 + r * 0.18, 0.23 + r * 0.18, 24), rippleMat);
      ripple.scale.set(1.35, 0.72, 1);
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(lake.position.x + THREE.MathUtils.randFloatSpread(radius * 0.45), 0.061, lake.position.z + THREE.MathUtils.randFloatSpread(radius * 0.3));
      addScenery(ripple);
    }
    terrainZones.push({ type: "water", shape: "ellipse", x: lake.position.x, z: lake.position.z, rx: radius * scaleX, rz: radius * scaleZ });
  }
}

function addRandomSettlements() {
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xc99862, roughness: 0.72 });
  const roofMats = [
    new THREE.MeshStandardMaterial({ color: 0x8f4938, roughness: 0.76 }),
    new THREE.MeshStandardMaterial({ color: 0x5f6d78, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0xb0793e, roughness: 0.76 })
  ];
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x8b7a58, roughness: 0.95 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a442d, roughness: 0.85 });
  const settlements = THREE.MathUtils.randInt(1, 3);

  for (let s = 0; s < settlements; s += 1) {
    const center = randomFieldPositions(1, 0)[0];
    center.x = THREE.MathUtils.clamp(center.x, -10, 10);
    center.z = THREE.MathUtils.clamp(center.z, -7, 9);

    const road = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.7), roadMat);
    road.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    road.position.set(center.x, 0.055, center.z);
    addScenery(road);

    const houses = THREE.MathUtils.randInt(3, 6);
    for (let i = 0; i < houses; i += 1) {
      const angle = (i / houses) * Math.PI * 2 + Math.random() * 0.35;
      const radius = 1.2 + Math.random() * 1.5;
      const house = createHouse(houseMat, roofMats[i % roofMats.length], woodMat);
      house.position.set(center.x + Math.cos(angle) * radius, 0, center.z + Math.sin(angle) * radius);
      house.rotation.y = Math.random() * Math.PI * 2;
      addScenery(house);
    }

    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.32, 10), woodMat);
    well.position.set(center.x, 0.16, center.z);
    well.castShadow = true;
    addScenery(well);
  }
}

function addSpaceSurfaceDetails() {
  const craterMat = new THREE.MeshBasicMaterial({ color: 0x090814, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x7a7291, roughness: 0.88, metalness: 0.08 });
  const glowMats = [
    new THREE.MeshBasicMaterial({ color: 0x65e7ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xff79d6, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xffdd6f, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
  ];

  for (let i = 0; i < 10; i += 1) {
    const position = randomFieldPositions(1, 0)[0];
    const radius = THREE.MathUtils.randFloat(0.65, 1.55);
    const crater = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), craterMat);
    crater.scale.set(1.35, 0.7 + Math.random() * 0.35, 1);
    crater.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    crater.position.set(position.x, 0.062, position.z);
    addScenery(crater);

    const rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.95, radius * 1.08, 28), rimMat);
    rim.scale.copy(crater.scale);
    rim.rotation.copy(crater.rotation);
    rim.position.set(position.x, 0.072, position.z);
    rim.receiveShadow = true;
    addScenery(rim);
  }

  for (let i = 0; i < 16; i += 1) {
    const position = randomFieldPositions(1, 0)[0];
    const mark = new THREE.Mesh(
      new THREE.RingGeometry(0.18 + Math.random() * 0.35, 0.21 + Math.random() * 0.38, 20),
      glowMats[i % glowMats.length]
    );
    mark.scale.set(1.8 + Math.random() * 1.6, 0.6 + Math.random() * 0.55, 1);
    mark.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    mark.position.set(position.x, 0.08, position.z);
    addScenery(mark);
  }
}

function addCrystalFields() {
  const crystalMats = [
    new THREE.MeshStandardMaterial({ color: 0x98f4ff, emissive: 0x1f8296, emissiveIntensity: 0.58, roughness: 0.28, metalness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: 0xff8ee8, emissive: 0x8c2b72, emissiveIntensity: 0.5, roughness: 0.32, metalness: 0.12 }),
    new THREE.MeshStandardMaterial({ color: 0xffe883, emissive: 0xa46612, emissiveIntensity: 0.42, roughness: 0.34, metalness: 0.2 })
  ];
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x46445c, roughness: 0.82, metalness: 0.12 });
  const clusterCount = THREE.MathUtils.randInt(5, 8);

  for (let c = 0; c < clusterCount; c += 1) {
    const center = randomFieldPositions(1, 0)[0];
    const group = new THREE.Group();
    const stones = THREE.MathUtils.randInt(3, 6);
    for (let i = 0; i < stones; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.85;
      const height = THREE.MathUtils.randFloat(0.6, 1.5);
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.16 + Math.random() * 0.14, height, 5), crystalMats[(c + i) % crystalMats.length]);
      crystal.position.set(Math.cos(angle) * radius, height * 0.5, Math.sin(angle) * radius);
      crystal.rotation.set(THREE.MathUtils.randFloat(-0.16, 0.16), Math.random() * Math.PI, THREE.MathUtils.randFloat(-0.16, 0.16));
      crystal.castShadow = true;
      group.add(crystal);
    }

    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46 + Math.random() * 0.28), baseMat);
    base.position.y = 0.2;
    base.scale.y = 0.34;
    base.receiveShadow = true;
    group.add(base);

    group.position.set(center.x, 0, center.z);
    addScenery(group);
  }
}

function addOrbitalDebris() {
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb8c1d9, roughness: 0.42, metalness: 0.62 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x30354e, roughness: 0.58, metalness: 0.48 });
  const solarMat = new THREE.MeshStandardMaterial({ color: 0x2f6b98, emissive: 0x102f50, emissiveIntensity: 0.22, roughness: 0.42, metalness: 0.28 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffe878, transparent: true, opacity: 0.74 });
  const debrisCount = THREE.MathUtils.randInt(5, 8);

  for (let i = 0; i < debrisCount; i += 1) {
    const center = randomFieldPositions(1, 0)[0];
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.42), i % 2 ? metalMat : darkMetalMat);
    core.position.y = 0.24;
    core.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
    core.castShadow = true;
    group.add(core);

    const panelCount = i % 3 === 0 ? 2 : 1;
    for (let p = 0; p < panelCount; p += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.34), solarMat);
      panel.position.set((p === 0 ? -0.72 : 0.72), 0.26, 0);
      panel.rotation.z = THREE.MathUtils.randFloat(-0.28, 0.28);
      panel.castShadow = true;
      group.add(panel);
    }

    if (i % 2 === 0) {
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), beaconMat);
      beacon.position.set(0, 0.52, 0.22);
      group.add(beacon);
    }

    group.position.set(center.x, 0.02, center.z);
    group.rotation.y = Math.random() * Math.PI * 2;
    addScenery(group);
  }
}

function createHouse(houseMat, roofMat, woodMat) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.62, 0.72), houseMat);
  body.position.y = 0.31;
  body.castShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.48, 4), roofMat);
  roof.position.y = 0.86;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.04), woodMat);
  door.position.set(0, 0.18, 0.38);
  group.add(door);
  return group;
}

function addRuneStones() {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x66715f, roughness: 0.84 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x72d7ef, transparent: true, opacity: 0.75 });

  [
    [-9.5, 5.7],
    [9.4, 5.9],
    [-7.5, -7.6],
    [7.5, -8.2]
  ].forEach(([x, z], index) => {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.45), stoneMat);
    stone.position.set(x, 0.9, z);
    stone.rotation.y = index * 0.7;
    stone.castShadow = true;
    scene.add(stone);

    const rune = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, 5), glowMat);
    rune.position.set(x, 1.15, z + 0.24);
    rune.rotation.set(0, 0, index * 0.3);
    scene.add(rune);
  });
}

function addSpawnGate() {
  const gate = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4d4540, roughness: 0.8 });
  const portalMat = new THREE.MeshBasicMaterial({ color: 0x8c58c7, transparent: true, opacity: 0.48, side: THREE.DoubleSide });

  for (const x of [-1.55, 1.55]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.4, 0.7), stoneMat);
    pillar.position.set(x, 1.7, 0);
    pillar.castShadow = true;
    gate.add(pillar);
  }

  const arch = new THREE.Mesh(new THREE.BoxGeometry(4, 0.72, 0.72), stoneMat);
  arch.position.set(0, 3.25, 0);
  arch.castShadow = true;
  gate.add(arch);

  const portal = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32), portalMat);
  portal.position.set(0, 1.7, 0.08);
  gate.add(portal);

  gate.position.set(0, 0, -14.6);
  gate.rotation.y = Math.PI;
  scene.add(gate);
}

function buildHeroModel(group, data, bodyMat, accentMat, darkMat) {
  if (data.id === "feenix") {
    buildFeenixModel(group, data);
    return;
  }
  if (data.id === "frank") {
    buildPaladinModel(group, data);
    return;
  }

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1b894, roughness: 0.54, metalness: 0.02 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xdcb65c, roughness: 0.42, metalness: 0.2 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xd976a4, roughness: 0.5, metalness: 0.08 });
  const purpleMat = new THREE.MeshStandardMaterial({ color: 0x4e2d66, roughness: 0.46, metalness: 0.1 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: data.id === "leela" ? 0xe4c36e : 0x23172f,
    roughness: 0.7,
    metalness: 0.02
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.95, 6, 12), data.id === "poliana" ? purpleMat : pinkMat);
  body.position.y = 1.08;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 22, 16), skinMat);
  head.position.y = 2.12;
  head.castShadow = true;
  group.add(head);
  addFace(group, data);

  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.1), data.id === "poliana" ? darkMat : pinkMat);
  cape.position.set(0, 1.2, -0.48);
  cape.rotation.x = -0.14;
  cape.castShadow = true;
  group.add(cape);

  addChibiLimbs(group, skinMat, data.id === "poliana" ? purpleMat : pinkMat);
  addHair(group, data, hairMat);

  if (data.archetype === "guardian") {
    addFairyWings(group);
    addFlowerCrown(group);
    addWeapon(group, "staff", goldMat, 1.08);
  }

  if (data.archetype === "mystic") {
    addWeapon(group, "staff", accentMat);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 8, 28), accentMat);
    halo.position.y = 2.58;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  }

  if (data.archetype === "ranger") {
    addPolianaSkirt(group, accentMat);
    addStarHalo(group, accentMat);
    addWeapon(group, "bow", accentMat, 0.95);
  }
}

function buildPaladinModel(group, data) {
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0b990, roughness: 0.54, metalness: 0.02 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0xe8e5d6, roughness: 0.32, metalness: 0.44 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf0c84e, roughness: 0.36, metalness: 0.32 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x4f77bd, roughness: 0.48, metalness: 0.12 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.58, metalness: 0.16 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 6, 12), armorMat);
  body.position.y = 1.08;
  body.castShadow = true;
  group.add(body);

  const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.86, 0.08), blueMat);
  tabard.position.set(0, 1.06, 0.45);
  tabard.castShadow = true;
  group.add(tabard);

  const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.09), goldMat);
  crossVertical.position.set(0, 1.14, 0.51);
  group.add(crossVertical);
  const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.09), goldMat);
  crossHorizontal.position.set(0, 1.2, 0.515);
  group.add(crossHorizontal);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 16), skinMat);
  head.position.y = 2.12;
  head.castShadow = true;
  group.add(head);
  addFace(group, data);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.54, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), armorMat);
  helmet.position.y = 2.19;
  helmet.castShadow = true;
  group.add(helmet);

  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.1), goldMat);
  crest.position.set(0, 2.58, 0.02);
  crest.castShadow = true;
  group.add(crest);

  addChibiLimbs(group, skinMat, armorMat);

  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.12, 5), goldMat);
  shield.position.set(-0.62, 1.22, 0.22);
  shield.rotation.set(Math.PI / 2, 0, 0.26);
  shield.castShadow = true;
  group.add(shield);

  const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.94, 8), darkMat);
  hammerHandle.position.set(0.66, 1.18, 0.08);
  hammerHandle.rotation.z = -0.48;
  hammerHandle.castShadow = true;
  group.add(hammerHandle);

  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.22), goldMat);
  hammerHead.position.set(0.87, 1.55, 0.08);
  hammerHead.rotation.z = -0.48;
  hammerHead.castShadow = true;
  group.add(hammerHead);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 8, 32), goldMat);
  halo.position.y = 2.68;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
}

function addChibiLimbs(group, skinMat, outfitMat) {
  const armGeo = new THREE.CapsuleGeometry(0.09, 0.62, 5, 8);
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.55, 5, 8);

  [
    [-0.5, 1.28, 0.05, 0.38],
    [0.5, 1.28, 0.05, -0.38]
  ].forEach(([x, y, z, rz]) => {
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.position.set(x, y, z);
    arm.rotation.z = rz;
    arm.castShadow = true;
    group.add(arm);
  });

  [-0.23, 0.23].forEach((x) => {
    const leg = new THREE.Mesh(legGeo, outfitMat);
    leg.position.set(x, 0.42, 0.03);
    leg.castShadow = true;
    group.add(leg);
  });
}

function addFace(group, data) {
  if (data.faceTexture) {
    addImageFace(group, data);
    addSculptedFace(group, data);
    return;
  }

  const eyeMat = new THREE.MeshBasicMaterial({ color: data.id === "leela" ? 0x73e05d : data.id === "frank" ? 0x4f77bd : 0x6a3f7a });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x10130f });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf29aa1, transparent: true, opacity: 0.72 });
  const smileMat = new THREE.MeshBasicMaterial({ color: 0x3a161a, side: THREE.DoubleSide });

  [-0.16, 0.16].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10), eyeMat);
    eye.scale.set(0.88, 1.18, 0.22);
    eye.position.set(x, 2.12, 0.405);
    group.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 8), pupilMat);
    pupil.scale.set(0.82, 1.06, 0.18);
    pupil.position.set(x, 2.1, 0.427);
    group.add(pupil);

    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), shineMat);
    shine.scale.set(1, 1, 0.16);
    shine.position.set(x - 0.026, 2.145, 0.444);
    group.add(shine);
  });

  [-0.28, 0.28].forEach((x) => {
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.065, 16), blushMat);
    blush.scale.set(1.45, 0.62, 1);
    blush.position.set(x, 2.0, 0.418);
    group.add(blush);
  });

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.011, 8, 24, Math.PI), smileMat);
  mouth.position.set(0, 1.96, 0.434);
  mouth.rotation.set(0, 0, Math.PI);
  mouth.scale.set(1.1, 0.62, 1);
  group.add(mouth);
}

function addSculptedFace(group, data) {
  const eyeColor = data.id === "leela" ? 0x69dc59 : data.id === "feenix" ? 0x1fc5ef : 0x7b4b8f;
  const eyeMat = new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.22, metalness: 0.08 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x071014 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const smileMat = new THREE.MeshBasicMaterial({ color: 0x351115, side: THREE.DoubleSide });
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf59ca2, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
  const isFeenix = data.id === "feenix";
  const centerY = isFeenix ? 2.08 : 2.12;
  const eyeY = isFeenix ? 2.14 : 2.18;
  const eyeZ = isFeenix ? 0.58 : 0.52;
  const eyeX = isFeenix ? 0.19 : 0.18;
  const eyeSize = isFeenix ? 0.145 : 0.13;

  [-eyeX, eyeX].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeSize, 18, 12), eyeMat);
    eye.scale.set(0.86, 1.16, 0.34);
    eye.position.set(x, eyeY, eyeZ);
    eye.castShadow = true;
    group.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.52, 14, 10), pupilMat);
    pupil.scale.set(0.78, 1.05, 0.2);
    pupil.position.set(x, eyeY - 0.015, eyeZ + 0.055);
    group.add(pupil);

    const shine = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.18, 8, 6), shineMat);
    shine.scale.set(1, 1, 0.16);
    shine.position.set(x - eyeSize * 0.22, eyeY + eyeSize * 0.3, eyeZ + 0.092);
    group.add(shine);
  });

  if (isFeenix) {
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf2b83c, roughness: 0.46, metalness: 0.08 });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 4), beakMat);
    beak.position.set(0, centerY - 0.13, 0.69);
    beak.rotation.x = Math.PI / 2;
    beak.castShadow = true;
    group.add(beak);
    return;
  }

  [-0.31, 0.31].forEach((x) => {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), cheekMat);
    cheek.scale.set(1.5, 0.65, 1);
    cheek.position.set(x, centerY - 0.08, 0.535);
    group.add(cheek);
  });

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.013, 8, 28, Math.PI), smileMat);
  mouth.position.set(0, centerY - 0.17, 0.56);
  mouth.rotation.set(0, 0, Math.PI);
  mouth.scale.set(1.1, 0.62, 1);
  group.add(mouth);
}

function addImageFace(group, data, options = {}) {
  const texture = getFaceTexture(data.faceTexture);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide
  });
  const face = new THREE.Mesh(
    createCurvedFaceGeometry(options.width ?? 0.7, options.height ?? 0.6, options.radius ?? 0.525),
    material
  );
  face.position.set(options.x ?? 0, options.y ?? 2.12, options.z ?? 0);
  face.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
  face.renderOrder = 4;
  face.userData.unitId = data.id;
  group.add(face);
}

function createCurvedFaceGeometry(width, height, radius) {
  const columns = 10;
  const rows = 10;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    const y = (0.5 - v) * height;
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const x = (u - 0.5) * width;
      const inside = Math.max(0.0001, radius * radius - x * x - y * y);
      const z = Math.sqrt(inside) + 0.006;
      positions.push(x, y, z);
      uvs.push(u, 1 - v);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function getFaceTexture(path) {
  if (!faceTextures.has(path)) {
    const texture = textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    faceTextures.set(path, texture);
  }

  return faceTextures.get(path);
}

function buildFeenixModel(group, data) {
  const berryMat = new THREE.MeshStandardMaterial({ color: 0xe43c1f, roughness: 0.44, metalness: 0.03 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf26f24, roughness: 0.52, metalness: 0.05 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd79838, roughness: 0.44, metalness: 0.18 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xead8b4, roughness: 0.6, metalness: 0.06 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xdfe7ed, roughness: 0.25, metalness: 0.58 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x27313a, roughness: 0.34, metalness: 0.62 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x65b742, roughness: 0.58, metalness: 0.02 });
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xffbf49, roughness: 0.42, metalness: 0.08 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.43, 0.8, 6, 12), metalMat);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);

  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.045, 8, 28), creamMat);
  sash.position.set(0.02, 1.17, 0.02);
  sash.rotation.set(0.78, 0.2, -0.68);
  sash.scale.set(1.1, 0.78, 1);
  sash.castShadow = true;
  group.add(sash);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), berryMat);
  head.position.y = 2.08;
  head.scale.set(1, 1.05, 0.95);
  head.castShadow = true;
  group.add(head);
  addImageFace(group, data, { width: 0.82, height: 0.66, y: 2.08, radius: 0.58 });
  addFeenixDetails(group, { orangeMat, goldMat, creamMat, metalMat, darkMetalMat, leafMat, seedMat });
}

function addFeenixDetails(group, mats) {
  const { orangeMat, goldMat, metalMat, darkMetalMat, leafMat, seedMat } = mats;

  for (let row = 0; row < 4; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), seedMat);
      seed.scale.set(0.7, 1.1, 0.28);
      seed.position.set(col * 0.13 + (row % 2) * 0.055, 2.0 + row * 0.11, 0.515);
      group.add(seed);
    }
  }

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), goldMat);
  beak.position.set(0, 1.96, 0.62);
  beak.rotation.x = Math.PI / 2;
  beak.castShadow = true;
  group.add(beak);

  [-0.56, 0.56].forEach((x) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 18), metalMat);
    cup.position.set(x, 2.08, 0);
    cup.rotation.z = Math.PI / 2;
    cup.castShadow = true;
    group.add(cup);
  });

  [-0.16, 0.02, 0.2].forEach((x, i) => {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 8), leafMat);
    leaf.position.set(x, 2.62, 0.03);
    leaf.rotation.set(1.05, 0, -0.7 + i * 0.65);
    leaf.castShadow = true;
    group.add(leaf);
  });

  [-0.16, 0.16].forEach((x) => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.58, 10), goldMat);
    tube.position.set(x, 2.84, -0.04);
    tube.rotation.z = x < 0 ? -0.24 : 0.24;
    tube.castShadow = true;
    group.add(tube);
  });

  [
    [-0.72, 1.62, -0.36, -0.68],
    [0.72, 1.62, -0.36, 0.68],
    [-0.83, 1.42, -0.38, -0.92],
    [0.83, 1.42, -0.38, 0.92]
  ].forEach(([x, y, z, ry]) => {
    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.52, 28), orangeMat);
    wing.scale.set(0.6, 1.35, 1);
    wing.position.set(x, y, z);
    wing.rotation.set(0.12, ry, 0);
    wing.castShadow = true;
    group.add(wing);
  });

  [
    [-0.48, 1.15, 0.1, 0.58],
    [0.48, 1.15, 0.1, -0.58],
    [-0.2, 0.38, 0.05, 0],
    [0.2, 0.38, 0.05, 0]
  ].forEach(([x, y, z, rz], index) => {
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(index < 2 ? 0.075 : 0.105, index < 2 ? 0.58 : 0.46, 5, 8), index < 2 ? darkMetalMat : metalMat);
    limb.position.set(x, y, z);
    limb.rotation.z = rz;
    limb.castShadow = true;
    group.add(limb);
  });
}

function addHair(group, data, hairMat) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.64), hairMat);
  cap.position.set(0, 2.22, 0.02);
  cap.rotation.x = -0.1;
  cap.castShadow = true;
  group.add(cap);

  if (data.id === "leela") {
    for (let i = -3; i <= 3; i += 1) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.58, 5, 8), hairMat);
      lock.position.set(i * 0.13, 1.93 - Math.abs(i) * 0.025, 0.23);
      lock.rotation.z = i * 0.12;
      lock.castShadow = true;
      group.add(lock);
    }
    return;
  }

  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), hairMat);
  bun.position.set(0.08, 2.72, -0.05);
  bun.castShadow = true;
  group.add(bun);

  const sideLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.48, 5, 8), hairMat);
  sideLock.position.set(-0.36, 1.95, 0.13);
  sideLock.rotation.z = 0.25;
  sideLock.castShadow = true;
  group.add(sideLock);
}

function addFairyWings(group) {
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xf3a7cb, roughness: 0.5, metalness: 0.03, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  [
    [-0.72, 1.7, -0.5, -0.42],
    [0.72, 1.7, -0.5, 0.42],
    [-0.62, 1.28, -0.52, -0.7],
    [0.62, 1.28, -0.52, 0.7]
  ].forEach(([x, y, z, ry]) => {
    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), wingMat);
    wing.scale.set(0.72, 1.28, 1);
    wing.position.set(x, y, z);
    wing.rotation.set(0.18, ry, 0);
    wing.castShadow = true;
    group.add(wing);
  });
}

function addFlowerCrown(group) {
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf2bfd5, roughness: 0.65 });
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xfff6d3, roughness: 0.5 });
  for (let i = 0; i < 6; i += 1) {
    const flower = new THREE.Group();
    for (let p = 0; p < 5; p += 1) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), petalMat);
      petal.scale.set(1, 0.55, 0.35);
      const a = (p / 5) * Math.PI * 2;
      petal.position.set(Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0);
      flower.add(petal);
    }
    flower.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), centerMat));
    flower.position.set(-0.18 + i * 0.07, 2.42 + Math.sin(i) * 0.025, 0.36);
    flower.rotation.z = i * 0.28;
    group.add(flower);
  }
}

function addPolianaSkirt(group, accentMat) {
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.38, 16, 1, true), accentMat);
  skirt.position.y = 0.8;
  skirt.rotation.y = Math.PI / 16;
  skirt.castShadow = true;
  group.add(skirt);
}

function addStarHalo(group, accentMat) {
  for (let i = 0; i < 5; i += 1) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), accentMat);
    const a = (i / 5) * Math.PI * 2;
    star.position.set(Math.cos(a) * 0.55, 2.52 + Math.sin(a) * 0.12, 0.1);
    star.castShadow = true;
    group.add(star);
  }
}

function buildEnemyModel(group, data, bodyMat, accentMat, darkMat) {
  const scale = data.archetype === "brute" ? 1.22 : data.archetype === "caster" ? 0.9 : 1;

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55 * scale, 0.9 * scale, 5, 10), bodyMat);
  body.position.y = 0.94 * scale;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 14, 10), bodyMat);
  head.position.y = 1.74 * scale;
  head.castShadow = true;
  group.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: data.archetype === "caster" ? 0x67d7a2 : 0xffe0a4 });
  [-0.14, 0.14].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 8, 6), eyeMat);
    eye.position.set(x * scale, 1.8 * scale, 0.36 * scale);
    group.add(eye);
  });

  const browMat = new THREE.MeshStandardMaterial({ color: data.accent ?? 0x3a1e18, roughness: 0.7 });
  [-0.13, 0.13].forEach((x, index) => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.035 * scale, 0.035 * scale), browMat);
    brow.position.set(x * scale, 1.91 * scale, 0.35 * scale);
    brow.rotation.z = index === 0 ? -0.28 : 0.28;
    group.add(brow);
  });

  const toothMat = new THREE.MeshBasicMaterial({ color: 0xf8f0d0 });
  [-0.06, 0.06].forEach((x) => {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.026 * scale, 0.1 * scale, 5), toothMat);
    tooth.position.set(x * scale, 1.61 * scale, 0.39 * scale);
    tooth.rotation.x = Math.PI;
    group.add(tooth);
  });

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.46 * scale, 0.035 * scale, 8, 26), darkMat);
  belt.position.y = 1.0 * scale;
  belt.rotation.x = Math.PI / 2;
  group.add(belt);

  const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 6), accentMat);
  hornLeft.position.set(-0.26 * scale, 2.08 * scale, 0);
  hornLeft.rotation.z = 0.45;
  hornLeft.castShadow = true;
  group.add(hornLeft);

  const hornRight = hornLeft.clone();
  hornRight.position.x *= -1;
  hornRight.rotation.z = -0.45;
  group.add(hornRight);

  if (data.archetype === "brute") {
    [-0.54, 0.54].forEach((x) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 6), accentMat);
      spike.position.set(x, 1.55, 0.05);
      spike.rotation.z = x < 0 ? 1.2 : -1.2;
      spike.castShadow = true;
      group.add(spike);
    });
    const club = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.7, 0.28), darkMat);
    club.position.set(0.85, 1.2, 0.08);
    club.rotation.z = -0.45;
    club.castShadow = true;
    club.userData.weaponPiece = true;
    group.add(club);
  } else if (data.archetype === "caster") {
    addWeapon(group, "staff", accentMat, 0.82);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), eyeMat);
    orb.position.set(-0.54, 2.2, 0.2);
    group.add(orb);
  } else {
    addWeapon(group, "axe", darkMat, 0.9);
  }
}

function buildCampModel(group, bodyMat, accentMat, darkMat) {
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x3c3358, roughness: 0.72, metalness: 0.08 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xf1d34f, transparent: true, opacity: 0.78 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.22, 8), platformMat);
  platform.position.y = 0.12;
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  const tent = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.35, 4), bodyMat);
  tent.position.y = 0.9;
  tent.rotation.y = Math.PI / 4;
  tent.castShadow = true;
  group.add(tent);

  const doorway = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.58, 0.08), darkMat);
  doorway.position.set(0, 0.52, 0.61);
  group.add(doorway);

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.35, 8), accentMat);
  beacon.position.set(0.78, 0.88, -0.1);
  beacon.castShadow = true;
  group.add(beacon);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.06), accentMat);
  flag.position.set(1.03, 1.35, -0.1);
  flag.castShadow = true;
  group.add(flag);

  const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glowMat);
  light.position.set(0, 1.82, 0);
  group.add(light);
}

function addWeapon(group, type, material, scale = 1) {
  if (type === "sword") {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 1.45 * scale, 0.12 * scale), material);
    blade.position.set(0.78, 1.38, 0.08);
    blade.rotation.z = -0.18;
    blade.castShadow = true;
    blade.userData.weaponPiece = true;
    group.add(blade);
    return;
  }

  if (type === "staff") {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 1.8 * scale, 8), material);
    staff.position.set(0.78, 1.35, 0.06);
    staff.rotation.z = -0.2;
    staff.castShadow = true;
    staff.userData.weaponPiece = true;
    group.add(staff);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 * scale), material);
    gem.position.set(0.95, 2.23, 0.06);
    gem.castShadow = true;
    gem.userData.weaponPiece = true;
    group.add(gem);
    return;
  }

  if (type === "bow") {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55 * scale, 0.035 * scale, 8, 28, Math.PI), material);
    bow.position.set(0.8, 1.38, 0.08);
    bow.rotation.set(0, Math.PI / 2, -0.25);
    bow.castShadow = true;
    group.add(bow);
    return;
  }

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 1.1 * scale, 8), material);
  handle.position.set(0.72, 1.16, 0.08);
  handle.rotation.z = -0.55;
  handle.castShadow = true;
  handle.userData.weaponPiece = true;
  group.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.32 * scale, 0.12 * scale), material);
  head.position.set(0.95, 1.62, 0.08);
  head.rotation.z = -0.55;
  head.castShadow = true;
  head.userData.weaponPiece = true;
  group.add(head);
}

function resetGame() {
  if (autoRestartTimeout) {
    clearTimeout(autoRestartTimeout);
    autoRestartTimeout = null;
  }
  units.forEach((unit) => {
    scene.remove(unit.mesh);
    if (unit.healthBar) scene.remove(unit.healthBar.group);
  });
  markers.forEach((marker) => scene.remove(marker));
  medkits.forEach((kit) => scene.remove(kit.mesh));
  popups.forEach((popup) => scene.remove(popup.group));
  upkeepWidgets.forEach((widget) => scene.remove(widget.group));
  removeHoverPopup();
  units = [];
  markers = [];
  medkits = [];
  popups = [];
  upkeepWidgets = [];
  selectedId = "leela";
  gold = 0;
  scoreAdjustments = 0;
  heroDamageScore = 0;
  wave = 1;
  spawnTimer = 3;
  missionTimer = missionDuration;
  missionCountdown = 0;
  restartCountdown = 0;
  missionPending = false;
  medkitSpawnTimer = 0;
  targetingAbility = null;
  uiRefreshTimer = 0;
  countdownOverlayEl.textContent = "";
  countdownOverlayEl.classList.remove("show");
  state = "playing";

  heroTemplates.forEach((template, index) => {
    const slot = heroStartSlots[template.id] ?? index;
    const x = (slot - (heroTemplates.length - 1) / 2) * 3.1;
    units.push(createUnit({ ...template, side: "hero", x, z: 12.2, level: 1 }));
  });

  spawnWave();
  log("Command Leela, Frank, Poliana, and Feenix in real time.");
  syncUi();
}

function createUnit(data) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: data.color,
    roughness: 0.45,
    metalness: data.side === "hero" ? 0.16 : 0.04
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: data.accent ?? 0xf2d06b, roughness: 0.55, metalness: 0.12 });
  const darkMat = new THREE.MeshStandardMaterial({ color: data.side === "hero" ? 0x203436 : 0x2d201b, roughness: 0.78 });

  if (data.side === "hero") {
    buildHeroModel(group, data, bodyMat, accentMat, darkMat);
  } else if (data.side === "camp") {
    buildCampModel(group, bodyMat, accentMat, darkMat);
  } else {
    buildEnemyModel(group, data, bodyMat, accentMat, darkMat);
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.045, 8, 36),
    new THREE.MeshBasicMaterial({ color: data.side === "hero" ? 0x9be7f5 : data.side === "camp" ? 0xf1d34f : 0xff8a73 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  ring.visible = false;
  group.add(ring);

  group.position.set(data.x, 0, data.z);
  if (data.side === "hero") group.scale.setScalar(heroVisualScale);
  group.userData.unitId = data.id;
  group.traverse((child) => {
    child.userData.unitId = data.id;
  });
  scene.add(group);
  const healthBar = createHealthBar(data.id, data.side);
  scene.add(healthBar.group);
  const weaponPieces = [];
  group.traverse((child) => {
    if (!child.userData.weaponPiece) return;
    child.userData.baseRotation = child.rotation.clone();
    weaponPieces.push(child);
  });

  return {
    id: data.id,
    name: data.name,
    role: data.role ?? "Invader",
    portrait: data.portrait,
    abilities: data.abilities ?? [],
    reward: data.reward ?? 0,
    destroyed: false,
    underAttackNotified: false,
    campDamageGoldTicks: 0,
    activeAbility: data.abilities?.[0] ?? null,
    abilityCooldowns: {},
    speedBuffTimer: 0,
    speedBuffMultiplier: 1,
    wingDashTimer: 0,
    wingDashHitIds: new Set(),
    asleep: false,
    sleepReason: null,
    sleepBob: Math.random() * Math.PI * 2,
    upkeepPaidMission: data.side === "hero" ? 1 : 0,
    sleepUi: null,
    shieldDefBonus: 0,
    shieldTimer: 0,
    selflessShieldTimer: 0,
    selflessShieldOwnerId: null,
    atkBuffMultiplier: 1,
    atkBuffTimer: 0,
    meatBuffTimer: 0,
    burnTimer: 0,
    burnTickTimer: 0,
    burnSourceId: null,
    sausageRainTimer: 0,
    sausageRainTickTimer: 0,
    sausageRainVisualTimer: 0,
    sausageRainSourceId: null,
    sausageStunTimer: 0,
    sparklyHealTimer: 0,
    sparklyHealTickTimer: 0,
    sparklyHealVisualTimer: 0,
    spaceCandyHealTimer: 0,
    spaceCandyHealTickTimer: 0,
    spaceCandyHealAmount: 0,
    innerLightHotTimer: 0,
    innerLightHotTickTimer: 0,
    belchCostTimer: 0,
    belchCostTickTimer: 0,
    archetype: data.archetype,
    side: data.side,
    level: data.level ?? 1,
    xp: data.side === "hero" ? 0 : undefined,
    totalXp: data.side === "hero" ? 0 : undefined,
    xpToNext: data.side === "hero" ? xpForNextLevel(data.level ?? 1) : undefined,
    baseMaxHp: data.hp,
    baseAtk: data.side === "hero" ? data.atk * combatStatScale : data.atk,
    baseDef: data.side === "hero" ? (data.def ?? 0) * combatStatScale : data.def ?? 0,
    hp: data.hp,
    maxHp: data.hp,
    atk: data.side === "hero" ? Math.round(data.atk * combatStatScale * 10) / 10 : data.atk,
    def: data.side === "hero" ? Math.round((data.def ?? 0) * combatStatScale * 10) / 10 : data.def ?? 0,
    range: data.range,
    speed: data.speed,
    cooldown: 0,
    reviveTimer: 0,
    attackAnim: 0,
    attackDuration: 0.28,
    attackDirection: new THREE.Vector3(),
    baseScale: data.side === "hero" ? heroVisualScale : 1,
    attackDelay: data.side === "hero" ? 0.85 : 1.15,
    target: null,
    targetPoint: new THREE.Vector3(data.x, 0, data.z),
    mesh: group,
    weaponPieces,
    ring,
    healthBar
  };
}

function createHealthBar(unitId, side) {
  const wideBar = side === "hero" || side === "camp";
  const width = wideBar ? 2.85 : 1.75;
  const height = wideBar ? 0.42 : 0.26;
  const group = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = wideBar ? 320 : 220;
  canvas.height = 54;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);

  sprite.scale.set(width, height, 1);
  sprite.renderOrder = 24;
  group.add(sprite);
  group.userData.unitId = unitId;

  return { group, canvas, context, texture, lastRatio: -1, lastColor: null };
}

function updateHealthBars() {
  units.forEach((unit) => {
    if (!unit.healthBar) return;
    const ratio = THREE.MathUtils.clamp(unit.hp / unit.maxHp, 0, 1);
    const { group } = unit.healthBar;
    group.visible = unit.hp > 0 || (unit.side === "hero" && unit.reviveTimer > 0);
    group.position.copy(unit.mesh.position);
    group.position.y += unit.side === "hero" ? 4.55 : unit.side === "camp" ? 3.05 : 2.65;
    group.quaternion.copy(camera.quaternion);
    drawHealthBar(unit.healthBar, ratio);
  });
}

function drawHealthBar(bar, ratio) {
  const color = healthColorCss(ratio);
  if (Math.abs(bar.lastRatio - ratio) < 0.005 && bar.lastColor === color) return;
  bar.lastRatio = ratio;
  bar.lastColor = color;

  const { canvas, context } = bar;
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(5, 7, 5, 0.94)";
  roundRect(context, 0, 4, width, height - 8, 16);
  context.fill();
  context.fillStyle = "rgba(24, 32, 22, 0.98)";
  roundRect(context, 10, 14, width - 20, height - 28, 10);
  context.fill();
  context.fillStyle = color;
  roundRect(context, 12, 16, Math.max(1, (width - 24) * ratio), height - 32, 8);
  context.fill();
  bar.texture.needsUpdate = true;
}

function healthColor(ratio) {
  if (ratio < 0.25) return 0xe8483f;
  if (ratio < 0.5) return 0xf28a28;
  if (ratio < 0.75) return 0xf1d34f;
  return 0x63d463;
}

function healthColorCss(ratio) {
  if (ratio < 0.25) return "#e8483f";
  if (ratio < 0.5) return "#f28a28";
  if (ratio < 0.75) return "#f1d34f";
  return "#63d463";
}

function spawnWave() {
  missionTimer = missionDuration;
  medkitSpawnTimer = 0;
  spawnFriendlyCamps();
  applyMissionUpkeep();
  spawnEnemyGroup((3 + Math.min(5, wave)) * 2, true);
  spawnTimer = 9;
  log("Protect the friendly camps!");
}

function spawnFriendlyCamps() {
  removeCamps();
  const positions = shuffledCampPositions();
  for (let i = 0; i < 3; i += 1) {
    const position = positions[i];
    units.push(createUnit({
      id: `camp-${wave}-${i}-${Date.now()}`,
      name: "Friendly Camp",
      role: "Camp",
      color: 0x5fbf7a,
      accent: 0xf1d34f,
      hp: 500,
      atk: 0,
      def: 0,
      range: 0,
      speed: 0,
      reward: campRewards[Math.floor(Math.random() * campRewards.length)],
      side: "camp",
      x: position.x,
      z: position.z,
      level: wave
    }));
  }
}

function shuffledCampPositions() {
  const options = [
    { x: -10.8, z: -4.8 },
    { x: 10.6, z: -5.2 },
    { x: -8.4, z: 5.8 },
    { x: 8.2, z: 5.6 },
    { x: -2.8, z: -7.2 },
    { x: 4.6, z: 7.2 }
  ];
  return options.sort(() => Math.random() - 0.5);
}

function removeCamps() {
  units = units.filter((unit) => {
    if (unit.side !== "camp") return true;
    scene.remove(unit.mesh);
    if (unit.healthBar) scene.remove(unit.healthBar.group);
    return false;
  });
}

function applyMissionUpkeep() {
  if (wave === 1) return;
  heroes(true).forEach((hero) => {
    if (hero.hp <= 0 || hero.upkeepPaidMission === wave) return;
    if (gold >= heroUpkeepCost) {
      gold -= heroUpkeepCost;
      goldRoll(hero.mesh.position, `-${heroUpkeepCost}G`);
      wakeHero(hero, true);
      hero.upkeepPaidMission = wave;
      return;
    }
    putHeroToSleep(hero, "upkeep");
  });
  syncUi();
}

function putHeroToSleep(hero, reason = "upkeep") {
  hero.asleep = true;
  hero.sleepReason = reason;
  hero.mesh.rotation.x = -Math.PI / 2;
  hero.target = null;
  hero.targetPoint.copy(hero.mesh.position);
  hero.speedBuffTimer = 0;
  hero.speedBuffMultiplier = 1;
  if (!hero.sleepUi) createSleepUi(hero);
  hero.sleepUi.group.visible = true;
  if (reason === "upkeep") log(`${hero.name} needs ${heroUpkeepCost} gold upkeep.`);
}

function wakeHero(hero, automatic = false) {
  hero.asleep = false;
  hero.sleepReason = null;
  hero.mesh.rotation.x = 0;
  hero.upkeepPaidMission = wave;
  if (hero.sleepUi) hero.sleepUi.group.visible = false;
  flash(hero.mesh.position, 0xf1d34f);
  if (!automatic) log(`${hero.name} woke up for ${wakeCost(hero)} gold.`);
}

function payHeroUpkeep(heroId) {
  const hero = heroes(true).find((candidate) => candidate.id === heroId);
  if (!hero || !hero.asleep) return;
  const cost = wakeCost(hero);
  if (gold < cost) {
    log(`${hero.name} needs ${cost} gold to wake up.`);
    return;
  }
  gold -= cost;
  goldRoll(hero.mesh.position, `-${cost}G`);
  if (hero.hp <= 0) {
    hero.hp = Math.ceil(hero.maxHp * 0.65);
    hero.reviveTimer = 0;
    if (hero.healthBar) hero.healthBar.group.visible = true;
  }
  wakeHero(hero, true);
  log(`${hero.name} woke up for ${cost} gold.`);
  syncUi();
}

function wakeCost(hero) {
  return hero.sleepReason === "revive" || hero.hp <= 0 || hero.reviveTimer > 0 ? heroReviveCost : heroUpkeepCost;
}

function spawnEnemyGroup(count, announce = false) {
  const hpScale = 1 + (wave - 1) * 0.05;
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (i - count / 2) * 0.24;
    const x = Math.cos(angle) * 14 + (Math.random() - 0.5) * 2;
    const z = Math.sin(angle) * 14 - 1;
    const template = enemyTemplates[(i + wave) % enemyTemplates.length];
    const isBrute = template.archetype === "brute";
    units.push(createUnit({
      id: `enemy-${Date.now()}-${i}`,
      name: template.name,
      color: template.color,
      accent: template.accent,
      hp: Math.ceil((template.hp + wave * 9 + (isBrute ? wave * 5 : 0)) * hpScale * enemyHpScale),
      atk: template.atk + Math.floor(wave / 2),
      def: template.def + Math.floor(wave / 3),
      range: template.range,
      speed: template.speed + Math.min(1.4, wave * 0.12),
      side: "enemy",
      x,
      z,
      level: wave,
      archetype: template.archetype
    }));
  }
  if (announce) {
    log(`Mission ${wave} entering the field.`);
  } else {
    log("Enemy reinforcements arrived.");
  }
}

function clearMedkits() {
  clearMedkitHighlight();
  medkits.forEach((kit) => scene.remove(kit.mesh));
  medkits = [];
}

function dropMedkits() {
  clearMedkits();
  const positions = randomFieldPositions(5, 4.5);

  positions.forEach((position, index) => {
    const pickup = index < 3
      ? createMedkit(`medkit-${wave}-${Date.now()}-${index}`, position)
      : createMeatPickup(`meat-${wave}-${Date.now()}-${index}`, position);
    medkits.push(pickup);
    scene.add(pickup.mesh);
  });
  medkitSpawnTimer = 15;
  log("Space candies and Bubblenium appeared.");
}

function randomFieldPositions(count, minDistance) {
  const positions = [];
  let attempts = 0;
  while (positions.length < count && attempts < 120) {
    attempts += 1;
    const position = new THREE.Vector3(
      THREE.MathUtils.randFloat(-worldSize / 2 + 4, worldSize / 2 - 4),
      0,
      THREE.MathUtils.randFloat(-worldSize / 2 + 5, worldSize / 2 - 5)
    );
    const tooCloseToGate = position.z < -10 && Math.abs(position.x) < 5;
    const tooClose = positions.some((existing) => existing.distanceTo(position) < minDistance);
    if (!tooClose && !tooCloseToGate) positions.push(position);
  }

  while (positions.length < count) {
    positions.push(new THREE.Vector3((positions.length - 1) * minDistance, 0, 3.5));
  }

  return positions;
}

function createMedkit(id, position) {
  const group = new THREE.Group();
  const wrapperMat = new THREE.MeshStandardMaterial({ color: 0x714de8, roughness: 0.42, metalness: 0.08 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x52d6ff, roughness: 0.38, metalness: 0.12 });
  const candyMat = new THREE.MeshStandardMaterial({ color: 0xffe66d, roughness: 0.42, metalness: 0.04 });
  const endMat = new THREE.MeshStandardMaterial({ color: 0xe9f6ff, roughness: 0.45, metalness: 0.06 });

  const wrapper = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.34, 0.48), wrapperMat);
  wrapper.position.y = 0.38;
  wrapper.castShadow = true;
  group.add(wrapper);

  [-0.46, 0.46].forEach((x) => {
    const twist = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 4), endMat);
    twist.position.set(x, 0.38, 0);
    twist.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    twist.castShadow = true;
    group.add(twist);
  });

  [-0.24, 0.24].forEach((x) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.54), stripeMat);
    stripe.position.set(x, 0.57, 0);
    stripe.rotation.y = 0.18;
    stripe.castShadow = true;
    group.add(stripe);
  });

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), candyMat);
  star.position.set(0, 0.61, 0.01);
  star.rotation.set(0.4, 0.3, 0.1);
  star.castShadow = true;
  group.add(star);

  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(1.28, 0.56, 0.72),
    new THREE.MeshBasicMaterial({ color: 0x63d463, transparent: true, opacity: 0.18, wireframe: true, depthTest: false })
  );
  highlight.position.y = 0.38;
  highlight.visible = false;
  group.add(highlight);

  group.position.copy(position);
  group.userData.type = "medkit";
  group.traverse((child) => {
    child.userData.medkitId = id;
  });
  return { id, type: "medkit", label: "Space Candy", mesh: group, highlight, heal: 50, bob: Math.random() * Math.PI * 2, ttl: 15 };
}

function createMeatPickup(id, position) {
  const group = new THREE.Group();
  const oreMat = new THREE.MeshStandardMaterial({ color: 0xf6fbff, roughness: 0.22, metalness: 0.86, emissive: 0xdbe9ff, emissiveIntensity: 0.12 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xff9adf, roughness: 0.28, metalness: 0.18, emissive: 0xff65c8, emissiveIntensity: 0.28 });

  const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), oreMat);
  ore.scale.set(1.12, 0.82, 0.9);
  ore.position.y = 0.48;
  ore.rotation.set(0.35, 0.2, -0.22);
  ore.castShadow = true;
  group.add(ore);

  const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), shineMat);
  glint.position.set(-0.13, 0.82, 0.25);
  glint.scale.set(0.55, 1.6, 0.35);
  group.add(glint);

  [
    [-0.24, 0.56, 0.34, 0.09],
    [0.18, 0.66, 0.32, 0.075],
    [0.31, 0.43, 0.21, 0.065],
    [-0.08, 0.36, 0.42, 0.055],
    [0.02, 0.78, -0.2, 0.07]
  ].forEach(([x, y, z, radius]) => {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), bubbleMat);
    bubble.position.set(x, y, z);
    bubble.castShadow = true;
    group.add(bubble);
  });

  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(1.16, 0.92, 0.94),
    new THREE.MeshBasicMaterial({ color: 0xff9adf, transparent: true, opacity: 0.22, wireframe: true, depthTest: false })
  );
  highlight.position.y = 0.48;
  highlight.visible = false;
  group.add(highlight);

  group.position.copy(position);
  group.userData.type = "meat";
  group.traverse((child) => {
    child.userData.medkitId = id;
  });
  return { id, type: "meat", label: "Bubblenium", mesh: group, highlight, bob: Math.random() * Math.PI * 2, ttl: 15 };
}

function updateMedkits(dt) {
  if (!missionPending) {
    medkitSpawnTimer -= dt;
    if (medkitSpawnTimer <= 0) dropMedkits();
  }

  medkits.forEach((kit) => {
    kit.ttl -= dt;
    kit.bob += dt * 2.8;
    kit.mesh.rotation.y += dt * 1.2;
    kit.mesh.position.y = 0.18 + Math.sin(kit.bob) * 0.18;
  });

  medkits = medkits.filter((kit) => {
    if (kit.ttl <= 0 || missionPending) {
      scene.remove(kit.mesh);
      return false;
    }

    const hero = heroes().find((candidate) => (
      candidate.mesh.position.distanceTo(kit.mesh.position) < 1.25
      && (kit.type === "meat" || candidate.hp < candidate.maxHp)
    ));
    if (!hero) return true;

    if (kit.type === "meat") {
      healUnit(hero, Math.ceil(hero.maxHp * 0.1));
      heroes().forEach((ally) => {
        ally.atkBuffMultiplier = Math.max(ally.atkBuffMultiplier ?? 1, 1.3);
        ally.atkBuffTimer = Math.max(ally.atkBuffTimer ?? 0, 15);
        ally.meatBuffTimer = 15;
        sparklyHealBurst(ally.mesh.position);
      });
      hero.speedBuffMultiplier = Math.max(hero.speedBuffMultiplier ?? 1, 1.33);
      hero.speedBuffTimer = Math.max(hero.speedBuffTimer ?? 0, 10);
      awardHeroXp(hero, 10);
      log(`${hero.name} absorbed Bubblenium.`);
    } else {
      gold = Math.max(0, gold - 5);
      goldRoll(kit.mesh.position, "-5G");
      hero.speedBuffMultiplier = Math.max(hero.speedBuffMultiplier ?? 1, 1.33);
      hero.speedBuffTimer = Math.max(hero.speedBuffTimer ?? 0, 10);
      hero.spaceCandyHealTimer = 3;
      hero.spaceCandyHealTickTimer = 1;
      hero.spaceCandyHealAmount = kit.heal / 3;
      healingBubbles(hero.mesh.position);
      awardHeroXp(hero, 10);
      log(`${hero.name} ate a Space Candy.`);
    }
    flash(hero.mesh.position, 0x63d463);
    scene.remove(kit.mesh);
    return false;
  });
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  if (!introVisible()) {
    if (state === "playing") update(dt);
    if (state === "lost") updateRestartCountdown(dt);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updateRestartCountdown(dt) {
  restartCountdown = Math.max(0, restartCountdown - dt);
  countdownOverlayEl.textContent = Math.ceil(restartCountdown);
  countdownOverlayEl.classList.toggle("show", restartCountdown > 0);
  if (restartCountdown <= 0) resetGame();
}

function update(dt) {
  if (missionPending) {
    missionCountdown -= dt;
    if (missionCountdown <= 0) {
      missionPending = false;
      wave += 1;
      randomizeScenery();
      spawnWave();
    }
  } else {
    missionTimer = Math.max(0, missionTimer - dt);
    if (missionTimer <= 0) {
      endMission();
    }
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemyGroup((2 + Math.min(4, Math.floor(wave / 2))) * 2);
      spawnTimer = Math.max(5.5, 11 - wave * 0.35);
    }
  }

  updateAbilityCooldowns(dt);
  updateHeroBuffs(dt);
  updateStatusEffects(dt);
  updateRevives(dt);
  updateAttackAnimations(dt);
  units.forEach((unit) => updateUnit(unit, dt));
  updateMedkits(dt);
  removeDeadUnits();
  updateUpkeepWidgets(dt);
  updateHealthBars();
  updateNamePopups(dt);
  syncSelectionRings();
  uiRefreshTimer -= dt;
  if (uiRefreshTimer <= 0) {
    uiRefreshTimer = 0.2;
    syncUi();
  }

  if (heroes(true).length > 0 && heroes(true).every((hero) => hero.asleep || hero.hp <= 0)) {
    state = "lost";
    restartCountdown = 10;
    countdownOverlayEl.textContent = restartCountdown;
    countdownOverlayEl.classList.add("show");
    log("All heroes are asleep. Restarting in 10 seconds.");
  }
}

function updateAbilityCooldowns(dt) {
  heroes().forEach((hero) => {
    Object.keys(hero.abilityCooldowns).forEach((ability) => {
      hero.abilityCooldowns[ability] = Math.max(0, hero.abilityCooldowns[ability] - dt);
      if (hero.abilityCooldowns[ability] === 0) delete hero.abilityCooldowns[ability];
    });
  });
}

function updateHeroBuffs(dt) {
  heroes(true).forEach((hero) => {
    if (hero.speedBuffTimer <= 0) {
      hero.speedBuffMultiplier = 1;
    } else {
      hero.speedBuffTimer = Math.max(0, hero.speedBuffTimer - dt);
      if (hero.speedBuffTimer === 0) hero.speedBuffMultiplier = 1;
    }

    if (hero.wingDashTimer > 0) {
      hero.wingDashTimer = Math.max(0, hero.wingDashTimer - dt);
      if (hero.wingDashTimer === 0) hero.wingDashHitIds.clear();
    }

    if (hero.atkBuffTimer <= 0) {
      hero.atkBuffMultiplier = 1;
      hero.meatBuffTimer = 0;
    } else {
      hero.atkBuffTimer = Math.max(0, hero.atkBuffTimer - dt);
      hero.meatBuffTimer = Math.max(0, hero.meatBuffTimer - dt);
      if (hero.atkBuffTimer === 0) {
        hero.atkBuffMultiplier = 1;
        hero.meatBuffTimer = 0;
      }
    }
  });
}

function updateStatusEffects(dt) {
  units.forEach((unit) => {
    if (unit.shieldTimer > 0) {
      unit.shieldTimer = Math.max(0, unit.shieldTimer - dt);
      if (unit.shieldTimer === 0) {
        unit.shieldDefBonus = 0;
        unit.selflessShieldOwnerId = null;
      }
    }

    if (unit.selflessShieldTimer > 0) {
      unit.selflessShieldTimer = Math.max(0, unit.selflessShieldTimer - dt);
      if (unit.selflessShieldTimer === 0) unit.selflessShieldOwnerId = null;
    }

    if (unit.belchCostTimer > 0 && unit.hp > 0) {
      unit.belchCostTimer = Math.max(0, unit.belchCostTimer - dt);
      unit.belchCostTickTimer -= dt;
      if (unit.belchCostTickTimer <= 0) {
        unit.hp = Math.max(1, unit.hp - 15);
        unit.belchCostTickTimer = 1;
        flash(unit.mesh.position, 0xd6a65a);
      }
    }

    if (unit.burnTimer > 0) {
      unit.burnTimer = Math.max(0, unit.burnTimer - dt);
      unit.burnTickTimer -= dt;
      if (unit.burnTickTimer <= 0) {
        damageEnemy(unit.burnSourceId, unit, unit.burnDamage ?? 10);
        unit.burnTickTimer = 1;
        flash(unit.mesh.position, 0x8a5a31);
      }
      if (unit.burnTimer === 0) {
        unit.burnDamage = 10;
        unit.burnSourceId = null;
      }
    }

    if (unit.sausageRainTimer > 0) {
      unit.sausageRainTimer = Math.max(0, unit.sausageRainTimer - dt);
      unit.sausageRainTickTimer -= dt;
      unit.sausageRainVisualTimer -= dt;
      if (unit.sausageRainTickTimer <= 0) {
        damageEnemy(unit.sausageRainSourceId, unit, scaledAbilityDamage(25));
        unit.sausageRainTickTimer = 1;
        flash(unit.mesh.position, 0xe07a32);
      }
      if (unit.sausageRainVisualTimer <= 0) {
        sausageRain(unit.mesh.position);
        unit.sausageRainVisualTimer = 0.34;
      }
      if (unit.sausageRainTimer === 0) unit.sausageRainSourceId = null;
    }

    if (unit.sparklyHealTimer > 0 && unit.hp > 0) {
      unit.sparklyHealTimer = Math.max(0, unit.sparklyHealTimer - dt);
      unit.sparklyHealTickTimer -= dt;
      unit.sparklyHealVisualTimer -= dt;
      if (unit.sparklyHealTickTimer <= 0) {
        healUnit(unit, 10);
        unit.sparklyHealTickTimer = 1;
        healingBubbles(unit.mesh.position);
      }
      if (unit.sparklyHealVisualTimer <= 0) {
        sparklyHealBurst(unit.mesh.position);
        unit.sparklyHealVisualTimer = 0.45;
      }
    }

    if (unit.spaceCandyHealTimer > 0 && unit.hp > 0) {
      unit.spaceCandyHealTimer = Math.max(0, unit.spaceCandyHealTimer - dt);
      unit.spaceCandyHealTickTimer -= dt;
      if (unit.spaceCandyHealTickTimer <= 0) {
        healUnit(unit, unit.spaceCandyHealAmount);
        unit.spaceCandyHealTickTimer = 1;
        healingBubbles(unit.mesh.position);
      }
      if (unit.spaceCandyHealTimer === 0) unit.spaceCandyHealAmount = 0;
    }

    if (unit.innerLightHotTimer > 0 && unit.hp > 0) {
      unit.innerLightHotTimer = Math.max(0, unit.innerLightHotTimer - dt);
      unit.innerLightHotTickTimer -= dt;
      if (unit.innerLightHotTickTimer <= 0) {
        healUnit(unit, 20);
        unit.innerLightHotTickTimer = 1;
        holyLightBurst(unit.mesh.position, 0.9, 0.55);
      }
    }
  });
}

function updateRevives(dt) {
  heroes(true).forEach((hero) => {
    if (hero.hp > 0 || hero.reviveTimer <= 0) return;
    hero.reviveTimer = Math.max(0, hero.reviveTimer - dt);
    if (hero.reviveTimer > 0) return;

    hero.hp = Math.ceil(hero.maxHp * 0.65);
    hero.asleep = false;
    hero.mesh.rotation.x = 0;
    hero.mesh.visible = true;
    if (hero.healthBar) hero.healthBar.group.visible = true;
    if (hero.sleepUi) hero.sleepUi.group.visible = false;
    hero.target = null;
    hero.targetPoint.copy(hero.mesh.position);
    flash(hero.mesh.position, 0x63d463);
    healingBubbles(hero.mesh.position);
    log(`${hero.name} revived.`);
  });
}

function endMission() {
  if (missionPending) return;
  resolveCampRewards();
  units = units.filter((unit) => {
    if (unit.side !== "enemy") return true;
    scene.remove(unit.mesh);
    if (unit.healthBar) scene.remove(unit.healthBar.group);
    return false;
  });
  gold += 25;
  clearMedkits();
  missionPending = true;
  missionCountdown = 10;
  log("Next mission in 10 seconds.");
}

function resolveCampRewards() {
  let saved = 0;
  camps().forEach((camp) => {
    saved += 1;
    scoreAdjustments += 100;
    gold += camp.reward;
    goldRoll(camp.mesh.position, `+${camp.reward}G`);
  });
  if (saved > 0) log(`${saved} friendly camp${saved === 1 ? "" : "s"} protected!`);
}

function updateUnit(unit, dt) {
  if (unit.hp <= 0 || unit.asleep) return;
  unit.cooldown = Math.max(0, unit.cooldown - dt);
  if (unit.side === "camp") return;
  const foes = unit.side === "hero" ? enemies() : defenders();
  const directTarget = units.find((candidate) => candidate.id === unit.target && candidate.hp > 0);
  const target = directTarget ?? nearest(unit, foes);

  if (unit.side === "enemy" && !target) return;

  const targetInRange = target && distanceUnits(unit, target) <= unit.range;
  if (targetInRange) {
    face(unit, target.mesh.position);
    if (unit.cooldown <= 0) {
      damage(unit, target);
      unit.cooldown = unit.attackDelay;
    }
    if (unit.side === "enemy") return;
  }

  if (unit.side === "enemy" && target) {
    moveTo(unit, target.mesh.position, dt);
  } else {
    moveTo(unit, unit.targetPoint, dt);
  }
}

function updateAttackAnimations(dt) {
  units.forEach((unit) => {
    if (unit.attackAnim <= 0) {
      unit.mesh.scale.setScalar(unit.baseScale);
      unit.mesh.position.y = 0;
      unit.mesh.rotation.z = 0;
      resetWeaponSwing(unit);
      return;
    }

    unit.attackAnim = Math.max(0, unit.attackAnim - dt);
    const progress = 1 - unit.attackAnim / unit.attackDuration;
    const strike = Math.sin(progress * Math.PI);
    unit.mesh.position.y = strike * 0.14;
    unit.mesh.rotation.z = unit.attackDirection.x * strike * 0.12;
    unit.mesh.scale.set(
      unit.baseScale * (1 + strike * 0.08),
      unit.baseScale * (1 - strike * 0.04),
      unit.baseScale * (1 + strike * 0.08)
    );
    swingWeapon(unit, progress, strike);

    if (unit.attackAnim === 0) {
      unit.mesh.position.y = 0;
      unit.mesh.rotation.z = 0;
      unit.mesh.scale.setScalar(unit.baseScale);
      resetWeaponSwing(unit);
    }
  });
}

function swingWeapon(unit, progress, strike) {
  if (!unit.weaponPieces?.length) return;
  const windup = Math.sin(Math.min(progress, 0.45) / 0.45 * Math.PI) * 0.5;
  const chop = Math.sin(Math.max(0, progress - 0.18) / 0.82 * Math.PI);
  unit.weaponPieces.forEach((piece) => {
    const base = piece.userData.baseRotation;
    piece.rotation.x = base.x - chop * 0.82;
    piece.rotation.y = base.y + unit.attackDirection.x * strike * 0.38;
    piece.rotation.z = base.z - windup + chop * 0.95;
  });
}

function resetWeaponSwing(unit) {
  unit.weaponPieces?.forEach((piece) => {
    const base = piece.userData.baseRotation;
    if (!base) return;
    piece.rotation.copy(base);
  });
}

function triggerAttackAnimation(attacker, defender) {
  attacker.attackAnim = attacker.attackDuration;
  attacker.attackDirection.copy(defender.mesh.position).sub(attacker.mesh.position).setY(0);
  if (attacker.attackDirection.lengthSq() === 0) {
    attacker.attackDirection.set(Math.sin(attacker.mesh.rotation.y), 0, Math.cos(attacker.mesh.rotation.y));
  }
  attacker.attackDirection.normalize();
}

function damage(attacker, defender) {
  triggerAttackAnimation(attacker, defender);
  playAutoAttackSound(attacker);
  const actualDefender = selflessShieldTarget(defender) ?? defender;
  const rawAttack = attacker.side === "enemy" ? attacker.atk * 0.125 : effectiveAtk(attacker);
  const amount = Math.max(1, Math.ceil(rawAttack - actualDefender.def - (actualDefender.shieldDefBonus ?? 0)));
  if (attacker.side === "hero" && actualDefender.side === "enemy") {
    damageEnemy(attacker, actualDefender, amount);
  } else {
    actualDefender.hp -= amount;
    if (attacker.side === "enemy" && actualDefender.side === "camp" && !actualDefender.underAttackNotified) {
      actualDefender.underAttackNotified = true;
      log("A friendly camp is under attack!");
    }
  }
  flash(actualDefender.mesh.position, attacker.side === "hero" ? 0x9be7f5 : 0xe76d55);
  if (actualDefender !== defender) {
    holyLightBurst(defender.mesh.position, 0.85, 0.45);
    goldShieldAura(actualDefender, 0.8);
  }
  if (defender.hp <= 0 && attacker.side === "hero") {
    gold += 12;
    log(`${attacker.name} defeated ${defender.name}.`);
  }
}

function selflessShieldTarget(defender) {
  if (defender.side !== "hero" || defender.selflessShieldTimer <= 0 || !defender.selflessShieldOwnerId) return null;
  const owner = units.find((unit) => unit.id === defender.selflessShieldOwnerId && unit.hp > 0 && !unit.asleep);
  return owner ?? null;
}

function effectiveAtk(unit) {
  return unit.atk * (unit.atkBuffMultiplier ?? 1);
}

function xpForNextLevel(level) {
  return Math.ceil(100 * Math.pow(2.5, Math.max(0, Math.floor(level) - 1)));
}

function scaledAbilityDamage(amount) {
  return Math.ceil(amount * abilityDamageScale);
}

function damageEnemy(source, enemy, amount) {
  if (!enemy || enemy.side !== "enemy" || enemy.hp <= 0 || amount <= 0) return 0;
  const before = Math.max(0, enemy.hp);
  enemy.hp = Math.max(0, enemy.hp - amount);
  const dealt = Math.max(0, before - Math.max(0, enemy.hp));
  const hero = typeof source === "string"
    ? units.find((unit) => unit.id === source && unit.side === "hero")
    : source;
  if (dealt > 0 && hero?.side === "hero") awardHeroXp(hero, dealt * 0.05);
  return dealt;
}

function awardHeroXp(hero, amount) {
  if (!hero || hero.side !== "hero") return;
  const xpGain = Math.round(amount * 10) / 10;
  if (xpGain <= 0) return;
  xpRoll(hero.mesh.position, `+${formatXpGain(xpGain)}XP`);
  hero.xp = (hero.xp ?? 0) + xpGain;
  hero.xpToNext = hero.xpToNext ?? xpForNextLevel(hero.level);
  while (hero.xp >= hero.xpToNext) {
    hero.xp -= hero.xpToNext;
    hero.level = Math.floor(hero.level) + 1;
    applyXpLevelStats(hero);
    hero.xpToNext = xpForNextLevel(hero.level);
    flash(hero.mesh.position, 0xf1d34f);
    log(`${hero.name} reached level ${hero.level}.`);
  }
}

function formatXpGain(amount) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}

function applyXpLevelStats(hero) {
  const previousMax = hero.maxHp;
  const multiplier = Math.pow(1.02, Math.max(0, Math.floor(hero.level) - 1));
  hero.maxHp = Math.ceil(hero.baseMaxHp * multiplier);
  hero.atk = Math.round(hero.baseAtk * multiplier * 10) / 10;
  hero.def = Math.round(hero.baseDef * multiplier * 10) / 10;
  hero.hp = Math.min(hero.maxHp, hero.hp + Math.max(0, hero.maxHp - previousMax));
}

function moveTo(unit, point, dt) {
  const pos = unit.mesh.position;
  const delta = new THREE.Vector3(point.x - pos.x, 0, point.z - pos.z);
  const dist = delta.length();
  if (dist < 0.12) return;

  delta.normalize();
  const multiplier = terrainSpeedMultiplier(unit, pos);
  const step = Math.min(dist, unit.speed * (unit.speedBuffMultiplier ?? 1) * multiplier * dt);
  const next = pos.clone().addScaledVector(delta, step);
  next.x = THREE.MathUtils.clamp(next.x, -worldSize / 2 + 1, worldSize / 2 - 1);
  next.z = THREE.MathUtils.clamp(next.z, -worldSize / 2 + 1, worldSize / 2 - 1);
  if (isTerrainBlocked(unit, next)) return;
  if (unit.side === "hero" && unit.wingDashTimer > 0) damageEnemiesInDashPath(unit, pos, next);
  pos.copy(next);
  face(unit, point);
}

function damageEnemiesInDashPath(hero, start, end) {
  enemies().forEach((enemy) => {
    if (hero.wingDashHitIds.has(enemy.id)) return;
    if (distancePointToSegment(enemy.mesh.position, start, end) > 0.82) return;
    damageEnemy(hero, enemy, scaledAbilityDamage(35));
    hero.wingDashHitIds.add(enemy.id);
    flash(enemy.mesh.position, 0x9be7f5);
  });
}

function distancePointToSegment(point, start, end) {
  const segment = end.clone().sub(start).setY(0);
  const lengthSq = segment.lengthSq();
  if (lengthSq === 0) return point.distanceTo(start);
  const toPoint = point.clone().sub(start).setY(0);
  const t = THREE.MathUtils.clamp(toPoint.dot(segment) / lengthSq, 0, 1);
  const closest = start.clone().add(segment.multiplyScalar(t));
  return point.clone().setY(0).distanceTo(closest);
}

function terrainSpeedMultiplier(unit, position) {
  let multiplier = 1;
  if (unit.side === "hero" && terrainAt(position, "water")) multiplier *= 0.5;
  if (unit.side === "enemy" && terrainAt(position, "water")) multiplier *= 0.75;
  if (terrainAt(position, "mountain")) multiplier *= 0.25;
  if (terrainAt(position, "trees")) multiplier *= 0.67;
  return multiplier;
}

function isTerrainBlocked(unit, position) {
  return false;
}

function terrainAt(position, type) {
  return terrainZones.some((zone) => zone.type === type && pointInZone(position, zone));
}

function pointInZone(position, zone) {
  const x = position.x - zone.x;
  const z = position.z - zone.z;
  if (zone.shape === "circle") return x * x + z * z <= zone.radius * zone.radius;
  if (zone.shape === "ellipse") return (x * x) / (zone.rx * zone.rx) + (z * z) / (zone.rz * zone.rz) <= 1;
  if (zone.shape === "rect") {
    const cos = Math.cos(-zone.rotation);
    const sin = Math.sin(-zone.rotation);
    const localX = x * cos - z * sin;
    const localZ = x * sin + z * cos;
    return Math.abs(localX) <= zone.width * 0.5 && Math.abs(localZ) <= zone.height * 0.5;
  }
  return false;
}

function face(unit, point) {
  const pos = unit.mesh.position;
  const angle = Math.atan2(point.x - pos.x, point.z - pos.z);
  unit.mesh.rotation.y = angle;
}

function removeDeadUnits() {
  units = units.filter((unit) => {
    if (unit.hp > 0) return true;
    if (unit.side === "hero") {
      if (unit.reviveTimer <= 0) {
        unit.reviveTimer = heroSleepDuration;
        unit.hp = 0;
        unit.asleep = false;
        putHeroToSleep(unit, "revive");
        unit.mesh.visible = true;
        if (unit.healthBar) unit.healthBar.group.visible = true;
        log(`${unit.name} will revive in ${heroSleepDuration} seconds.`);
      }
      return true;
    }
    scene.remove(unit.mesh);
    if (unit.healthBar) scene.remove(unit.healthBar.group);
    return false;
  });
}

function showNamePopup(unit) {
  const popup = createNamePopup(unit);
  scene.add(popup.group);
  popups.push({ ...popup, ttl: 1.8 });
}

function createNamePopup(unit) {
  const group = new THREE.Group();
  const labelText = unit.side === "hero" ? `${unit.name} (Level ${Math.floor(unit.level)})` : unit.name;
  const label = createNameTexture(labelText);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: label.texture,
    transparent: true,
    depthTest: false
  }));
  sprite.scale.set(label.scaleX, label.scaleY, 1);
  sprite.renderOrder = 30;
  group.add(sprite);
  group.position.copy(unit.mesh.position);
  group.position.y += 3.0;
  return { group, unitId: unit.id };
}

function updateNamePopups(dt) {
  popups = popups.filter((popup) => {
    popup.ttl -= dt;
    const unit = units.find((candidate) => candidate.id === popup.unitId);
    if (popup.ttl <= 0 || !unit || unit.hp <= 0) {
      scene.remove(popup.group);
      return false;
    }
    popup.group.position.copy(unit.mesh.position);
    popup.group.position.y += unit.side === "hero" ? 4.55 : 2.8;
    popup.group.quaternion.copy(camera.quaternion);
    return true;
  });
  if (hoverPopup) positionNamePopup(hoverPopup);
}

function positionNamePopup(popup) {
  const unit = units.find((candidate) => candidate.id === popup.unitId);
  const medkit = medkits.find((candidate) => candidate.id === popup.unitId);
  if (medkit) {
    popup.group.position.copy(medkit.mesh.position);
    popup.group.position.y += 1.45;
    popup.group.quaternion.copy(camera.quaternion);
    return;
  }

  if (!unit || unit.hp <= 0) {
    removeHoverPopup();
    return;
  }
  popup.group.position.copy(unit.mesh.position);
  popup.group.position.y += unit.side === "hero" ? 4.55 : 2.8;
  popup.group.quaternion.copy(camera.quaternion);
}

function clearMedkitHighlight() {
  if (!highlightedMedkit) return;
  highlightedMedkit.highlight.visible = false;
  highlightedMedkit = null;
}

function removeHoverPopup() {
  hoveredUnitId = null;
  hoveredMedkitId = null;
  clearMedkitHighlight();
  if (!hoverPopup) return;
  scene.remove(hoverPopup.group);
  hoverPopup = null;
}

function createNameTexture(name) {
  const canvas = document.createElement("canvas");
  const fontSize = 84;
  const paddingX = 34;
  const paddingY = 20;
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = `800 ${fontSize}px system-ui, sans-serif`;
  const textWidth = Math.ceil(measureContext.measureText(name).width);
  canvas.width = Math.min(768, Math.max(180, textWidth + paddingX * 2));
  canvas.height = fontSize + paddingY * 2;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(18, 23, 20, 0.82)";
  context.strokeStyle = "rgba(229, 234, 218, 0.34)";
  context.lineWidth = 7;
  roundRect(context, 4, 4, canvas.width - 8, canvas.height - 8, 18);
  context.fill();
  context.stroke();
  context.fillStyle = "#f5f3e8";
  context.font = `800 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(name, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return {
    texture,
    scaleX: THREE.MathUtils.clamp(canvas.width / 105, 2.0, 7.0),
    scaleY: 1.2
  };
}

function createSleepUi(hero) {
  const group = new THREE.Group();
  const zLabel = createUiTexture("ZZZZ", {
    fontSize: 74,
    fill: "rgba(26, 31, 36, 0.72)",
    stroke: "rgba(245, 243, 232, 0.35)",
    text: "#dff0ff"
  });
  const zSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: zLabel.texture,
    transparent: true,
    depthTest: false
  }));
  zSprite.scale.set(2.35, 0.72, 1);
  zSprite.renderOrder = 34;
  zSprite.position.y = 0.74;
  group.add(zSprite);

  const countdownLabel = createUiTexture(`${heroSleepDuration}s`, {
    fontSize: 66,
    fill: "rgba(34, 30, 18, 0.88)",
    stroke: "rgba(255, 244, 170, 0.75)",
    text: "#f1d34f"
  });
  const countdownSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: countdownLabel.texture,
    transparent: true,
    depthTest: false
  }));
  countdownSprite.scale.set(1.25, 0.62, 1);
  countdownSprite.renderOrder = 35;
  countdownSprite.position.y = -0.02;
  countdownSprite.visible = false;
  group.add(countdownSprite);

  const payLabel = createUiTexture("Wake Up", {
    fontSize: 62,
    fill: "rgba(40, 95, 48, 0.94)",
    stroke: "rgba(255, 244, 170, 0.8)",
    text: "#fff7b0"
  });
  const payButton = new THREE.Sprite(new THREE.SpriteMaterial({
    map: payLabel.texture,
    transparent: true,
    depthTest: false
  }));
  payButton.scale.set(2.25, 0.68, 1);
  payButton.renderOrder = 36;
  payButton.userData.payHeroId = hero.id;
  group.add(payButton);

  group.visible = false;
  scene.add(group);
  hero.sleepUi = { group, zSprite, countdownSprite, payButton, lastCountdownText: `${heroSleepDuration}s` };
  upkeepWidgets.push(hero.sleepUi);
}

function createUiTexture(text, options = {}) {
  const canvas = document.createElement("canvas");
  const fontSize = options.fontSize ?? 64;
  const paddingX = 28;
  const paddingY = 18;
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = `900 ${fontSize}px system-ui, sans-serif`;
  const textWidth = Math.ceil(measureContext.measureText(text).width);
  canvas.width = Math.min(512, Math.max(180, textWidth + paddingX * 2));
  canvas.height = fontSize + paddingY * 2;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.fill ?? "rgba(18, 23, 20, 0.82)";
  context.strokeStyle = options.stroke ?? "rgba(229, 234, 218, 0.34)";
  context.lineWidth = 6;
  roundRect(context, 4, 4, canvas.width - 8, canvas.height - 8, 18);
  context.fill();
  context.stroke();
  context.fillStyle = options.text ?? "#f5f3e8";
  context.font = `900 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture };
}

function updateUpkeepWidgets(dt) {
  heroes(true).forEach((hero) => {
    if (!hero.sleepUi) return;
    hero.sleepBob += dt * 2.8;
    const visible = hero.asleep && hero.mesh.visible && (hero.hp > 0 || hero.reviveTimer > 0);
    hero.sleepUi.group.visible = visible;
    if (!visible) return;
    hero.sleepUi.group.position.copy(hero.mesh.position);
    hero.sleepUi.group.position.y += 4.95 + Math.sin(hero.sleepBob) * 0.18;
    hero.sleepUi.group.quaternion.copy(camera.quaternion);
    hero.sleepUi.zSprite.position.x = Math.sin(hero.sleepBob * 1.7) * 0.18;
    hero.sleepUi.zSprite.position.y = 0.76 + Math.sin(hero.sleepBob * 1.2) * 0.08;
    if (hero.sleepReason === "revive") {
      const countdownText = `${Math.ceil(hero.reviveTimer)}s`;
      hero.sleepUi.countdownSprite.visible = true;
      if (hero.sleepUi.lastCountdownText !== countdownText) {
        updateSleepCountdownTexture(hero.sleepUi, countdownText);
      }
    } else {
      hero.sleepUi.countdownSprite.visible = false;
    }
    hero.sleepUi.payButton.visible = true;
    hero.sleepUi.payButton.material.opacity = gold >= wakeCost(hero) ? 1 : 0.58;
  });
}

function updateSleepCountdownTexture(sleepUi, text) {
  const label = createUiTexture(text, {
    fontSize: 66,
    fill: "rgba(34, 30, 18, 0.88)",
    stroke: "rgba(255, 244, 170, 0.75)",
    text: "#f1d34f"
  });
  sleepUi.countdownSprite.material.map?.dispose?.();
  sleepUi.countdownSprite.material.map = label.texture;
  sleepUi.countdownSprite.material.needsUpdate = true;
  sleepUi.lastCountdownText = text;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function onPointerMove(event) {
  if (activePointers.has(event.pointerId)) {
    event.preventDefault();
    updateCameraPointer(event);
    return;
  }

  if (state !== "playing") {
    removeHoverPopup();
    return;
  }

  const hitUnit = unitFromPointerEvent(event);
  if (!hitUnit) {
    const hitMedkit = medkitFromPointerEvent(event);
    if (!hitMedkit) {
      removeHoverPopup();
      return;
    }

    if (hoveredMedkitId === hitMedkit.id) return;
    removeHoverPopup();
    highlightedMedkit = hitMedkit;
    highlightedMedkit.highlight.visible = true;
    hoverPopup = createNamePopup({ id: hitMedkit.id, name: hitMedkit.label, side: "medkit", hp: 1, mesh: hitMedkit.mesh });
    hoveredMedkitId = hitMedkit.id;
    scene.add(hoverPopup.group);
    positionNamePopup(hoverPopup);
    return;
  }

  if (hoveredUnitId === hitUnit.id) return;
  removeHoverPopup();
  hoverPopup = createNamePopup(hitUnit);
  hoveredUnitId = hitUnit.id;
  scene.add(hoverPopup.group);
  positionNamePopup(hoverPopup);
}

function onPointerDown(event) {
  event.preventDefault();
  activePointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    prevX: event.clientX,
    prevY: event.clientY,
    startX: event.clientX,
    startY: event.clientY
  });
  cameraControls.tapEvent = event;
  cameraControls.moved = false;
  cameraControls.lastSingle = { x: event.clientX, y: event.clientY };
  if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  if (activePointers.size === 2) beginPinchZoom();
  removeHoverPopup();
}

function onPointerUp(event) {
  if (!activePointers.has(event.pointerId)) return;
  event.preventDefault();
  const wasSingleTap = activePointers.size === 1 && !cameraControls.moved;
  activePointers.delete(event.pointerId);
  if (canvas.releasePointerCapture) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released by the browser.
    }
  }

  if (wasSingleTap) handleBattlefieldTap(event);

  if (activePointers.size === 1) {
    const remaining = [...activePointers.values()][0];
    cameraControls.lastSingle = { x: remaining.x, y: remaining.y };
    cameraControls.pinchCenter = null;
  } else if (activePointers.size === 0) {
    cameraControls.tapEvent = null;
    cameraControls.lastSingle = null;
    cameraControls.pinchCenter = null;
  }
}

function updateCameraPointer(event) {
  const pointerState = activePointers.get(event.pointerId);
  pointerState.prevX = pointerState.x;
  pointerState.prevY = pointerState.y;
  pointerState.x = event.clientX;
  pointerState.y = event.clientY;

  if (activePointers.size >= 2) {
    updatePinchZoom();
    return;
  }

  const distanceFromStart = Math.hypot(pointerState.x - pointerState.startX, pointerState.y - pointerState.startY);
  if (distanceFromStart < 6 && !cameraControls.moved) return;
  cameraControls.moved = true;
  panCameraByPixels(pointerState.x - pointerState.prevX, pointerState.y - pointerState.prevY);
}

function beginPinchZoom() {
  const pair = [...activePointers.values()].slice(0, 2);
  cameraControls.pinchDistance = pointerDistance(pair);
  cameraControls.pinchZoom = cameraZoom;
  cameraControls.pinchCenter = pointerCenter(pair);
  cameraControls.moved = true;
}

function updatePinchZoom() {
  const pair = [...activePointers.values()].slice(0, 2);
  const distance = pointerDistance(pair);
  const center = pointerCenter(pair);
  if (cameraControls.pinchDistance > 0) {
    setCameraZoom(cameraControls.pinchZoom * (distance / cameraControls.pinchDistance));
  }
  if (cameraControls.pinchCenter) {
    panCameraByPixels(center.x - cameraControls.pinchCenter.x, center.y - cameraControls.pinchCenter.y);
  }
  cameraControls.pinchCenter = center;
}

function pointerDistance(pair) {
  return Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
}

function pointerCenter(pair) {
  return {
    x: (pair[0].x + pair[1].x) / 2,
    y: (pair[0].y + pair[1].y) / 2
  };
}

function panCameraByPixels(deltaX, deltaY) {
  const scale = 0.035 / cameraZoom;
  cameraPan.x = THREE.MathUtils.clamp(cameraPan.x - deltaX * scale, -9, 9);
  cameraPan.z = THREE.MathUtils.clamp(cameraPan.z - deltaY * scale, -8, 8);
  updateCameraFrame();
}

function setCameraZoom(nextZoom) {
  cameraZoom = THREE.MathUtils.clamp(nextZoom, 0.85, 2.1);
  updateCameraFrame();
}

function onWheel(event) {
  event.preventDefault();
  setCameraZoom(cameraZoom * (event.deltaY < 0 ? 1.08 : 0.92));
}

function handleBattlefieldTap(event) {
  if (state !== "playing") return;
  const payHeroId = payButtonFromPointerEvent(event);
  if (payHeroId) {
    payHeroUpkeep(payHeroId);
    return;
  }

  const hitUnit = unitFromPointerEvent(event);
  if (hitUnit) {
    if (hitUnit.side === "enemy" && castTargetedAbilityAt(hitUnit.mesh.position)) return;
    if (hitUnit.side === "hero") {
      if (hitUnit.asleep) {
        selectHero(hitUnit.id);
        log(`Tap Wake Up to revive ${hitUnit.name} for ${wakeCost(hitUnit)} gold.`);
        return;
      }
      selectHero(hitUnit.id);
    }
    if (hitUnit.side === "enemy") focusEnemy(hitUnit.id);
    return;
  }

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitGround = raycaster.intersectObject(ground)[0];
  if (hitGround) {
    if (castTargetedAbilityAt(hitGround.point)) return;
    commandMove(hitGround.point);
  }
}

function unitFromPointerEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitUnits = raycaster.intersectObjects(units.map((unit) => unit.mesh), true);
  if (!hitUnits.length) return null;
  for (const hit of hitUnits) {
    const id = unitIdFromObject(hit.object);
    const unit = units.find((candidate) => candidate.id === id && (candidate.hp > 0 || candidate.asleep));
    if (unit) return unit;
  }
  return null;
}

function unitIdFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.unitId) return current.userData.unitId;
    current = current.parent;
  }
  return null;
}

function medkitFromPointerEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitKits = raycaster.intersectObjects(medkits.map((kit) => kit.mesh), true);
  if (!hitKits.length) return null;
  const id = hitKits[0].object.userData.medkitId;
  return medkits.find((kit) => kit.id === id) ?? null;
}

function payButtonFromPointerEvent(event) {
  const payButtons = upkeepWidgets
    .filter((widget) => widget.group.visible && widget.payButton.visible)
    .map((widget) => widget.payButton);
  if (!payButtons.length) return null;

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitButtons = raycaster.intersectObjects(payButtons, false);
  return hitButtons[0]?.object.userData.payHeroId ?? null;
}


function selectHero(id) {
  selectedId = id;
  const hero = selectedHero();
  if (!hero) return;
  log(`${hero.name} selected.`);
  syncUi();
}

function chooseAbility(heroId, ability) {
  const hero = units.find((unit) => unit.id === heroId);
  if (!hero) return;
  if (hero.asleep) {
    log(`${hero.name} is sleeping until upkeep is paid.`);
    return;
  }
  const cooldown = hero.abilityCooldowns[ability] ?? 0;
  if (cooldown > 0) {
    log(`${ability} ready in ${Math.ceil(cooldown)}s.`);
    return;
  }

  hero.activeAbility = ability;
  if (ability === "Fairy Dust") {
    if (castFairyDust(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Solar Burst") {
    if (castSolarBurst(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Wing Dash") {
    castWingDash(hero);
    startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Sparkly Heal") {
    if (castSparklyHeal(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Void Barrage") {
    targetingAbility = { heroId: hero.id, ability };
    log("Tap an enemy or location for Void Barrage.");
    syncUi();
    return;
  }
  if (ability === "Berry Shield") {
    if (castBerryShield(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Shadow Step") {
    if (castShadowStep(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Stinky Breath") {
    if (castStinkyBreath(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Sausage Party") {
    if (castSausageRain(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Inner Light") {
    if (castInnerLight(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Space Fart") {
    if (castHammerOfLight(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Selfless Belch") {
    if (castSelflessShield(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  startAbilityCooldown(hero, ability);
  log(`${hero.name} readied ${ability}.`);
  syncUi();
}

function startAbilityCooldown(hero, ability) {
  hero.abilityCooldowns[ability] = abilityCooldownDurations[ability] ?? 12;
}

function castFairyDust(hero) {
  const foes = enemies();
  if (!foes.length) {
    log("No enemies for Fairy Dust.");
    return false;
  }

  foes.forEach((enemy) => {
    damageEnemy(hero, enemy, scaledAbilityDamage(50));
    flash(enemy.mesh.position, 0xf1d34f);
  });
  fairyDust(hero);
  playTinkleSound();
  log(`${hero.name} cast Fairy Dust.`);
  return true;
}

function castSolarBurst(hero) {
  const primaryTarget = targetEnemy(hero) ?? nearest(hero, enemies());
  if (!primaryTarget) {
    log("No enemies for Solar Burst.");
    return false;
  }
  face(hero, primaryTarget.mesh.position);
  const direction = primaryTarget.mesh.position.clone().sub(hero.mesh.position).setY(0).normalize();
  const origin = hero.mesh.position.clone();
  let hits = 0;

  enemies().forEach((enemy) => {
    const toEnemy = enemy.mesh.position.clone().sub(origin);
    const distance = toEnemy.length();
    if (distance > 7.5) return;
    toEnemy.y = 0;
    toEnemy.normalize();
    const dot = direction.dot(toEnemy);
    if (dot < Math.cos(Math.PI / 5)) return;
    damageEnemy(hero, enemy, scaledAbilityDamage(75));
    hits += 1;
    flash(enemy.mesh.position, 0xf6db55);
  });

  solarFlames(hero);
  sunlightRing(hero.mesh.position);
  log(hits ? `${hero.name} fired Solar Burst.` : "Solar Burst missed.");
  return hits > 0;
}

function castWingDash(hero) {
  hero.speedBuffMultiplier = 2;
  hero.speedBuffTimer = 4;
  hero.wingDashTimer = 4;
  hero.wingDashHitIds = new Set();
  flash(hero.mesh.position, 0x9be7f5);
  playWhooshSound();
  log(`${hero.name} used Wing Dash.`);
}

function castSparklyHeal(hero) {
  let affected = 0;
  heroes().forEach((ally) => {
    if (ally.mesh.position.distanceTo(hero.mesh.position) > 4) return;
    healUnit(ally, 50);
    ally.sparklyHealTimer = 5;
    ally.sparklyHealTickTimer = 1;
    ally.sparklyHealVisualTimer = 0;
    healingBubbles(ally.mesh.position);
    sparklyHealBurst(ally.mesh.position);
    affected += 1;
  });
  flash(hero.mesh.position, 0x63d463);
  if (affected) playSparkleRingSound();
  log(affected ? `${hero.name} cast Sparkly Heal.` : "No allies in Sparkly Heal range.");
  return affected > 0;
}

function castTargetedAbilityAt(point) {
  if (!targetingAbility) return false;
  const hero = units.find((unit) => unit.id === targetingAbility.heroId);
  if (!hero || hero.asleep || hero.hp <= 0) {
    targetingAbility = null;
    return false;
  }

  if (targetingAbility.ability === "Void Barrage") {
    if (castVoidBarrageAt(hero, point)) {
      startAbilityCooldown(hero, "Void Barrage");
      targetingAbility = null;
      syncUi();
    }
    return true;
  }

  return false;
}

function castVoidBarrageAt(hero, point) {
  const maxRange = 6;
  const impact = new THREE.Vector3(point.x, 0, point.z);
  const from = hero.mesh.position.clone().setY(0);
  const offset = impact.clone().sub(from);
  const distance = offset.length();
  if (distance > maxRange && distance > 0) {
    offset.normalize().multiplyScalar(maxRange);
    impact.copy(from).add(offset);
  }

  face(hero, impact);
  let hits = 0;
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const radius = i === 0 ? 0 : 0.65;
    const arrowImpact = impact.clone();
    arrowImpact.x += Math.cos(angle) * radius;
    arrowImpact.z += Math.sin(angle) * radius;
    enemies().forEach((enemy) => {
      if (enemy.mesh.position.distanceTo(arrowImpact) > 1) return;
      damageEnemy(hero, enemy, scaledAbilityDamage(25));
      hits += 1;
      flash(enemy.mesh.position, 0x9c59d1);
    });
    starShotArrow(hero.mesh.position, arrowImpact);
  }
  playArrowBarrageSound();
  hero.target = null;
  log(hits ? `${hero.name} fired Void Barrage.` : `${hero.name} fired Void Barrage at the target.`);
  return true;
}

function castBerryShield(hero) {
  let protectedCount = 0;
  heroes().forEach((ally) => {
    if (ally.mesh.position.distanceTo(hero.mesh.position) > 2.5) return;
    ally.shieldDefBonus = 5;
    ally.shieldTimer = 5;
    protectedCount += 1;
  });
  strawberryShield(hero);
  log(`${hero.name} shielded ${protectedCount} hero${protectedCount === 1 ? "" : "es"}.`);
  return protectedCount > 0;
}

function castShadowStep(hero) {
  const angle = Math.random() * Math.PI * 2;
  const destination = hero.mesh.position.clone();
  destination.x += Math.cos(angle) * 3;
  destination.z += Math.sin(angle) * 3;
  destination.x = THREE.MathUtils.clamp(destination.x, -worldSize / 2 + 1, worldSize / 2 - 1);
  destination.z = THREE.MathUtils.clamp(destination.z, -worldSize / 2 + 1, worldSize / 2 - 1);
  if (!isTerrainBlocked(hero, destination)) {
    flash(hero.mesh.position, 0x4e2d66);
    hero.mesh.position.copy(destination);
    hero.targetPoint.copy(destination);
    flash(hero.mesh.position, 0x9c59d1);
  }
  log(`${hero.name} used Shadow Step.`);
  return true;
}

function castStinkyBreath(hero) {
  const primaryTarget = targetEnemy(hero) ?? nearest(hero, enemies());
  if (!primaryTarget) {
    log("No enemies for Stinky Breath.");
    return false;
  }
  face(hero, primaryTarget.mesh.position);
  const direction = primaryTarget.mesh.position.clone().sub(hero.mesh.position).setY(0).normalize();
  const origin = hero.mesh.position.clone();
  let hits = 0;

  enemies().forEach((enemy) => {
    const toEnemy = enemy.mesh.position.clone().sub(origin);
    const distance = toEnemy.length();
    if (distance > 5.8) return;
    toEnemy.y = 0;
    toEnemy.normalize();
    if (direction.dot(toEnemy) < Math.cos(Math.PI / 4)) return;
    enemy.burnTimer = 4;
    enemy.burnTickTimer = 1;
    enemy.burnDamage = scaledAbilityDamage(55) / 4;
    enemy.burnSourceId = hero.id;
    hits += 1;
    flash(enemy.mesh.position, 0x8a5a31);
  });
  flameBreath(hero);
  playEwwwSound();
  log(hits ? `${hero.name} used Stinky Breath.` : "Stinky Breath missed.");
  return hits > 0;
}

function castSausageRain(hero) {
  const foes = enemies();
  const target = targetEnemy(hero)
    ?? foes.sort((a, b) => a.mesh.position.distanceTo(hero.mesh.position) - b.mesh.position.distanceTo(hero.mesh.position))[0];

  if (!target) {
    log("No enemies for Sausage Party.");
    return false;
  }

  const affected = foes.filter((enemy) => enemy.mesh.position.distanceTo(target.mesh.position) <= sausageRainRadius);
  affected.forEach((enemy) => {
    enemy.sausageRainTimer = 5;
    enemy.sausageRainTickTimer = 1;
    enemy.sausageRainVisualTimer = 0;
    enemy.sausageRainSourceId = hero.id;
  });
  heroes().forEach((ally) => {
    if (ally.mesh.position.distanceTo(target.mesh.position) > 4) return;
    ally.atkBuffMultiplier = Math.max(ally.atkBuffMultiplier ?? 1, 1.2);
    ally.atkBuffTimer = Math.max(ally.atkBuffTimer ?? 0, 5);
    sparklyHealBurst(ally.mesh.position);
  });
  sausageRain(target.mesh.position);
  playHooraySound();
  log(`${hero.name} started a Sausage Party on ${affected.length} enemy${affected.length === 1 ? "" : "ies"}.`);
  return affected.length > 0;
}

function castInnerLight(hero) {
  let affected = 0;
  heroes().forEach((ally) => {
    if (ally.mesh.position.distanceTo(hero.mesh.position) > 3.5) return;
    const healing = ally.id === hero.id && hero.selflessShieldTimer > 0 ? 75 : 25;
    healUnit(ally, healing);
    ally.innerLightHotTimer = 3;
    ally.innerLightHotTickTimer = 1;
    holyLightBurst(ally.mesh.position, 0.85, 0.55);
    affected += 1;
  });
  enemies().forEach((enemy) => {
    if (enemy.mesh.position.distanceTo(hero.mesh.position) > 3.5) return;
    damageEnemy(hero, enemy, scaledAbilityDamage(25));
    flash(enemy.mesh.position, 0xfff0a6);
    affected += 1;
  });
  flash(hero.mesh.position, 0xfff0a6);
  if (affected) playShineSound();
  log(`${hero.name} used Inner Light.`);
  return affected > 0;
}

function castHammerOfLight(hero) {
  const target = targetEnemy(hero) ?? nearest(hero, enemies());
  if (target) face(hero, target.mesh.position);
  const direction = new THREE.Vector3(Math.sin(hero.mesh.rotation.y), 0, Math.cos(hero.mesh.rotation.y)).normalize();
  const origin = hero.mesh.position.clone();
  let hits = 0;

  enemies().forEach((enemy) => {
    const toEnemy = enemy.mesh.position.clone().sub(origin);
    const distance = toEnemy.length();
    if (distance > 2) return;
    toEnemy.y = 0;
    toEnemy.normalize();
    if (direction.dot(toEnemy) < Math.cos(Math.PI / 3)) return;
    damageEnemy(hero, enemy, scaledAbilityDamage(55));
    hits += 1;
    flash(enemy.mesh.position, 0xffe875);
  });
  hammerLightSmash(hero, direction);
  playSpaceFartSound();
  log(hits ? `${hero.name} used Space Fart.` : `${hero.name} called Space Fart.`);
  return true;
}

function castSelflessShield(hero) {
  const nearby = heroes()
    .filter((ally) => ally.id !== hero.id && ally.mesh.position.distanceTo(hero.mesh.position) <= 4)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
  if (!nearby) {
    hero.belchCostTimer = 10;
    hero.belchCostTickTimer = 1;
    let hits = 0;
    enemies().forEach((enemy) => {
      if (enemy.mesh.position.distanceTo(hero.mesh.position) > 4) return;
      damageEnemy(hero, enemy, scaledAbilityDamage(55));
      hits += 1;
      flash(enemy.mesh.position, 0xd6a65a);
    });
    holyLightBurst(hero.mesh.position, 1.8, 1.1);
    playBelchSound();
    log(hits ? `${hero.name} used Selfless Belch.` : `${hero.name} belched bravely.`);
    return true;
  }

  const beforeHeal = nearby.hp;
  healUnit(nearby, 70);
  const actualHealing = nearby.hp - beforeHeal;
  if (actualHealing > 0) hero.hp = Math.max(1, hero.hp - Math.ceil(actualHealing * 0.5));
  nearby.shieldDefBonus = Math.max(nearby.shieldDefBonus ?? 0, 4);
  nearby.shieldTimer = 8;
  nearby.selflessShieldTimer = 8;
  nearby.selflessShieldOwnerId = hero.id;
  hero.shieldDefBonus = Math.max(hero.shieldDefBonus ?? 0, 3);
  hero.shieldTimer = 8;
  hero.selflessShieldTimer = 8;
  hero.selflessShieldOwnerId = null;
  holyLightBurst(nearby.mesh.position, 1.2, 1.4);
  holyLightBurst(hero.mesh.position, 0.95, 1.1);
  goldShieldAura(nearby, 8);
  goldShieldAura(hero, 8);
  healingBubbles(nearby.mesh.position);
  playBelchSound();
  log(`${hero.name} used Selfless Belch on ${nearby.name}.`);
  return true;
}

function targetEnemy(hero) {
  return enemies().find((enemy) => enemy.id === hero.target) ?? null;
}

function starShotArrow(from, to) {
  const start = new THREE.Vector3(from.x, 1.9, from.z);
  const end = new THREE.Vector3(to.x, 1.2, to.z);
  const direction = end.clone().sub(start).normalize();
  const arrow = new THREE.Group();
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xf7e27a, transparent: true, opacity: 0.96 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98 });
  const fletchMat = new THREE.MeshBasicMaterial({ color: 0x9c59d1, transparent: true, opacity: 0.94, side: THREE.DoubleSide });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.78, 10), shaftMat);
  shaft.rotation.x = Math.PI / 2;
  arrow.add(shaft);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 12), headMat);
  head.position.z = 0.52;
  head.rotation.x = Math.PI / 2;
  arrow.add(head);

  [-1, 1].forEach((side) => {
    const feather = new THREE.Mesh(new THREE.CircleGeometry(0.12, 3), fletchMat);
    feather.position.set(side * 0.08, 0, -0.42);
    feather.scale.set(0.7, 1.15, 1);
    feather.rotation.set(Math.PI / 2, 0, side * 0.55);
    arrow.add(feather);
  });

  arrow.position.copy(start);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  arrow.userData.life = 0.62;
  arrow.userData.kind = "star-arrow";
  arrow.userData.start = start;
  arrow.userData.end = end;
  arrow.userData.age = 0;
  arrow.userData.duration = 0.42;
  scene.add(arrow);
  markers.push(arrow);
}

function strawberryShield(hero) {
  const berryMat = new THREE.MeshBasicMaterial({ color: 0xe8483f, transparent: true, opacity: 0.9 });
  const seedMat = new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0.95 });
  const leafMat = new THREE.MeshBasicMaterial({ color: 0x62b34d, transparent: true, opacity: 0.95, side: THREE.DoubleSide });

  for (let i = 0; i < 10; i += 1) {
    const berry = new THREE.Group();
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), berryMat.clone());
    fruit.scale.set(1, 1.18, 0.9);
    berry.add(fruit);
    for (let seedIndex = 0; seedIndex < 3; seedIndex += 1) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), seedMat.clone());
      seed.position.set((seedIndex - 1) * 0.045, 0.02 + seedIndex * 0.035, 0.105);
      berry.add(seed);
    }
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.075, 5), leafMat.clone());
    leaf.position.y = 0.15;
    leaf.rotation.x = Math.PI / 2;
    berry.add(leaf);

    const angle = (i / 10) * Math.PI * 2;
    berry.position.set(
      hero.mesh.position.x + Math.cos(angle) * 1.38,
      1.85 + Math.sin(angle * 2) * 0.18,
      hero.mesh.position.z + Math.sin(angle) * 1.38
    );
    berry.userData.life = 5;
    berry.userData.age = 0;
    berry.userData.ownerId = hero.id;
    berry.userData.angle = angle;
    berry.userData.radius = 1.38;
    berry.userData.height = 1.85;
    berry.userData.spinSpeed = 2.8 + i * 0.04;
    berry.userData.kind = "shield-berry";
    scene.add(berry);
    markers.push(berry);
  }
}

function flameBreath(hero) {
  const direction = new THREE.Vector3(Math.sin(hero.mesh.rotation.y), 0, Math.cos(hero.mesh.rotation.y)).normalize();
  const origin = hero.mesh.position.clone().add(direction.clone().multiplyScalar(0.9));
  const colors = [0x6b3f22, 0x8a5a31, 0xa16f3d, 0x4f301d];
  for (let i = 0; i < 82; i += 1) {
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 + Math.random() * 0.18, 10, 8),
      new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.9 })
    );
    const spread = (i / 82) * 4.2;
    const side = new THREE.Vector3(direction.z, 0, -direction.x).multiplyScalar((Math.random() - 0.5) * spread);
    flame.position.copy(origin).add(direction.clone().multiplyScalar(0.45 + Math.random() * 4.4)).add(side);
    flame.position.y += 1.25 + Math.random() * 1.25;
    flame.userData.life = 2 + Math.random() * 0.18;
    flame.userData.velocity = direction.clone().multiplyScalar(0.075 + Math.random() * 0.055);
    flame.userData.velocity.y = (Math.random() - 0.5) * 0.025;
    flame.userData.kind = "heal-bubble";
    scene.add(flame);
    markers.push(flame);
  }
}

function focusEnemy(enemyId) {
  const hero = selectedHero(true);
  const enemy = units.find((unit) => unit.id === enemyId);
  if (!hero || hero.asleep || hero.hp <= 0 || !enemy || enemy.hp <= 0) return;
  hero.target = enemy.id;
  hero.targetPoint.copy(hero.mesh.position);
  face(hero, enemy.mesh.position);
  showNamePopup(enemy);
  log(`${hero.name} targeting ${enemy.name}. Choose an ability.`);
}

function commandMove(point) {
  const hero = selectedHero();
  if (!hero) return;
  if (hero.asleep) {
    log(`${hero.name} is sleeping until upkeep is paid.`);
    return;
  }
  hero.target = null;
  hero.targetPoint.copy(point);
  flash(point, 0x9be7f5);
  log(`${hero.name} moving.`);
}

function rallyHeroes() {
  setActionMenuOpen(false);
  const destination = new THREE.Vector3(0, 0, 5.2);
  heroes().forEach((hero, index) => {
    hero.target = null;
    hero.targetPoint.set(destination.x + (index - (heroes().length - 1) / 2) * 2.35, 0, destination.z);
  });
  flash(destination, 0xe0be57);
  log("Squad rallying.");
}

function flash(position, color) {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.74, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(position.x, 0.08, position.z);
  marker.userData.life = 0.55;
  scene.add(marker);
  markers.push(marker);
}

function goldRoll(position, text) {
  const label = createUiTexture(text, {
    fontSize: 76,
    fill: "rgba(70, 43, 9, 0.88)",
    stroke: "rgba(255, 232, 117, 0.9)",
    text: "#ffe875"
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: label.texture,
    transparent: true,
    depthTest: false
  }));
  sprite.position.set(position.x, 3.75, position.z);
  sprite.scale.set(1.35, 0.62, 1);
  sprite.renderOrder = 42;
  sprite.userData.life = 1.15;
  sprite.userData.velocity = new THREE.Vector3(0, 0.045, 0);
  sprite.userData.kind = "gold-roll";
  scene.add(sprite);
  markers.push(sprite);
}

function xpRoll(position, text) {
  const label = createUiTexture(text, {
    fontSize: 72,
    fill: "rgba(39, 26, 70, 0.88)",
    stroke: "rgba(156, 89, 209, 0.92)",
    text: "#e0c7ff"
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: label.texture,
    transparent: true,
    depthTest: false
  }));
  sprite.position.set(position.x, 4.18, position.z);
  sprite.scale.set(1.32, 0.58, 1);
  sprite.renderOrder = 44;
  sprite.userData.life = 1.2;
  sprite.userData.velocity = new THREE.Vector3(0, 0.055, 0);
  sprite.userData.kind = "xp-roll";
  scene.add(sprite);
  markers.push(sprite);
}

function healUnit(unit, amount) {
  if (!unit || unit.hp <= 0 || amount <= 0) return 0;
  const before = unit.hp;
  unit.hp = Math.min(unit.maxHp, unit.hp + amount);
  const healed = Math.max(0, Math.round(unit.hp - before));
  if (healed > 0) {
    healRoll(unit.mesh.position, `+${healed}HP`);
    awardHeroXp(unit, healed * 0.05);
  }
  return healed;
}

function healRoll(position, text) {
  const label = createUiTexture(text, {
    fontSize: 72,
    fill: "rgba(18, 58, 30, 0.86)",
    stroke: "rgba(99, 211, 99, 0.92)",
    text: "#8eff8a"
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: label.texture,
    transparent: true,
    depthTest: false
  }));
  sprite.position.set(position.x, 3.95, position.z);
  sprite.scale.set(1.15, 0.56, 1);
  sprite.renderOrder = 43;
  sprite.userData.life = 1.05;
  sprite.userData.velocity = new THREE.Vector3(0, 0.052, 0);
  sprite.userData.kind = "heal-roll";
  scene.add(sprite);
  markers.push(sprite);
}

function healingBubbles(position) {
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0x63d463, transparent: true, opacity: 0.82 });
  for (let i = 0; i < 9; i += 1) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 10, 8), bubbleMat.clone());
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.25 + Math.random() * 0.62;
    bubble.position.set(position.x + Math.cos(angle) * radius, 1.2 + Math.random() * 0.7, position.z + Math.sin(angle) * radius);
    bubble.userData.life = 0.9 + Math.random() * 0.35;
    bubble.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.01, 0.035 + Math.random() * 0.025, (Math.random() - 0.5) * 0.01);
    bubble.userData.kind = "heal-bubble";
    scene.add(bubble);
    markers.push(bubble);
  }
}

function sparklyHealBurst(position) {
  const colors = [0x8df58e, 0xffffff, 0xf1d34f, 0xb8fff0];
  const geometries = [
    new THREE.OctahedronGeometry(0.075),
    new THREE.TetrahedronGeometry(0.08),
    new THREE.RingGeometry(0.055, 0.085, 5)
  ];

  for (let i = 0; i < 22; i += 1) {
    const sparkle = new THREE.Mesh(
      geometries[i % geometries.length],
      new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide
      })
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.35 + Math.random() * 0.95;
    sparkle.position.set(
      position.x + Math.cos(angle) * radius,
      1.05 + Math.random() * 1.9,
      position.z + Math.sin(angle) * radius
    );
    sparkle.scale.setScalar(0.85 + Math.random() * 1.3);
    sparkle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    sparkle.userData.life = 0.7 + Math.random() * 0.35;
    sparkle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.024, 0.024 + Math.random() * 0.03, (Math.random() - 0.5) * 0.024);
    sparkle.userData.spin = new THREE.Vector3(Math.random() * 0.16, Math.random() * 0.16, Math.random() * 0.16);
    sparkle.userData.kind = "sparkle-dust";
    scene.add(sparkle);
    markers.push(sparkle);
  }
}

function fairyDust(hero) {
  const direction = new THREE.Vector3(Math.sin(hero.mesh.rotation.y), 0, Math.cos(hero.mesh.rotation.y)).normalize();
  const origin = hero.mesh.position.clone().add(direction.clone().multiplyScalar(1.15));
  const colors = [0xfff8b6, 0xf6db55, 0xffffff, 0xffe68a];
  const sparkleGeometries = [
    new THREE.OctahedronGeometry(0.1),
    new THREE.TetrahedronGeometry(0.1),
    new THREE.SphereGeometry(0.045, 8, 6)
  ];

  for (let i = 0; i < 92; i += 1) {
    const geometry = sparkleGeometries[i % sparkleGeometries.length];
    const dust = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.96 })
    );
    const size = 0.7 + Math.random() * 1.2;
    dust.scale.setScalar(size);
    dust.position.set(
      origin.x + (Math.random() - 0.5) * 3.15,
      0.85 + Math.random() * 3.85,
      origin.z + (Math.random() - 0.5) * 3.15
    );
    dust.userData.life = 0.75 + Math.random() * 0.35;
    dust.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.045, 0.022 + Math.random() * 0.034, (Math.random() - 0.5) * 0.045);
    dust.userData.spin = new THREE.Vector3(Math.random() * 0.18, Math.random() * 0.18, Math.random() * 0.18);
    dust.userData.kind = "sparkle-dust";
    scene.add(dust);
    markers.push(dust);
  }

  for (let i = 0; i < 18; i += 1) {
    const twinkle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.12, 5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    twinkle.position.set(
      origin.x + (Math.random() - 0.5) * 3.2,
      1.2 + Math.random() * 3.1,
      origin.z + (Math.random() - 0.5) * 3.2
    );
    twinkle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    twinkle.userData.life = 0.55 + Math.random() * 0.35;
    twinkle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.025, 0.03 + Math.random() * 0.025, (Math.random() - 0.5) * 0.025);
    twinkle.userData.spin = new THREE.Vector3(0.08 + Math.random() * 0.12, 0.08 + Math.random() * 0.12, 0.08 + Math.random() * 0.12);
    twinkle.userData.kind = "sparkle-dust";
    scene.add(twinkle);
    markers.push(twinkle);
  }
}

function sausageRain(position) {
  const sausageMat = new THREE.MeshBasicMaterial({ color: 0xc46a35, transparent: true, opacity: 0.95 });
  const endMat = new THREE.MeshBasicMaterial({ color: 0xf1b064, transparent: true, opacity: 0.95 });

  for (let i = 0; i < 10; i += 1) {
    const sausage = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.38, 5, 10), sausageMat.clone());
    body.rotation.z = Math.PI / 2;
    sausage.add(body);

    [-0.23, 0.23].forEach((x) => {
      const end = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), endMat.clone());
      end.position.x = x;
      sausage.add(end);
    });

    sausage.position.set(
      position.x + (Math.random() - 0.5) * 2.5,
      3.6 + Math.random() * 1.6,
      position.z + (Math.random() - 0.5) * 2.5
    );
    sausage.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    sausage.userData.life = 1.2 + Math.random() * 0.25;
    sausage.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.015, -0.09 - Math.random() * 0.045, (Math.random() - 0.5) * 0.015);
    sausage.userData.spin = new THREE.Vector3(Math.random() * 0.13, Math.random() * 0.13, Math.random() * 0.13);
    sausage.userData.kind = "sausage-rain";
    scene.add(sausage);
    markers.push(sausage);
  }
}

function solarFlames(hero) {
  const direction = new THREE.Vector3(Math.sin(hero.mesh.rotation.y), 0, Math.cos(hero.mesh.rotation.y)).normalize();
  const origin = hero.mesh.position.clone().add(direction.clone().multiplyScalar(1.0));
  const flameColors = [0xfff06a, 0xffbd2e, 0xff7a1a];

  for (let i = 0; i < 34; i += 1) {
    const color = flameColors[i % flameColors.length];
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.055 + Math.random() * 0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
    );
    const spread = (i / 34) * 2.2;
    const side = new THREE.Vector3(direction.z, 0, -direction.x).multiplyScalar((Math.random() - 0.5) * spread);
    flame.position.copy(origin)
      .add(direction.clone().multiplyScalar(0.3 + Math.random() * 2.2))
      .add(side);
    flame.position.y += 2.6 + Math.random() * 0.4;
    flame.userData.life = 0.55 + Math.random() * 0.28;
    flame.userData.velocity = direction.clone().multiplyScalar(0.055 + Math.random() * 0.035);
    flame.userData.velocity.y = (Math.random() - 0.5) * 0.015;
    flame.userData.kind = "heal-bubble";
    scene.add(flame);
    markers.push(flame);
  }
}

function sunlightRing(position) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.95, 48),
    new THREE.MeshBasicMaterial({ color: 0xffdf57, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(position.x, 0.12, position.z);
  ring.userData.life = 0.85;
  ring.userData.kind = "sun-ring";
  scene.add(ring);
  markers.push(ring);
}

function holyLightBurst(position, radius = 1.5, life = 0.9) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.35, radius, 48),
    new THREE.MeshBasicMaterial({ color: 0xfff0a6, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(position.x, 0.16, position.z);
  ring.userData.life = life;
  ring.userData.kind = "holy-light";
  scene.add(ring);
  markers.push(ring);

  for (let i = 0; i < 18; i += 1) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 + Math.random() * 0.04, 8, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0xffe875, transparent: true, opacity: 0.92 })
    );
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius * 0.65;
    spark.position.set(position.x + Math.cos(angle) * distance, 0.8 + Math.random() * 1.3, position.z + Math.sin(angle) * distance);
    spark.userData.life = Math.min(1.1, life);
    spark.userData.velocity = new THREE.Vector3(Math.cos(angle) * 0.015, 0.025 + Math.random() * 0.025, Math.sin(angle) * 0.015);
    spark.userData.kind = "heal-bubble";
    scene.add(spark);
    markers.push(spark);
  }
}

function hammerLightSmash(hero, direction) {
  const origin = hero.mesh.position.clone().add(direction.clone().multiplyScalar(1.25));
  const cloudColors = [0x6b3f22, 0x8a5a31, 0x4f301d, 0xa16f3d];
  for (let i = 0; i < 34; i += 1) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 + Math.random() * 0.28, 12, 8),
      new THREE.MeshBasicMaterial({
        color: cloudColors[i % cloudColors.length],
        transparent: true,
        opacity: 0.72
      })
    );
    const spread = 0.25 + Math.random() * 1.45;
    const angle = Math.random() * Math.PI * 2;
    cloud.position.set(
      origin.x + Math.cos(angle) * spread,
      0.35 + Math.random() * 0.8,
      origin.z + Math.sin(angle) * spread
    );
    cloud.userData.kind = "brown-cloud";
    cloud.userData.life = 1.25 + Math.random() * 0.45;
    cloud.userData.velocity = new THREE.Vector3(
      Math.cos(angle) * (0.008 + Math.random() * 0.012),
      0.045 + Math.random() * 0.04,
      Math.sin(angle) * (0.008 + Math.random() * 0.012)
    );
    cloud.userData.spin = new THREE.Vector3(Math.random() * 0.035, Math.random() * 0.035, Math.random() * 0.035);
    scene.add(cloud);
    markers.push(cloud);
  }

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(1.75, 3.05, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x8a5a31, transparent: true, opacity: 0.26, side: THREE.DoubleSide })
  );
  cone.rotation.x = Math.PI / 2;
  cone.rotation.z = -hero.mesh.rotation.y;
  cone.position.set(origin.x, 0.18, origin.z);
  cone.scale.set(0.78, 1, 1);
  cone.userData.life = 0.55;
  cone.userData.kind = "holy-light";
  scene.add(cone);
  markers.push(cone);
  flash(origin, 0x8a5a31);
}

function goldShieldAura(hero, duration) {
  const shield = new THREE.Group();
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0xffd85a, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.52, 5), shieldMat);
  face.scale.set(0.8, 1.2, 1);
  shield.add(face);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.58, 5), shieldMat.clone());
  rim.scale.set(0.8, 1.2, 1);
  shield.add(rim);
  shield.userData.kind = "gold-shield";
  shield.userData.life = duration;
  shield.userData.ownerId = hero.id;
  shield.userData.age = 0;
  scene.add(shield);
  markers.push(shield);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterAudioGain = audioContext.createGain();
    masterAudioGain.gain.setValueAtTime(soundEnabled ? masterAudioVolume * soundEffectsVolume : 0, audioContext.currentTime);
    masterAudioGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function audioOutput(context) {
  if (!masterAudioGain) {
    masterAudioGain = context.createGain();
    masterAudioGain.gain.setValueAtTime(soundEnabled ? masterAudioVolume * soundEffectsVolume : 0, context.currentTime);
    masterAudioGain.connect(context.destination);
  }
  return masterAudioGain;
}

function prepareBackgroundMusic() {
  if (backgroundMusicPrepared) return;
  backgroundMusicPrepared = true;
  const music = audioAssets.backgroundMusic;
  music.loop = true;
  music.autoplay = true;
  music.preload = "auto";
  music.setAttribute("playsinline", "");
  music.volume = musicEnabled ? musicVolume : 0;
  music.load();
}

function startBackgroundMusic() {
  if (!musicEnabled) return;
  prepareBackgroundMusic();
  const music = audioAssets.backgroundMusic;
  music.loop = true;
  music.volume = musicEnabled ? musicVolume : 0;
  if (!music.paused) return;
  const playPromise = music.play();
  if (playPromise?.catch) playPromise.catch(() => {});
}

function playAudioAsset(asset, fallback) {
  if (!soundEnabled) return;
  if (!asset) {
    fallback?.();
    return;
  }
  try {
    asset.pause();
    asset.currentTime = 0;
    asset.volume = soundEffectsVolume;
    const playPromise = asset.play();
    if (playPromise?.catch) playPromise.catch(() => fallback?.());
  } catch {
    fallback?.();
  }
}

function playSpaceFartSound() {
  playAudioAsset(audioAssets.spaceFart, playGeneratedSpaceFartSound);
}

function playGeneratedSpaceFartSound() {
  const context = getAudioContext();
  if (!context) return;
  playRumbleSound(context, {
    duration: 2,
    startFrequency: 118,
    endFrequency: 32,
    noiseFrequency: 360,
    volume: 0.34,
    wobble: 9,
    wobbleDepth: 28,
    noiseLevel: 0.5,
    waveType: "sawtooth"
  });
}

function playBelchSound() {
  playAudioAsset(audioAssets.selflessBelch, playGeneratedBelchSound);
}

function playGeneratedBelchSound() {
  const context = getAudioContext();
  if (!context) return;
  playRumbleSound(context, {
    duration: 3,
    startFrequency: 56,
    endFrequency: 92,
    noiseFrequency: 190,
    volume: 0.32,
    wobble: 3,
    wobbleDepth: 38,
    noiseLevel: 0.72,
    waveType: "square"
  });
}

function playEwwwSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const duration = 1.45;
  const gain = context.createGain();
  const vowel = context.createOscillator();
  const vibrato = context.createOscillator();
  const vibratoGain = context.createGain();
  const filter = context.createBiquadFilter();

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.42, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  vowel.type = "triangle";
  vowel.frequency.setValueAtTime(510, now);
  vowel.frequency.exponentialRampToValueAtTime(230, now + duration);
  vibrato.frequency.setValueAtTime(7.2, now);
  vibratoGain.gain.setValueAtTime(42, now);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(940, now);
  filter.Q.setValueAtTime(8, now);

  vibrato.connect(vibratoGain);
  vibratoGain.connect(vowel.frequency);
  vowel.connect(filter);
  filter.connect(gain);
  gain.connect(audioOutput(context));
  vowel.start(now);
  vibrato.start(now);
  vowel.stop(now + duration);
  vibrato.stop(now + duration);
}

function playWhooshSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const duration = 0.75;
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const noise = context.createBufferSource();
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);

  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = (Math.random() * 2 - 1) * Math.sin((i / samples.length) * Math.PI);
  }

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(360, now);
  filter.frequency.exponentialRampToValueAtTime(2200, now + duration);
  filter.Q.setValueAtTime(1.2, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioOutput(context));
  noise.start(now);
  noise.stop(now + duration);
}

function playTinkleSound() {
  playBellSequence([1320, 1760, 2217, 2640], 0.55, 0.08);
}

function playSparkleRingSound() {
  playAudioAsset(audioAssets.sparklyHeal, playGeneratedSparkleRingSound);
}

function playShineSound() {
  playAudioAsset(audioAssets.innerLight, playGeneratedShineSound);
}

function playGeneratedSparkleRingSound() {
  playBellSequence([880, 1175, 1568, 2093, 2637], 0.85, 0.07);
}

function playGeneratedShineSound() {
  playBellSequence([660, 990, 1320, 1980], 2, 0.1);
}

function playAutoAttackSound(attacker) {
  if (attacker.side === "enemy") {
    playAudioAsset(audioAssets.enemyAttack, playMonsterAttackSound);
    return;
  }
  if (attacker.id === "leela") {
    playAudioAsset(audioAssets.starFairyAttack);
    return;
  }
  if (attacker.id === "frank") {
    playAudioAsset(audioAssets.paladinAttack);
  }
}

function playHooraySound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const syllables = [
    { start: 0, frequency: 560 },
    { start: 0.18, frequency: 760 }
  ];

  syllables.forEach((syllable) => {
    const start = now + syllable.start;
    const duration = 0.42;
    const oscillator = context.createOscillator();
    const formant = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(syllable.frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(syllable.frequency * 1.28, start + duration);
    formant.type = "bandpass";
    formant.frequency.setValueAtTime(1220, start);
    formant.Q.setValueAtTime(3.8, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.38, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(formant);
    formant.connect(gain);
    gain.connect(audioOutput(context));
    oscillator.start(start);
    oscillator.stop(start + duration);
  });
}

function playArrowBarrageSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;

  for (let i = 0; i < 6; i += 1) {
    const start = now + i * 0.055;
    const duration = 0.24;
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const noise = context.createBufferSource();
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);

    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
      const progress = sampleIndex / samples.length;
      samples[sampleIndex] = (Math.random() * 2 - 1) * (1 - progress) * Math.sin(progress * Math.PI);
    }

    filter.type = "highpass";
    filter.frequency.setValueAtTime(1100 + i * 90, start);
    filter.Q.setValueAtTime(2.5, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioOutput(context));
    noise.start(start);
    noise.stop(start + duration);
  }
}

function playMonsterAttackSound() {
  const context = getAudioContext();
  if (!context) return;
  playRumbleSound(context, {
    duration: 0.42,
    startFrequency: 104,
    endFrequency: 58,
    noiseFrequency: 520,
    volume: 0.28,
    wobble: 18,
    wobbleDepth: 24,
    noiseLevel: 0.62,
    waveType: "sawtooth"
  });
}

function playBellSequence(frequencies, duration, volume) {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  frequencies.forEach((frequency, index) => {
    const start = now + index * (duration / frequencies.length) * 0.55;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, start + duration * 0.45);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioOutput(context));
    oscillator.start(start);
    oscillator.stop(start + duration);
  });
}

function playRumbleSound(context, options) {
  const now = context.currentTime;
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const oscillator = context.createOscillator();
  const wobble = context.createOscillator();
  const wobbleGain = context.createGain();
  const noise = context.createBufferSource();
  const noiseGain = context.createGain();
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * options.duration), context.sampleRate);
  const samples = buffer.getChannelData(0);

  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(options.volume, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(options.noiseFrequency, now);
  filter.frequency.exponentialRampToValueAtTime(options.noiseFrequency * 0.45, now + options.duration);
  oscillator.type = options.waveType ?? "sawtooth";
  oscillator.frequency.setValueAtTime(options.startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + options.duration);
  wobble.frequency.setValueAtTime(options.wobble, now);
  wobbleGain.gain.setValueAtTime(options.wobbleDepth ?? 18, now);
  noise.buffer = buffer;
  noiseGain.gain.setValueAtTime(options.noiseLevel ?? 0.34, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

  wobble.connect(wobbleGain);
  wobbleGain.connect(oscillator.frequency);
  oscillator.connect(filter);
  noise.connect(noiseGain);
  noiseGain.connect(filter);
  filter.connect(gain);
  gain.connect(audioOutput(context));
  oscillator.start(now);
  wobble.start(now);
  noise.start(now);
  oscillator.stop(now + options.duration);
  wobble.stop(now + options.duration);
  noise.stop(now + options.duration);
}

function syncSelectionRings() {
  units.forEach((unit) => {
    unit.ring.visible = unit.id === selectedId || unit.target === selectedId;
  });

  markers = markers.filter((marker) => {
    marker.userData.life -= 0.016;
    if (marker.userData.kind === "heal-bubble") {
      marker.position.add(marker.userData.velocity);
      marker.scale.multiplyScalar(0.995);
    } else if (marker.userData.kind === "sparkle-dust") {
      marker.position.add(marker.userData.velocity);
      marker.rotation.x += marker.userData.spin?.x ?? 0.08;
      marker.rotation.y += marker.userData.spin?.y ?? 0.08;
      marker.rotation.z += marker.userData.spin?.z ?? 0.08;
      marker.scale.multiplyScalar(1.006);
    } else if (marker.userData.kind === "sausage-rain") {
      marker.position.add(marker.userData.velocity);
      marker.rotation.x += marker.userData.spin?.x ?? 0.08;
      marker.rotation.y += marker.userData.spin?.y ?? 0.08;
      marker.rotation.z += marker.userData.spin?.z ?? 0.08;
    } else if (marker.userData.kind === "sun-ring") {
      marker.scale.multiplyScalar(1.11);
    } else if (marker.userData.kind === "holy-light") {
      marker.scale.multiplyScalar(1.018);
    } else if (marker.userData.kind === "brown-cloud") {
      marker.position.add(marker.userData.velocity);
      marker.rotation.x += marker.userData.spin?.x ?? 0.02;
      marker.rotation.y += marker.userData.spin?.y ?? 0.02;
      marker.rotation.z += marker.userData.spin?.z ?? 0.02;
      marker.scale.multiplyScalar(1.018);
    } else if (marker.userData.kind === "star-arrow") {
      marker.userData.age += 0.016;
      const progress = THREE.MathUtils.clamp(marker.userData.age / marker.userData.duration, 0, 1);
      marker.position.copy(marker.userData.start).lerp(marker.userData.end, progress);
      marker.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.22);
    } else if (marker.userData.kind === "gold-roll" || marker.userData.kind === "heal-roll" || marker.userData.kind === "xp-roll") {
      marker.position.add(marker.userData.velocity);
      marker.scale.multiplyScalar(1.004);
    } else if (marker.userData.kind === "shield-berry") {
      marker.userData.age += 0.016;
      const owner = units.find((unit) => unit.id === marker.userData.ownerId);
      if (owner) {
        const angle = marker.userData.angle + marker.userData.age * marker.userData.spinSpeed;
        marker.position.set(
          owner.mesh.position.x + Math.cos(angle) * marker.userData.radius,
          marker.userData.height + Math.sin(marker.userData.age * 7 + marker.userData.angle) * 0.22,
          owner.mesh.position.z + Math.sin(angle) * marker.userData.radius
        );
      }
      marker.rotation.x += 0.035;
      marker.rotation.y += 0.12;
      marker.rotation.z += 0.025;
    } else if (marker.userData.kind === "gold-shield") {
      marker.userData.age += 0.016;
      const owner = units.find((unit) => unit.id === marker.userData.ownerId && unit.hp > 0);
      if (owner) {
        const forward = new THREE.Vector3(Math.sin(owner.mesh.rotation.y), 0, Math.cos(owner.mesh.rotation.y));
        marker.position.copy(owner.mesh.position).add(forward.multiplyScalar(0.85));
        marker.position.y = 1.65 + Math.sin(marker.userData.age * 5) * 0.08;
        marker.quaternion.copy(camera.quaternion);
      }
      marker.scale.setScalar(1 + Math.sin(marker.userData.age * 9) * 0.08);
    } else {
      marker.scale.multiplyScalar(1.035);
    }
    setMarkerOpacity(marker, Math.max(0, marker.userData.life));
    if (marker.userData.life > 0) return true;
    scene.remove(marker);
    return false;
  });
}

function setMarkerOpacity(marker, opacity) {
  const visibleOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
  if (marker.material) {
    marker.material.opacity = visibleOpacity;
    return;
  }
  marker.traverse?.((child) => {
    if (child.material) child.material.opacity = visibleOpacity;
  });
}

function syncUi() {
  goldEl.textContent = `Gold ${gold}`;
  waveEl.textContent = missionPending ? `Mission ${wave + 1} in ${Math.ceil(missionCountdown)}s` : `Mission ${wave} ${formatTime(missionTimer)}`;
  const countdown = state === "lost" ? restartCountdown : missionCountdown;
  const showCountdown = state === "lost" || missionPending;
  countdownOverlayEl.textContent = showCountdown ? Math.ceil(countdown) : "";
  countdownOverlayEl.classList.toggle("show", showCountdown);

  const hero = selectedHero();
  const selectedCamp = selectedUnit()?.side === "camp" ? selectedUnit() : null;
  selectedNameEl.innerHTML = selectedCamp
    ? campStatsHtml(selectedCamp)
    : hero ? `${heroDisplayName(hero)} | ${heroStatsHtml(hero)}` : "Choose a hero";
  selectedStatsEl.textContent = "";
  soundBtn.textContent = soundEnabled ? "Effects 🔊" : "Effects 🔇";
  soundBtn.setAttribute("aria-pressed", String(soundEnabled));
  musicBtn.innerHTML = `Music <span class="music-note ${musicEnabled ? "" : "muted"}" aria-hidden="true">♪</span>`;
  musicBtn.setAttribute("aria-pressed", String(musicEnabled));
  abilitiesPanelEl.innerHTML = "";
  if (hero) {
    hero.abilities.forEach((ability) => {
      const button = document.createElement("button");
      button.type = "button";
      const cooldown = hero.abilityCooldowns[ability] ?? 0;
      const ready = state === "playing" && !hero.asleep && cooldown <= 0;
      button.className = [
        "ability-btn",
        hero.activeAbility === ability ? "active" : "",
        ready ? "ready" : "",
        cooldown > 0 ? "cooling" : ""
      ].filter(Boolean).join(" ");
      button.innerHTML = `
        <span class="ability-label">${ability}</span>
        ${cooldown > 0 ? `<span class="ability-cooldown">${Math.ceil(cooldown)}</span>` : ""}
      `;
      button.disabled = state !== "playing" || hero.asleep || cooldown > 0;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        chooseAbility(hero.id, ability);
      });
      abilitiesPanelEl.appendChild(button);
    });
  }
  squadEl.innerHTML = "";
  heroDockEl.innerHTML = "";
  sortedHeroesForHud().forEach((unit) => {
    const sleeping = unit.asleep || unit.reviveTimer > 0 || unit.hp <= 0;
    const avatar = document.createElement("button");
    avatar.type = "button";
    avatar.className = `hero-avatar ${selectedId === unit.id ? "active" : ""} ${sleeping ? "sleeping" : ""}`;
    avatar.setAttribute("aria-label", `Select ${unit.name}`);
    avatar.innerHTML = `
      ${unit.portrait ? `<img src="${unit.portrait}" alt="${unit.name}">` : `<span>${unit.name[0]}</span>`}
      ${sleeping ? `<span class="sleep-mark">ZZZ</span>` : ""}
      <small>${unit.name}</small>
    `;
    avatar.addEventListener("click", () => {
      selectHero(unit.id);
      if (sleeping) payHeroUpkeep(unit.id);
    });
    heroDockEl.appendChild(avatar);

    const card = document.createElement("button");
    card.type = "button";
    card.className = `hero-card ${selectedId === unit.id ? "active" : ""} ${sleeping ? "sleeping" : ""}`;
    card.innerHTML = `
      ${unit.portrait ? `<img class="hero-card__portrait" src="${unit.portrait}" alt="${unit.name}">` : ""}
      <span class="hero-card__details">
        <strong>${heroDisplayName(unit)}</strong>
        <small>${sleeping ? "Sleeping | " : ""}${heroMiniStatsHtml(unit)}</small>
        <span class="bar"><span style="width:${Math.max(0, unit.hp / unit.maxHp) * 100}%"></span></span>
      </span>
    `;
    card.addEventListener("click", () => {
      selectHero(unit.id);
      if (sleeping) payHeroUpkeep(unit.id);
    });
    squadEl.appendChild(card);
  });
  updateNotificationPosition();
}

function updateNotificationPosition() {
  if (!hudEl) return;
  const hudRect = hudEl.getBoundingClientRect();
  const bottom = Math.max(96, window.innerHeight - hudRect.top + 8);
  document.documentElement.style.setProperty("--notification-bottom", `${Math.round(bottom)}px`);
}

function sortedHeroesForHud() {
  return heroes(true).slice().sort((a, b) => (heroStartSlots[a.id] ?? 99) - (heroStartSlots[b.id] ?? 99));
}

function heroDisplayName(hero) {
  return `${hero.name} - ${hero.role}`;
}

function heroStatsHtml(hero) {
  const hpRatio = hero.maxHp > 0 ? hero.hp / hero.maxHp : 0;
  return [
    `HP <span class="${hpClass(hpRatio)}">${Math.max(0, Math.ceil(hero.hp))}</span>`,
    `XP ${formatStat(hero.xp ?? 0)}`,
    `A ${formatStat(hero.atk)}${bonusMarkup(atkBonus(hero))}`,
    `D ${formatStat(hero.def)}${bonusMarkup(defBonus(hero))}`
  ].join(" | ");
}

function campStatsHtml(camp) {
  const hpRatio = camp.maxHp > 0 ? camp.hp / camp.maxHp : 0;
  return `Friendly Camp | HP <span class="${hpClass(hpRatio)}">${Math.max(0, Math.ceil(camp.hp))}</span>`;
}

function hpClass(ratio) {
  if (ratio < 0.25) return "hp-red";
  if (ratio < 0.5) return "hp-orange";
  if (ratio < 0.75) return "hp-yellow";
  return "hp-green";
}

function heroMiniStatsHtml(hero) {
  return [
    `LVL ${Math.floor(hero.level)}`,
    `ATK ${formatStat(hero.atk)}${bonusMarkup(atkBonus(hero))}`,
    `RNG ${formatStat(hero.range)}`,
    `DEF ${formatStat(hero.def)}${bonusMarkup(defBonus(hero))}`
  ].join(" | ");
}

function bonusMarkup(amount) {
  return amount > 0 ? ` <span class="stat-bonus">+${formatStat(amount)}</span>` : "";
}

function atkBonus(hero) {
  return hero.atkBuffTimer > 0 ? hero.atk * ((hero.atkBuffMultiplier ?? 1) - 1) : 0;
}

function defBonus(hero) {
  return hero.shieldTimer > 0 ? hero.shieldDefBonus ?? 0 : 0;
}

function formatStat(value) {
  return Number.isInteger(value) ? `${value}` : `${Math.round(value * 10) / 10}`;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function heroes(includeDowned = false) {
  return units.filter((unit) => unit.side === "hero" && (includeDowned || unit.hp > 0));
}

function enemies() {
  return units.filter((unit) => unit.side === "enemy" && unit.hp > 0);
}

function camps() {
  return units.filter((unit) => unit.side === "camp" && unit.hp > 0);
}

function defenders() {
  return units.filter((unit) => (
    (unit.side === "hero" && unit.hp > 0 && !unit.asleep)
    || (unit.side === "camp" && unit.hp > 0)
  ));
}

function selectedHero(includeDowned = false) {
  const roster = heroes(includeDowned);
  return roster.find((unit) => unit.id === selectedId) ?? roster[0];
}

function nearest(unit, candidates) {
  return candidates.sort((a, b) => distanceUnits(unit, a) - distanceUnits(unit, b))[0];
}

function distanceUnits(a, b) {
  return a.mesh.position.distanceTo(b.mesh.position);
}

function resize() {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
  viewportIsPortrait = viewportHeight > viewportWidth;
  renderer.setSize(viewportWidth, viewportHeight, false);
  document.body.classList.toggle("portrait", viewportIsPortrait);
  updateCameraFrame();
  updateNotificationPosition();
}

function updateCameraFrame() {
  camera.aspect = viewportWidth / viewportHeight;

  if (viewportIsPortrait) {
    camera.fov = 57 / cameraZoom;
    camera.position.set(cameraPan.x, 36, cameraPan.z + 32);
    camera.lookAt(cameraPan.x, 0, cameraPan.z + 2.6);
    camera.setViewOffset(viewportWidth, viewportHeight, 0, Math.round(viewportHeight * 0.08), viewportWidth, viewportHeight);
  } else {
    camera.clearViewOffset();
    camera.fov = (viewportWidth < 700 ? 52 : 50) / cameraZoom;
    camera.position.set(cameraPan.x, viewportWidth < 700 ? 33 : 29, cameraPan.z + (viewportWidth < 700 ? 33 : 30));
    camera.lookAt(cameraPan.x, 0, cameraPan.z + 1.2);
  }

  camera.updateProjectionMatrix();
}

function log(message) {
  logEl.textContent = message;
}

setInterval(() => {
  if (state === "playing") syncUi();
}, 250);
