// --- PURCHASING ---
function buyClickUpgrade(index) {
    if (!isLoggedIn) {
        showNotification("Login to purchase upgrades!");
        return;
    }

    let up = game.clickUpgrades[index];
    // --- CHANGE: Pull the individual rate from the object ---
    const rate = up.rate || 1.5;

    let countToBuy = buyAmount === 'max' ? getMaxAffordable(game.primos, up.cost, rate) : buyAmount;
    
    if (countToBuy < 1) {
        if (buyAmount !== 'max') showNotification("Not enough Primogems!");
        return;
    }

    let totalCost = getMultiCost(up.cost, rate, countToBuy);

    if (game.primos >= totalCost) {
        game.primos -= totalCost;
        up.level += countToBuy;
        game.clickPower += (up.power * countToBuy);
        up.cost *= Math.pow(rate, countToBuy); 
        updateUI();
        saveCloudGame();
    } else if (buyAmount !== 'max') {
        showNotification("Not enough Primogems!");
    }
}

function buyGenerator(index) {
    if (!isLoggedIn) {
        showNotification("Login to purchase generators!");
        return;
    }

    let gen = game.generators[index];
    // --- CHANGE: Pull the individual rate from the object ---
    const rate = gen.rate || 1.75;

    let countToBuy = buyAmount === 'max' ? getMaxAffordable(game.primos, gen.cost, rate) : buyAmount;
    
    if (countToBuy < 1) {
        if (buyAmount !== 'max') showNotification("Not enough Primogems!");
        return;
    }

    let totalCost = getMultiCost(gen.cost, rate, countToBuy);

    if (game.primos >= totalCost) {
        game.primos -= totalCost;
        gen.count += countToBuy;
        gen.cost *= Math.pow(rate, countToBuy);
        updateUI();
        saveCloudGame();
    } else if (buyAmount !== 'max') {
        showNotification("Not enough Primogems!");
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

    // --- CHANGE: Use the new helper function instead of manual math ---
    let currentClickPower = getFinalClickPower();  
    let totalSeelieGain = currentClickPower * game.seelies;

    // 4. Update game state
    game.primos += totalSeelieGain;
    game.totalPrimosEver += totalSeelieGain;
    
    // Handle Raiden & Fischl strikes here too if you want them in the same loop
    handleAutoPetStrikes(); 

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

    const existingCards = container.querySelectorAll('.upgrade-card');

    data.forEach((item, index) => {
        // --- THE UPDATE: DYNAMIC RATE ---
        // It looks for item.rate first. If it's missing, it uses your old defaults.
        const rate = item.rate || (item.power ? 1.5 : 1.75);

        let displayAmt = buyAmount === 'max' ? getMaxAffordable(game.primos, item.cost, rate) : buyAmount;
        let effectiveAmt = (displayAmt <= 0) ? 1 : displayAmt;
        let totalCost = getMultiCost(item.cost, rate, effectiveAmt);
        const canAfford = game.primos >= totalCost;
        let displayLvl = item.level !== undefined ? item.level : item.count;

        let card = existingCards[index];

        if (!card) {
            card = document.createElement('div');
            card.className = 'upgrade-card';
            container.appendChild(card);
        }

        card.classList.toggle('disabled', !canAfford);

        const newHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.power ? '+' + item.power + ' Click' : '+' + item.income.toFixed(1) + '/s'}</small><br>
                <small style="color: #64ffbf;">Buying: ${displayAmt}x</small>
            </div>
            <div>
                <span>Cost: <span class="cost-val">${formatNumbers(totalCost)}</span></span><br>
                <small>Lvl: <span class="lvl-val">${displayLvl}</span></small>
            </div>
        `;

        if (card.innerHTML !== newHTML) {
            card.innerHTML = newHTML;
        }

        card.onclick = () => {
            if (canAfford) {
                clickFn(index);
                updateUI(); 
            } else {
                showNotification("Not enough Primogems!");
            }
        };
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

function setBuyAmount(amt) {
    buyAmount = amt;
    
    // Update button visuals
    document.querySelectorAll('.btn-mult').forEach(btn => {
        const btnText = btn.innerText.toLowerCase().replace('x', '');
        const targetText = amt.toString().toLowerCase();
        
        if (btnText === targetText) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (typeof updateUI === "function") {
        updateUI();
    }
}

function getMultiCost(baseCost, rate, count) {
    return baseCost * (Math.pow(rate, count) - 1) / (rate - 1);
}

function getMaxAffordable(primos, currentCost, rate) {
    if (primos < currentCost) return 0;
    let n = Math.floor(Math.log((primos * (rate - 1) / currentCost) + 1) / Math.log(rate));
    return n;
}

// --- PET CORE MECHANICS ---

function handleAutoPetStrikes() {
    // Raiden Shogun: 10% Click Power every 1s
    if (game.activePets.includes('raiden')) {
        const damage = getFinalClickPower() * 0.10;
        game.primos += damage;
        game.totalPrimosEver += damage;
    }

    // Fischl: 1 Full Click every 2.5s (2500ms)
    if (game.activePets.includes('fischl')) {
        fischlTimer += 1000;
        if (fischlTimer >= 2500) {
            const damage = getFinalClickPower();
            game.primos += damage;
            game.totalPrimosEver += damage;
            fischlTimer = 0;
        }
    }
}

function getDiscountedCost(baseCost) {
    let discount = 1;
    if (game.activePets.includes('yaoyao')) discount -= 0.05;
    if (game.activePets.includes('nahida')) discount -= 0.15;
    return baseCost * discount;
}

function togglePetEquip(petId) {
    const activeIndex = game.activePets.indexOf(petId);

    if (activeIndex > -1) {
        // Unequip
        game.activePets.splice(activeIndex, 1);
        showNotification("Pet unequipped.");
    } else {
        // Equip
        if (game.activePets.length >= 4) {
            showNotification("Party is full! (Max 4)");
            return;
        }
        if (game.ownedPets.includes(petId)) {
            game.activePets.push(petId);
            showNotification(`${petId} added to party!`);
        } else {
            showNotification("You don't own this pet yet.");
        }
    }
    updateUI();
    saveCloudGame(); 
}

function getFinalClickPower() {
    let base = game.clickPower || 1;
    let multiplier = game.clickMultiplier || 1;
    let petBonus = 1;

    // 1. Add Pet Multipliers (Anemo Buffs)
    if (game.activePets && game.activePets.includes('sucrose')) petBonus += 0.15;
    if (game.activePets && game.activePets.includes('xiao')) petBonus += 0.40;

    // 2. Combine them (Base * Potions * Pets)
    let finalPower = base * multiplier * petBonus;

    if (game.activePets && game.activePets.includes('skirk')) {
        if (Math.random() < 0.10) { 
            return finalPower * 3.0; 
        }
    }

    return finalPower;
}

function renderPets() {
    const container = document.getElementById('pets-grid');
    if (!container) return;
    container.innerHTML = '';

    // Loop through the pet data from your config
    config.pets.forEach(pet => {
        const isOwned = game.ownedPets.includes(pet.id);
        const isActive = game.activePets.includes(pet.id);
        
        const card = document.createElement('div');
        card.className = `pet-card rarity-${pet.rarity} ${!isOwned ? 'locked' : ''} ${isActive ? 'active' : ''}`;
        
        const visionColors = { 
            Anemo: '#64ffbf', Pyro: '#ff6464', Hydro: '#64c9ff', 
            Electro: '#d164ff', Dendro: '#a2ff64', Cryo: '#64f7ff', Geo: '#ffe164' 
        };
        const glowColor = visionColors[pet.vision] || '#ffffff';
        if (isActive) card.style.boxShadow = `0 0 15px ${glowColor}`;

        card.innerHTML = `
            <div class="pet-icon-wrapper">
                <img src="${pet.icon}" class="pet-chibi" alt="${pet.name}" draggable="false">
                <div class="vision-tag" style="background: ${glowColor}">${pet.vision}</div>
            </div>
            <div class="pet-info">
                <div class="pet-name">${pet.name}</div>
                <div class="pet-buff-desc">${pet.buffDesc || 'No buff info available'}</div>
                <button class="equip-btn">
                    ${isActive ? 'UNEQUIP' : (isOwned ? 'EQUIP' : 'LOCKED')}
                </button>
            </div>
        `;

        card.onclick = () => {
            if (isOwned) {
                togglePetEquip(pet.id);
                renderPets();
                updateSidebarParty();
            } else {
                showNotification("This companion hasn't joined you yet!");
            }
        };

        container.appendChild(card);
    });

    document.getElementById('party-count').innerText = game.activePets.length;
}

function updateSidebarParty() {
    const sidebarCount = document.getElementById('sidebar-party-count');
    if (sidebarCount) sidebarCount.innerText = `${game.activePets.length}/4`;

    const miniList = document.getElementById('active-pets-mini');
    if (!miniList) return;
    miniList.innerHTML = '';

    game.activePets.forEach(petId => {
        const petData = config.pets.find(p => p.id === petId);
        if (petData) {
            const img = document.createElement('img');
            img.src = petData.icon;
            img.className = 'mini-pet-icon';
            img.title = petData.name;
            miniList.appendChild(img);
        }
    });
}
