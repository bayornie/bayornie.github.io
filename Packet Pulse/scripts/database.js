// database.js
const DB_NAME = "PacketPulseDB";
const DB_VERSION = 1;
const STORE_NAME = "GameState";

let db;

/**
 * Initializes the IndexedDB database.
 * @returns {Promise} */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            console.log("Offline Database Ready.");
            resolve();
        };

        request.onerror = (e) => {
            console.error("Database failed to load:", e.target.error);
            reject(e.target.error);
        };
    });
}

/*Saves the current game state */
function saveGame(nodes, upgrades, camera, totalBytes, connections) {
    if (!db) return;

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const gameState = {
        nodes: nodes,
        upgrades: upgrades,
        camera: camera,
        totalBytes: totalBytes,
        connections: connections,
        timestamp: Date.now()
    };

    store.put(gameState, "current_session");
}

/* Loads the saved game state */
function loadGame() {
    return new Promise((resolve, reject) => {
        if (!db) reject("Database not initialized");

        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get("current_session");

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}