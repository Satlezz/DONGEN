// ==================================================================
// Castle Rock: Cockpit Simulator (2060)
// Swiveling Cannons, 3D Holo-Map, Stargate Checkpoint & Threat Trackers
// ==================================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// DOM References
const cockpitHud = document.getElementById("cockpit-hud");
const menuOverlay = document.getElementById("menu-overlay");
const mainMenu = document.getElementById("main-menu");
const campaignMenu = document.getElementById("campaign-menu");
const profileMenu = document.getElementById("profile-menu");
const storyModal = document.getElementById("story-modal");
const saveloadMenu = document.getElementById("saveload-menu");
const optionsMenu = document.getElementById("options-menu");
const pauseMenu = document.getElementById("pause-menu");
const quitScreen = document.getElementById("quit-screen");
const intermissionScreen = document.getElementById("intermission-screen");
const navPointers = document.getElementById("hud-nav-pointers");

const menuPilotDisplay = document.getElementById("menu-pilot-display");
const gateTracker = document.getElementById("gate-tracker");
const warnLock = document.getElementById("warn-lock");
const warnHull = document.getElementById("warn-hull");

const intermissionSectorTitle = document.getElementById("intermission-sector-title");
const debriefScore = document.getElementById("debrief-score");
const debriefHull = document.getElementById("debrief-hull");
const debriefNextLevel = document.getElementById("debrief-next-level");
const debriefTransmission = document.getElementById("debrief-transmission");

const inputPilotName = document.getElementById("input-pilot-name");
const inputCallsign = document.getElementById("input-callsign");
const slotsContainer = document.getElementById("slots-container");
const rebindList = document.getElementById("rebind-list");

// Resolution Scaler
let renderScale = 1.0;
function resize() {
  canvas.width = window.innerWidth * renderScale;
  canvas.height = window.innerHeight * renderScale;
  ctx.scale(renderScale, renderScale);
}
window.addEventListener("resize", resize);
resize();

// ------------------------------------------------------------------
// Atmospheric Space Synthesizer (Web Audio API)
// ------------------------------------------------------------------
class CinematicSoundEngine {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.soundEnabled = true;
    this.timerId = null;
    this.isPlaying = false;
    this.chordStep = 0;

    this.chords = [
      [146.83, 220.0, 349.23, 440.0],  // Dm
      [116.54, 233.08, 349.23, 466.16], // Bb
      [98.00, 196.0, 293.66, 392.0],   // Gm
      [110.0, 220.0, 329.63, 440.0]    // Am
    ];
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  startMusic() {
    if (!this.musicEnabled || this.isPlaying) return;
    this.init();
    this.isPlaying = true;
    this.triggerChord();
    this.timerId = setInterval(() => this.triggerChord(), 5200);
  }

  stopMusic() {
    this.isPlaying = false;
    if (this.timerId) clearInterval(this.timerId);
  }

  triggerChord() {
    if (!this.musicEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const chord = this.chords[this.chordStep % this.chords.length];

    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx === 0 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, now);
      if (idx > 0) osc.detune.setValueAtTime((Math.random() - 0.5) * 12, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(280 + idx * 80, now);
      filter.frequency.exponentialRampToValueAtTime(720, now + 2.5);
      filter.frequency.exponentialRampToValueAtTime(240, now + 5.0);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.08 : 0.04, now + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 5.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 5.2);
    });

    this.chordStep++;
  }

  playBlaster() {
    if (!this.soundEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.16);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playExplosion(intensity = 1) {
    if (!this.soundEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 0.45 * intensity;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500 * intensity, now);
    filter.frequency.linearRampToValueAtTime(30, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playFanfare() {
    if (!this.soundEnabled || !this.ctx) return;
    const notes = [293.66, 369.99, 440.0, 587.33];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = this.ctx.currentTime + i * 0.12;
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, time);
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.4);
    });
  }
}
const audio = new CinematicSoundEngine();

// ------------------------------------------------------------------
// Automated Voiceover System (SpeechSynthesis API)
// ------------------------------------------------------------------
function speakPrologueAutomatically() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const text = document.getElementById("story-text-container").innerText;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 0.98;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.includes("en") && (v.name.includes("Natural") || v.name.includes("Google")));
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

function stopVoiceover() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ------------------------------------------------------------------
// Pilot Profile & LocalStorage
// ------------------------------------------------------------------
let pilotProfile = {
  name: "Prince Julian",
  callsign: "House of Rock"
};

function loadPilotProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem("castle_rock_profile"));
    if (saved) pilotProfile = saved;
  } catch (e) {}
  updateProfileDisplay();
}

function savePilotProfile(name, callsign) {
  pilotProfile.name = name || "Prince Julian";
  pilotProfile.callsign = callsign || "House of Rock";
  localStorage.setItem("castle_rock_profile", JSON.stringify(pilotProfile));
  updateProfileDisplay();
}

function updateProfileDisplay() {
  menuPilotDisplay.textContent = pilotProfile.name.toUpperCase();
  inputPilotName.value = pilotProfile.name;
  inputCallsign.value = pilotProfile.callsign;
}

// ------------------------------------------------------------------
// 15 Progressive Sectors with Hyperspace Gate Distance Targets
// ------------------------------------------------------------------
const LEVELS = [
  { level: 1,  name: "Deep Lunar Outskirts", gateDistance: 3200, speed: 1.0, color: "#8a817c", capitalShip: false },
  { level: 2,  name: "The Kuiper Gateway",    gateDistance: 4500, speed: 1.15, color: "#718096", capitalShip: false },
  { level: 3,  name: "Corsair Patrol Sector", gateDistance: 5600, speed: 1.3, color: "#a0aec0", capitalShip: true },
  { level: 4,  name: "The Crimson Belt",      gateDistance: 6800, speed: 1.45, color: "#9b2c2c", capitalShip: true },
  { level: 5,  name: "Debris of Phobos",      gateDistance: 7900, speed: 1.6, color: "#c53030", capitalShip: true },
  { level: 6,  name: "Plasma Storm Sector",   gateDistance: 9200, speed: 1.75, color: "#805ad5", capitalShip: true },
  { level: 7,  name: "Cygnus Corsair Bastion",gateDistance: 10500, speed: 1.9, color: "#6b46c1", capitalShip: true },
  { level: 8,  name: "Jupiter's Magnetosphere",gateDistance: 12000, speed: 2.05, color: "#dd6b20", capitalShip: true },
  { level: 9,  name: "Europa Orbital Trench", gateDistance: 13600, speed: 2.2, color: "#319795", capitalShip: true },
  { level: 10, name: "The Ion Chasm",         gateDistance: 15400, speed: 2.35, color: "#00b5d8", capitalShip: true },
  { level: 11, name: "Alien Vanguard Line",   gateDistance: 17200, speed: 2.5, color: "#d53f8c", capitalShip: true },
  { level: 12, name: "Martian Quarantine Rim",gateDistance: 19200, speed: 2.65, color: "#e53e3e", capitalShip: true },
  { level: 13, name: "The Solar Flotilla",    gateDistance: 21500, speed: 2.8, color: "#d69e2e", capitalShip: true },
  { level: 14, name: "Earth Stratosphere Gate",gateDistance: 24000, speed: 2.95, color: "#38a169", capitalShip: true },
  { level: 15, name: "Homecoming: Earth Orbit",gateDistance: 27000, speed: 3.1, color: "#2b6cb0", capitalShip: true }
];

// Controls
const keyBindings = {
  pitchUp: "KeyS",
  pitchDown: "KeyW",
  yawLeft: "KeyA",
  yawRight: "KeyD",
  fire: "Space"
};
const activeKeys = { pitchUp: false, pitchDown: false, yawLeft: false, yawRight: false, fire: false };
let bindingAction = null;

window.addEventListener("keydown", (e) => {
  audio.init();

  if (bindingAction) {
    keyBindings[bindingAction] = e.code;
    bindingAction = null;
    renderKeybindings();
    e.preventDefault();
    return;
  }

  if (e.code === "Escape") {
    togglePause();
    return;
  }

  if (e.code === keyBindings.pitchUp) activeKeys.pitchUp = true;
  if (e.code === keyBindings.pitchDown) activeKeys.pitchDown = true;
  if (e.code === keyBindings.yawLeft) activeKeys.yawLeft = true;
  if (e.code === keyBindings.yawRight) activeKeys.yawRight = true;
  if (e.code === keyBindings.fire) activeKeys.fire = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === keyBindings.pitchUp) activeKeys.pitchUp = false;
  if (e.code === keyBindings.pitchDown) activeKeys.pitchDown = false;
  if (e.code === keyBindings.yawLeft) activeKeys.yawLeft = false;
  if (e.code === keyBindings.yawRight) activeKeys.yawRight = false;
  if (e.code === keyBindings.fire) activeKeys.fire = false;
});

// ------------------------------------------------------------------
// 3D 6-DOF Flight Kinematics & Checkpoint Gate Entity
// ------------------------------------------------------------------
let gameState = "MENU";
let currentLevelIdx = 0;
let score = 0;
let hp = 100;
let screenShake = 0;

// Flight Attitude & Swiveling Cannons State
const flight = {
  pitch: 0,
  yaw: 0,
  roll: 0,
  pitchRate: 0,
  yawRate: 0,
  rollRate: 0,
  speedZ: 8.5,
  yokeAngle: 0,
  yokeDepth: 0,
  // Articulated Gun Barrels
  gunPitch: 0,
  gunYaw: 0,
  leftRecoil: 0,
  rightRecoil: 0
};

// Checkpoint Stargate Object
let checkpointGate = {
  x: 0,
  y: 0,
  z: 3200,
  radius: 180,
  rotation: 0
};

// 3D Entities
const stars3D = [];
const asteroids3D = [];
const enemyShips3D = [];
const blasterBeams3D = [];
const enemyLasers3D = [];
const explosionDebris = [];

// Populate 3D Stars
for (let i = 0; i < 360; i++) {
  stars3D.push({
    x: (Math.random() - 0.5) * 4400,
    y: (Math.random() - 0.5) * 3200,
    z: Math.random() * 2600 + 100,
    size: Math.random() * 2.2 + 0.8,
    color: Math.random() > 0.8 ? "#90cdf4" : (Math.random() > 0.9 ? "#fed7aa" : "#ffffff")
  });
}

function spawnAsteroid3D() {
  const cfg = LEVELS[currentLevelIdx];
  asteroids3D.push({
    x: (Math.random() - 0.5) * 2000,
    y: (Math.random() - 0.5) * 1400,
    z: 2200,
    radius: Math.random() * 45 + 30,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    hp: 4,
    color: cfg.color
  });
}

function spawnEnemyShip3D(isCapital = false) {
  enemyShips3D.push({
    x: (Math.random() - 0.5) * 1600,
    y: (Math.random() - 0.5) * 1000,
    z: 2400,
    isCapital: isCapital,
    width: isCapital ? 140 : 48,
    height: isCapital ? 70 : 24,
    vx: (Math.random() - 0.5) * (isCapital ? 3 : 7),
    vy: (Math.random() - 0.5) * (isCapital ? 2 : 5),
    shootCooldown: isCapital ? 70 : 90,
    hp: isCapital ? 16 : 4,
    maxHp: isCapital ? 16 : 4
  });
}

// Reset Checkpoint Gate for New Sector
function initSectorGate() {
  const cfg = LEVELS[currentLevelIdx];
  checkpointGate.x = (Math.random() - 0.5) * 600;
  checkpointGate.y = (Math.random() - 0.5) * 400;
  checkpointGate.z = cfg.gateDistance;
}

// ------------------------------------------------------------------
// 3D Vector Math & Coordinate Transformation
// ------------------------------------------------------------------
function transform3D(x, y, z) {
  const cy = Math.cos(flight.yaw), sy = Math.sin(flight.yaw);
  let x1 = x * cy - z * sy;
  let z1 = x * sy + z * cy;
  let y1 = y;

  const cp = Math.cos(flight.pitch), sp = Math.sin(flight.pitch);
  let y2 = y1 * cp - z1 * sp;
  let z2 = y1 * sp + z1 * cp;
  let x2 = x1;

  const cr = Math.cos(flight.roll), sr = Math.sin(flight.roll);
  let rx = x2 * cr - y2 * sr;
  let ry = x2 * sr + y2 * cr;
  let rz = z2;

  const fov = 420;
  const scale = fov / Math.max(10, rz);
  const cx = window.innerWidth / 2;
  const cyCenter = window.innerHeight / 2 - 25;

  return {
    px: cx + rx * scale,
    py: cyCenter + ry * scale,
    scale: scale,
    rz: rz
  };
}

// ------------------------------------------------------------------
// Flight Physics & Simulation Loop
// ------------------------------------------------------------------
let spawnTimer = 0;
let enemyTimer = 0;
let shootCooldown = 0;
let alternateCannon = false;

function update() {
  if (gameState !== "PLAYING") return;

  const currentLvl = LEVELS[currentLevelIdx];

  // Flight Steering Input (Pitch & Yaw)
  if (activeKeys.pitchDown) {
    flight.pitchRate = Math.min(flight.pitchRate + 0.003, 0.035);
    flight.yokeDepth = Math.min(flight.yokeDepth + 3, 25);
    flight.gunPitch = Math.min(flight.gunPitch + 0.03, 0.3);
  } else if (activeKeys.pitchUp) {
    flight.pitchRate = Math.max(flight.pitchRate - 0.003, -0.035);
    flight.yokeDepth = Math.max(flight.yokeDepth - 3, -25);
    flight.gunPitch = Math.max(flight.gunPitch - 0.03, -0.3);
  } else {
    flight.pitchRate *= 0.88;
    flight.yokeDepth *= 0.88;
    flight.gunPitch *= 0.85;
  }

  if (activeKeys.yawLeft) {
    flight.yawRate = Math.max(flight.yawRate - 0.003, -0.035);
    flight.rollRate = Math.max(flight.rollRate - 0.004, -0.045);
    flight.yokeAngle = Math.max(flight.yokeAngle - 0.06, -0.65);
    flight.gunYaw = Math.max(flight.gunYaw - 0.04, -0.35);
  } else if (activeKeys.yawRight) {
    flight.yawRate = Math.min(flight.yawRate + 0.003, 0.035);
    flight.rollRate = Math.min(flight.rollRate + 0.004, 0.045);
    flight.yokeAngle = Math.min(flight.yokeAngle + 0.06, 0.65);
    flight.gunYaw = Math.min(flight.gunYaw + 0.04, 0.35);
  } else {
    flight.yawRate *= 0.88;
    flight.rollRate *= 0.88;
    flight.yokeAngle *= 0.86;
    flight.gunYaw *= 0.85;
  }

  flight.pitch += flight.pitchRate;
  flight.yaw += flight.yawRate;
  flight.roll += flight.rollRate;
  flight.roll *= 0.96;

  // Checkpoint Gate Movement
  checkpointGate.z -= flight.speedZ * currentLvl.speed;
  checkpointGate.rotation += 0.02;

  // Gate Tracker HUD Update
  const gateDist = Math.max(0, Math.round(checkpointGate.z));
  gateTracker.textContent = `GATE: ${gateDist} M`;
  if (gateDist < 300) gateTracker.style.color = "#00ff88";
  else gateTracker.style.color = "#ffd700";

  // Checkpoint Gate Arrival Detection
  if (checkpointGate.z <= 70) {
    if (Math.hypot(checkpointGate.x, checkpointGate.y) < checkpointGate.radius + 150) {
      triggerGateHyperspace();
      return;
    }
  }

  // Recoil recovery
  flight.leftRecoil *= 0.8;
  flight.rightRecoil *= 0.8;

  // Rapid Gun Spray (Continuous fire while Spacebar is held)
  if (shootCooldown > 0) shootCooldown--;
  if (activeKeys.fire && shootCooldown === 0) {
    audio.playBlaster();
    alternateCannon = !alternateCannon;

    // Gun barrel coordinates with dynamic swivel offset
    const spreadX = (Math.random() - 0.5) * 8 + flight.gunYaw * 40;
    const spreadY = (Math.random() - 0.5) * 8 + flight.gunPitch * 40;

    if (alternateCannon) {
      flight.leftRecoil = 14;
      blasterBeams3D.push({ x: -130 + spreadX, y: 110 + spreadY, z: 30, vz: 55 });
    } else {
      flight.rightRecoil = 14;
      blasterBeams3D.push({ x: 130 + spreadX, y: 110 + spreadY, z: 30, vz: 55 });
    }
    shootCooldown = 6; // High rate of fire spray
  }

  // Update Blaster Beams
  for (let i = blasterBeams3D.length - 1; i >= 0; i--) {
    const b = blasterBeams3D[i];
    b.z += b.vz;

    // Beam vs Asteroid Collision
    for (let j = asteroids3D.length - 1; j >= 0; j--) {
      const a = asteroids3D[j];
      if (Math.abs(a.z - b.z) < 50 && Math.hypot(a.x - b.x, a.y - b.y) < a.radius) {
        blasterBeams3D.splice(i, 1);
        a.hp--;
        if (a.hp <= 0) {
          audio.playExplosion(1.4);
          triggerShipBlast(a.x, a.y, a.z, 25, a.color);
          asteroids3D.splice(j, 1);
          score += 150;
        }
        break;
      }
    }

    // Beam vs Enemy Starships Collision
    for (let k = enemyShips3D.length - 1; k >= 0; k--) {
      const e = enemyShips3D[k];
      if (Math.abs(e.z - b.z) < 60 && Math.hypot(e.x - b.x, e.y - b.y) < e.width / 1.5) {
        blasterBeams3D.splice(i, 1);
        e.hp--;
        if (e.hp <= 0) {
          audio.playExplosion(e.isCapital ? 2.8 : 1.8);
          triggerShipBlast(e.x, e.y, e.z, e.isCapital ? 75 : 40, "#ff0055");
          enemyShips3D.splice(k, 1);
          score += e.isCapital ? 1200 : 400;
        }
        break;
      }
    }

    if (b.z > 2400) blasterBeams3D.splice(i, 1);
  }

  // Update Stars
  for (const s of stars3D) {
    s.z -= flight.speedZ * currentLvl.speed;
    if (s.z <= 15) {
      s.z = 2600;
      s.x = (Math.random() - 0.5) * 4400;
      s.y = (Math.random() - 0.5) * 3200;
    }
  }

  // Spawners
  spawnTimer++;
  if (spawnTimer > 32) {
    spawnAsteroid3D();
    spawnTimer = 0;
  }

  enemyTimer++;
  if (enemyTimer > 130) {
    spawnEnemyShip3D(false);
    if (currentLvl.capitalShip && Math.random() < 0.45) {
      spawnEnemyShip3D(true);
      warnLock.textContent = "CAPITAL SHIP DETECTED";
      warnLock.style.color = "#ff0055";
      setTimeout(() => {
        warnLock.textContent = "TARGET LOCK: SCANNING";
        warnLock.style.color = "#00ff88";
      }, 3500);
    }
    enemyTimer = 0;
  }

  // Update Asteroids
  for (let i = asteroids3D.length - 1; i >= 0; i--) {
    const a = asteroids3D[i];
    a.z -= flight.speedZ * currentLvl.speed;
    a.rot += a.rotSpeed;

    if (a.z <= 65 && Math.hypot(a.x, a.y) < a.radius + 30) {
      handleCockpitDamage(25);
      triggerShipBlast(a.x, a.y, a.z, 25, a.color);
      asteroids3D.splice(i, 1);
      continue;
    }
    if (a.z < 10) asteroids3D.splice(i, 1);
  }

  // Update Enemy Starships
  for (let i = enemyShips3D.length - 1; i >= 0; i--) {
    const e = enemyShips3D[i];
    e.z -= flight.speedZ * 0.65;
    e.x += e.vx;
    e.y += e.vy;

    e.shootCooldown--;
    if (e.shootCooldown <= 0 && e.z > 250) {
      enemyLasers3D.push({ x: e.x, y: e.y, z: e.z, vx: -e.x * 0.015, vy: -e.y * 0.015, vz: -30 });
      e.shootCooldown = e.isCapital ? 65 : 85;
    }

    if (e.z <= 65 && Math.hypot(e.x, e.y) < e.width / 1.6) {
      handleCockpitDamage(e.isCapital ? 40 : 20);
      triggerShipBlast(e.x, e.y, e.z, 35, "#ff0055");
      enemyShips3D.splice(i, 1);
      continue;
    }
    if (e.z < 10) enemyShips3D.splice(i, 1);
  }

  // Update Enemy Lasers
  for (let i = enemyLasers3D.length - 1; i >= 0; i--) {
    const l = enemyLasers3D[i];
    l.z += l.vz;
    l.x += l.vx;
    l.y += l.vy;

    if (l.z <= 40 && Math.hypot(l.x, l.y) < 45) {
      enemyLasers3D.splice(i, 1);
      handleCockpitDamage(12);
      continue;
    }
    if (l.z < 10) enemyLasers3D.splice(i, 1);
  }

  // Update Debris Fragments
  for (let i = explosionDebris.length - 1; i >= 0; i--) {
    const d = explosionDebris[i];
    d.x += d.vx;
    d.y += d.vy;
    d.z += d.vz;
    d.alpha -= 0.025;
    if (d.alpha <= 0) explosionDebris.splice(i, 1);
  }

  if (screenShake > 0) screenShake *= 0.86;

  // Update Off-Screen Directional Tracking Arrows
  updateNavPointers();
}

// ------------------------------------------------------------------
// Off-Screen Threat & Checkpoint Trackers
// ------------------------------------------------------------------
function updateNavPointers() {
  navPointers.innerHTML = "";
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const pad = 60;

  // 1. Checkpoint Gate Tracker
  const ptGate = transform3D(checkpointGate.x, checkpointGate.y, checkpointGate.z);
  const isGateOffscreen = ptGate.rz <= 10 || ptGate.px < pad || ptGate.px > window.innerWidth - pad || ptGate.py < pad || ptGate.py > window.innerHeight - pad;

  if (isGateOffscreen) {
    let angle = Math.atan2(ptGate.py - cy, ptGate.px - cx);
    if (ptGate.rz <= 10) angle += Math.PI; // Behind camera

    const edgeX = Math.max(pad, Math.min(window.innerWidth - pad, cx + Math.cos(angle) * (cx - pad)));
    const edgeY = Math.max(pad, Math.min(window.innerHeight - pad, cy + Math.sin(angle) * (cy - pad)));

    const div = document.createElement("div");
    div.className = "nav-arrow-pointer pointer-gate";
    div.style.left = `${edgeX}px`;
    div.style.top = `${edgeY}px`;
    div.innerHTML = `⯈ GATE: ${Math.round(checkpointGate.z)}M`;
    navPointers.appendChild(div);
  }

  // 2. Nearest Enemy Starship Tracker
  if (enemyShips3D.length > 0) {
    const nearestEnemy = enemyShips3D[0];
    const ptEnemy = transform3D(nearestEnemy.x, nearestEnemy.y, nearestEnemy.z);
    const isEnemyOffscreen = ptEnemy.rz <= 10 || ptEnemy.px < pad || ptEnemy.px > window.innerWidth - pad || ptEnemy.py < pad || ptEnemy.py > window.innerHeight - pad;

    if (isEnemyOffscreen) {
      let angle = Math.atan2(ptEnemy.py - cy, ptEnemy.px - cx);
      if (ptEnemy.rz <= 10) angle += Math.PI;

      const edgeX = Math.max(pad, Math.min(window.innerWidth - pad, cx + Math.cos(angle) * (cx - pad)));
      const edgeY = Math.max(pad, Math.min(window.innerHeight - pad, cy + Math.sin(angle) * (cy - pad)));

      const div = document.createElement("div");
      div.className = "nav-arrow-pointer pointer-enemy";
      div.style.left = `${edgeX}px`;
      div.style.top = `${edgeY}px`;
      div.innerHTML = `⯈ HOSTILE: ${Math.round(nearestEnemy.z)}M`;
      navPointers.appendChild(div);
    }
  }
}

function triggerShipBlast(x, y, z, count, color) {
  screenShake = 16;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 18 + 6;
    explosionDebris.push({
      x: x,
      y: y,
      z: z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 20,
      size: Math.random() * 6 + 3,
      alpha: 1.0,
      color: color
    });
  }
}

function handleCockpitDamage(dmg) {
  audio.playExplosion(1.5);
  screenShake = 18;
  hp = Math.max(0, hp - dmg);
  warnHull.textContent = `HULL: ${hp}%`;
  warnHull.style.color = hp < 30 ? "#ff0055" : (hp < 60 ? "#ffaa00" : "#00ff88");

  if (hp <= 0) {
    gameState = "GAMEOVER";
    audio.stopMusic();
  }
}

function triggerGateHyperspace() {
  gameState = "INTERMISSION";
  audio.playFanfare();
  saveAutosave();

  intermissionSectorTitle.textContent = LEVELS[currentLevelIdx].name;
  debriefScore.textContent = score;
  debriefHull.textContent = `${hp}%`;
  debriefNextLevel.textContent = currentLevelIdx < LEVELS.length - 1 ? `Sector ${currentLevelIdx + 2}: ${LEVELS[currentLevelIdx + 1].name}` : "Earth High Orbit";
  intermissionScreen.classList.remove("hidden");
}

document.getElementById("btn-next-sector").onclick = () => {
  intermissionScreen.classList.add("hidden");
  if (currentLevelIdx < LEVELS.length - 1) {
    currentLevelIdx++;
    initSectorGate();
    gameState = "PLAYING";
  } else {
    gameState = "WON";
    audio.stopMusic();
  }
};

// ------------------------------------------------------------------
// Realistic Cockpit, Swiveling Cannons & Holo-Map Rendering
// ------------------------------------------------------------------
function drawArticulatedCannons(w, h) {
  ctx.save();

  // Cannon Base Positions (Left & Right Cockpit Wings)
  const leftX = w * 0.16;
  const rightX = w * 0.84;
  const cannonY = h - 100;

  // Dynamic Swivel Angles derived from Flight Gun Pitch & Yaw
  const swivelAngle = flight.gunYaw * 0.8;
  const pitchOffset = flight.gunPitch * 25;

  // Left Auto-Cannon
  ctx.save();
  ctx.translate(leftX, cannonY + flight.leftRecoil);
  ctx.rotate(swivelAngle);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-18, -pitchOffset - 50, 36, 90);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(-18, -pitchOffset - 50, 36, 90);

  // Twin Rotary Barrel Tubes
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-12, -pitchOffset - 90, 8, 45);
  ctx.fillRect(4, -pitchOffset - 90, 8, 45);

  // Muzzle Flash on Fire
  if (flight.leftRecoil > 6) {
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, -pitchOffset - 95, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Right Auto-Cannon
  ctx.save();
  ctx.translate(rightX, cannonY + flight.rightRecoil);
  ctx.rotate(swivelAngle);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-18, -pitchOffset - 50, 36, 90);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(-18, -pitchOffset - 50, 36, 90);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-12, -pitchOffset - 90, 8, 45);
  ctx.fillRect(4, -pitchOffset - 90, 8, 45);

  if (flight.rightRecoil > 6) {
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, -pitchOffset - 95, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  ctx.restore();
}

function drawFlightYoke(cx, cy) {
  ctx.save();
  const baseY = cy + 180 + flight.yokeDepth;
  ctx.translate(cx, baseY);
  ctx.rotate(flight.yokeAngle);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-18, 0, 36, 120);
  ctx.strokeStyle = "#475569";
  ctx.strokeRect(-18, 0, 36, 120);

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00f0ff";
  ctx.stroke();

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 13px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CR-2060", 0, -6);
  ctx.fillStyle = "#ffaa00";
  ctx.font = "9px 'Segoe UI', sans-serif";
  ctx.fillText("ROYAL YOKE", 0, 10);

  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 4;

  // Left Grip
  ctx.beginPath();
  ctx.arc(-80, -20, 24, Math.PI * 0.5, Math.PI * 1.5);
  ctx.lineTo(-40, -35);
  ctx.lineTo(-40, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Grip
  ctx.beginPath();
  ctx.arc(80, -20, 24, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.lineTo(40, 0);
  ctx.lineTo(40, -35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(-82, -38, 7, 0, Math.PI * 2);
  ctx.arc(82, -38, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCockpitInstruments(w, h) {
  const dashHeight = 170;
  const dashY = h - dashHeight;

  const grad = ctx.createLinearGradient(0, dashY, 0, h);
  grad.addColorStop(0, "#0b1220");
  grad.addColorStop(1, "#03060d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, dashY, w, dashHeight);

  ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, dashY, w, dashHeight);

  // Left MFD: 3D Tactical Holo-Map
  const radarW = 220;
  const radarH = 130;
  ctx.fillStyle = "rgba(5, 10, 20, 0.95)";
  ctx.fillRect(25, dashY + 20, radarW, radarH);
  ctx.strokeRect(25, dashY + 20, radarW, radarH);

  // Holo-Map Range Rings
  const rCenter = 135;
  const rCenterY = dashY + 85;
  ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
  ctx.beginPath();
  ctx.arc(rCenter, rCenterY, 45, 0, Math.PI * 2);
  ctx.arc(rCenter, rCenterY, 25, 0, Math.PI * 2);
  ctx.moveTo(rCenter, dashY + 40); ctx.lineTo(rCenter, dashY + 130);
  ctx.moveTo(90, rCenterY); ctx.lineTo(180, rCenterY);
  ctx.stroke();

  // Holo-Map Player Chevron
  ctx.fillStyle = "#00ff88";
  ctx.beginPath();
  ctx.moveTo(rCenter, rCenterY - 6);
  ctx.lineTo(rCenter - 5, rCenterY + 5);
  ctx.lineTo(rCenter + 5, rCenterY + 5);
  ctx.closePath();
  ctx.fill();

  // Holo-Map Checkpoint Gate Diamond
  const gRx = rCenter + (checkpointGate.x / 4000) * 45;
  const gRy = rCenterY - (checkpointGate.z / 6000) * 45;
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(gRx, gRy - 4);
  ctx.lineTo(gRx + 4, gRy);
  ctx.lineTo(gRx, gRy + 4);
  ctx.lineTo(gRx - 4, gRy);
  ctx.closePath();
  ctx.fill();

  // Holo-Map Enemy Blips
  ctx.fillStyle = "#ff0055";
  for (const e of enemyShips3D) {
    const ex = rCenter + (e.x / 4000) * 45;
    const ey = rCenterY - (e.z / 6000) * 45;
    ctx.fillRect(ex - 2, ey - 2, 4, 4);
  }

  // Right MFD: Avionics Cluster
  ctx.fillStyle = "rgba(5, 10, 20, 0.95)";
  ctx.fillRect(w - 245, dashY + 20, radarW, radarH);
  ctx.strokeRect(w - 245, dashY + 20, radarW, radarH);

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText("VELOCITY: " + Math.round(flight.speedZ * 120) + " KM/S", w - 230, dashY + 45);
  ctx.fillText("STABILITY: NOMINAL", w - 230, dashY + 65);
  ctx.fillText("GATE DIST: " + Math.max(0, Math.round(checkpointGate.z)) + " M", w - 230, dashY + 85);
  ctx.fillText("SECTOR SCORE: " + score, w - 230, dashY + 105);
  ctx.fillText("CITADEL HULL: " + hp + "%", w - 230, dashY + 125);

  // Dynamic Crosshair Tracking
  const cx = w / 2 + flight.gunYaw * 80;
  const cy = h / 2 - 35 + flight.gunPitch * 80;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-flight.roll);

  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(-16, -16, 32, 32);
  ctx.fillStyle = "#ff0055";
  ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();
}

// ------------------------------------------------------------------
// Main Render Pipeline
// ------------------------------------------------------------------
function draw() {
  ctx.save();
  if (screenShake > 0.5) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // 1. Render 3D Stars
  for (const s of stars3D) {
    const pt = transform3D(s.x, s.y, s.z);
    if (pt.rz > 10 && pt.px >= 0 && pt.px <= window.innerWidth && pt.py >= 0 && pt.py <= window.innerHeight) {
      ctx.fillStyle = s.color;
      ctx.fillRect(pt.px, pt.py, s.size * pt.scale * 1.5, s.size * pt.scale * 1.5);
    }
  }

  // 2. Render Checkpoint Stargate Portal Ring
  const gatePt = transform3D(checkpointGate.x, checkpointGate.y, checkpointGate.z);
  if (gatePt.rz > 10) {
    const gr = checkpointGate.radius * gatePt.scale;
    ctx.save();
    ctx.translate(gatePt.px, gatePt.py);
    ctx.rotate(checkpointGate.rotation);

    // Glowing Outer Stargate Ring
    ctx.beginPath();
    ctx.arc(0, 0, gr, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = Math.max(3, 8 * gatePt.scale);
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 25;
    ctx.stroke();

    // Swirling Wormhole Event Horizon
    ctx.beginPath();
    ctx.arc(0, 0, gr * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // 3. Render 3D Asteroids
  for (const a of asteroids3D) {
    const pt = transform3D(a.x, a.y, a.z);
    const r = a.radius * pt.scale;
    if (pt.rz > 10 && r > 1) {
      ctx.save();
      ctx.translate(pt.px, pt.py);
      ctx.rotate(a.rot);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. Render 3D Enemy Starships
  for (const e of enemyShips3D) {
    const pt = transform3D(e.x, e.y, e.z);
    const w = e.width * pt.scale;
    const h = e.height * pt.scale;
    if (pt.rz > 10 && w > 2) {
      ctx.save();
      ctx.translate(pt.px, pt.py);
      ctx.rotate(-flight.roll);

      ctx.fillStyle = e.isCapital ? "#1e1b4b" : "#450a0a";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = e.isCapital ? "#a855f7" : "#ef4444";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(-w * 0.35, h * 0.3, w * 0.7, 4);

      if (e.isCapital) {
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-w / 2, -h / 2 - 8, w * (e.hp / e.maxHp), 4);
      }
      ctx.restore();
    }
  }

  // 5. Render Swiveling Gun Plasma Spray Beams
  for (const b of blasterBeams3D) {
    const pt = transform3D(b.x, b.y, b.z);
    if (pt.rz > 10) {
      ctx.fillStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 14;
      ctx.fillRect(pt.px - 3, pt.py - 3, 6, 6);
      ctx.shadowBlur = 0;
    }
  }

  // 6. Enemy Lasers
  for (const l of enemyLasers3D) {
    const pt = transform3D(l.x, l.y, l.z);
    if (pt.rz > 10) {
      ctx.fillStyle = "#ff0055";
      ctx.beginPath();
      ctx.arc(pt.px, pt.py, 4 * pt.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 7. Explosion Debris
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const d of explosionDebris) {
    const pt = transform3D(d.x, d.y, d.z);
    if (pt.rz > 10) {
      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.arc(pt.px, pt.py, d.size * pt.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore();

  // 8. Render Articulated Cannons, Dashboard & Yoke
  if (gameState === "PLAYING" || gameState === "PAUSED") {
    drawArticulatedCannons(window.innerWidth, window.innerHeight);
    drawCockpitInstruments(window.innerWidth, window.innerHeight);
    drawFlightYoke(window.innerWidth / 2, window.innerHeight - 130);
  }

  // Victory & Game Over End State
  if (gameState === "GAMEOVER" || gameState === "WON") {
    ctx.fillStyle = "rgba(2, 4, 10, 0.9)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.textAlign = "center";
    ctx.fillStyle = gameState === "WON" ? "#00ff88" : "#ff0044";
    ctx.font = "bold 42px 'Segoe UI', sans-serif";
    ctx.fillText(gameState === "WON" ? "EARTH ORBIT REACHED" : "CITADEL DESTROYED", window.innerWidth / 2, window.innerHeight / 2 - 30);

    ctx.fillStyle = "#ffffff";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.fillText(`COMMANDER ${pilotProfile.name.toUpperCase()} | TOTAL SCORE: ${score}`, window.innerWidth / 2, window.innerHeight / 2 + 20);
    ctx.fillText("PRESS [ESC] TO RETURN TO TITLE MENU", window.innerWidth / 2, window.innerHeight / 2 + 60);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// ------------------------------------------------------------------
// Menu & Autosave Flow
// ------------------------------------------------------------------
function switchMenu(target) {
  [mainMenu, campaignMenu, profileMenu, storyModal, saveloadMenu, optionsMenu, pauseMenu, quitScreen].forEach(m => m.classList.add("hidden"));
  if (target) {
    menuOverlay.classList.remove("hidden");
    target.classList.remove("hidden");
  } else {
    menuOverlay.classList.add("hidden");
  }
}

function startMission(isNew = true) {
  if (isNew) {
    score = 0;
    hp = 100;
    currentLevelIdx = 0;
  }
  asteroids3D.length = 0;
  enemyShips3D.length = 0;
  blasterBeams3D.length = 0;
  enemyLasers3D.length = 0;
  explosionDebris.length = 0;

  initSectorGate();
  switchMenu(null);
  cockpitHud.classList.remove("hidden");
  gameState = "PLAYING";
  audio.startMusic();
}

function saveAutosave() {
  const saves = JSON.parse(localStorage.getItem("castle_rock_saves") || "{}");
  saves["autosave"] = {
    level: currentLevelIdx,
    score,
    hp,
    pilot: pilotProfile,
    timestamp: new Date().toLocaleString()
  };
  localStorage.setItem("castle_rock_saves", JSON.stringify(saves));
}

function togglePause() {
  if (gameState === "PLAYING") {
    gameState = "PAUSED";
    audio.stopMusic();
    switchMenu(pauseMenu);
  } else if (gameState === "PAUSED") {
    gameState = "PLAYING";
    audio.startMusic();
    switchMenu(null);
  } else if (gameState === "GAMEOVER" || gameState === "WON") {
    gameState = "MENU";
    cockpitHud.classList.add("hidden");
    switchMenu(mainMenu);
  }
}

// Menu Button Events
document.getElementById("btn-campaign").onclick = () => switchMenu(campaignMenu);
document.getElementById("btn-back-campaign").onclick = () => switchMenu(mainMenu);

document.getElementById("btn-profile").onclick = () => switchMenu(profileMenu);
document.getElementById("btn-back-profile").onclick = () => switchMenu(mainMenu);
document.getElementById("btn-save-profile").onclick = () => {
  savePilotProfile(inputPilotName.value, inputCallsign.value);
  switchMenu(mainMenu);
};

document.getElementById("btn-newgame").onclick = () => {
  switchMenu(storyModal);
  speakPrologueAutomatically();
};

document.getElementById("btn-continue").onclick = () => {
  const saves = JSON.parse(localStorage.getItem("castle_rock_saves") || "{}");
  if (saves["autosave"]) {
    currentLevelIdx = saves["autosave"].level;
    score = saves["autosave"].score;
    hp = saves["autosave"].hp;
    startMission(false);
  } else {
    alert("No autosaved flight profile found. Commencing fresh voyage.");
    startMission(true);
  }
};

document.getElementById("btn-start-story").onclick = () => {
  stopVoiceover();
  startMission(true);
};
document.getElementById("btn-skip-story").onclick = () => {
  stopVoiceover();
  switchMenu(campaignMenu);
};

document.getElementById("btn-options").onclick = () => switchMenu(optionsMenu);
document.getElementById("btn-back-options").onclick = () => switchMenu(gameState === "PAUSED" ? pauseMenu : mainMenu);

document.getElementById("btn-pause-options").onclick = () => switchMenu(optionsMenu);
document.getElementById("btn-resume").onclick = togglePause;
document.getElementById("btn-quit-main").onclick = () => {
  gameState = "MENU";
  cockpitHud.classList.add("hidden");
  switchMenu(mainMenu);
};
document.getElementById("btn-pause").onclick = togglePause;

document.getElementById("btn-quit").onclick = () => switchMenu(quitScreen);
document.getElementById("btn-restart-terminal").onclick = () => switchMenu(mainMenu);

// Sound & Music Toggles
const musicBtn = document.getElementById("opt-music-btn");
const musicHudBtn = document.getElementById("btn-music-toggle");
function toggleMusic() {
  audio.musicEnabled = !audio.musicEnabled;
  musicBtn.textContent = audio.musicEnabled ? "ENABLED" : "MUTED";
  musicHudBtn.textContent = `AUDIO: ${audio.musicEnabled ? "ON" : "OFF"}`;
  if (audio.musicEnabled && gameState === "PLAYING") audio.startMusic();
  else audio.stopMusic();
}
musicBtn.onclick = toggleMusic;
musicHudBtn.onclick = toggleMusic;

document.getElementById("opt-sound-btn").onclick = (e) => {
  audio.soundEnabled = !audio.soundEnabled;
  e.target.textContent = audio.soundEnabled ? "ENABLED" : "MUTED";
};

// Resolution Toggle
document.getElementById("opt-resolution-btn").onclick = (e) => {
  renderScale = renderScale === 1.0 ? 0.65 : 1.0;
  e.target.textContent = renderScale === 1.0 ? "HIGH (NATIVE)" : "LOW (FAST)";
  resize();
};

// Keybindings UI
function renderKeybindings() {
  rebindList.innerHTML = "";
  Object.keys(keyBindings).forEach(action => {
    const row = document.createElement("div");
    row.className = "rebind-row";
    row.innerHTML = `
      <span>${action.toUpperCase()}:</span>
      <button class="rebind-key-btn" id="rebind-${action}">
        ${bindingAction === action ? "PRESS KEY..." : keyBindings[action]}
      </button>
    `;
    rebindList.appendChild(row);

    document.getElementById(`rebind-${action}`).onclick = () => {
      bindingAction = action;
      renderKeybindings();
    };
  });
}
renderKeybindings();
loadPilotProfile();