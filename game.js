import * as THREE from "./vendor/three.module.js";

const canvas = document.querySelector("#battlefield");
const squadEl = document.querySelector("#squad");
const abilitiesPanelEl = document.querySelector("#abilitiesPanel");
const countdownOverlayEl = document.querySelector("#countdownOverlay");
const selectedNameEl = document.querySelector("#selectedName");
const selectedStatsEl = document.querySelector("#selectedStats");
const logEl = document.querySelector("#log");
const goldEl = document.querySelector("#gold");
const waveEl = document.querySelector("#wave");
const upgradeBtn = document.querySelector("#upgradeBtn");
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
const heroUpkeepCost = 30;
const heroSleepDuration = 10;
const sausageRainRadius = 2.66;
const abilityCooldownDurations = {
  "Fairy Dust": 6,
  "Solar Burst": 5,
  "Wing Dash": 8,
  "Sparkly Heal": 3,
  "Berry Shield": 16,
  "Flame Breath": 3,
  "Star Shot": 15,
  "Shadow Step": 5,
  "Sausage Rain": 5
};
const biomeThemes = [
  { name: "Forest", sky: 0x192018, fog: 0x192018, ground: 0x3a4634, patch: [0x425338, 0x2f3f35, 0x4a5137], water: 0x357b8f, mountain: 0x5f665f, tree: [0x26482f, 0x315d38, 0x516b39] },
  { name: "Desert", sky: 0x5a4730, fog: 0x5a4730, ground: 0x9c7a45, patch: [0xb28b51, 0x85683f, 0xc19a5f], water: 0x397f91, mountain: 0x8a6a48, tree: [0x6f7c3a, 0x8d8a3d, 0x566b35] },
  { name: "Moonscape", sky: 0x11131a, fog: 0x11131a, ground: 0x5f626b, patch: [0x6f737d, 0x4e525d, 0x777a82], water: 0x3d6077, mountain: 0x888c96, tree: [0x5f6670, 0x727a83, 0x4c535d] },
  { name: "Mars", sky: 0x351b16, fog: 0x351b16, ground: 0x8f3f28, patch: [0xa84f32, 0x71301f, 0xb8663f], water: 0x285b69, mountain: 0x9d5139, tree: [0x7b4f2b, 0x9c6435, 0x5f4328] }
];

let renderer;
let scene;
let camera;
let ground;
let selectedId = "aegis";
let gold = 60;
let wave = 1;
let spawnTimer = 0;
let missionTimer = missionDuration;
let missionCountdown = 0;
let missionPending = false;
let medkitSpawnTimer = 0;
let state = "playing";
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
let autoRestartTimeout = null;
let uiRefreshTimer = 0;

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
    role: "Fairy Guardian",
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
    abilities: ["Solar Burst", "Berry Shield", "Flame Breath"]
  },
  {
    id: "poliana",
    name: "Poliana",
    color: 0x8ed36e,
    accent: 0x9c59d1,
    hp: 118,
    atk: 16,
    def: 1,
    range: 3,
    speed: 6.35,
    role: "Star Ranger",
    archetype: "ranger",
    portrait: "assets/heroes/poliana.png",
    faceTexture: "assets/heroes/poliana-face.png",
    abilities: ["Star Shot", "Shadow Step", "Sausage Rain"]
  }
];

const enemyTemplates = [
  { name: "Grub Raider", color: 0xa54939, accent: 0x3a1e18, hp: 62, atk: 4, def: 0, range: 1.8, speed: 2.9, archetype: "raider" },
  { name: "Stone Brute", color: 0x8c6f55, accent: 0x4a3a2f, hp: 98, atk: 6, def: 1, range: 1.7, speed: 2.25, archetype: "brute" },
  { name: "Hex Imp", color: 0x9b62bd, accent: 0x67d7a2, hp: 48, atk: 5, def: 0, range: 4.6, speed: 3.25, archetype: "caster" }
];

init();
resetGame();
animate();

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x192018);
  scene.fog = new THREE.Fog(0x192018, 38, 72);

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

  createWorld();
  resize();

  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", removeHoverPopup);
  upgradeBtn.addEventListener("click", upgradeSelected);
  rallyBtn.addEventListener("click", rallyHeroes);
  restartBtn.addEventListener("click", resetGame);
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
  addRandomMountains();
  addRandomWater();
  addRandomSettlements();
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

  const eyeMat = new THREE.MeshBasicMaterial({ color: data.id === "leela" ? 0x73e05d : 0x6a3f7a });
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
    const club = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.7, 0.28), darkMat);
    club.position.set(0.85, 1.2, 0.08);
    club.rotation.z = -0.45;
    club.castShadow = true;
    group.add(club);
  } else if (data.archetype === "caster") {
    addWeapon(group, "staff", accentMat, 0.82);
  } else {
    addWeapon(group, "axe", darkMat, 0.9);
  }
}

function addWeapon(group, type, material, scale = 1) {
  if (type === "sword") {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 1.45 * scale, 0.12 * scale), material);
    blade.position.set(0.78, 1.38, 0.08);
    blade.rotation.z = -0.18;
    blade.castShadow = true;
    group.add(blade);
    return;
  }

  if (type === "staff") {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 1.8 * scale, 8), material);
    staff.position.set(0.78, 1.35, 0.06);
    staff.rotation.z = -0.2;
    staff.castShadow = true;
    group.add(staff);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 * scale), material);
    gem.position.set(0.95, 2.23, 0.06);
    gem.castShadow = true;
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
  group.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.32 * scale, 0.12 * scale), material);
  head.position.set(0.95, 1.62, 0.08);
  head.rotation.z = -0.55;
  head.castShadow = true;
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
  wave = 1;
  spawnTimer = 3;
  missionTimer = missionDuration;
  missionCountdown = 0;
  missionPending = false;
  medkitSpawnTimer = 0;
  uiRefreshTimer = 0;
  countdownOverlayEl.textContent = "";
  countdownOverlayEl.classList.remove("show");
  state = "playing";

  heroTemplates.forEach((template, index) => {
    const x = (index - 1) * 3.5;
    units.push(createUnit({ ...template, side: "hero", x, z: 6.2, level: 1 }));
  });

  spawnWave();
  log("Command Leela, Feenix, and Poliana in real time.");
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
  } else {
    buildEnemyModel(group, data, bodyMat, accentMat, darkMat);
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.045, 8, 36),
    new THREE.MeshBasicMaterial({ color: data.side === "hero" ? 0x9be7f5 : 0xff8a73 })
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

  return {
    id: data.id,
    name: data.name,
    role: data.role ?? "Invader",
    portrait: data.portrait,
    abilities: data.abilities ?? [],
    activeAbility: data.abilities?.[0] ?? null,
    abilityCooldowns: {},
    speedBuffTimer: 0,
    speedBuffMultiplier: 1,
    asleep: false,
    sleepReason: null,
    sleepBob: Math.random() * Math.PI * 2,
    upkeepPaidMission: data.side === "hero" ? 1 : 0,
    sleepUi: null,
    shieldDefBonus: 0,
    shieldTimer: 0,
    burnTimer: 0,
    burnTickTimer: 0,
    sausageRainTimer: 0,
    sausageRainTickTimer: 0,
    sausageRainVisualTimer: 0,
    sparklyHealTimer: 0,
    sparklyHealTickTimer: 0,
    sparklyHealVisualTimer: 0,
    archetype: data.archetype,
    side: data.side,
    level: data.level ?? 1,
    hp: data.hp,
    maxHp: data.hp,
    atk: data.atk,
    def: data.def ?? 0,
    range: data.range,
    speed: data.speed,
    cooldown: 0,
    reviveTimer: 0,
    attackDelay: data.side === "hero" ? 0.85 : 1.15,
    target: null,
    targetPoint: new THREE.Vector3(data.x, 0, data.z),
    mesh: group,
    ring,
    healthBar
  };
}

function createHealthBar(unitId, side) {
  const width = side === "hero" ? 2.85 : 1.75;
  const height = side === "hero" ? 0.42 : 0.26;
  const group = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = side === "hero" ? 320 : 220;
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
    group.position.y += unit.side === "hero" ? 4.55 : 2.65;
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
  applyMissionUpkeep();
  spawnEnemyGroup(3 + Math.min(5, wave), true);
  spawnTimer = 9;
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
  if (!automatic) log(`${hero.name} woke up for ${heroUpkeepCost} gold.`);
}

function payHeroUpkeep(heroId) {
  const hero = heroes(true).find((candidate) => candidate.id === heroId);
  if (!hero || !hero.asleep) return;
  if (gold < heroUpkeepCost) {
    log(`${hero.name} needs ${heroUpkeepCost} gold to wake up.`);
    return;
  }
  gold -= heroUpkeepCost;
  goldRoll(hero.mesh.position, `-${heroUpkeepCost}G`);
  if (hero.hp <= 0) {
    hero.hp = Math.ceil(hero.maxHp * 0.65);
    hero.reviveTimer = 0;
    if (hero.healthBar) hero.healthBar.group.visible = true;
  }
  wakeHero(hero);
  syncUi();
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
      hp: Math.ceil((template.hp + wave * 9 + (isBrute ? wave * 5 : 0)) * hpScale),
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
  const positions = randomFieldPositions(3, 4.5);

  positions.forEach((position, index) => {
    const kit = createMedkit(`medkit-${wave}-${Date.now()}-${index}`, position);
    medkits.push(kit);
    scene.add(kit.mesh);
  });
  medkitSpawnTimer = 15;
  log("First aid kits appeared.");
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
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e7, roughness: 0.48, metalness: 0.04 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe8483f, roughness: 0.42, metalness: 0.06 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x58625a, roughness: 0.56, metalness: 0.12 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.42, 0.62), boxMat);
  box.position.y = 0.38;
  box.castShadow = true;
  group.add(box);

  const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.44), redMat);
  crossVertical.position.set(0, 0.61, 0.01);
  crossVertical.castShadow = true;
  group.add(crossVertical);

  const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.14), redMat);
  crossHorizontal.position.set(0, 0.62, 0.01);
  crossHorizontal.castShadow = true;
  group.add(crossHorizontal);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 20, Math.PI), handleMat);
  handle.position.set(0, 0.65, -0.22);
  handle.rotation.set(Math.PI / 2, 0, Math.PI);
  group.add(handle);

  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.62, 0.82),
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
  return { id, mesh: group, highlight, heal: 50, bob: Math.random() * Math.PI * 2, ttl: 15 };
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

    const hero = heroes().find((candidate) => candidate.mesh.position.distanceTo(kit.mesh.position) < 1.25 && candidate.hp < candidate.maxHp);
    if (!hero) return true;

    hero.hp = Math.min(hero.maxHp, hero.hp + kit.heal);
    flash(hero.mesh.position, 0x63d463);
    healingBubbles(hero.mesh.position);
    log(`${hero.name} used a first aid kit.`);
    scene.remove(kit.mesh);
    return false;
  });
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  if (state === "playing") update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
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
      spawnEnemyGroup(2 + Math.min(4, Math.floor(wave / 2)));
      spawnTimer = Math.max(5.5, 11 - wave * 0.35);
    }
  }

  updateAbilityCooldowns(dt);
  updateHeroBuffs(dt);
  updateStatusEffects(dt);
  updateRevives(dt);
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
    log("All heroes are asleep. Restarting...");
    autoRestartTimeout = window.setTimeout(resetGame, 2200);
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
      return;
    }
    hero.speedBuffTimer = Math.max(0, hero.speedBuffTimer - dt);
    if (hero.speedBuffTimer === 0) hero.speedBuffMultiplier = 1;
  });
}

function updateStatusEffects(dt) {
  units.forEach((unit) => {
    if (unit.shieldTimer > 0) {
      unit.shieldTimer = Math.max(0, unit.shieldTimer - dt);
      if (unit.shieldTimer === 0) unit.shieldDefBonus = 0;
    }

    if (unit.burnTimer > 0) {
      unit.burnTimer = Math.max(0, unit.burnTimer - dt);
      unit.burnTickTimer -= dt;
      if (unit.burnTickTimer <= 0) {
        unit.hp -= 10;
        unit.burnTickTimer = 1;
        flash(unit.mesh.position, 0xff4b24);
      }
    }

    if (unit.sausageRainTimer > 0) {
      unit.sausageRainTimer = Math.max(0, unit.sausageRainTimer - dt);
      unit.sausageRainTickTimer -= dt;
      unit.sausageRainVisualTimer -= dt;
      if (unit.sausageRainTickTimer <= 0) {
        unit.hp -= 25;
        unit.sausageRainTickTimer = 1;
        flash(unit.mesh.position, 0xe07a32);
      }
      if (unit.sausageRainVisualTimer <= 0) {
        sausageRain(unit.mesh.position);
        unit.sausageRainVisualTimer = 0.34;
      }
    }

    if (unit.sparklyHealTimer > 0 && unit.hp > 0) {
      unit.sparklyHealTimer = Math.max(0, unit.sparklyHealTimer - dt);
      unit.sparklyHealTickTimer -= dt;
      unit.sparklyHealVisualTimer -= dt;
      if (unit.sparklyHealTickTimer <= 0) {
        unit.hp = Math.min(unit.maxHp, unit.hp + 10);
        unit.sparklyHealTickTimer = 1;
        healingBubbles(unit.mesh.position);
      }
      if (unit.sparklyHealVisualTimer <= 0) {
        sparklyHealBurst(unit.mesh.position);
        unit.sparklyHealVisualTimer = 0.45;
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

function updateUnit(unit, dt) {
  if (unit.hp <= 0 || unit.asleep) return;
  unit.cooldown = Math.max(0, unit.cooldown - dt);
  const foes = unit.side === "hero" ? enemies() : heroes();
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
  } else if (unit.side === "hero" && directTarget && !targetInRange) {
    moveTo(unit, target.mesh.position, dt);
  } else {
    moveTo(unit, unit.targetPoint, dt);
  }
}

function damage(attacker, defender) {
  const rawAttack = attacker.side === "enemy" ? attacker.atk * 0.125 : attacker.atk;
  const amount = Math.max(1, Math.ceil(rawAttack - defender.def - (defender.shieldDefBonus ?? 0)));
  defender.hp -= amount;
  flash(defender.mesh.position, attacker.side === "hero" ? 0x9be7f5 : 0xe76d55);
  if (defender.hp <= 0 && attacker.side === "hero") {
    gold += 12;
    attacker.level += 0.1;
    log(`${attacker.name} defeated ${defender.name}.`);
  }
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
  pos.copy(next);
  face(unit, point);
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
  const label = createNameTexture(unit.name);
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
    hero.sleepUi.payButton.material.opacity = gold >= heroUpkeepCost ? 1 : 0.58;
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
    hoverPopup = createNamePopup({ id: hitMedkit.id, name: "Medikit", side: "medkit", hp: 1, mesh: hitMedkit.mesh });
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
  if (state !== "playing") return;
  const payHeroId = payButtonFromPointerEvent(event);
  if (payHeroId) {
    payHeroUpkeep(payHeroId);
    return;
  }

  const hitUnit = unitFromPointerEvent(event);
  if (hitUnit) {
    if (hitUnit.side === "hero") {
      if (hitUnit.asleep) {
        selectHero(hitUnit.id);
        log(`Tap Wake Up to revive ${hitUnit.name} for ${heroUpkeepCost} gold.`);
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
  if (hitGround) commandMove(hitGround.point);
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
  if (ability === "Star Shot") {
    if (castStarShot(hero)) startAbilityCooldown(hero, ability);
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
  if (ability === "Flame Breath") {
    if (castFlameBreath(hero)) startAbilityCooldown(hero, ability);
    syncUi();
    return;
  }
  if (ability === "Sausage Rain") {
    if (castSausageRain(hero)) startAbilityCooldown(hero, ability);
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
    enemy.hp -= 50;
    flash(enemy.mesh.position, 0xf1d34f);
  });
  fairyDust(hero);
  log(`${hero.name} cast Fairy Dust.`);
  return true;
}

function castSolarBurst(hero) {
  const primaryTarget = nearest(hero, enemies());
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
    enemy.hp -= 75;
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
  flash(hero.mesh.position, 0x9be7f5);
  log(`${hero.name} used Wing Dash.`);
}

function castSparklyHeal(hero) {
  let affected = 0;
  heroes().forEach((ally) => {
    if (ally.mesh.position.distanceTo(hero.mesh.position) > 4) return;
    ally.hp = Math.min(ally.maxHp, ally.hp + 50);
    ally.sparklyHealTimer = 5;
    ally.sparklyHealTickTimer = 1;
    ally.sparklyHealVisualTimer = 0;
    healingBubbles(ally.mesh.position);
    sparklyHealBurst(ally.mesh.position);
    affected += 1;
  });
  flash(hero.mesh.position, 0x63d463);
  log(affected ? `${hero.name} cast Sparkly Heal.` : "No allies in Sparkly Heal range.");
  return affected > 0;
}

function castStarShot(hero) {
  const target = enemies()
    .filter((enemy) => enemy.mesh.position.distanceTo(hero.mesh.position) <= 5)
    .sort((a, b) => a.mesh.position.distanceTo(hero.mesh.position) - b.mesh.position.distanceTo(hero.mesh.position))[0];

  if (!target) {
    log("No enemy in Star Shot range.");
    return false;
  }

  target.hp -= 100;
  starShotArrow(hero.mesh.position, target.mesh.position);
  log(`${hero.name} fired Star Shot.`);
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

function castFlameBreath(hero) {
  const primaryTarget = nearest(hero, enemies());
  if (!primaryTarget) {
    log("No enemies for Flame Breath.");
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
    enemy.hp -= 25;
    enemy.burnTimer = 3;
    enemy.burnTickTimer = 1;
    hits += 1;
    flash(enemy.mesh.position, 0xff4b24);
  });
  flameBreath(hero);
  log(hits ? `${hero.name} used Flame Breath.` : "Flame Breath missed.");
  return hits > 0;
}

function castSausageRain(hero) {
  const foes = enemies();
  const target = foes.find((enemy) => enemy.id === hero.target)
    ?? foes.sort((a, b) => a.mesh.position.distanceTo(hero.mesh.position) - b.mesh.position.distanceTo(hero.mesh.position))[0];

  if (!target) {
    log("No enemies for Sausage Rain.");
    return false;
  }

  const affected = foes.filter((enemy) => enemy.mesh.position.distanceTo(target.mesh.position) <= sausageRainRadius);
  affected.forEach((enemy) => {
    enemy.sausageRainTimer = 5;
    enemy.sausageRainTickTimer = 1;
    enemy.sausageRainVisualTimer = 0;
  });
  sausageRain(target.mesh.position);
  log(`${hero.name} called Sausage Rain on ${affected.length} enemy${affected.length === 1 ? "" : "ies"}.`);
  return affected.length > 0;
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
  arrow.userData.impacted = false;
  scene.add(arrow);
  markers.push(arrow);
}

function strawberryShield(hero) {
  const direction = new THREE.Vector3(Math.sin(hero.mesh.rotation.y), 0, Math.cos(hero.mesh.rotation.y)).normalize();
  const right = new THREE.Vector3(direction.z, 0, -direction.x);
  const center = hero.mesh.position.clone().add(direction.clone().multiplyScalar(1.45));
  const berryMat = new THREE.MeshBasicMaterial({ color: 0xe8483f, transparent: true, opacity: 0.9 });
  const seedMat = new THREE.MeshBasicMaterial({ color: 0xffd45a });

  for (let i = 0; i < 10; i += 1) {
    const berry = new THREE.Group();
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), berryMat.clone());
    fruit.scale.set(1, 1.18, 0.9);
    berry.add(fruit);
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), seedMat);
    seed.position.set(0.04, 0.04, 0.1);
    berry.add(seed);
    const row = Math.floor(i / 5);
    const col = i % 5;
    berry.position.copy(center)
      .add(right.clone().multiplyScalar((col - 2) * 0.34))
      .add(new THREE.Vector3(0, 1.2 + row * 0.32, 0));
    berry.userData.life = 5;
    berry.userData.kind = "shield-berry";
    scene.add(berry);
    markers.push(berry);
  }
}

function flameBreath(hero) {
  const direction = new THREE.Vector3(Math.sin(hero.mesh.rotation.y), 0, Math.cos(hero.mesh.rotation.y)).normalize();
  const origin = hero.mesh.position.clone().add(direction.clone().multiplyScalar(0.9));
  const colors = [0xff1f12, 0xff5120, 0xff9f1f, 0xffd45a];
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
  hero.targetPoint.copy(enemy.mesh.position);
  showNamePopup(enemy);
  log(`${hero.name} targeting ${enemy.name}.`);
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
  const destination = new THREE.Vector3(0, 0, 5.2);
  heroes().forEach((hero, index) => {
    hero.target = null;
    hero.targetPoint.set(destination.x + (index - 1) * 2.6, 0, destination.z);
  });
  flash(destination, 0xe0be57);
  log("Squad rallying.");
}

function upgradeSelected() {
  const hero = selectedHero();
  if (!hero) return;
  const cost = upgradeCost(hero);
  if (gold < cost) {
    log(`Upgrade needs ${cost} gold.`);
    return;
  }
  gold -= cost;
  hero.level = Math.floor(hero.level) + 1;
  hero.maxHp += 22;
  hero.hp = hero.maxHp;
  hero.atk += 4;
  hero.def += 1;
  hero.range += 0.12;
  hero.speed += 0.12;
  log(`${hero.name} upgraded to level ${hero.level}.`);
  syncUi();
}

function upgradeCost(hero) {
  return 35 + (Math.floor(hero.level) - 1) * 20;
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
    } else if (marker.userData.kind === "star-arrow") {
      marker.userData.age += 0.016;
      const progress = THREE.MathUtils.clamp(marker.userData.age / marker.userData.duration, 0, 1);
      marker.position.copy(marker.userData.start).lerp(marker.userData.end, progress);
      marker.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.22);
      if (progress >= 1 && !marker.userData.impacted) {
        marker.userData.impacted = true;
        flash(marker.userData.end, 0xf1d34f);
      }
    } else if (marker.userData.kind === "gold-roll") {
      marker.position.add(marker.userData.velocity);
      marker.scale.multiplyScalar(1.004);
    } else if (marker.userData.kind === "shield-berry") {
      marker.rotation.y += 0.05;
      marker.position.y += Math.sin(marker.userData.life * 8) * 0.002;
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
  countdownOverlayEl.textContent = missionPending ? Math.ceil(missionCountdown) : "";
  countdownOverlayEl.classList.toggle("show", missionPending);

  const hero = selectedHero();
  selectedNameEl.textContent = hero ? `${hero.name} ${hero.role}` : "Choose a hero";
  selectedStatsEl.textContent = hero
    ? `HP ${Math.max(0, Math.ceil(hero.hp))}/${hero.maxHp} | ATK ${hero.atk} | RNG ${hero.range} | DEF ${hero.def} | LVL ${Math.floor(hero.level)}`
    : "Tap a hero, then tap the field to move.";
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
        <span>${ability}</span>
        ${cooldown > 0 ? `<span class="ability-cooldown">${Math.ceil(cooldown)}</span>` : ""}
      `;
      button.disabled = state !== "playing" || hero.asleep || cooldown > 0;
      button.addEventListener("click", () => chooseAbility(hero.id, ability));
      abilitiesPanelEl.appendChild(button);
    });
  }
  const cost = hero ? upgradeCost(hero) : 35;
  upgradeBtn.textContent = `Upgrade ${cost}g`;
  upgradeBtn.disabled = !hero || gold < cost || state !== "playing";

  squadEl.innerHTML = "";
  heroes().forEach((unit) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `hero-card ${selectedId === unit.id ? "active" : ""}`;
    card.innerHTML = `
      ${unit.portrait ? `<img class="hero-card__portrait" src="${unit.portrait}" alt="${unit.name}">` : ""}
      <span class="hero-card__details">
        <strong>${unit.name}</strong>
        <small>${unit.asleep ? "Sleeping | " : ""}${unit.role} | LVL ${Math.floor(unit.level)} | ATK ${unit.atk} | RNG ${unit.range} | DEF ${unit.def}</small>
        <span class="bar"><span style="width:${Math.max(0, unit.hp / unit.maxHp) * 100}%"></span></span>
      </span>
    `;
    card.addEventListener("click", () => selectHero(unit.id));
    squadEl.appendChild(card);
  });
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
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  document.body.classList.toggle("portrait", isPortrait);

  if (isPortrait) {
    camera.fov = 52;
    camera.position.set(0, 34, 30);
    camera.lookAt(0, 0, 1.5);
    camera.setViewOffset(width, height, 0, Math.round(height * 0.16), width, height);
  } else {
    camera.clearViewOffset();
    camera.fov = 48;
    camera.position.set(0, width < 700 ? 31 : 27, width < 700 ? 32 : 28);
    camera.lookAt(0, 0, 0);
  }

  camera.updateProjectionMatrix();
}

function log(message) {
  logEl.textContent = message;
}

setInterval(() => {
  if (state === "playing") syncUi();
}, 250);
