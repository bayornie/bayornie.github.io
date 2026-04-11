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
let game = {
    playerName: "Traveler",
    primos: 0,
    totalPrimosEver: 0,
    lastWarpTime: 0,
    prestigePoints: 0,
    multiplier: 1.0,
    clickPower: 1,
    lastLogin: Date.now(),
    pps: 0,
    seelies: 0,
    ownedPets: [],
    activePets: [],

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
        { id: 'strong_start', name: "Hero's Wit", cost: 5, level: 0, desc: 'Start with +25 Click Power' },
        { id: 'resonance', name: "Elemental Resonance", cost: 10, level: 0, desc: '+10% Total Multiplier' }
    ],

    shopItems: [
        { id: 'time_warp', name: "Time Warp", cost: 20000, desc: "Instantly gain 30 minutes of passive income." },
        { id: 'seelie', name: "Follower Seelie", cost: 150000, desc: "A helpful spirit that clicks for you once every 3 seconds." },
        { id: 'buff_pot', name: "Adepti's Temptation", cost: 300000, desc: "Permanently increases click multiplier by +0.5x." },
        { id: 'primordial_shard', name: "Primordial Shard", cost: 750000, desc: "Permanently increases all PPS by 10%." }
    ],

    pets: [
        // --- 4 STAR PETS ---
        { id: 'sucrose', name: 'Sucrose', rarity: 4, vision: 'Anemo', buffType: 'click', buffValue: 0.15, icon: 'img/pets/sucrose_chibi.png', owned: false },
        { id: 'bennett', name: 'Bennett', rarity: 4, vision: 'Pyro', buffType: 'pps', buffValue: 0.10, icon: 'img/pets/bennett_chibi.png', owned: false },
        { id: 'xingqiu', name: 'Xingqiu', rarity: 4, vision: 'Hydro', buffType: 'special_click', buffValue: 100, icon: 'img/pets/xingqiu_chibi.png', owned: false },
        { id: 'yaoyao', name: 'Yaoyao', rarity: 4, vision: 'Dendro', buffType: 'discount', buffValue: 0.05, icon: 'img/pets/yaoyao_chibi.png', owned: false },
        { id: 'fischl', name: 'Fischl', rarity: 4, vision: 'Electro', buffType: 'autoclick', buffValue: 2500, icon: 'img/pets/fischl_chibi.png', owned: false },
        { id: 'kaeya', name: 'Kaeya', rarity: 4, vision: 'Cryo', buffType: 'freeze', buffValue: 60, icon: 'img/pets/kaeya_chibi.png', owned: false },
        { id: 'noelle', name: 'Noelle', rarity: 4, vision: 'Geo', buffType: 'prestige_bonus', buffValue: 0.15, icon: 'img/pets/noelle_chibi.png', owned: false },

        // --- 5 STAR PETS ---
        { id: 'xiao', name: 'Xiao', rarity: 5, vision: 'Anemo', buffType: 'click', buffValue: 0.40, icon: 'img/pets/xiao_chibi.png', owned: false },
        { id: 'arlecchino', name: 'Arlecchino', rarity: 5, vision: 'Pyro', buffType: 'global_mult', buffValue: 1.5, icon: 'img/pets/arlecchino_chibi.png', owned: false },
        { id: 'columbina', name: 'Columbina', rarity: 5, vision: 'Hydro', buffType: 'pps_mult', buffValue: 2.0, icon: 'img/pets/columbina_chibi.png', owned: false },
        { id: 'nahida', name: 'Nahida', rarity: 5, vision: 'Dendro', buffType: 'discount', buffValue: 0.15, icon: 'img/pets/nahida_chibi.png', owned: false },
        { id: 'raiden', name: 'Raiden Shogun', rarity: 5, vision: 'Electro', buffType: 'auto_burst', buffValue: 0.10, interval: 1000, icon: 'img/pets/raiden_chibi.png', owned: false },
        { id: 'skirk', name: 'Skirk', rarity: 5, vision: 'Cryo', buffType: 'crit_click', buffValue: 3.0, icon: 'img/pets/skirk_chibi.png', owned: false },
        { id: 'xilonen', name: 'Xilonen', rarity: 5, vision: 'Geo', buffType: 'prestige_perm', buffValue: 0.25, icon: 'img/pets/xilonen_chibi.png', owned: false }
    ]
};
