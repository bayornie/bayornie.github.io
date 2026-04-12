// --- PURCHASING ---
function buyClickUpgrade(index) {
    if (!isLoggedIn) {
        showNotification("Login to purchase upgrades!");
        return;
    }

    let up = game.clickUpgrades[index];
    const rate = up.rate || 1.5;

    // Apply Pet Discount
    const effectiveDiscount = game.currentDiscount || 1;
    const currentCost = up.cost * effectiveDiscount;

    let countToBuy = buyAmount === 'max' ? getMaxAffordable(game.primos, currentCost, rate) : buyAmount;

    if (countToBuy < 1) {
        if (buyAmount !== 'max') showNotification("Not enough Primogems!");
        return;
    }

    // Apply discount to the total multi-buy cost
    let totalCost = getMultiCost(up.cost, rate, countToBuy) * effectiveDiscount;

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
    const rate = gen.rate || 1.75;

    // Apply Pet Discount
    const effectiveDiscount = game.currentDiscount || 1;
    const currentCost = gen.cost * effectiveDiscount;

    let countToBuy = buyAmount === 'max' ? getMaxAffordable(game.primos, currentCost, rate) : buyAmount;

    if (countToBuy < 1) {
        if (buyAmount !== 'max') showNotification("Not enough Primogems!");
        return;
    }

    // Apply discount to the total multi-buy cost
    let totalCost = getMultiCost(gen.cost, rate, countToBuy) * effectiveDiscount;

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

    // --- APPLY DISCOUNT LOGIC ---
    const effectiveDiscount = game.currentDiscount || 1;
    const finalCost = petData.cost * effectiveDiscount;

    if (game.ownedPets.includes(petId)) {
        showNotification("This companion is already in your party!");
        return;
    }

    if (game.primos >= finalCost) {
        game.primos -= finalCost;
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
    if (!isLoggedIn) return;

    // --- 1. SEELIE AUTO-CLICK LOGIC ---
    if (game.seelies && game.seelies > 0) {
        let currentClickPower = getFinalClickPower();
        let totalSeelieGain = currentClickPower * game.seelies;

        game.primos += totalSeelieGain;
        game.totalPrimosEver += totalSeelieGain;

        // Visual indicator for Seelies
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        spawnText(centerX, centerY, `+${formatNumbers(totalSeelieGain)} ✨`);
    }

    updateUI();
}, 3000);

setInterval(() => {
    if (!isLoggedIn) return;

    const buffs = calculatePetBuffs();
    const clickPower = getFinalClickPower();

    // RAIDEN: Every 1s with 10% multiplier (Bane of All Evil/Musou no Hitotachi)
    if (game.activePets.includes('raiden')) {
        let raidenDmg = clickPower * 0.10;
        game.primos += raidenDmg;
        game.totalPrimosEver += raidenDmg;
        spawnText(window.innerWidth / 2 + 50, window.innerHeight / 2, `+${formatNumbers(raidenDmg)} ⚡`, "#b186ff");
    }

    // FISCHL: Every 2 seconds (Oz Support)
    if (game.activePets.includes('fischl') && Math.floor(Date.now() / 1000) % 2 === 0) {
        let fischlDmg = clickPower * 0.025;
        game.primos += fischlDmg;
        game.totalPrimosEver += fischlDmg;
        spawnText(window.innerWidth / 2 - 50, window.innerHeight / 2, `+${formatNumbers(fischlDmg)} 🐦`, "#b186ff");
    }

    updateUI();
}, 1000);

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

    const buffs = calculatePetBuffs();
    let pointsGained = Math.floor(game.primos / 1000000) * (buffs.prestigeBonus || 1);

    game.prestigePoints = (game.prestigePoints || 0) + pointsGained;

    // 4. Update the Multiplier (Permanent Buff)
    game.multiplier += (pointsGained * 0.05);
    game.primos = 0;
    game.clickPower = 1;

    game.clickUpgrades.forEach(up => {
        up.level = 0;
        up.cost = getBaseCost(up.id);
    });

    game.generators.forEach(gen => {
        gen.count = 0;
        gen.cost = getBaseCost(gen.id);
    });

    updateUI();
    saveCloudGame();
    showNotification(`Ascension Complete! Gained ${Math.floor(pointsGained)} points. Multiplier +${(pointsGained * 5).toFixed(1)}%.`);
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

function handleMainClick() {
    clickCounter++;
    const buffs = calculatePetBuffs();
    let power = getFinalClickPower();

    // 1. Xingqiu: Every 25th click counts as 50 clicks (per Excel)
    if (game.activePets.includes('xingqiu') && clickCounter % 25 === 0) {
        power *= 50;
        showNotification("Raincutter Burst!", "hydro");
    }

    // 2. Kaeya/Skirk: Critical Hits
    if (buffs.critChance > 0) {
        power *= buffs.critValue;
    }

    game.primos += power;
    game.totalPrimosEver += power;

    // Visuals
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    let color = buffs.critChance > 0 ? "#ff4e4e" : "#ffffff";
    spawnText(x, y, `+${formatNumbers(power)}`, color);

    updateUI();
}

function getFinalClickPower() {
    let base = game.clickPower || 1;
    let multiplier = game.clickMultiplier || 1;

    // This already handles Xiao (1.5x), Sucrose (1.15x), and Arlecchino (1.5x)
    const petBuffs = calculatePetBuffs();

    // We multiply the base by the active multipliers
    let finalPower = base * multiplier * petBuffs.clickMult * petBuffs.globalMult;

    return finalPower;
}

// --- PARTY & BUFF LOGIC ---
function calculatePetBuffs() {
    let buffs = {
        clickMult: 1,
        ppsMult: 1,
        globalMult: 1,
        discount: 1,
        prestigeBonus: 1,      // For Noelle and Xilonen
        critChance: 0,        // For Kaeya and Skirk
        critValue: 1,         // Damage multiplier on crit
        autoClickRate: 0,     // Interval in ms
        autoClickPower: 0     // % of click power
    };

    if (!game.activePets) return buffs;

    game.activePets.forEach(petId => {
        const pet = game.pets.find(p => p.id === petId);
        if (!pet) return;

        // --- Standard Buff Types ---
        if (pet.buffType === 'click') {
            buffs.clickMult *= (1 + pet.buffValue);
        } else if (pet.buffType === 'pps_mult') {
            buffs.ppsMult *= pet.buffValue;
        } else if (pet.buffType === 'global_mult') {
            buffs.globalMult *= pet.buffValue;
        } else if (pet.buffType === 'discount') {
            buffs.discount -= pet.buffValue;
        }

        // --- Special Sheet Mechanics ---
        else if (pet.buffType === 'prestige' || pet.buffType === 'prestige_bonus') {
            buffs.prestigeBonus += pet.buffValue;
        } else if (pet.buffType === 'crit') {
            buffs.critChance = 1.0;
            buffs.critValue = pet.buffValue;
        } else if (pet.buffType === 'auto_click') {
            buffs.autoClickRate = pet.id === 'raiden' ? 1000 : 2000;
            buffs.autoClickPower = pet.buffValue;
        }
    });

    if (buffs.discount < 0.1) buffs.discount = 0.1;

    return buffs;
}
