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

// --- 1. GAME DATA ---
let game = {
    primos: 0,
    totalPrimosEver: 0,
    prestigePoints: 0,
    multiplier: 1.0,
    clickPower: 1,
    
    clickUpgrades: [
        { id: 'hands', name: 'Stronger Hands', cost: 10, power: 1, level: 0 },
        { id: 'trowel', name: 'Stone Trowel', cost: 150, power: 5, level: 0 },
        { id: 'trowel', name: 'Steel Trowel', cost: 500, power: 10, level: 0 }
    ],
    
    generators: [
        { id: 'flower', name: 'Sweet Flower', cost: 50, income: 0.25, count: 0 },
        { id: 'lamp', name: 'Lamp Grass', cost: 250, income: 1, count: 0 },
        { id: 'sunsettia', name: 'Sunsettia', cost: 1000, income: 5.0, count: 0 }
    ]
};

// --- 2. CORE LOGIC ---
document.getElementById('click-area').addEventListener('mousedown', (e) => {
    let amount = game.clickPower * game.multiplier;
    game.primos += amount;
    game.totalPrimosEver += amount;
    
    spawnText(e.clientX, e.clientY, `+${Math.floor(amount)}`);
    updateUI();
});

// Passive Income Loop
setInterval(() => {
    let totalPPS = 0;
    game.generators.forEach(g => {
        totalPPS += (g.income * g.count);
    });
    
    let income = (totalPPS * game.multiplier) / 10;
    game.primos += income;
    game.totalPrimosEver += income;
    updateUI();
}, 100);

// --- 3. UI FUNCTIONS ---
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
    if(targetPanel) targetPanel.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');

    if (panelId === 'upgrades') renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    if (panelId === 'generators') renderList('gen-upgrades', game.generators, buyGenerator);
}

function updateUI() {
    document.getElementById('primo-count').innerText = Math.floor(game.primos).toLocaleString();
    document.getElementById('stat-total').innerText = Math.floor(game.primos).toLocaleString();
    document.getElementById('stat-mult').innerText = game.multiplier.toFixed(2) + 'x';
    document.getElementById('stat-click').innerText = (game.clickPower * game.multiplier).toFixed(0);
    
    let totalPPS = 0;
    game.generators.forEach(g => totalPPS += (g.income * g.count));
    document.getElementById('stat-pps').innerText = (totalPPS * game.multiplier).toFixed(1);

    updateCardStates('click-upgrades', game.clickUpgrades);
    updateCardStates('gen-upgrades', game.generators);
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
                <small>${item.power ? '+'+item.power+' Click' : '+'+item.income+'/s'}</small>
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

// --- 4. PURCHASING ---
function buyClickUpgrade(index) {
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
    let gen = game.generators[index];
    if (game.primos >= gen.cost) {
        game.primos -= gen.cost;
        gen.count++;
        gen.cost *= 1.75;
        updateUI();
        saveCloudGame(); 
    }
}

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

// --- 5. AUTH & CLOUD SAVE LOGIC ---

function openAuth() {
    document.getElementById('auth-overlay').style.display = 'flex';
}

function openProfile() {
    const user = auth.currentUser;
    if (user) {
        if (document.getElementById('prof-primos')) {
            document.getElementById('prof-primos').innerText = Math.floor(game.primos).toLocaleString();
        }
        
        if (document.getElementById('prof-power')) {
            document.getElementById('prof-power').innerText = (game.clickPower * game.multiplier).toFixed(0);
        }
        
        // This shows the pop-up
        document.getElementById('profile-overlay').style.display = 'flex';
    } else {
        showToast("Please login to view profile!");
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        location.reload(); 
    });
}

async function handleAuth(type) {
    const email = document.getElementById(type === 'login' ? 'username' : 'reg-username').value + "@game.com"; 
    const pass = document.getElementById(type === 'login' ? 'password' : 'reg-password').value;

    if (pass.length < 6) {
        showNotification("Password must be at least 6 characters!");
        return;
    }

    try {
        if (type === 'register') {
            const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
            await db.collection("users").doc(userCredential.user.uid).set(game);
            showNotification("Ad Astra Abyssosque Traveler! Account Created.");
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
        document.getElementById('auth-overlay').style.display = 'none';
        if(loginTrigger) loginTrigger.style.display = 'none';
        if(userControls) userControls.style.display = 'block';
        loadCloudGame(user.uid);
    } else {
        document.getElementById('auth-overlay').style.display = 'none'; 
        if(loginTrigger) {
            loginTrigger.style.display = 'block';
            loginTrigger.innerText = "Login / Register";
        }
        if(userControls) userControls.style.display = 'none';
        updateUI(); 
    }
});

async function saveCloudGame() {
    const user = auth.currentUser;
    if (user) {
        await db.collection("users").doc(user.uid).set(game);
        console.log("Cloud Saved!");
    }
}

async function loadCloudGame(uid) {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
        game = doc.data();
        updateUI();
        console.log("Cloud Loaded!");
    }
}

function toggleAuth() {
    const isLogin = document.getElementById('login-form').style.display !== 'none';
    document.getElementById('login-form').style.display = isLogin ? 'none' : 'block';
    document.getElementById('register-form').style.display = isLogin ? 'block' : 'none';
}

window.onclick = function(event) {
    const authOverlay = document.getElementById('auth-overlay');
    const profOverlay = document.getElementById('profile-overlay');
    if (event.target == authOverlay) authOverlay.style.display = "none";
    if (event.target == profOverlay) profOverlay.style.display = "none";
}

setInterval(saveCloudGame, 60000);
