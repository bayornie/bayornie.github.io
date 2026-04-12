// --- HELPER FUNCTIONS ---
function formatNumbers(num) {
    if (num >= 1000000000000000000) return (num / 1000000000000000000).toFixed(2) + 'Qi';
    if (num >= 1000000000000000) return (num / 1000000000000000).toFixed(2) + 'Qa';
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

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
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    } else {
        // Fallback: If clicked via code, find the nav item by text
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.innerText.toLowerCase() === panelId.toLowerCase()) {
                item.classList.add('active');
            }
        });
    }

    // --- Tab Rendering Logic ---
    if (panelId === 'upgrades') renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    if (panelId === 'generators') renderList('gen-upgrades', game.generators, buyGenerator);
    if (panelId === 'prestige') { renderPrestigeUpgrades(); }
    if (panelId === 'pets') { renderPets(); }
    if (panelId === 'shop') {
        renderShopItems();
        renderPetShop();
    }
}

function updateUI() {
    // --- 0. PET BUFF CALCULATIONS (Added for Active Party) ---
    const petBuffs = calculatePetBuffs(); 

    // --- 1. RECALCULATE BASE STATS (The "Source of Truth" Fix) ---
    let baseCP = 1; 
    game.clickUpgrades.forEach(up => {
        baseCP += (up.level * up.power);
    });

    let basePPS = 0;
    game.generators.forEach(g => {
        basePPS += (g.income * g.count);
    });

    // --- 2. APPLY SEPARATED MULTIPLIERS (Updated to include Pet Buffs) ---
    // We multiply your existing multipliers by the new petBuffs
    game.clickPower = baseCP * (game.clickMultiplier || 1) * petBuffs.clickMult;
    let finalPPS = basePPS * (game.prestigeMultiplier || 1) * petBuffs.ppsMult;

    // --- 3. MAIN RESOURCE DISPLAYS ---
    document.getElementById('primogems').innerText = formatNumbers(game.primos);
    document.getElementById('stat-total').innerText = formatNumbers(game.primos);
    
    // Multiplier and Power stats
    document.getElementById('stat-mult').innerText = (game.prestigeMultiplier || 1).toFixed(2) + 'x';
    document.getElementById('stat-click').innerText = formatNumbers(game.clickPower);
    document.getElementById('stat-pps').innerText = formatNumbers(finalPPS);

    if (document.getElementById('stat-total-ever')) {
        document.getElementById('stat-total-ever').innerText = formatNumbers(game.totalPrimosEver);
    }

    // --- 4. DYNAMIC LIST RENDERING (The Multi-Buy Fix) ---
    renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    renderList('gen-upgrades', game.generators, buyGenerator);

    // --- 5. SPECIAL STATS & BUTTONS ---
    const prestigeDisplay = document.getElementById('stat-prestige');
    if (prestigeDisplay) {
        prestigeDisplay.innerText = formatNumbers(game.prestigePoints || 0);
    }

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

    // --- 6. SIDEBAR SYNC (Added to update the "0/4 Slots" display) ---
    updatePartySidebar();
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
