const MAX_WAVES = 25;

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

// Tower Data: Colors and Costs
const towerData = {
    pyro: { color: '#ff4d4d', cost: 100 },
    cryo: { color: '#99ffff', cost: 100 },
    electro: { color: '#b333ff', cost: 125 },
    anemo: { color: '#33ffd1', cost: 125 },
    geo: { color: '#ffcc33', cost: 150 },
    hydro: { color: '#2196f3', cost: 150 },
    dendro: { color: '#72e000', cost: 175 }
};

// Enemy Pathing
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
