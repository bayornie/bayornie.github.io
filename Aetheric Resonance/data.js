// --- CRITICAL GLOBALS ---
let selectedStage = 1;
let selectedAct = 1; // New global
let currentStage = 1;
let currentAct = 1;   // New global

// --- Globals ---
let player, dummy, keys, kunais, weaponStick, hpBarGraphics, playerGuiGraphics, background;
let isDashing = false, burstMeter = 0, dummyHP = 50, jumpCount = 0;

let lastSwordTime = 0;
let lastKunaiTime = 0;
let enemyStatus = { type: null, duration: 0 };
let burnTickTimer = 0;
let lastEnemyAttackTime = 0;
let lastRegenTime = 0; 

// Leveling Variables
let currentLevel = 1;
let currentXP = 0;
let xpRequired = 100;
const maxLevel = 1400;

// --- Player Stats ---
let playerStats = {
    sword: 1,
    kunai: 1,
    hp: 50,
    maxHp: 50,
    stamina: 100,
    currentStamina: 100,
    statPoints: 0
};

// --- STAGE & ACT MANAGEMENT ---
const enemies = [
    { 
        name: "Slime Highlands", req: 1, bg: 'bg_forest',
        acts: [
            { name: "Green Sprout", hp: 30, atk: 2, xp: 10, color: 0xadff2f, scaleX: 1.5, scaleY: 1.0 },
            { name: "Sticky Trail", hp: 45, atk: 3, xp: 15, color: 0x32cd32, scaleX: 1.8, scaleY: 1.2 },
            { name: "Blue Puddle", hp: 60, atk: 4, xp: 20, color: 0x00ced1, scaleX: 2.0, scaleY: 1.0 },
            { name: "Acid Ooze", hp: 80, atk: 5, xp: 25, color: 0x9400d3, scaleX: 2.2, scaleY: 1.4 },
            { name: "KING SLIME", hp: 150, atk: 10, xp: 100, color: 0xff0000, scaleX: 4.5, scaleY: 2.5 }
        ]
    },
    { 
        name: "Whispering Graveyard", req: 141, bg: 'bg_graveyard',
        acts: [
            { name: "Lost Soul", hp: 100, atk: 6, xp: 30, color: 0xeeeeee, scaleX: 1.2, scaleY: 1.8 },
            { name: "Bone Rattle", hp: 120, atk: 8, xp: 40, color: 0xcccccc, scaleX: 1.4, scaleY: 2.0 },
            { name: "Mist Stalker", hp: 140, atk: 10, xp: 50, color: 0x888888, scaleX: 1.0, scaleY: 2.5 },
            { name: "Crypt Guard", hp: 180, atk: 12, xp: 60, color: 0x444444, scaleX: 1.8, scaleY: 2.2 },
            { name: "THE PHANTOM", hp: 300, atk: 20, xp: 200, color: 0x00ff00, scaleX: 2.5, scaleY: 3.5 }
        ]
    },
    { 
        name: "Ironclad Castle", req: 281, bg: 'bg_castle',
        acts: [
            { name: "Squire", hp: 200, atk: 15, xp: 70, color: 0xaaaaaa, scaleX: 1.5, scaleY: 2.0 },
            { name: "Shield Wall", hp: 250, atk: 18, xp: 85, color: 0x888888, scaleX: 2.5, scaleY: 2.0 },
            { name: "Iron Knight", hp: 300, atk: 22, xp: 100, color: 0x555555, scaleX: 2.0, scaleY: 2.5 },
            { name: "Elite Guard", hp: 400, atk: 28, xp: 120, color: 0x333333, scaleX: 2.2, scaleY: 2.8 },
            { name: "GRAND MARSHAL", hp: 700, atk: 45, xp: 400, color: 0x0000ff, scaleX: 3.5, scaleY: 3.5 }
        ]
    },
    { 
        name: "Arcane Library", req: 421, bg: 'bg_library',
        acts: [
            { name: "Page Turner", hp: 350, atk: 25, xp: 150, color: 0xffffcc, scaleX: 1.2, scaleY: 1.8 },
            { name: "Ink Blot", hp: 400, atk: 30, xp: 180, color: 0x222222, scaleX: 2.0, scaleY: 1.0 },
            { name: "Spell Scroll", hp: 500, atk: 35, xp: 210, color: 0xbc8cf2, scaleX: 1.0, scaleY: 3.0 },
            { name: "High Scholar", hp: 650, atk: 40, xp: 250, color: 0xffd700, scaleX: 1.5, scaleY: 2.2 },
            { name: "ARCHMAGE LORE", hp: 1000, atk: 60, xp: 600, color: 0xffff00, scaleX: 2.0, scaleY: 2.0 }
        ]
    },
    { 
        name: "Abyssal Gates", req: 561, bg: 'bg_hell',
        acts: [
            { name: "Imp", hp: 600, atk: 40, xp: 300, color: 0xff4500, scaleX: 1.2, scaleY: 1.2 },
            { name: "Hellhound", hp: 800, atk: 50, xp: 350, color: 0x8b0000, scaleX: 2.5, scaleY: 1.5 },
            { name: "Succubus", hp: 1000, atk: 65, xp: 400, color: 0xff00ff, scaleX: 1.5, scaleY: 2.5 },
            { name: "Pit Lord", hp: 1500, atk: 80, xp: 500, color: 0x4b0082, scaleX: 3.0, scaleY: 3.5 },
            { name: "DEMON PRINCE", hp: 2500, atk: 110, xp: 1000, color: 0xff00ff, scaleX: 4.0, scaleY: 4.0 }
        ]
    },
    { 
        name: "Celestial Heights", req: 701, bg: 'bg_sky',
        acts: [
            { name: "Breeze", hp: 1200, atk: 70, xp: 600, color: 0xf0f8ff, scaleX: 2.0, scaleY: 0.5 },
            { name: "Cloud Mote", hp: 1500, atk: 85, xp: 700, color: 0x87ceeb, scaleX: 2.0, scaleY: 2.0 },
            { name: "Thunder Clap", hp: 2000, atk: 100, xp: 850, color: 0xffd700, scaleX: 1.0, scaleY: 4.0 },
            { name: "Sky Valkyrie", hp: 2800, atk: 130, xp: 1000, color: 0xffffff, scaleX: 2.0, scaleY: 3.0 },
            { name: "STORM DEITY", hp: 4500, atk: 180, xp: 2000, color: 0x00ffff, scaleX: 3.0, scaleY: 4.5 }
        ]
    },
    { 
        name: "Everfrost Peak", req: 841, bg: 'bg_mountain',
        acts: [
            { name: "Snowball", hp: 3000, atk: 150, xp: 1200, color: 0xffffff, scaleX: 2.0, scaleY: 2.0 },
            { name: "Icicle", hp: 3500, atk: 170, xp: 1400, color: 0xadd8e6, scaleX: 1.0, scaleY: 4.0 },
            { name: "Frost Troll", hp: 4500, atk: 210, xp: 1700, color: 0xcedef0, scaleX: 3.5, scaleY: 3.5 },
            { name: "Yeti", hp: 6000, atk: 250, xp: 2100, color: 0xeeeeee, scaleX: 4.5, scaleY: 4.5 },
            { name: "ANCIENT GOLEM", hp: 10000, atk: 350, xp: 5000, color: 0xbc8cf2, scaleX: 6.0, scaleY: 6.0 }
        ]
    },
    { 
        name: "Magma Core", req: 981, bg: 'bg_volcano',
        acts: [
            { name: "Ember", hp: 7000, atk: 300, xp: 3000, color: 0xffa500, scaleX: 1.5, scaleY: 1.5 },
            { name: "Lava Swell", hp: 8500, atk: 350, xp: 3500, color: 0xff4500, scaleX: 4.0, scaleY: 1.0 },
            { name: "Fire Drake", hp: 11000, atk: 420, xp: 4500, color: 0xd2691e, scaleX: 3.0, scaleY: 2.0 },
            { name: "Magma Fiend", hp: 15000, atk: 550, xp: 6000, color: 0x800000, scaleX: 3.5, scaleY: 4.0 },
            { name: "VOLCANO DRAGON", hp: 25000, atk: 800, xp: 12000, color: 0xff0000, scaleX: 7.0, scaleY: 3.5 }
        ]
    },
    { 
        name: "Forbidden Sands", req: 1121, bg: 'bg_desert',
        acts: [
            { name: "Dust Devil", hp: 18000, atk: 600, xp: 8000, color: 0xedc9af, scaleX: 2.0, scaleY: 5.0 },
            { name: "Scarab", hp: 22000, atk: 750, xp: 10000, color: 0xb8860b, scaleX: 3.0, scaleY: 1.5 },
            { name: "Sand Stalker", hp: 28000, atk: 900, xp: 13000, color: 0x556b2f, scaleX: 1.8, scaleY: 3.5 },
            { name: "Anubis Guard", hp: 35000, atk: 1200, xp: 18000, color: 0x000000, scaleX: 2.5, scaleY: 5.0 },
            { name: "THE SAND TITAN", hp: 60000, atk: 2000, xp: 35000, color: 0x800080, scaleX: 5.0, scaleY: 8.0 }
        ]
    },
    { 
        name: "The Astral Void", req: 1261, bg: 'bg_space',
        acts: [
            { name: "Nebula", hp: 80000, atk: 3000, xp: 50000, color: 0x483d8b, scaleX: 4.0, scaleY: 4.0 },
            { name: "Pulsar", hp: 120000, atk: 4500, xp: 75000, color: 0xffffff, scaleX: 1.0, scaleY: 1.0 },
            { name: "Black Hole", hp: 200000, atk: 7000, xp: 100000, color: 0x000000, scaleX: 6.0, scaleY: 6.0 },
            { name: "Star Eater", hp: 350000, atk: 10000, xp: 150000, color: 0xffd700, scaleX: 4.0, scaleY: 8.0 },
            { name: "TRUE DEITY", hp: 1000000, atk: 25000, xp: 500000, color: 0xbc8cf2, scaleX: 5.0, scaleY: 5.0 }
        ]
    }
];
