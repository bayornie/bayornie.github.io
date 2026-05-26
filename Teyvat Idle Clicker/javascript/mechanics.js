function getDomainEngine() {
    // Check if the global game object exists
    if (typeof window.game === 'undefined') {
        console.error("CRITICAL: window.game is undefined!");
        return null;
    }

    // Force initialize the engine if it's missing (The "Self-Healing" fix)
    if (!window.game.domainCombatEngine) {
        console.warn("Domain engine missing from save data. Rebuilding...");
        window.game.domainCombatEngine = {
            bossName: "",
            bossImage: "",
            maxHp: 0,
            currentHp: 0,
            timeLimit: 60,
            timeLeft: 60,
            mainInterval: null,
            generatorTimer: 0,
            weakSpotTimer: 0,
            isFightActive: false,
            weakSpotActive: false,
            activeLootPool: []
        };
    }
    return window.game.domainCombatEngine;
}

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

    const rates = {
        'time_warp': 1.2,
        'seelie': 3,
        'buff_pot': 2.5,
        'primordial_shard': 3,
        'domain_ticket': 1
    };
    const rate = rates[item.id] || 2;

    if (game.primos >= item.cost) {
        if (item.id === 'seelie' && (item.level || 0) >= 3) {
            showNotification("You can only carry 3 Seelies at a time!");
            return;
        }

        game.primos -= item.cost;
        item.level = (item.level || 0) + 1;

        // --- NEW DOMAIN TICKET HANDLING ---
        if (item.id === 'domain_ticket') {
            game.domainTickets = (game.domainTickets || 0) + 1;
            showNotification(`Obtained 1 Abyssal Domain Ticket! Total: ${game.domainTickets}`, "success");
        }

        if (item.id === 'time_warp') {
            const now = Date.now();
            const cooldown = 3600 * 1000;

            // Allow Thundering Fury 4pc to reduce this countdown tracker dynamically
            if (!game.timeWarpCooldown) game.timeWarpCooldown = 0;
            const timePassed = now - (game.lastWarpTime || 0) + game.timeWarpCooldown;

            if (timePassed < cooldown) {
                showNotification(`Time Warp is on cooldown! Wait ${minutesLeft}m.`);
                game.primos += item.cost;
                item.level--;
                return;
            }

            // --- REDIRECTED TO ADVANCED ENGINE CALCULATIONS ---
            let currentPPS = typeof getFinalPPS === "function" ? getFinalPPS() : 0;
            if (currentPPS === 0) {
                game.generators.forEach(g => currentPPS += (g.income * g.count));
                currentPPS *= (game.multiplier || 1);
            }

            let baseWarpDuration = 1800; // 30 minutes base duration yield scale
            let durationBonus = typeof getArtifactStatModifier === "function" ? getArtifactStatModifier("itemDuration") : 0;
            const sets = typeof getActiveSetCounts === "function" ? getActiveSetCounts() : {};

            // Emblem of Severed Fate (2-Piece)
            if (sets["severed_fate"] >= 2) durationBonus += 0.20;

            let totalWarpDuration = baseWarpDuration * (1 + durationBonus);
            let bonus = currentPPS * totalWarpDuration;

            // --- [NOBLESSE OBLIGE 4-PIECE MECHANIC] ---
            if (sets["noblesse"] >= 4) {
                game.isTimeWarpActive = true;
                showNotification("Noblesse Oblige: Active manual click multipliers boosted for 30s!", "geo");
                setTimeout(() => {
                    game.isTimeWarpActive = false;
                }, 30000);
            }

            game.primos += bonus;
            game.lastWarpTime = now;
            game.timeWarpCooldown = 0;
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

        item.cost = Math.floor(item.cost * rate);
        updateUI();
        if (typeof renderShopItems === "function") renderShopItems();
        saveCloudGame();
    } else {
        showNotification("Not enough Primogems!");
    }
}

function buyPet(petId) {
    const petData = game.pets.find(p => p.id === petId);
    if (!petData) return;

    const effectiveDiscount = game.currentDiscount || 1;
    const finalCost = petData.cost * effectiveDiscount;

    if (game.ownedPets.includes(petId)) {
        showNotification("This companion is already in your party!");
        return;
    }

    if (game.primos >= finalCost) {
        game.primos -= finalCost;
        game.ownedPets.push(petId);

        if (game.activePets.length < 4) {
            game.activePets.push(petId);
            showNotification(`${petData.name} joined your active party!`);
        } else {
            showNotification(`${petData.name} obtained! Party is full.`);
        }

        renderPetShop();
        if (typeof renderPets === 'function') renderPets();
        updateUI();
        saveCloudGame();
    } else {
        showNotification("Not enough Primogems for this Fate!");
    }
}

function buyFateShopItem(itemId) {
    const item = game.fateShopItems.find(i => i.id === itemId);
    if (!item) return;

    const balance = item.costType === 'intertwined' ? (game.intertwinedFates || 0) : (game.acquaintFates || 0);

    if (balance < item.cost) {
        const fateName = item.costType === 'intertwined' ? 'Intertwined Fates' : 'Acquaint Fates';
        showNotification(`You need ${item.cost} ${fateName} for this!`);
        return;
    }

    // Deduct Fate currency
    if (item.costType === 'intertwined') game.intertwinedFates -= item.cost;
    if (item.costType === 'acquaint') game.acquaintFates -= item.cost;

    if (item.id === 'adventurer_efficiency') {
        // Katheryne's Directive: Adds +15% to base multiplier
        game.katheryneMultiplier = (game.katheryneMultiplier || 1) + 0.15;
        showNotification("Generators updated! Base production efficiency increased by +15%.");
    }
    else if (item.id === 'resonance_booster') {
        // Stardust Resonance: Adds +0.5x to your Global Multiplier Scale
        game.multiplier = (game.multiplier || 1) + 0.5;
        showNotification("Global multiplier boosted by +0.5x!");
    }
    else if (item.id === 'celestia_blessing') {
        // Blessing of Celestia: Doubles overall Click Power (x2.0)
        game.clickMultiplier = (game.clickMultiplier || 1) * 2;
        showNotification("The Heavens smile upon you! Click power doubled x2.0.");
    }
    else if (item.id === 'abyss_leak') {
        // Abyssal Leyline Shard: Only multiplies generator incomes by x2.5
        game.abyssalGeneratorMultiplier = (game.abyssalGeneratorMultiplier || 1) * 2.5;
        showNotification("Abyssal leak! All generator income multiplied by x2.5.");
    }

    updateUI();
    saveCloudGame();
    renderFateShop();
}

// --- SEELIE AUTO-CLICKER SYSTEM ---
setInterval(() => {
    if (!isLoggedIn) return;

    if (game.seelies && game.seelies > 0) {
        let currentClickPower = getFinalClickPower();
        let totalSeelieGain = currentClickPower * game.seelies;

        game.primos += totalSeelieGain;
        game.totalPrimosEver += totalSeelieGain;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        spawnText(centerX, centerY, `+${formatNumbers(totalSeelieGain)} ✨`);
    }

    updateUI();
}, 3000);

setInterval(() => {
    if (!isLoggedIn) return;

    const clickPower = getFinalClickPower();
    const sets = typeof getActiveSetCounts === "function" ? getActiveSetCounts() : {};

    // --- [THUNDERING FURY 2-PIECE MECHANIC] ---
    // -15% Automated Clicker Intervals means we can roll a 15% chance to double-strike per second
    const thunderingFurySpeedBonus = (sets["thundering_fury"] >= 2 && Math.random() < 0.15);

    // RAIDEN: Every 1s (10% Click Damage)
    if (game.activePets.includes('raiden')) {
        let raidenDmg = clickPower * 0.10;
        if (thunderingFurySpeedBonus) raidenDmg *= 2;

        game.primos += raidenDmg;
        game.totalPrimosEver += raidenDmg;
        spawnText(window.innerWidth / 2 + 50, window.innerHeight / 2, `+${formatNumbers(raidenDmg)} ⚡`, "#b186ff");
    }

    // FISCHL: Every 2 seconds (25% Click Damage based on pet profile update)
    if (game.activePets.includes('fischl') && Math.floor(Date.now() / 1000) % 2 === 0) {
        let fischlDmg = clickPower * 0.25;
        if (thunderingFurySpeedBonus) fischlDmg *= 2;

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

    // --- ARTIFACT PRESERVATION GUARD ---
    const savedArtifacts = game.artifacts || [];
    const savedEquipped = game.equippedArtifacts || { flower: null, plume: null, sands: null, goblet: null, circlet: null };

    // --- RESET REWARDS & NEW MULTIPLIERS ---
    game.multiplier = 1;
    game.clickMultiplier = 1;
    game.katheryneMultiplier = 1;
    game.abyssalGeneratorMultiplier = 1;
    game.primos = 0;
    game.clickPower = 1;

    // Clear active temporary set battle states
    game.shimenawaBurstActive = false;
    game.marechausseeStacks = 0;
    game.timeWarpCooldown = 0;
    if (game.marechausseeTimer) clearTimeout(game.marechausseeTimer);

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

    // --- RESTORE ARTIFACT ENVIRONMENT DATA ---
    game.artifacts = savedArtifacts;
    game.equippedArtifacts = savedEquipped;

    updateUI();
    saveCloudGame();
    showNotification(`Ascension Complete! Gained ${Math.floor(pointsGained)} points.`);
}

function getBaseCost(id) {
    const baseCosts = {
        'hands': 10, 'trowel': 150, 'steel_trowel': 500, 'dull_blade': 2500, 'silver_sword': 5000,
        'flower': 50, 'lamp': 300, 'sunsettia': 1000, 'common_chest': 5000, 'exquisite_chest': 25000,
        'time_warp': 20000, 'seelie': 150000, 'buff_pot': 300000, 'primordial_shard': 750000
    };
    return baseCosts[id] || 100;
}

// Initialize Data Arrays inside Safe Fallbacks
function initArtifactsIfMissing() {
    if (!game.artifacts) game.artifacts = [];
    if (!game.equippedArtifacts) {
        game.equippedArtifacts = { flower: null, plume: null, sands: null, goblet: null, circlet: null };
    }
}

// Equip an Artifact from inventory into its active slot
function equipArtifact(artifactId) {
    initArtifactsIfMissing();
    const art = game.artifacts.find(a => a.id === artifactId);
    if (!art) return false;

    // If an item is already equipped there, unequip it first
    if (game.equippedArtifacts[art.slot]) {
        game.equippedArtifacts[art.slot].isEquipped = false;
    }

    game.equippedArtifacts[art.slot] = art;
    art.isEquipped = true;

    if (typeof updateUI === "function") updateUI();
    if (typeof saveCloudGame === "function") saveCloudGame();
    return true;
}

// Count Active Set Pieces
function getActiveSetCounts() {
    initArtifactsIfMissing();
    let counts = {};

    Object.values(game.equippedArtifacts).forEach(art => {
        if (art && art.set) {
            counts[art.set] = (counts[art.set] || 0) + 1;
        }
    });

    return counts;
}

// 7. Extract Totals for Calculation Hooks
function getArtifactStatModifier(statType) {
    initArtifactsIfMissing();
    let total = 0;

    Object.values(game.equippedArtifacts).forEach(art => {
        if (!art) return;

        // Accumulate Main Stat
        if (art.mainStat.type === statType) {
            total += art.mainStat.value;
        }

        // Accumulate Substats
        art.substats.forEach(sub => {
            if (sub.type === statType) {
                total += sub.value;
            }
        });
    });

    return total;
}

function updateDomainUI() {
    const engine = getDomainEngine();
    if (!engine) return;

    const bossNameEl = document.getElementById('domain-boss-name');
    const bossImgEl = document.getElementById('domain-boss-image');
    const hpFill = document.getElementById('domain-boss-hp-fill');
    const hpText = document.getElementById('domain-boss-hp-text');
    const timerText = document.getElementById('domain-timer-text');

    // Safe casing logic in case engine properties aren't loaded instantly
    if (bossNameEl) bossNameEl.innerText = engine.bossName ? engine.bossName.toUpperCase() : "BOSS";
    if (bossImgEl && engine.bossImage) bossImgEl.src = engine.bossImage;

    // Progress calculation
    const pct = Math.max(0, (engine.currentHp / engine.maxHp) * 100);
    if (hpFill) hpFill.style.width = `${pct}%`;
    if (hpText) hpText.innerText = `${Math.floor(engine.currentHp).toLocaleString()} / ${engine.maxHp.toLocaleString()}`;
    if (timerText) timerText.innerText = `Time Remaining: ${Math.max(0, engine.timeLeft).toFixed(1)}s`;
}

function launchDomainFight(domainId) {
    // --- TICKET ENTRY GATE VALIDATION ---
    if (!game.domainTickets || game.domainTickets < 1) {
        if (typeof showNotification === "function") {
            showNotification("🔒 Locked! You need an Abyssal Domain Ticket to challenge this domain.", "warning");
        } else {
            alert("Locked! You need an Abyssal Domain Ticket to challenge this domain.");
        }
        return;
    }

    const domain = DOMAIN_DATABASE.find(d => d.id === domainId);
    const engine = getDomainEngine();

    if (!domain || !engine) {
        console.error("Domain or Engine not found! Domain:", domain, "Engine:", engine);
        return;
    }

    // Ticket verified successfully! Deduct exactly 1 ticket to initialize entry challenge
    game.domainTickets--;
    if (typeof showNotification === "function") {
        showNotification("🎫 Ticket consumed! Entering the Abyssal Domain...", "success");
    }

    // 1. Reset state
    engine.bossName = domain.boss;
    engine.bossImage = domain.image;
    engine.maxHp = domain.hp;
    engine.currentHp = domain.hp;
    engine.timeLeft = domain.timeLimit;
    engine.activeLootPool = domain.fiveStarPool;
    engine.isFightActive = true;

    // Reset internal timers & clean old dynamic targets
    engine.generatorTimer = 0;
    engine.weakSpotTimer = 0;
    engine.weakSpotActive = false;
    const oldWeakSpot = document.getElementById('active-weak-spot');
    if (oldWeakSpot) oldWeakSpot.remove();

    // 2. Switch internal view
    toggleDomainView('battle');

    // 3. Update Image
    const bossImg = document.getElementById('domain-boss-image');
    if (bossImg) {
        bossImg.src = domain.image;
        bossImg.style.display = 'block';
    }

    // FIX: Bind mouse coordinates to the combat container for active clicking
    const combatBox = document.getElementById('domain-combat-box');
    if (combatBox) {
        combatBox.onclick = (event) => handleDomainClick(event);
    }

    updateDomainUI();

    // 4. Delay the loop start to ensure the DOM is fully rendered
    if (engine.mainInterval) clearInterval(engine.mainInterval);

    setTimeout(() => {
        if (engine.isFightActive) {
            engine.mainInterval = setInterval(domainLoop, 100);
        }
    }, 200);
}

function handleDomainClick(event) {
    const engine = getDomainEngine();

    // 1. HARD BLOCK: Stop clicks if the fight isn't active, or if the boss is already dead
    if (!engine || !engine.isFightActive || engine.currentHp <= 0) return;

    // 2. ANTI-DUPLICATION GATE: Prevent browser double-firing (e.g., touchstart + click combo)
    if (event.detail === 0 && event.type === 'click') {
        // Blocks ghost clicks triggered by mobile/pointer emulators
        return;
    }

    // Alternative debounce check to prevent multi-firing within 15ms
    const now = Date.now();
    if (engine.lastClickTime && (now - engine.lastClickTime) < 15) {
        return;
    }
    engine.lastClickTime = now;

    // Hook directly into your true click power formula
    let damage = 1;
    if (typeof getFinalClickPower === 'function') {
        damage = getFinalClickPower();
    } else if (window.game && window.game.clickPower) {
        damage = window.game.clickPower;
    }

    // Safety fallback check to prevent NaN corruption
    if (isNaN(damage) || damage <= 0) {
        damage = 103;
    }

    engine.currentHp -= damage;

    // Grab coordinate arrays for damage floating text injection
    const clickX = event.pageX;
    const clickY = event.pageY;

    if (typeof spawnText === 'function') {
        const displayDmg = typeof formatNumbers === 'function' ? formatNumbers(damage) : Math.floor(damage).toLocaleString();
        spawnText(clickX, clickY, `+${displayDmg}`, "#ffe164");
    }

    // 3. IMMEDIATE STATE LOCK ON DEATH: 
    // We drop the 200ms delayed timeout completely. Running code on a delay 
    // while listeners remain active is what allowed background clicks to stack up duplicates.
    if (engine.currentHp <= 0) {
        engine.currentHp = 0;
        engine.isFightActive = false; // Turn off immediately to lock out further click evaluation

        if (engine.mainInterval) {
            clearInterval(engine.mainInterval);
            engine.mainInterval = null;
        }

        updateDomainUI();
        terminateDomainChallenge(true);
    } else {
        updateDomainUI();
    }
}

function triggerGeneratorAttack() {
    const engine = getDomainEngine();
    // Stop background generator damage instantly if the fight ended or is inactive
    if (!engine || !engine.isFightActive || engine.currentHp <= 0) return;

    // Hook directly into your true calculator formula function
    let totalPPS = 0;
    if (typeof getFinalPPS === 'function') {
        totalPPS = getFinalPPS();
    } else if (window.game) {
        totalPPS = window.game.pps || window.game.primogemsPerSecond || window.game.generatorIncome || 0;
    }

    if (isNaN(totalPPS) || totalPPS <= 0) return;

    // Apply exactly 1/10th of your total PPS on each individual 100ms tick.
    const genDamagePerTick = totalPPS / 10;
    engine.currentHp -= genDamagePerTick;

    // Keep track of time increments using a distinct tracker variable to isolate loop properties
    if (!engine.visualTextTimer) engine.visualTextTimer = 0;
    engine.visualTextTimer += 0.1;

    // Spawn the stylized purple float indicator exactly once every 1.0 second (10 ticks)
    if (engine.visualTextTimer >= 1.0) {
        engine.visualTextTimer = 0; // Reset accumulator

        const combatBox = document.querySelector('.domain-battle-view') || document.getElementById('domain-combat-box');
        if (combatBox && typeof spawnText === 'function') {
            const rect = combatBox.getBoundingClientRect();
            const centerX = rect.left + window.scrollX + (rect.width / 2);
            const centerY = rect.top + window.scrollY + (rect.height / 2);

            const displayGenDmg = typeof formatNumbers === 'function' ? formatNumbers(totalPPS) : Math.floor(totalPPS).toLocaleString();
            spawnText(centerX, centerY, `✦ ${displayGenDmg}`, "#a25fff");
        }
    }

    // Victory Check Evaluation
    if (engine.currentHp <= 0) {
        engine.currentHp = 0;
        engine.isFightActive = false;

        if (engine.mainInterval) {
            clearInterval(engine.mainInterval);
            engine.mainInterval = null;
        }

        updateDomainUI();
        terminateDomainChallenge(true);
    }
}

function spawnCriticalWeakSpot() {
    const engine = getDomainEngine();
    const combatBox = document.getElementById('domain-combat-box');

    // 1. Safety: Verify everything exists and is visible
    if (!engine || !engine.isFightActive || !combatBox) return;

    // Check if the combat box actually has dimensions
    const rect = combatBox.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // 2. Cleanup: Remove existing spots
    const existing = document.getElementById('active-weak-spot');
    if (existing) existing.remove();

    // 3. Create Spot
    const spot = document.createElement('div');
    spot.id = 'active-weak-spot';
    engine.weakSpotActive = true;

    // Use dimensions safely
    const x = Math.random() * (rect.width - 50);
    const y = Math.random() * (rect.height - 50);

    spot.style.cssText = `
        position: absolute; left: ${x}px; top: ${y}px;
        width: 50px; height: 50px; border-radius: 50%;
        background: #64ffbf; cursor: pointer; z-index: 100;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 10px #64ffbf; border: 2px solid white;
    `;
    spot.innerText = "🎯";

    spot.onclick = () => {
        const power = window.game?.clickPower || 1;
        engine.currentHp -= (power * 10);
        engine.weakSpotActive = false;
        spot.remove();
        updateDomainUI();
    };

    combatBox.appendChild(spot);

    // 4. Auto-remove
    setTimeout(() => {
        if (spot.parentNode) {
            spot.remove();
            engine.weakSpotActive = false;
        }
    }, 3000);
}

function domainLoop() {
    const engine = getDomainEngine();
    if (!engine || !engine.isFightActive) return;

    // 1. Check for immediate victory before processing increments
    if (engine.currentHp <= 0) {
        engine.currentHp = 0;
        engine.isFightActive = false;
        if (engine.mainInterval) clearInterval(engine.mainInterval);
        updateDomainUI();
        terminateDomainChallenge(true);
        return;
    }

    // 2. Progressively update time increments
    engine.timeLeft = Math.max(0, engine.timeLeft - 0.1);
    engine.generatorTimer += 0.1;
    engine.weakSpotTimer += 0.1;

    // 3. Trigger Generator Attack (Passive DPS ticks)
    if (engine.generatorTimer >= 1.0) {
        triggerGeneratorAttack();
        engine.generatorTimer = 0;
    }

    // 4. Trigger Weak Spot (Burst visual updates)
    if (engine.weakSpotTimer >= 10.0) {
        if (typeof spawnCriticalWeakSpot === 'function') spawnCriticalWeakSpot();
        engine.weakSpotTimer = 0;
    }

    // 5. Update UI instantly so changes render sequentially
    updateDomainUI();

    // 6. Evaluate final match outcomes at the tail end of the tick
    if (engine.currentHp <= 0) {
        engine.currentHp = 0;
        engine.isFightActive = false;
        if (engine.mainInterval) clearInterval(engine.mainInterval);
        updateDomainUI();

        terminateDomainChallenge(true);
    } else if (engine.timeLeft <= 0) {
        engine.timeLeft = 0;
        engine.isFightActive = false;
        if (engine.mainInterval) clearInterval(engine.mainInterval);
        updateDomainUI();

        terminateDomainChallenge(false);
    }
}

function terminateDomainChallenge(isVictory) {
    const engine = getDomainEngine();
    engine.isFightActive = false;

    // Hard clear any hanging active intervals
    if (engine.mainInterval) clearInterval(engine.mainInterval);
    if (window.domainInterval) clearInterval(window.domainInterval);

    if (isVictory) {
        // Fallback-safe database lookup
        let domain = null;
        if (typeof DOMAIN_DATABASE !== 'undefined' && Array.isArray(DOMAIN_DATABASE)) {
            domain = DOMAIN_DATABASE.find(d =>
                d.boss && engine.bossName && d.boss.toLowerCase().trim() === engine.bossName.toLowerCase().trim()
            );
        }

        if (domain) {
            console.log(`Success! Dropping loot table metrics for: ${domain.name}`);
            grantDomainRewards(domain.id);
        } else {
            console.warn(`Loot Table Match failed or database missing for: "${engine.bossName}". Forcing fallback display.`);
            // If database matching fails, pass a safe fallback index or zero to keep the screen from hanging
            const fallbackId = (typeof DOMAIN_DATABASE !== 'undefined' && DOMAIN_DATABASE[0]) ? DOMAIN_DATABASE[0].id : 0;
            grantDomainRewards(fallbackId);
        }
    } else {
        if (typeof showNotification === 'function') {
            showNotification("Challenge Failed! Time limit reached.", "error");
        }
        console.log("Defeat: No rewards.");
        toggleDomainView('selection');
    }
}

function grantDomainRewards(domainId) {
    const engine = getDomainEngine();

    if (!window.game) window.game = {};
    if (!window.game.artifacts) window.game.artifacts = [];

    const visualCardsData = [];

    // 1. Safe extraction of drop tables
    let activeDomain = { fiveStarPool: ['ocean_clam', 'shimenawa'], id: "peak-of-vindagnyr" };
    if (typeof DOMAIN_DATABASE !== 'undefined' && Array.isArray(DOMAIN_DATABASE)) {
        activeDomain = DOMAIN_DATABASE.find(d => d.id === domainId) || DOMAIN_DATABASE[0] || activeDomain;
    }

    const featuredFiveStarPool = (engine && engine.activeLootPool && engine.activeLootPool.length > 0)
        ? engine.activeLootPool
        : (activeDomain.fiveStarPool || ['ocean_clam', 'shimenawa']);

    const globalFourStarPool = typeof GLOBAL_FOUR_STAR_DROPS !== 'undefined' ? GLOBAL_FOUR_STAR_DROPS : ['berserker', 'the_exile'];
    const slotIcons = { flower: "🌸", plume: "🪶", sands: "⏳", goblet: "🍷", circlet: "👑" };

    const generateAndStore = (rarity, setId) => {
        const validSlots = (window.game && window.game.artifactSlots) ? window.game.artifactSlots : ['flower', 'plume', 'sands', 'goblet', 'circlet'];
        const randomSlot = validSlots[Math.floor(Math.random() * validSlots.length)];

        if (typeof generateRandomArtifact === 'function') {
            const dropItem = generateRandomArtifact(rarity, setId, randomSlot);
            if (dropItem && typeof dropItem === 'object') {
                window.game.artifacts.push(dropItem);
                visualCardsData.push({ rarity, slot: randomSlot, name: dropItem.name, set: setId });
            } else {
                console.error(`Generator failed for ${rarity}★. Item:`, dropItem);
            }
        }
    };

    // 2. GENERATE 5-STAR DROPS (2 to 3 pieces)
    const fiveStarCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < fiveStarCount; i++) {
        const selectedSetId = Math.random() < 0.50 ? featuredFiveStarPool[0] : featuredFiveStarPool[1];

        // Match your artifactSlots mapping safely
        const validSlots = (window.game && window.game.artifactSlots) ? window.game.artifactSlots : fallbackSlots;
        const randomSlot = validSlots[Math.floor(Math.random() * validSlots.length)];

        if (typeof generateRandomArtifact === 'function') {
            try {
                const dropItem = generateRandomArtifact(5, selectedSetId, randomSlot);
                window.game.artifacts.push(dropItem);
                visualCardsData.push({ rarity: 5, slot: randomSlot, name: dropItem.name, set: selectedSetId });
            } catch (err) {
                console.error("Error generating 5-Star Artifact:", err);
                visualCardsData.push({ rarity: 5, slot: randomSlot, name: "Mystic 5★ Piece", set: selectedSetId });
            }
        }
    }

    // 3. GENERATE 4-STAR DROPS (3 to 4 pieces)
    const fourStarCount = Math.floor(Math.random() * 2) + 3;
    for (let i = 0; i < fourStarCount; i++) {
        const selectedSetId = Math.random() < 0.50 ? globalFourStarPool[0] : globalFourStarPool[1];

        const validSlots = (window.game && window.game.artifactSlots) ? window.game.artifactSlots : fallbackSlots;
        const randomSlot = validSlots[Math.floor(Math.random() * validSlots.length)];

        if (typeof generateRandomArtifact === 'function') {
            try {
                const dropItem = generateRandomArtifact(4, selectedSetId, randomSlot);
                window.game.artifacts.push(dropItem);
                visualCardsData.push({ rarity: 4, slot: randomSlot, name: dropItem.name, set: selectedSetId });
            } catch (err) {
                console.error("Error generating 4-Star Artifact:", err);
                visualCardsData.push({ rarity: 4, slot: randomSlot, name: "Stellar 4★ Piece", set: selectedSetId });
            }
        }
    }

    // 4. INJECT MODAL INTO THE CORRECT DOM CONTAINER
    // Fixed: Checking for .domain-battle-view wrapper container
    let combatBox = document.querySelector('.domain-battle-view');

    if (combatBox) {
        // Clear out dangling active click damage numbers so they don't overlay
        const floatingTexts = combatBox.querySelectorAll('.floating-text, [class*="text"]');
        floatingTexts.forEach(el => {
            if (el.textContent.includes('+') || el.textContent.includes('✦')) el.remove();
        });

        const oldOverlay = document.getElementById('active-victory-overlay');
        if (oldOverlay) oldOverlay.remove();

        let lootItemsHTML = '';
        visualCardsData.forEach(item => {
            const icon = slotIcons[item.slot] || "🔮";
            const bgGradient = item.rarity === 5
                ? 'linear-gradient(to bottom, #e49a41, #965a25)'
                : 'linear-gradient(to bottom, #ba89e0, #6c478f)';

            // Clean clean item text names if layout concatenates undefined values
            let displayName = item.name;
            if (displayName.includes('undefined')) {
                const cleanSetName = item.set.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                displayName = `${cleanSetName} ${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}`;
            }

            lootItemsHTML += `
                <div style="
                    width: 95px;
                    background: #eae5de;
                    border-radius: 4px;
                    overflow: hidden;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    border-bottom: 3px solid ${item.rarity === 5 ? '#e49a41' : '#ba89e0'};
                ">
                    <div style="
                        width: 100%;
                        height: 90px;
                        background: ${bgGradient};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    ">
                        <span style="font-size: 2.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${icon}</span>
                        <div style="position: absolute; bottom: 2px; right: 5px; color: #fff; font-size: 0.75rem; font-weight: bold; text-shadow: 1px 1px 2px black;">1</div>
                    </div>
                    <div style="
                        width: 100%;
                        background: #fff;
                        padding: 6px 4px;
                        min-height: 42px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-sizing: border-box;
                    ">
                        <span style="
                            color: #3b4249;
                            font-size: 0.65rem;
                            font-weight: bold;
                            text-align: center;
                            line-height: 1.1;
                        ">${displayName}</span>
                    </div>
                </div>
            `;
        });

        const overlay = document.createElement('div');
        overlay.id = 'active-victory-overlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(14, 18, 24, 0.95); z-index: 100; display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            box-sizing: border-box; padding: 20px; border-radius: 6px;
        `;

        overlay.innerHTML = `
            <div style="color: #f3dfb7; font-size: 1.6rem; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 3px; font-family: sans-serif;">Reward Obtained</div>
            <div style="width: 280px; height: 1px; background: linear-gradient(to right, transparent, #e3c07d, transparent); margin-bottom: 25px;"></div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; align-items: center; max-width: 95%; margin-bottom: 30px;">
                ${lootItemsHTML}
            </div>
            
            <div style="color: #a5a9b2; font-size: 0.8rem; font-family: sans-serif; cursor: pointer; border: 1px solid #4a5363; padding: 6px 16px; border-radius: 4px; background: rgba(25,32,45,0.6);" id="confirm-rewards-btn">
                Click to Confirm
            </div>
        `;

        // Ensure relative positioning works cleanly over the box layout context
        const originalPosition = combatBox.style.position;
        combatBox.style.position = 'relative';
        combatBox.appendChild(overlay);

        const cleanupAction = (event) => {
            event.stopPropagation();
            overlay.remove();
            combatBox.style.position = originalPosition;

            toggleDomainView('selection');

            if (typeof renderArtifactMenu === "function") {
                renderArtifactMenu();
            }

            if (typeof updateUI === "function") updateUI();
            if (window.saveGame) window.saveGame();
            else if (window.save) window.save();
        };

        document.getElementById('confirm-rewards-btn').onclick = cleanupAction;
    } else {
        console.error("CRITICAL: Container view setup missing. Reverting panel states.");
        toggleDomainView('selection');
    }

    if (typeof showNotification === 'function') {
        showNotification(`Domain Cleared! Obtained ${fiveStarCount}x 5★ Artifacts.`, "success");
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
        game.activePets.splice(activeIndex, 1);
        showNotification("Pet unequipped.");
    } else {
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
    game.lastClickTime = Date.now(); // Essential timestamp for Golden Troupe passive tracking

    const buffs = calculatePetBuffs();
    let power = getFinalClickPower();

    // Fetch active equipment sets mapping
    const sets = typeof getActiveSetCounts === "function" ? getActiveSetCounts() : {};

    // --- [SHIMENAWA 4-PIECE MECHANIC] ---
    if (sets["shimenawa"] >= 4 && !game.shimenawaBurstActive) {
        if (Math.random() < 0.05 && game.primos >= 2000) {
            game.primos -= 2000;
            game.shimenawaBurstActive = true;
            showNotification("Reminiscence Sacrifice! Click Damage Multiplied!", "pyro");
            power = getFinalClickPower();

            setTimeout(() => {
                game.shimenawaBurstActive = false;
                showNotification("Reminiscence burst faded.", "info");
            }, 5000);
        }
    }

    // --- [THUNDERING FURY 4-PIECE MECHANIC] ---
    if (sets["thundering_fury"] >= 4 && Math.random() < 0.01) {
        if (game.timeWarpCooldown > 0) {
            game.timeWarpCooldown = Math.max(0, game.timeWarpCooldown - 30000);
            showNotification("Thundering Fury: Time Warp CD Reduced!", "electro");
        }
    }

    // --- [THE EXILE 4-PIECE MECHANIC] ---
    if (sets["the_exile"] >= 4 && clickCounter % 100 === 0) {
        if (Math.random() < 0.05) {
            const droppedFate = Math.random() < 0.5 ? 'intertwinedFate' : 'acquaintFate';
            game[droppedFate] = (game[droppedFate] || 0) + 1;
            showNotification("The Exile dropped a free Fate!", "anemo");
        }
    }

    // Special Pet Triggers
    if (game.activePets.includes('xingqiu') && clickCounter % 25 === 0) {
        power *= 50;
        showNotification("Raincutter Burst!", "hydro");
    }

    // --- CRITICAL HIT EVALUATION AND STAT POOL GATHERING ---
    let baseCritChance = buffs.critChance || 0;
    let baseCritDamage = buffs.critValue || 2.0;

    if (typeof getArtifactStatModifier === "function") {
        baseCritChance += getArtifactStatModifier("critChance");
        baseCritDamage += getArtifactStatModifier("critClickMult");
    }

    // --- CRIT SET BUFF CONDITIONS ---
    if (sets["berserker"] >= 2) baseCritChance += 0.12;
    if (sets["berserker"] >= 4 && clickCounter > 20) baseCritChance += 0.24;
    if (sets["marechaussee"] >= 4) {
        if (!game.marechausseeStacks) game.marechausseeStacks = 0;
        game.marechausseeStacks = Math.min(3, game.marechausseeStacks + 1);
        baseCritChance += (game.marechausseeStacks * 0.12);

        clearTimeout(game.marechausseeTimer);
        game.marechausseeTimer = setTimeout(() => { game.marechausseeStacks = 0; }, 5000);
    }

    // Roll for Critical Success
    const isCrit = Math.random() < baseCritChance;
    if (isCrit) {
        power *= baseCritDamage;
    }

    // Process balances
    game.primos += power;
    game.totalPrimosEver += power;

    // Visual spawning elements
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    let color = isCrit ? "#ff4e4e" : "#ffffff";
    spawnText(x, y, `+${formatNumbers(power)}`, color);

    if (typeof updateAchievements === 'function') {
        updateAchievements();
    }

    updateUI();
}

function getFinalClickPower() {
    // 1. Get current base from upgrades (Starts at 1)
    let base = 1;
    game.clickUpgrades.forEach(up => {
        base += (Number(up.level) || 0) * (Number(up.power) || 0);
    });

    // --- Katheryne's Directive Multiplier Fix ---
    // Affects the BASE calculation directly just like generator incomes
    if (game.katheryneMultiplier) {
        base *= game.katheryneMultiplier;
    }

    // 2. Add Seelie Blessing and Flat Artifact stats directly to that base
    const seelieBlessing = game.blessings.find(b => b.id === 'strong_start');
    const seelieBonus = (seelieBlessing ? (Number(seelieBlessing.level) || 0) * 100 : 0);

    let artifactFlat = typeof getArtifactStatModifier === "function" ? getArtifactStatModifier("clickPowerFlat") : 0;

    let totalBase = base + seelieBonus + artifactFlat;

    // 3. Gather percentage modifiers (Base 100%)
    let artifactPct = typeof getArtifactStatModifier === "function" ? getArtifactStatModifier("clickPowerPct") : 0;
    let setMultiplier = 1;

    // --- ARTIFACT SET BONUS EVALUATION (CLICK ONLY) ---
    if (typeof getActiveSetCounts === "function") {
        const sets = getActiveSetCounts();

        // Gladiator's Finale (2-Piece & 4-Piece)
        if (sets["gladiator"] >= 2) artifactPct += 0.18;
        if (sets["gladiator"] >= 4) artifactPct += 0.35;

        // Noblesse Oblige (2-Piece)
        if (sets["noblesse"] >= 2) artifactPct += 0.20;

        // Shimenawa's Reminiscence (2-Piece & 4-Piece active burst state)
        if (sets["shimenawa"] >= 2) artifactPct += 0.18;
        if (sets["shimenawa"] >= 4 && game.shimenawaBurstActive) setMultiplier *= 4.0; // 300% damage increase

        // Marechaussee Hunter (2-Piece)
        if (sets["marechaussee"] >= 2) artifactPct += 0.15;
    }

    // 4. Apply all multipliers to the combined base
    let multiplier = game.clickMultiplier || 1;
    const petBuffs = calculatePetBuffs();
    const resonanceBlessing = game.blessings.find(b => b.id === 'resonance');
    const resonanceMult = 1 + (resonanceBlessing ? (Number(resonanceBlessing.level) || 0) * 0.10 : 0);

    return totalBase * (1 + artifactPct) * setMultiplier * multiplier * resonanceMult * (petBuffs.clickMult || 1) * (petBuffs.globalMult || 1) * (game.multiplier || 1);
}

function getFinalPPS() {
    let basePPS = 0;
    game.generators.forEach(g => {
        let genIncome = Number(g.income) || 0;
        if (game.katheryneMultiplier) {
            genIncome *= game.katheryneMultiplier;
        }
        basePPS += genIncome * (Number(g.count) || 0);
    });

    const petBuffs = typeof calculatePetBuffs === "function" ? calculatePetBuffs() : { ppsMult: 1, globalMult: 1 };
    const resonanceBlessing = game.blessings.find(b => b.id === 'resonance');
    const resonanceMult = 1 + (resonanceBlessing ? (Number(resonanceBlessing.level) || 0) * 0.10 : 0);
    const temptation = game.shopItems.find(item => item.id === 'buff_pot');
    const temptationMult = 1 + (temptation ? (Number(temptation.level) || 0) * 0.5 : 0);
    const achievementBonus = typeof getAchievementMultiplierBonus === "function" ? getAchievementMultiplierBonus() : 0;

    let totalGameMult = (game.multiplier || 1) * resonanceMult * (1.0 + achievementBonus);
    let finalPPS = basePPS * totalGameMult * temptationMult * (petBuffs.ppsMult || 1) * (petBuffs.globalMult || 1);

    if (typeof getArtifactStatModifier === "function") {
        finalPPS *= (1 + getArtifactStatModifier("ppsMult"));
    }
    if (game.abyssalGeneratorMultiplier) {
        finalPPS *= game.abyssalGeneratorMultiplier;
    }
    return finalPPS;
}

function calculatePetBuffs() {
    let buffs = { clickMult: 1, ppsMult: 1, globalMult: 1, discount: 1, prestigeBonus: 1, critChance: 0, critValue: 1, autoClickRate: 0, autoClickPower: 0 };
    if (!game.activePets) return buffs;

    game.activePets.forEach(petId => {
        const pet = game.pets.find(p => p.id === petId);
        if (!pet) return;
        if (pet.buffType === 'click') buffs.clickMult *= (1 + pet.buffValue);
        else if (pet.buffType === 'pps_mult') buffs.ppsMult *= pet.buffValue;
        else if (pet.buffType === 'global_mult') buffs.globalMult *= pet.buffValue;
        else if (pet.buffType === 'discount') buffs.discount -= pet.buffValue;
        else if (pet.buffType === 'prestige' || pet.buffType === 'prestige_bonus') buffs.prestigeBonus += pet.buffValue;
        else if (pet.buffType === 'crit') { buffs.critChance = 1.0; buffs.critValue = pet.buffValue; }
        else if (pet.buffType === 'auto_click') { buffs.autoClickRate = pet.id === 'raiden' ? 1000 : 2000; buffs.autoClickPower = pet.buffValue; }
    });
    if (buffs.discount < 0.1) buffs.discount = 0.1;
    return buffs;
}

function forgeFate(fateType) {
    if (!isLoggedIn) {
        showNotification("🔒 This feature requires an active account. Please log in first!");
        if (typeof openAuth === "function") openAuth();
        return;
    }

    const forgePrice = (fateType === 'intertwined') ? 1600000 : 160000;

    if (game.primos >= forgePrice) {
        game.primos -= forgePrice;

        if (fateType === 'intertwined') {
            game.intertwinedFates = (game.intertwinedFates || 0) + 1;
            showNotification("Successfully forged 1 Intertwined Fate! ✨");
        } else if (fateType === 'acquaint') {
            game.acquaintFates = (game.acquaintFates || 0) + 1;
            showNotification("Successfully forged 1 Acquaint Fate! 💫");
        }

        updateUI();
        saveCloudGame();
        renderFateShop();
    } else {
        const displayPrice = fateType === 'intertwined' ? "1.60M" : "160K";
        showNotification(`Insufficient Primogems! Forging requires ${displayPrice}.`);
    }
}

// --- VISUAL SETTINGS ---
function toggleParticles() {
    game.settings = game.settings || { particles: true };
    game.settings.particles = !game.settings.particles;

    const btn = document.getElementById('pref-particles');
    if (btn) {
        btn.innerText = game.settings.particles ? "ON" : "OFF";
    }

    showNotification(`Particles ${game.settings.particles ? 'Enabled' : 'Disabled'}`);
    saveCloudGame();
}
