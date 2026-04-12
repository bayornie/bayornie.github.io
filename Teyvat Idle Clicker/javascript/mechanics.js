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

function buyPet(petId) {
    const petData = game.pets.find(p => p.id === petId);
    if (!petData) return;

    // Use the exact cost from your config (no more 5000 fallback)
    const cost = petData.cost;

    if (game.ownedPets.includes(petId)) {
        showNotification("This companion is already in your party!");
        return;
    }

    if (game.primos >= cost) {
        game.primos -= cost;
        game.ownedPets.push(petId);

        // --- ACTIVE PARTY LOGIC ---
        if (game.activePets.length < 4) {
            game.activePets.push(petId);
            showNotification(`${petData.name} joined your active party!`);
        } else {
            showNotification(`${petData.name} obtained! Party is full.`);
        }

        // Update everything
        renderPetShop();
        if (typeof renderPets === 'function') renderPets();
        updateUI();
        saveCloudGame();
    } else {
        showNotification("Not enough Primogems for this Fate!");
    }
}

// --- SEELIE AUTO-CLICKER SYSTEM ---
setInterval(() => {
    if (!isLoggedIn || !game.seelies || game.seelies <= 0) return;

    let currentClickPower = getFinalClickPower();  
    let totalSeelieGain = currentClickPower * game.seelies;

    game.primos += totalSeelieGain;
    game.totalPrimosEver += totalSeelieGain;
    
    handleAutoPetStrikes(); 

    updateUI();

    // --- ACTIVATED: Visual indicator for the Seelie click ---
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    spawnText(centerX, centerY, `+${formatNumbers(totalSeelieGain)} ✨`);

}, 3000);

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
    // Updated: Now adds 0.05 (5%) per point gained
    game.multiplier += (pointsGained * 0.05);

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
    // Updated notification to show 5% per point
    showNotification(`Ascension Complete! Multiplier increased by ${pointsGained * 5}%.`);
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

// --- PARTY & BUFF LOGIC ---

function calculatePetBuffs() {
    let clickMult = 1;
    let ppsMult = 1;

    // Loop through active IDs and find their data in the config
    game.activePets.forEach(petId => {
        const pet = game.pets.find(p => p.id === petId);
        if (!pet) return;

        if (pet.buffType === 'click') {
            clickMult += pet.buffValue;
        } else if (pet.buffType === 'pps_mult') {
            ppsMult *= pet.buffValue;
        } else if (pet.buffType === 'global_mult') {
            ppsMult *= pet.buffValue;
            clickMult += (pet.buffValue - 1);
        }
    });

    return { clickMult, ppsMult };
}
