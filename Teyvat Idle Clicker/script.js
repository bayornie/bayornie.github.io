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

// --- GAME DATA ---
let isLoggedIn = false;
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
        { id: 'lamp', name: 'Lamp Grass', cost: 300, income: 2, count: 0 },
        { id: 'sunsettia', name: 'Sunsettia', cost: 1000, income: 5, count: 0 },
        { id: 'common_chest', name: 'Common Chest', cost: 5000, income: 25, count: 0 },
        { id: 'exquisite_chest', name: 'Exquisite Chest', cost: 25000, income: 50, count: 0 }
    ],

    blessings: [
        { id: 'crit', name: "Adventurer's Luck", cost: 1, level: 0, desc: '+5% Crit Click Chance' },
        { id: 'fast_gen', name: "Ley Line Efficiency", cost: 2, level: 0, desc: '+10% Generator Speed' },
        { id: 'strong_start', name: "Hero's Wit", cost: 5, level: 0, desc: 'Start with +25 Click Power' },
        { id: 'resonance', name: "Elemental Resonance", cost: 10, level: 0, desc: '+10% Total Multiplier' }
    ],

    shopItems: [
        { id: 'time_warp', name: "Time Warp", cost: 20000, desc: "Instantly gain 30 minutes of passive income." },
        { id: 'seelie', name: "Follower Seelie", cost: 50000, desc: "A helpful spirit that clicks for you once every 3 seconds." },
        { id: 'buff_pot', name: "Adepti's Temptation", cost: 75000, desc: "Permanently increases click multiplier by +0.5x." },
        { id: 'primordial_shard', name: "Primordial Shard", cost: 300000, desc: "Permanently increases all PPS by 10%." }
    ],
};

// --- CORE LOGIC ---
document.getElementById('click-area').addEventListener('mousedown', (e) => {
    if (!isLoggedIn) {
        showNotification("Please Login to start collecting!");
        openAuth();
        return;
    }

    let amount = game.clickPower * game.multiplier;

    const critBlessing = game.blessings.find(b => b.id === 'crit');
    const critLevel = critBlessing ? critBlessing.level : 0;
    const critChance = critLevel * 0.05;

    const isCrit = Math.random() < critChance;
    let displayPops = `+${Math.floor(amount)}`;

    if (isCrit) {
        amount *= 5; // 5x multiplier for a Critical Hit
        displayPops = `CRIT! +${Math.floor(amount)}`;
    }

    game.primos += amount;
    game.totalPrimosEver += amount;

    spawnText(e.clientX, e.clientY, displayPops);
    updateUI();
});

// Passive Income Loop
setInterval(() => {
    if (!isLoggedIn) return;

    let totalPPS = 0;
    game.generators.forEach(g => {
        totalPPS += (g.income * g.count);
    });

    let income = (totalPPS * game.multiplier) / 10;
    game.primos += income;
    game.totalPrimosEver += income;
    updateUI();
}, 100);

// --- UI FUNCTIONS ---
function showNotification(message) {
    const toast = document.getElementById('game-toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showPanel(panelId) {
    document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
    const targetPanel = document.getElementById(`${panelId}-panel`);
    if (targetPanel) targetPanel.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');

    if (panelId === 'upgrades') renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    if (panelId === 'generators') renderList('gen-upgrades', game.generators, buyGenerator);
    if (panelId === 'prestige') { renderPrestigeUpgrades(); };
    if (panelId === 'shop') { renderShopItems(); };
}

function updateUI() {
    document.getElementById('primogems').innerText = Math.floor(game.primos).toLocaleString();
    document.getElementById('stat-total').innerText = Math.floor(game.primos).toLocaleString();
    document.getElementById('stat-mult').innerText = game.multiplier.toFixed(2) + 'x';
    document.getElementById('stat-click').innerText = (game.clickPower * game.multiplier).toFixed(0);

    let totalPPS = 0;
    game.generators.forEach(g => totalPPS += (g.income * g.count));
    document.getElementById('stat-pps').innerText = (totalPPS * game.multiplier).toFixed(1);

    updateCardStates('click-upgrades', game.clickUpgrades);
    updateCardStates('gen-upgrades', game.generators);

    // 1. Update the Prestige Points counter
    const prestigeDisplay = document.getElementById('stat-prestige');
    if (prestigeDisplay) {
        prestigeDisplay.innerText = (game.prestigePoints || 0).toLocaleString();
    }

    // 2. Update the Ascension Button appearance
    const ascBtn = document.getElementById('ascension-btn');
    if (ascBtn) {
        if (game.primos >= 1000000) {
            ascBtn.classList.remove('disabled');
            ascBtn.innerText = "Ascend Now!";
        } else {
            ascBtn.classList.add('disabled');
            ascBtn.innerText = `Ascend (Requires 1M)`;
        }
    }
}

function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = passwordInput.nextElementSibling;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.innerText = "👁️";
    } else {
        passwordInput.type = "password";
        toggleIcon.innerText = "🔒";
    }
}

function calculateOfflineEarnings() {
    let totalPPS = 0;
    game.generators.forEach(g => {
        totalPPS += (g.income * g.count);
    });
    game.pps = totalPPS * game.multiplier;

    const now = Date.now();
    const lastLogin = game.lastLogin || now;

    let secondsAway = Math.floor((now - lastLogin) / 1000);
    if (secondsAway <= 30) return;

    const maxSeconds = 36000; // 10 Hours
    if (secondsAway > maxSeconds) secondsAway = maxSeconds;

    const earned = secondsAway * game.pps;

    if (earned > 0) {
        game.primos += earned;
        game.totalPrimosEver += earned;
        game.lastLogin = now;

        const hours = Math.floor(secondsAway / 3600);
        const mins = Math.floor((secondsAway % 3600) / 60);

        showOfflineModal(earned, hours, mins);
        saveCloudGame();
    }
}

function showOfflineModal(amount, h, m) {
    const modal = document.getElementById('offline-modal');
    if (!modal) return;

    const timeText = document.getElementById('offline-time-text');
    const amountText = document.getElementById('offline-amount-text');

    if (timeText) timeText.innerText = `You were away for ${h > 0 ? h + "h " : ""}${m}m`;
    if (amountText) amountText.innerText = Math.floor(amount).toLocaleString();

    // Force it to show
    modal.style.setProperty('display', 'flex', 'important');
}

function closeOfflineModal() {
    document.getElementById('offline-modal').style.display = 'none';
}

function updateCardStates(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cards = container.querySelectorAll('.upgrade-card');
    data.forEach((item, index) => {
        if (cards[index]) {
            if (game.primos < item.cost) {
                cards[index].classList.add('disabled');
            } else {
                cards[index].classList.remove('disabled');
            }

            let displayLvl = item.level !== undefined ? item.level : item.count;
            const costSpan = cards[index].querySelector('.cost-val');
            const lvlSmall = cards[index].querySelector('.lvl-val');

            if (costSpan) costSpan.innerText = Math.floor(item.cost).toLocaleString();
            if (lvlSmall) lvlSmall.innerText = displayLvl;
        }
    });
}

// --- PURCHASING ---
function buyClickUpgrade(index) {
    if (!isLoggedIn) {
        showNotification("Login to purchase upgrades!");
        return;
    }

    let up = game.clickUpgrades[index];
    if (game.primos >= up.cost) {
        game.primos -= up.cost;
        up.level++;
        game.clickPower += up.power;
        up.cost *= 1.5;
        updateUI();
        saveCloudGame();
    }
}

function buyGenerator(index) {
    if (!isLoggedIn) {
        showNotification("Login to purchase generators!");
        return;
    }

    let gen = game.generators[index];
    if (game.primos >= gen.cost) {
        game.primos -= gen.cost;
        gen.count++;
        gen.cost *= 1.75;
        updateUI();
        saveCloudGame();
    }
}

function buyBlessing(index) {
    let b = game.blessings[index];
    if (game.prestigePoints >= b.cost) {
        game.prestigePoints -= b.cost;
        b.level++;
        b.cost = Math.ceil(b.cost * 2);

        // Apply immediate effects if needed
        if (b.id === 'strong_start') game.clickPower += 10;

        showNotification(`${b.name} Level Up!`);
        updateUI();
        renderPrestigeUpgrades();
        saveCloudGame();
    } else {
        showNotification("Not enough Prestige Points!");
    }
}

function buyShopItem(index) {
    if (!isLoggedIn) {
        showNotification("Login to access the Shop!");
        return;
    }

    let item = game.shopItems[index];
    if (game.primos >= item.cost) {
        game.primos -= item.cost;

        // --- SPECIAL EFFECTS ---
        if (item.id === 'time_warp') {
            const now = Date.now();
            const cooldown = 3600 * 1000;
            const timePassed = now - (game.lastWarpTime || 0);

            if (timePassed < cooldown) {
                const minutesLeft = Math.ceil((cooldown - timePassed) / 60000);
                showNotification(`Time Warp is on cooldown! Wait ${minutesLeft}m.`);
                return; // Stop the purchase
            }

            // --- If not on cooldown, proceed with the warp ---
            let totalPPS = 0;
            game.generators.forEach(g => totalPPS += (g.income * g.count));
            let bonus = (totalPPS * game.multiplier) * 1800;

            game.primos += bonus;
            game.lastWarpTime = now;
            item.cost = Math.floor(item.cost * 2);
            showNotification(`Time Warped! Gained ${Math.floor(bonus).toLocaleString()} Primos!`);
        }

        if (item.id === 'seelie') {
            if ((game.seelies || 0) >= 3) {
                showNotification("You can only carry 3 Seelies at a time!");
                return;
            }

            game.seelies = (game.seelies || 0) + 1;
            item.cost = Math.ceil(item.cost * 2.5);

            showNotification(`Seelie #${game.seelies} joined your journey!`);

            if (game.seelies === 3) {
                item.name = "Follower Seelie (MAX)";
                item.desc = "You have reached the maximum number of Seelies.";
            }
        }

        if (item.id === 'buff_pot') {
            game.multiplier += 0.5;
            item.cost = Math.floor(item.cost * 2);
            showNotification("Consumed Adepti's Temptation! Multiplier increased.");
        }

        if (item.id === 'primordial_shard') {
            game.generators.forEach(gen => {
                gen.income *= 1.1;
            });
            item.cost = Math.floor(item.cost * 3);
            showNotification("Primordial Shard fused! All generators are 10% more effective.");
        }

        updateUI();
        renderShopItems();
        saveCloudGame();
    } else {
        showNotification("Not enough Primogems!");
    }
}

// --- SEELIE AUTO-CLICKER SYSTEM ---
setInterval(() => {
    if (!isLoggedIn || !game.seelies || game.seelies <= 0) return;

    // A Seelie clicks for you!
    let amount = (game.clickPower * game.multiplier);
    game.primos += (amount * game.seelies);
    game.totalPrimosEver += (amount * game.seelies);

    updateUI();
}, 3000);

function spawnText(x, y, txt) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.innerText = txt;
    const randomX = (Math.random() - 0.5) * 40;
    const randomY = (Math.random() - 0.5) * 20;
    el.style.left = (x + randomX) + 'px';
    el.style.top = (y + randomY) + 'px';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 800);
}

// --- PRESTIGE SYSTEM ---

function ascend() {
    if (!isLoggedIn) {
        showNotification("Login to reach Ascension!");
        openAuth();
        return;
    }

    // 2. Check if player meets the 1M requirement
    if (game.primos < 1000000) {
        showNotification("Not enough Primogems to Ascend yet!");
        return;
    }

    // 3. Calculate Points (1 point for every 1M)
    let pointsGained = Math.floor(game.primos / 1000000);
    game.prestigePoints = (game.prestigePoints || 0) + pointsGained;

    // 4. Update the Multiplier (Permanent Buff)
    game.multiplier += (pointsGained * 0.1);

    // 5. Reset Progress (Sacrifice)
    game.primos = 0;
    game.clickPower = 1;

    // Reset Upgrades and Generators back to Level 0 and base costs
    game.clickUpgrades.forEach(up => {
        up.level = 0;
        up.cost = getBaseCost(up.id);
    });

    game.generators.forEach(gen => {
        gen.count = 0;
        gen.cost = getBaseCost(gen.id);
    });

    // 6. Refresh everything
    updateUI();
    saveCloudGame();
    showNotification(`Ascension Complete! Multiplier increased by ${pointsGained * 10}%.`);
}

// Helper to get initial costs for the reset
function getBaseCost(id) {
    const baseCosts = {
        // Click Upgrades
        'hands': 10,
        'trowel': 150,
        'steel_trowel': 500,
        'dull_blade': 2500,
        'silver_sword': 5000,

        // Generators
        'flower': 50,
        'lamp': 300,
        'sunsettia': 1000,
        'common_chest': 5000,
        'exquisite_chest': 25000
    };
    return baseCosts[id] || 100;
}

// --- RENDERING FUNCTIONS ---

function renderList(containerId, data, clickFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    data.forEach((item, index) => {
        let displayLvl = item.level !== undefined ? item.level : item.count;
        const card = document.createElement('div');
        card.className = `upgrade-card ${game.primos < item.cost ? 'disabled' : ''}`;
        card.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.power ? '+' + item.power + ' Click' : '+' + item.income + '/s'}</small>
            </div>
            <div>
                <span>Cost: <span class="cost-val">${Math.floor(item.cost).toLocaleString()}</span></span><br>
                <small>Lvl: <span class="lvl-val">${displayLvl}</span></small>
            </div>
        `;
        card.onclick = () => clickFn(index);
        container.appendChild(card);
    });
}

function renderPrestigeUpgrades() {
    const container = document.getElementById('prestige-upgrades');
    if (!container) return;
    container.innerHTML = '';

    game.blessings.forEach((blessing, index) => {
        const card = document.createElement('div');
        card.className = `upgrade-card ${game.prestigePoints < blessing.cost ? 'disabled' : ''}`;
        card.innerHTML = `
            <div>
                <strong>${blessing.name}</strong><br>
                <small>${blessing.desc}</small>
            </div>
            <div>
                <span>Cost: <span class="highlight">${blessing.cost} PP</span></span><br>
                <small>Lvl: ${blessing.level}</small>
            </div>
        `;
        card.onclick = () => buyBlessing(index);
        container.appendChild(card);
    });
}

function renderShopItems() {
    const container = document.getElementById('shop-items');
    if (!container) return;
    container.innerHTML = '';

    game.shopItems.forEach((item, index) => {
        const card = document.createElement('div');

        // --- COOLDOWN LOGIC ---
        let isOnCooldown = false;
        let cooldownText = "";

        if (item.id === 'time_warp' && game.lastWarpTime) {
            const now = Date.now();
            const cooldownPeriod = 3600000; // 1 hour in ms
            const timePassed = now - game.lastWarpTime;

            if (timePassed < cooldownPeriod) {
                isOnCooldown = true;
                const minsLeft = Math.ceil((cooldownPeriod - timePassed) / 60000);
                cooldownText = `Ready in ${minsLeft}m`;
            }
        }

        const isMaxSeelie = item.id === 'seelie' && (game.seelies || 0) >= 3;
        const canAfford = game.primos >= item.cost;

        // Disable if: Can't afford OR Max Seelies OR On Cooldown
        card.className = `upgrade-card ${(!canAfford || isMaxSeelie || isOnCooldown) ? 'disabled' : ''}`;

        // Determine what to display in the cost area
        let costDisplay;
        if (isMaxSeelie) {
            costDisplay = `<span class="highlight">MAXED</span>`;
        } else if (isOnCooldown) {
            costDisplay = `<span class="highlight">${cooldownText}</span>`;
        } else {
            costDisplay = `Cost: <span class="highlight">${item.cost.toLocaleString()}</span>`;
        }

        card.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.desc}</small>
            </div>
            <div>
                <span>${costDisplay}</span>
            </div>
        `;

        card.onclick = () => {
            if (isMaxSeelie) {
                showNotification("You already have the maximum number of Seelies!");
            } else if (isOnCooldown) {
                showNotification("This item is still on cooldown!");
            } else {
                buyShopItem(index);
            }
        };

        container.appendChild(card);
    });
}

// --- AUTH & CLOUD SAVE LOGIC ---
function openAuth() {
    document.getElementById('auth-overlay').style.display = 'flex';
}

function openProfile() {
    const user = auth.currentUser;
    if (user) {
        const profName = document.getElementById('prof-name');
        if (profName) {
            profName.innerText = game.playerName || "Traveler";
        }

        if (document.getElementById('prof-primos')) {
            document.getElementById('prof-primos').innerText = Math.floor(game.primos).toLocaleString();
        }

        if (document.getElementById('prof-power')) {
            document.getElementById('prof-power').innerText = (game.clickPower * game.multiplier).toFixed(0);
        }

        if (document.getElementById('prof-per-sec')) {
            let totalIncome = 0;
            game.generators.forEach(gen => {
                totalIncome += gen.count * gen.income;
            });
            document.getElementById('prof-per-sec').innerText = totalIncome.toFixed(1);
        }

        document.getElementById('profile-overlay').style.display = 'flex';
    } else {
        showNotification("Please login to view profile!");
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        location.reload();
    });
}

async function handleAuth(type) {
    const usernameInput = document.getElementById(type === 'login' ? 'username' : 'reg-username').value;
    const email = usernameInput + "@game.com";
    const pass = document.getElementById(type === 'login' ? 'password' : 'reg-password').value;

    if (pass.length < 6) {
        showNotification("Password must be at least 6 characters!");
        return;
    }

    try {
        if (type === 'register') {
            game.playerName = usernameInput; 

            const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
            await db.collection("users").doc(userCredential.user.uid).set(game);
            showNotification(`Ad Astra Abyssosque, ${game.playerName}!`);
        } else {
            await auth.signInWithEmailAndPassword(email, pass);
            showNotification("Welcome back, Traveler!");
        }
        document.getElementById('auth-overlay').style.display = 'none';
    } catch (error) {
        showNotification(error.message);
    }
}

auth.onAuthStateChanged((user) => {
    const loginTrigger = document.getElementById('login-nav-btn');
    const userControls = document.getElementById('user-controls');

    if (user) {
        isLoggedIn = true;
        document.getElementById('auth-overlay').style.display = 'none';
        if (loginTrigger) loginTrigger.style.display = 'none';
        if (userControls) userControls.style.display = 'block';
        loadCloudGame(user.uid);
    } else {
        isLoggedIn = false;
        document.getElementById('auth-overlay').style.display = 'none';
        if (loginTrigger) {
            loginTrigger.style.display = 'block';
            loginTrigger.innerText = "Login / Register";
        }
        if (userControls) userControls.style.display = 'none';
        updateUI();
    }
});

async function saveCloudGame() {
    game.lastLogin = Date.now();
    const user = auth.currentUser;
    if (user) {
        await db.collection("users").doc(user.uid).set(game);
        console.log("Cloud Saved!");
    }
}

async function loadCloudGame(uid) {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
        let cloudData = doc.data();

        // 1. SMART SYNC: Click Upgrades
        game.clickUpgrades.forEach((localItem, index) => {
            if (!cloudData.clickUpgrades[index]) {
                cloudData.clickUpgrades.push(localItem);
            } else {
                cloudData.clickUpgrades[index].name = localItem.name;
                cloudData.clickUpgrades[index].power = localItem.power;
            }
        });

        // 2. SMART SYNC: Generators
        game.generators.forEach((localGen, index) => {
            if (!cloudData.generators[index]) {
                cloudData.generators.push(localGen);
            } else {
                cloudData.generators[index].name = localGen.name;
                cloudData.generators[index].income = localGen.income;
            }
        });

        // 3. SMART SYNC: Blessings
        game.blessings.forEach((localBlessing, index) => {
            if (!cloudData.blessings[index]) {
                cloudData.blessings.push(localBlessing);
            } else {
                cloudData.blessings[index].name = localBlessing.name;
                cloudData.blessings[index].desc = localBlessing.desc;
            }
        });

        // 4. SMART SYNC: Shop Items
        game.shopItems.forEach((localShop, index) => {
            if (!cloudData.shopItems[index]) {
                cloudData.shopItems.push(localShop);
            } else {
                cloudData.shopItems[index].name = localShop.name;
                cloudData.shopItems[index].desc = localShop.desc;
                cloudData.shopItems[index].cost = localShop.cost;
            }
        });

        // Safety for new variables
        if (cloudData.seelies === undefined) cloudData.seelies = 0;
        if (cloudData.prestigePoints === undefined) cloudData.prestigePoints = 0;
        
        // If name is missing or the generic "Traveler", pull the real username from their email
        if (!cloudData.playerName || cloudData.playerName === "Traveler") {
            const userEmail = auth.currentUser.email;
            if (userEmail) {
                // Takes 'Byoku' from 'Byoku@game.com'
                const recoveredName = userEmail.split('@')[0];
                cloudData.playerName = recoveredName.charAt(0).toUpperCase() + recoveredName.slice(1);
            } else {
                cloudData.playerName = "Traveler";
            }
        }

        game = cloudData;
        calculateOfflineEarnings();
        updateUI();
        saveCloudGame(); 
        console.log("Sync Complete: Player Name and Balance updated!");
    }
}

function toggleAuth() {
    const isLogin = document.getElementById('login-form').style.display !== 'none';
    document.getElementById('login-form').style.display = isLogin ? 'none' : 'block';
    document.getElementById('register-form').style.display = isLogin ? 'block' : 'none';
}

window.onclick = function (event) {
    const authOverlay = document.getElementById('auth-overlay');
    const profOverlay = document.getElementById('profile-overlay');
    if (event.target == authOverlay) authOverlay.style.display = "none";
    if (event.target == profOverlay) profOverlay.style.display = "none";
}

setInterval(saveCloudGame, 60000);
