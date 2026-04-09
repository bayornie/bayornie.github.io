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
        { id: 'lamp', name: 'Lamp Grass', cost: 500, income: 1, count: 0 },
        { id: 'sunsettia', name: 'Sunsettia', cost: 1000, income: 5.0, count: 0 }
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
            
            // Update only the cost and level text inside the card
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
    }
}

function buyGenerator(index) {
    let gen = game.generators[index];
    if (game.primos >= gen.cost) {
        game.primos -= gen.cost;
        gen.count++;
        gen.cost *= 2;
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
