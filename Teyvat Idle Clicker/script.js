// --- 1. GAME DATA ---
let game = {
    primos: 0,
    totalPrimosEver: 0,
    prestigePoints: 0,
    multiplier: 1.0, // Fixed: Starts at 1.0 to ensure +1 clicks at the start
    clickPower: 1,   // Fixed: Starts at 1
    
    clickUpgrades: [
        { id: 'hands', name: 'Stronger Hands', cost: 10, power: 1, level: 0 },
        { id: 'trowel', name: 'Steel Trowel', cost: 100, power: 5, level: 0 }
    ],
    
    generators: [
        { id: 'flower', name: 'Sweet Flower', cost: 15, income: 0.1, count: 0 },
        { id: 'lamp', name: 'Lamp Grass', cost: 150, income: 2.0, count: 0 },
        { id: 'statue', name: 'Statue of Seven', cost: 2000, income: 15.0, count: 0 }
    ]
};

// --- 2. CORE LOGIC ---
document.getElementById('click-area').addEventListener('mousedown', (e) => {
    let amount = game.clickPower * game.multiplier;
    game.primos += amount;
    game.totalPrimosEver += amount;
    
    // Fixed: Uses Math.floor for the text to match the start power of 1
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

function showPanel(panelId) {
    document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
    const targetPanel = document.getElementById(`${panelId}-panel`);
    if(targetPanel) targetPanel.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');

    // Re-render lists when switching panels to update "disabled" states
    if (panelId === 'upgrades') renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    if (panelId === 'generators') renderList('gen-upgrades', game.generators, buyGenerator);
}

function updateUI() {
    // Top Stash
    document.getElementById('primo-count').innerText = Math.floor(game.primos).toLocaleString();
    
    // Sidebar Statistics
    document.getElementById('stat-total').innerText = Math.floor(game.primos).toLocaleString();
    document.getElementById('stat-mult').innerText = game.multiplier.toFixed(2) + 'x';
    document.getElementById('stat-click').innerText = (game.clickPower * game.multiplier).toFixed(0);
    
    let totalPPS = 0;
    game.generators.forEach(g => totalPPS += (g.income * g.count));
    document.getElementById('stat-pps').innerText = (totalPPS * game.multiplier).toFixed(1);

    // Refresh currently visible lists
    if(document.getElementById('upgrades-panel').classList.contains('active')) {
        renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    }
    if(document.getElementById('generators-panel').classList.contains('active')) {
        renderList('gen-upgrades', game.generators, buyGenerator);
    }
}

function renderList(containerId, data, clickFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    data.forEach((item, index) => {
        // Fix: Handles both .level and .count to prevent "undefined" display
        let displayLvl = item.level !== undefined ? item.level : item.count;
        
        const card = document.createElement('div');
        card.className = `upgrade-card ${game.primos < item.cost ? 'disabled' : ''}`;
        card.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.power ? '+'+item.power+' Click' : '+'+item.income+'/s'}</small>
            </div>
            <div>
                <span class="cost">Cost: ${Math.floor(item.cost).toLocaleString()}</span><br>
                <small>Lvl: ${displayLvl}</small>
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
    }
}

function buyGenerator(index) {
    let gen = game.generators[index];
    if (game.primos >= gen.cost) {
        game.primos -= gen.cost;
        gen.count++;
        gen.cost *= 1.2;
        updateUI();
    }
}

function spawnText(x, y, txt) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.innerText = txt;
    
    // Add a slight random offset so they don't stack perfectly
    const randomX = (Math.random() - 0.5) * 40;
    const randomY = (Math.random() - 0.5) * 20; 

    el.style.left = (x + randomX) + 'px';
    el.style.top = (y + randomY) + 'px';
    
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 800);
}

// Initial Run
updateUI();
