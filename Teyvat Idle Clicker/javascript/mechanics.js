// --- PURCHASING ---
function buyClickUpgrade(index) {
    if (!isLoggedIn) {
        showNotification("Login to purchase upgrades!");
        return;
    }

    let up = game.clickUpgrades[index];
    const rate = up.rate || 1.5;
    const effectiveDiscount = game.currentDiscount || 1;
    const currentCost = up.cost * effectiveDiscount;

    let countToBuy = buyAmount === 'max' ? getMaxAffordable(game.primos, currentCost, rate) : buyAmount;

    if (countToBuy < 1) {
        if (buyAmount !== 'max') showNotification("Not enough Primogems!");
        return;
    }

    let totalCost = getMultiCost(up.cost, rate, countToBuy) * effectiveDiscount;

    if (game.primos >= totalCost) {
        game.primos -= totalCost;
        up.level += countToBuy;

        // Cost scaling logic
        up.cost *= Math.pow(rate, countToBuy);

        // --- ADDED: Fire achievement evaluator loop ---
        if (typeof updateAchievements === 'function') {
            updateAchievements();
        }

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
    const effectiveDiscount = game.currentDiscount || 1;
    const currentCost = gen.cost * effectiveDiscount;

    let countToBuy = buyAmount === 'max' ? getMaxAffordable(game.primos, currentCost, rate) : buyAmount;

    if (countToBuy < 1) {
        if (buyAmount !== 'max') showNotification("Not enough Primogems!");
        return;
    }

    let totalCost = getMultiCost(gen.cost, rate, countToBuy) * effectiveDiscount;

    if (game.primos >= totalCost) {
        game.primos -= totalCost;
        gen.count += countToBuy;

        // Cost scaling logic
        gen.cost *= Math.pow(rate, countToBuy);

        // --- ADDED: Fire achievement evaluator loop ---
        if (typeof updateAchievements === 'function') {
            updateAchievements();
        }

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

    // --- Run Time Warp validation BEFORE charging money or scaling to fix infinite duplication exploit ---
    if (item.id === 'time_warp') {
        const now = Date.now();
        const cooldown = 3600 * 1000;
        const timePassed = now - (game.lastWarpTime || 0);

        if (timePassed < cooldown) {
            const minutesLeft = Math.ceil((cooldown - timePassed) / 60000);
            showNotification(`Time Warp is on cooldown! Wait ${minutesLeft}m.`);
            return;
        }
    }

    // --- SEELIE MAX CHECK ---
    if (item.id === 'seelie' && (item.level || 0) >= 3) {
        showNotification("You can only carry 3 Seelies at a time!");
        return;
    }

    // Define rates for price scaling
    const rates = {
        'time_warp': 1.2,
        'seelie': 3,
        'buff_pot': 2.5,
        'primordial_shard': 3
    };
    const rate = rates[item.id] || 2;

    if (game.primos >= item.cost) {
        game.primos -= item.cost;

        // Initialize level if it doesn't exist, then increment
        item.level = (item.level || 0) + 1;

        // --- SPECIAL EFFECTS ---
        if (item.id === 'time_warp') {
            let totalPPS = 0;
            game.generators.forEach(g => totalPPS += (g.income * g.count));
            let bonus = (totalPPS * game.multiplier) * 1800;

            game.primos += bonus;
            game.lastWarpTime = Date.now();
            showNotification(`Time Warped! Gained ${Math.floor(bonus).toLocaleString()} Primos!`);
        }

        if (item.id === 'seelie') {
            game.seelies = item.level;
            showNotification(`Seelie #${item.level} joined your journey!`);

            if (item.level >= 3) {
                item.name = "Follower Seelie (MAX)";
                item.desc = "You have reached the maximum number of Seelies.";
            }
        }

        if (item.id === 'buff_pot') {
            game.clickMultiplier = (game.clickMultiplier || 1) + 0.5;
            showNotification("Consumed Adepti's Temptation! Click power increased.");
        }

        if (item.id === 'primordial_shard') {
            game.generators.forEach(gen => {
                gen.income *= 1.1;
            });
            showNotification("Primordial Shard fused! All generators are 10% more effective.");
        }

        // --- SCALE COST FOR NEXT PURCHASE ---
        item.cost = Math.floor(item.cost * rate);

        // --- ADDED: Fire achievement evaluator loop ---
        if (typeof updateAchievements === 'function') {
            updateAchievements();
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

    if (game.primos < 1000000) {
        showNotification("Not enough Primogems to Ascend yet!");
        return;
    }

    const buffs = calculatePetBuffs();
    let pointsGained = Math.floor(game.primos / 1000000) * (buffs.prestigeBonus || 1);

    game.prestigePoints = (game.prestigePoints || 0) + pointsGained;

    // Reset Multiplier and stats for a clean run
    game.multiplier = 1;
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

    game.shopItems.forEach(item => {
        item.level = 0;
        item.cost = getBaseCost(item.id);
        if (item.id === 'seelie') item.name = "Follower Seelie";
    });

    updateUI();
    saveCloudGame();
    showNotification(`Ascension Complete! Gained ${Math.floor(pointsGained)} points. Multiplier reset to 1.00x.`);
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
        'exquisite_chest': 25000,

        // --- Shop Items ---
        'time_warp': 20000,
        'seelie': 150000,
        'buff_pot': 300000,
        'primordial_shard': 750000
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

function getAchievementMultiplierBonus() {
    let totalBonus = 0;

    // Guard clause: if nothing is completed yet, return 0% extra bonus
    if (!game.completedAchievements || game.completedAchievements.length === 0) {
        return 0;
    }

    // Use game data if available, otherwise look at your window global config array
    const data = game.achievementsData || window.achievementsData || [];

    game.completedAchievements.forEach(completedId => {
        const achConfig = data.find(a => a.id === completedId);
        if (achConfig && achConfig.bonus) {
            totalBonus += achConfig.bonus;
        }
    });

    return totalBonus;
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
    game.clicks = (parseInt(game.clicks) || 0) + 1;

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

    if (typeof updateAchievements === 'function') {
        updateAchievements();
    }

    updateUI();
}

function getFinalClickPower() {
    // 1. Calculate base from levels
    let baseCP = 1;
    game.clickUpgrades.forEach(up => {
        baseCP += (Number(up.level) || 0) * (Number(up.power) || 0);
    });

    // 2. Get Hero's Wit
    const heroWitBlessing = game.blessings.find(b => b.id === 'strong_start');
    const heroWitBonus = (heroWitBlessing ? (Number(heroWitBlessing.level) || 0) * 100 : 0);

    // 3. Get Multipliers (Temptation + Resonance)
    const resonanceBlessing = game.blessings.find(b => b.id === 'resonance');
    const resonanceMult = 1 + (resonanceBlessing ? (Number(resonanceBlessing.level) || 0) * 0.10 : 0);
    const temptation = game.shopItems.find(item => item.id === 'buff_pot');
    const temptationMult = 1 + (temptation ? (Number(temptation.level) || 0) * 0.5 : 0);

    // --- ADDED: Calculate current global Achievement Multiplier Bonus pool ---
    const achievementBonusPool = typeof getAchievementMultiplierBonus === 'function' ? getAchievementMultiplierBonus() : 0;
    const achievementMult = 1 + achievementBonusPool;

    // --- ADDED: Injected achievementMult directly into the core math line ---
    let totalGameMult = (game.multiplier || 1) * resonanceMult * temptationMult * achievementMult;

    // 4. Get Pet Buffs
    const petBuffs = calculatePetBuffs();

    // 5. Final Calculation (Matches updateUI exactly)
    return (baseCP + heroWitBonus) * totalGameMult * (petBuffs.clickMult || 1) * (petBuffs.globalMult || 1);
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
