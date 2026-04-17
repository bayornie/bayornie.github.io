// Game State & Stats
let gold = 500;
let lives = 25;
let wave = 1;
let isGameOver = false;

// Wave Management Stats
let isWaveActive = false;
let enemiesToSpawn = 0;
let spawnTimer = 0;
let waveClearBonus = 100;

// Object Tracking
let enemies = [];
let towers = [];
let selectedType = null;
let projectiles = [];
let selectedTowerInstance = null;

// Tower Data: Colors and Costs
const towerData = {
    pyro: { color: '#ff4d4d', cost: 100, damage: 15, range: 140 },
    cryo: { color: '#99ffff', cost: 100, damage: 7.5, range: 160 },
    electro: { color: '#b333ff', cost: 125, damage: 10, range: 180 },
    anemo: { color: '#33ffd1', cost: 125, damage: 5, range: 150 },
    geo: { color: '#ffcc33', cost: 150, damage: 25, range: 120 },
    hydro: { color: '#2196f3', cost: 150, damage: 10, range: 150 },
    dendro: { color: '#72e000', cost: 175, damage: 12.5, range: 150 }
};

// Enemy Pathing
const MAX_WAVES = 25;
const path = [
    { x: 0, y: 100 },
    { x: 650, y: 100 },
    { x: 650, y: 250 },
    { x: 150, y: 250 },
    { x: 150, y: 400 },
    { x: 650, y: 400 },
    { x: 650, y: 480 },
    { x: 800, y: 480 }
];
