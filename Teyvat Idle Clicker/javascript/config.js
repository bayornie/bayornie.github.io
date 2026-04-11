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

    clickUpgrades: [
        { id: 'hands', name: 'Stronger Hands', cost: 10, power: 1, level: 0 },
        { id: 'trowel', name: 'Stone Trowel', cost: 150, power: 5, level: 0 },
        { id: 'steel_trowel', name: 'Steel Trowel', cost: 500, power: 10, level: 0 },
        { id: 'dull_blade', name: 'Dull Blade', cost: 2500, power: 20, level: 0 },
        { id: 'silver_sword', name: 'Silver Sword', cost: 5000, power: 50, level: 0 }
    ],

    generators: [
        { id: 'flower', name: 'Sweet Flower', cost: 50, income: 0.5, count: 0 },
        { id: 'lamp', name: 'Lamp Grass', cost: 300, income: 2.0, count: 0 },
        { id: 'sunsettia', name: 'Sunsettia', cost: 1000, income: 5.0, count: 0 },
        { id: 'common_chest', name: 'Common Chest', cost: 5000, income: 20.0, count: 0 },
        { id: 'exquisite_chest', name: 'Exquisite Chest', cost: 25000, income: 50.0, count: 0 }
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
};
