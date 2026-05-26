// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDQGZWGNKl3WyVWz9tMxGiWfkMPK-jrM-o",
    authDomain: "teyvat-idle-clicker.firebaseapp.com",
    projectId: "teyvat-idle-clicker",
    storageBucket: "teyvat-idle-clicker.firebasestorage.app",
    messagingSenderId: "660360530949",
    appId: "1:660360530949:web:4b692df1a888582fc1e06c",
    measurementId: "G-2S3XG9HZDD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- AUTO-LOGOUT ON TAB CLOSE ---
// Sets persistence to SESSION so the account is cleared when the tab is closed
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("Auth persistence set to SESSION. User will logout on tab close.");
    })
    .catch((error) => {
        console.error("Auth persistence error:", error.message);
    });

// --- GAME DATA ---
let isLoggedIn = false;
let buyAmount = 1;
let fischlTimer = 0;
let clickCounter = 0;
let game = {
    playerName: "Traveler",
    primos: 0,
    totalPrimosEver: 0,
    clicks: 0,
    completedAchievements: [],
    lastWarpTime: 0,
    prestigePoints: 0,
    multiplier: 1.0,
    clickPower: 1,
    lastLogin: Date.now(),
    pps: 0,
    seelies: 0,
    ownedPets: [],
    activePets: [],
    intertwinedFates: 0,
    acquaintFates: 0,
    domainTickets: 0,
    artifacts: [],

    clickUpgrades: [
        { id: 'hands', name: 'Stronger Hands', cost: 10, power: 1, level: 0, rate: 1.2 },
        { id: 'trowel', name: 'Stone Trowel', cost: 150, power: 5, level: 0, rate: 1.3 },
        { id: 'steel_trowel', name: 'Steel Trowel', cost: 500, power: 10, level: 0, rate: 1.4 },
        { id: 'dull_blade', name: 'Dull Blade', cost: 2500, power: 20, level: 0, rate: 1.45 },
        { id: 'silver_sword', name: 'Silver Sword', cost: 5000, power: 50, level: 0, rate: 1.5 }
    ],

    generators: [
        { id: 'flower', name: 'Sweet Flower', cost: 50, income: 0.5, count: 0, rate: 1.2 },
        { id: 'lamp', name: 'Lamp Grass', cost: 300, income: 2.0, count: 0, rate: 1.25 },
        { id: 'sunsettia', name: 'Sunsettia', cost: 1000, income: 5.0, count: 0, rate: 1.3 },
        { id: 'common_chest', name: 'Common Chest', cost: 5000, income: 20.0, count: 0, rate: 1.4 },
        { id: 'exquisite_chest', name: 'Exquisite Chest', cost: 25000, income: 50.0, count: 0, rate: 1.5 }
    ],

    blessings: [
        { id: 'crit', name: "Adventurer's Luck", cost: 1, level: 0, desc: '+5% Crit Click Chance' },
        { id: 'fast_gen', name: "Ley Line Efficiency", cost: 2, level: 0, desc: '+10% Generator Speed' },
        { id: 'strong_start', name: "Hero's Wits", cost: 5, level: 0, desc: 'Start with +100 Click Power' },
        { id: 'resonance', name: "Elemental Resonance", cost: 10, level: 0, desc: '+10% Total Multiplier' }
    ],

    shopItems: [
        { id: 'time_warp', name: "Time Warp", cost: 20000, level: 0, desc: "Instantly gain 30 minutes of passive income." },
        { id: 'seelie', name: "Follower Seelie", cost: 150000, level: 0, desc: "A helpful spirit that clicks for you once every 3 seconds." },
        { id: 'buff_pot', name: "Adepti's Temptation", cost: 300000, level: 0, desc: "Permanently increases click multiplier by +0.5x." },
        { id: 'primordial_shard', name: "Primordial Shard", cost: 750000, level: 0, desc: "Permanently increases generator multipliers by 10%." }
    ],

    domainTicket: [
        {
            id: "domain_ticket",
            name: "Abyssal Domain Ticket",
            desc: "A specialized seal required to challenge Abyssal Domains and claim rare artifact rewards.",
            cost: 500000,
            icon: "🎫"
        }
    ],

    fateShopItems: [
        {
            id: 'adventurer_efficiency',
            name: "Katheryne's Directive",
            costType: 'acquaint',
            cost: 4,
            desc: 'Permanently increases all generator base outputs by +15%.',
            purchased: 0
        },
        {
            id: 'resonance_booster',
            name: 'Stardust Resonance',
            costType: 'acquaint',
            cost: 8,
            desc: 'Adds an extra 0.5x to your global display multiplier.',
            purchased: 0
        },

        {
            id: 'celestia_blessing',
            name: 'Blessing of Celestia',
            costType: 'intertwined',
            cost: 5,
            desc: 'Permanently increases Click Multiplier by +2.0x.',
            purchased: 0
        },
        {
            id: 'abyss_leak',
            name: 'Abyssal Leyline Shard',
            costType: 'intertwined',
            cost: 10,
            desc: 'Permanently amplifies global passive income (PPS) output by x2.0.',
            purchased: 0
        }
    ],

    // === ARTIFACT SYSTEM ===
    artifactSets: [
        { id: 'gladiator', name: "Gladiator's Finale", twoPieceDesc: "+18% Click Power.", fourPieceDesc: "+35% Manual Click Power." },
        { id: 'golden_troupe', name: "Golden Troupe", twoPieceDesc: "+20% Passive Income (PPS).", fourPieceDesc: "+50% PPS if you haven't clicked in 10 seconds." },
        { id: 'berserker', name: "Berserker", twoPieceDesc: "+12% Critical Click Chance.", fourPieceDesc: "+24% Critical Click Chance if Combo > 20." },
        { id: 'marechaussee', name: "Marechaussee Hunter", twoPieceDesc: "+15% Manual Click Power.", fourPieceDesc: "Clicking increases Critical Click Chance by 12% (Max 36%)." },
        { id: 'severed_fate', name: "Emblem of Severed Fate", twoPieceDesc: "+20% Active Item Duration.", fourPieceDesc: "+25% PPS of your total Item Duration bonus." },
        { id: 'noblesse', name: "Noblesse Oblige", twoPieceDesc: "+20% Global Click Power.", fourPieceDesc: "Activating Time Warp boosts PPS by 20% during its duration." },
        { id: 'thundering_fury', name: "Thundering Fury", twoPieceDesc: "-15% Automated Clicker Intervals.", fourPieceDesc: "Manual clicks have a 10% chance to shave 1 minute off Time Warp CD." },
        { id: 'shimenawa', name: "Shimenawa's Reminiscence", twoPieceDesc: "+18% Click Power.", fourPieceDesc: "5% chance on click to spend 2000 Primos for a 300% click burst." },
        { id: 'ocean_clam', name: "Ocean-Hued Clam", twoPieceDesc: "+15% Passive Income (PPS).", fourPieceDesc: "Every 10 seconds, instantly gain 90 seconds of current PPS." },
        { id: 'the_exile', name: "The Exile", twoPieceDesc: "+15% Stardust/Starglitter acquisition rates.", fourPieceDesc: "Manual clicks have a 5% chance to drop a completely free Fate." }
    ],

    artifactSlots: ["flower", "plume", "sands", "goblet", "circlet"],

    statPool: [
        { type: "clickPowerPct", name: "Click Power %", isPercent: true },
        { type: "clickPowerFlat", name: "Flat Click Power", isPercent: false },
        { type: "ppsPct", name: "Passive Income % (PPS)", isPercent: true },
        { type: "critChance", name: "Critical Click Chance", isPercent: true },
        { type: "critClickMult", name: "Critical Click DMG Bonus", isPercent: true },
        { type: "itemDuration", name: "Item Duration %", isPercent: true }
    ],

    domainCombatEngine: {
        bossName: "",
        bossImage: "",
        maxHp: 0,
        currentHp: 0,
        timeLimit: 60,
        timeLeft: 60,
        mainInterval: null,
        generatorTimer: 0,
        weakSpotTimer: 0,
        isFightActive: false,
        weakSpotActive: false,
        activeLootPool: []
    },

    pets: [
        { id: 'sucrose', name: 'Sucrose', rarity: 4, vision: 'Anemo', cost: 50000000, buffType: 'click', buffValue: 0.15, icon: 'img/pets/sucrose_chibi.png' },
        { id: 'bennett', name: 'Bennett', rarity: 4, vision: 'Pyro', cost: 65000000, buffType: 'pps', buffValue: 0.10, icon: 'img/pets/bennett_chibi.png' },
        { id: 'xingqiu', name: 'Xingqiu', rarity: 4, vision: 'Hydro', cost: 80000000, buffType: 'special_click', buffValue: 100, icon: 'img/pets/xingqiu_chibi.png' },
        { id: 'yaoyao', name: 'Yaoyao', rarity: 4, vision: 'Dendro', cost: 95000000, buffType: 'discount', buffValue: 0.05, icon: 'img/pets/yaoyao_chibi.png' },
        { id: 'fischl', name: 'Fischl', rarity: 4, vision: 'Electro', cost: 110000000, buffType: 'autoclick', buffValue: 2500, icon: 'img/pets/fischl_chibi.png' },
        { id: 'kaeya', name: 'Kaeya', rarity: 4, vision: 'Cryo', cost: 125000000, buffType: 'freeze', buffValue: 60, icon: 'img/pets/kaeya_chibi.png' },
        { id: 'noelle', name: 'Noelle', rarity: 4, vision: 'Geo', cost: 140000000, buffType: 'prestige_bonus', buffValue: 0.15, icon: 'img/pets/noelle_chibi.png' },

        { id: 'xiao', name: 'Xiao', rarity: 5, vision: 'Anemo', cost: 250000000, buffType: 'click', buffValue: 0.40, icon: 'img/pets/xiao_chibi.png' },
        { id: 'arlecchino', name: 'Arlecchino', rarity: 5, vision: 'Pyro', cost: 275000000, buffType: 'global_mult', buffValue: 1.5, icon: 'img/pets/arlecchino_chibi.png' },
        { id: 'columbina', name: 'Bina', rarity: 5, vision: 'Hydro', cost: 300000000, buffType: 'pps_mult', buffValue: 2.0, icon: 'img/pets/columbina_chibi.png' },
        { id: 'nahida', name: 'Nahida', rarity: 5, vision: 'Dendro', cost: 325000000, buffType: 'discount', buffValue: 0.15, icon: 'img/pets/nahida_chibi.png' },
        { id: 'raiden', name: 'Raiden', rarity: 5, vision: 'Electro', cost: 350000000, buffType: 'auto_burst', buffValue: 0.10, interval: 1000, icon: 'img/pets/raiden_chibi.png' },
        { id: 'skirk', name: 'Skirk', rarity: 5, vision: 'Abyss', cost: 350000000, buffType: 'crit', buffValue: 3.0, icon: 'img/pets/skirk_chibi.png' },
        { id: 'xilonen', name: 'Xilo', rarity: 5, vision: 'Geo', cost: 400000000, buffType: 'prestige_perm', buffValue: 0.25, icon: 'img/pets/xilonen_chibi.png' }
    ],

    bgmList: [
        { id: 1, title: "Chasm Lullaby", file: "sounds/bgm/Chasm Lullaby.mp3" },
        { id: 2, title: "Columbina's Lullaby", file: "sounds/bgm/Columbina's Lullaby  Genshin Impact Ver. 6.0 Luna I OST.mp3" },
        { id: 3, title: "Dragonspine Ice Crystal (Piano)", file: "sounds/bgm/Dragonspine Ice Crystal (Piano).mp3" },
        { id: 4, title: "Dusk in Mondstadt", file: "sounds/bgm/Dusk in Mondstadt.mp3" },
        { id: 5, title: "Fall of Maples", file: "sounds/bgm/Fall of Maples.mp3" },
        { id: 6, title: "Genshin Impact Main Theme", file: "sounds/bgm/Genshin Impact Main Theme - Yu-Peng Chen.mp3" },
        { id: 7, title: "Innocent Age", file: "sounds/bgm/Innocent Age.mp3" },
        { id: 8, title: "Journey into Sweet Dreams", file: "sounds/bgm/Journey into Sweet Dreams.mp3" },
        { id: 9, title: "Lovers' Oath", file: "sounds/bgm/Lovers' Oath.mp3" },
        { id: 10, title: "Sumeru City Lullaby (Piano)", file: "sounds/bgm/Sumeru City Lullaby (Piano Version).mp3" },
        { id: 11, title: "Sumeru City Relaxing Night (Harp)", file: "sounds/bgm/Sumeru City Relaxing Night (Harp Version).mp3" },
    ],
    currentTrackIndex: 0,
    bgmVolume: 0.5,
    isMusicMuted: false
};

const GLOBAL_FOUR_STAR_DROPS = ["berserker", "the_exile"];
const DOMAIN_DATABASE = [
    {
        id: "peak-of-vindagnyr",
        name: "Peak of Vindagnyr",
        boss: "Cryo Hypostasis",
        hp: 750000,
        timeLimit: 60,
        fiveStarPool: ["ocean_clam", "shimenawa"],
        image: "img/boss/cryo_hypostasis.webp"
    },
    {
        id: "midsummer-courtyard",
        name: "Midsummer Courtyard",
        boss: "Thunder Manifestation",
        hp: 1000000,
        timeLimit: 60,
        fiveStarPool: ["thundering_fury", "gladiator"],
        image: "img/boss/thunder_manifestation.webp"
    },
    {
        id: "momiji-dyed-court",
        name: "Momiji Dyed Court",
        boss: "Perpetual Mechanical Array",
        hp: 1250000,
        timeLimit: 60,
        fiveStarPool: ["severed_fate", "noblesse"],
        image: "img/boss/pma.webp"
    },
    {
        id: "valley-of-remembrance",
        name: "Valley of Remembrance",
        boss: "Maguu Kenki",
        hp: 1500000,
        timeLimit: 60,
        fiveStarPool: ["golden_troupe", "marechaussee"],
        image: "img/boss/maguu_kenki.webp"
    },
];

window.achievementsData = [
    // ─── PATH 1: THE CLICKER'S JOURNEY (10 Achievements) ───
    { id: 'clicks_100', title: 'Novice Clicker', desc: 'Click the central Primogem 100 times.', type: 'clicks', target: 100, bonus: 0.01 },
    { id: 'clicks_1k', title: 'Steady Rhythm', desc: 'Click the central Primogem 1,000 times.', type: 'clicks', target: 1000, bonus: 0.01 },
    { id: 'clicks_10k', title: 'Dedicated Path', desc: 'Click the central Primogem 10,000 times.', type: 'clicks', target: 10000, bonus: 0.02 },
    { id: 'clicks_100k', title: 'Fervent Tap', desc: 'Click the central Primogem 100,000 times.', type: 'clicks', target: 100000, bonus: 0.02 },
    { id: 'clicks_1m', title: 'Calloused Fingers', desc: 'Click the central Primogem 1,000,000 times.', type: 'clicks', target: 1000000, bonus: 0.03 },
    { id: 'clicks_10m', title: 'Unstoppable Momentum', desc: 'Click the central Primogem 10,000,000 times.', type: 'clicks', target: 10000000, bonus: 0.03 },
    { id: 'clicks_100m', title: 'Legendary Tempo', desc: 'Click the central Primogem 100,000,000 times.', type: 'clicks', target: 100000000, bonus: 0.04 },
    { id: 'clicks_1b', title: 'Shattered Mouse', desc: 'Click the central Primogem 1,000,000,000 times.', type: 'clicks', target: 1000000000, bonus: 0.04 },
    { id: 'clicks_10b', title: 'God of Friction', desc: 'Click the central Primogem 10,000,000,000 times.', type: 'clicks', target: 10000000000, bonus: 0.05 },
    { id: 'clicks_100b', title: 'Teyvat Celestial Clicker', desc: 'Click the central Primogem 100,000,000,000 times.', type: 'clicks', target: 100000000000, bonus: 0.06 },

    // ─── PATH 2: THE TOOL MASTER (10 Achievements) ───
    { id: 'upgrades_10', title: 'Sharpened Edge', desc: 'Reach 10 total click upgrade levels.', type: 'clickUpgrades', target: 10, bonus: 0.01 },
    { id: 'upgrades_100', title: 'Enchanted Tools', desc: 'Reach 100 total click upgrade levels.', type: 'clickUpgrades', target: 100, bonus: 0.01 },
    { id: 'upgrades_1k', title: 'Heavy Handed', desc: 'Reach 1,000 total click upgrade levels.', type: 'clickUpgrades', target: 1000, bonus: 0.02 },
    { id: 'upgrades_10k', title: 'Impact Mastery', desc: 'Reach 10,000 total click upgrade levels.', type: 'clickUpgrades', target: 10000, bonus: 0.02 },
    { id: 'upgrades_100k', title: 'Kinetic Overload', desc: 'Reach 100,000 total click upgrade levels.', type: 'clickUpgrades', target: 100000, bonus: 0.03 },
    { id: 'upgrades_1m', title: 'Sonic Strike', desc: 'Reach 1,000,000 total click upgrade levels.', type: 'clickUpgrades', target: 1000000, bonus: 0.03 },
    { id: 'upgrades_10m', title: 'Continental Cleaver', desc: 'Reach 10,000,000 total click upgrade levels.', type: 'clickUpgrades', target: 10000000, bonus: 0.04 },
    { id: 'upgrades_100m', title: 'Relic Unleashed', desc: 'Reach 100,000,000 total click upgrade levels.', type: 'clickUpgrades', target: 100000000, bonus: 0.04 },
    { id: 'upgrades_1b', title: 'Subatomic Impact', desc: 'Reach 1,000,000,000 total click upgrade levels.', type: 'clickUpgrades', target: 1000000000, bonus: 0.05 },
    { id: 'upgrades_10b', title: 'Ascended Might', desc: 'Reach 10,000,000,000 total click upgrade levels.', type: 'clickUpgrades', target: 10000000000, bonus: 0.06 },

    // ─── PATH 3: INDUSTRIAL REVOLUTION (10 Achievements) ───
    { id: 'gens_10', title: 'Resource Manager', desc: 'Own 10 total passive generators.', type: 'totalGenerators', target: 10, bonus: 0.01 },
    { id: 'gens_100', title: 'Automated Outpost', desc: 'Own 100 total passive generators.', type: 'totalGenerators', target: 100, bonus: 0.01 },
    { id: 'gens_1k', title: 'Factory Blueprint', desc: 'Own 1,000 total passive generators.', type: 'totalGenerators', target: 1000, bonus: 0.02 },
    { id: 'gens_10k', title: 'Production Line', desc: 'Own 10,000 total passive generators.', type: 'totalGenerators', target: 10000, bonus: 0.02 },
    { id: 'gens_100k', title: 'Industrial District', desc: 'Own 100,000 total passive generators.', type: 'totalGenerators', target: 100000, bonus: 0.03 },
    { id: 'gens_1m', title: 'Teyvat Conglomerate', desc: 'Own 1,000,000 total passive generators.', type: 'totalGenerators', target: 1000000, bonus: 0.03 },
    { id: 'gens_10m', title: 'Automated Empire', desc: 'Own 10,000,000 total passive generators.', type: 'totalGenerators', target: 10000000, bonus: 0.04 },
    { id: 'gens_100m', title: 'Mechanical Overlord', desc: 'Own 100,000,000 total passive generators.', type: 'totalGenerators', target: 100000000, bonus: 0.04 },
    { id: 'gens_1b', title: 'Dyson Swarm Blueprint', desc: 'Own 1,000,000,000 total passive generators.', type: 'totalGenerators', target: 1000000000, bonus: 0.05 },
    { id: 'gens_10b', title: 'Infinite Engine', desc: 'Own 10,000,000,000 total passive generators.', type: 'totalGenerators', target: 10000000000, bonus: 0.06 },

    // ─── PATH 4: TREASURE HOARDER (10 Total Primogems Achievements) ───
    { id: 'primos_1k', title: 'Genshin Pocket Money', desc: 'Earn 1,000 total Primogems ever.', type: 'totalPrimos', target: 1000, bonus: 0.01 },
    { id: 'primos_10k', title: 'Welkin Moon Stash', desc: 'Earn 10,000 total Primogems ever.', type: 'totalPrimos', target: 10000, bonus: 0.01 },
    { id: 'primos_100k', title: 'Hoarder Cache', desc: 'Earn 100,000 total Primogems ever.', type: 'totalPrimos', target: 100000, bonus: 0.02 },
    { id: 'primos_1m', title: 'Abyssal Fortune', desc: 'Earn 1,000,000 total Primogems ever.', type: 'totalPrimos', target: 1000000, bonus: 0.02 },
    { id: 'primos_10m', title: 'Secret Treasury', desc: 'Earn 10,000,000 total Primogems ever.', type: 'totalPrimos', target: 10000000, bonus: 0.03 },
    { id: 'primos_100m', title: 'Mora Rivalry', desc: 'Earn 100,000,000 total Primogems ever.', type: 'totalPrimos', target: 100000000, bonus: 0.03 },
    { id: 'primos_1b', title: 'Northland Bank Vault', desc: 'Earn 1,000,000,000 total Primogems ever.', type: 'totalPrimos', target: 1000000000, bonus: 0.04 },
    { id: 'primos_10b', title: 'Archon Wealth', desc: 'Earn 10,000,000,000 total Primogems ever.', type: 'totalPrimos', target: 10000000000, bonus: 0.04 },
    { id: 'primos_100b', title: 'Celestial Capital', desc: 'Earn 100,000,000,000 total Primogems ever.', type: 'totalPrimos', target: 100000000000, bonus: 0.05 },
    { id: 'primos_1t', title: 'Phanes Sovereign Reserve', desc: 'Earn 1,000,000,000,000 total Primogems ever.', type: 'totalPrimos', target: 1000000000000, bonus: 0.06 }
];

window.game = game;