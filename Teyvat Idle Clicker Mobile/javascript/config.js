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
let lastTouchEnd = 0;
let clickCounter = 0;
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
        { id: 'strong_start', name: "Hero's Wit", cost: 5, level: 0, desc: 'Start with +5 Click Power' },
        { id: 'resonance', name: "Elemental Resonance", cost: 10, level: 0, desc: '+10% Total Multiplier' }
    ],

    shopItems: [
        { id: 'time_warp', name: "Time Warp", cost: 20000, level: 0, desc: "Instantly gain 30 minutes of passive income." },
        { id: 'seelie', name: "Follower Seelie", cost: 150000, level: 0, desc: "A helpful spirit that clicks for you once every 3 seconds." },
        { id: 'buff_pot', name: "Adepti's Temptation", cost: 300000, level: 0, desc: "Permanently increases click multiplier by +0.5x." },
        { id: 'primordial_shard', name: "Primordial Shard", cost: 750000, level: 0, desc: "Permanently increases generator multipliers by 10%." }
    ],

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
        { id: 5, title: "Falls of Maples", file: "sounds/bgm/Falls of Maples.mp3" },
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
