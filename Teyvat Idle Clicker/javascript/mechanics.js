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
            game.clickMultiplier = (game.clickMultiplier || 1) + 0.5;
            item.cost = Math.floor(item.cost * 2);
            showNotification("Consumed Adepti's Temptation! Click power increased.");
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

    let currentClickPower = game.clickPower * (game.clickMultiplier || 1);  
    let totalSeelieGain = currentClickPower * game.seelies;

    // 4. Update game state
    game.primos += totalSeelieGain;
    game.totalPrimosEver += totalSeelieGain;
    updateUI();

    // Optional: Spawn a visual indicator for the Seelie click
    // spawnText(window.innerWidth / 2, window.innerHeight / 2, `+${formatNumbers(totalSeelieGain)}`);

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
                <small>${item.power ? '+' + item.power + ' Click' : '+' + item.income.toFixed(1) + '/s'}</small>
            </div>
            <div>
                <span>Cost: <span class="cost-val">${formatNumbers(item.cost)}</span></span><br>
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
