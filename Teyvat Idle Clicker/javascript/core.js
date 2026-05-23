// --- HELPER FUNCTIONS ---
function formatNumbers(num) {
    if (num >= 1000000000000000000000000) return (num / 1000000000000000000000000).toFixed(2) + 'Sp';
    if (num >= 1000000000000000000000) return (num / 1000000000000000000000).toFixed(2) + 'Sx';
    if (num >= 1000000000000000000) return (num / 1000000000000000000).toFixed(2) + 'Qi';
    if (num >= 1000000000000000) return (num / 1000000000000000).toFixed(2) + 'Qa';
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

const bgmPlayer = new Audio();
bgmPlayer.volume = game.bgmVolume;

function playTrack(index) {
    if (!game.bgmList || game.bgmList.length === 0) return;

    // Boundary checks for the loop
    if (index >= game.bgmList.length) index = 0; 
    if (index < 0) index = game.bgmList.length - 1;

    game.currentTrackIndex = index;
    const track = game.bgmList[index];

    bgmPlayer.src = track.file;
    bgmPlayer.volume = game.bgmVolume || 0.5;

    if (!game.isMusicMuted) {
        bgmPlayer.play().catch(e => {
            console.log("Autoplay blocked. Interaction required.");
        });
    }

    if (typeof renderMusicList === "function") {
        renderMusicList();
    }
}

bgmPlayer.onended = () => {
    playTrack(game.currentTrackIndex + 1);
};

// --- CORE LOGIC ---
document.getElementById('click-area').addEventListener('mousedown', (e) => {
    // --- MUSIC KICKSTART ---
    if (bgmPlayer.paused && !game.isMusicMuted && bgmPlayer.src) {
        bgmPlayer.play().catch(err => console.log("Playback interaction required."));
    }

    if (!isLoggedIn) {
        showNotification("Please Login to start collecting!");
        openAuth();
        return;
    }

    game.clicks = (parseInt(game.clicks) || 0) + 1;

    let amount = getFinalClickPower();
    const buffs = calculatePetBuffs();

    clickCounter++;
    
    // --- RAINCUTTER LOGIC (Xingqiu) ---
    let isRaincutter = false;
    if (game.activePets && game.activePets.includes('xingqiu') && clickCounter % 25 === 0) {
        amount *= 50;
        isRaincutter = true;
    }

    // 1. Identify which pets are currently active
    const hasSkirk = game.activePets && game.activePets.includes('skirk');
    const hasKaeya = game.activePets && game.activePets.includes('kaeya');

    // 2. Critical Chance Logic
    const critBlessing = game.blessings.find(b => b.id === 'crit');
    const critLevel = critBlessing ? critBlessing.level : 0;
    const critChanceFromBlessing = critLevel * 0.05;

    const rolledBlessingCrit = Math.random() < critChanceFromBlessing;
    const hasGuaranteedPetCrit = buffs.critChance > 0;
    const isCrit = rolledBlessingCrit || hasGuaranteedPetCrit;

    let label = "";
    let color = "#ffffff";

    if (isRaincutter) {
        label = "RAINCUTTER!";
        color = "#4cc2f1"; // Hydro Blue
    } else if (isCrit) {
        // --- STACKING MULTIPLIER LOGIC ---
        let totalCritMult = 1;

        if (hasSkirk && hasKaeya) {
            totalCritMult = 6.0; // 3x (Skirk) * 2x (Kaeya)
            label = "ABYSSAL FREEZE!";
            color = "#b7a8ff"; // Light Purple/Ice
        } else if (hasSkirk) {
            totalCritMult = 3.0;
            label = "ABYSSAL!";
            color = "#a155ff"; // Deep Void Purple
        } else if (hasKaeya) {
            totalCritMult = 2.0;
            label = "FREEZE!";
            color = "#8deaff"; // Cryo Blue
        } else if (rolledBlessingCrit) {
            totalCritMult = 2.0; 
            label = "CRIT!";
            color = "#ff4e4e"; // Standard Red Crit
        }

        amount *= totalCritMult;
    }

    // 4. Update Game State
    game.primos += amount;
    game.totalPrimosEver += amount;

    // 5. Visuals
    let display = `${label} +${formatNumbers(amount)}`.trim();
    spawnText(e.clientX, e.clientY, display, color);

    if (typeof updateAchievements === 'function') {
        updateAchievements();
    }
    
    updateUI();
});

// Passive Income Loop
setInterval(() => {
    if (!isLoggedIn) return;

    // 1. Calculate Base PPS from generators
    let basePPS = 0;
    game.generators.forEach(g => {
        basePPS += (g.income * g.count);
    });

    // 2. Get active Pet Buffs
    const petBuffs = calculatePetBuffs();

    // 3. Get Game Multipliers (including Resonance Blessing if it exists)
    const resonanceBlessing = game.blessings.find(b => b.id === 'resonance');
    const resonanceMult = 1 + (resonanceBlessing ? resonanceBlessing.level * 0.10 : 0);
    const achievementBonus = getAchievementMultiplierBonus();
    const totalGameMult = (game.multiplier || 1) * resonanceMult * (1.0 + achievementBonus);

    // 4. Calculate Final Income 
    let finalPPS = basePPS * petBuffs.ppsMult * (petBuffs.globalMult || 1) * totalGameMult;

    // Divide by 10 because the interval runs every 100ms (10 times per second)
    let income = finalPPS / 10;

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
    if (panelId === 'achievements'){
        renderAchievements();
    }
}

function updateUI() {
    // --- 0. PET BUFF CALCULATIONS ---
    const petBuffs = calculatePetBuffs();

    // --- 1. RECALCULATE BASE STATS ---
    let baseCP = 1;
    game.clickUpgrades.forEach(up => {
        baseCP += (Number(up.level) || 0) * (Number(up.power) || 0);
    });

    let basePPS = 0;
    game.generators.forEach(g => {
        basePPS += (Number(g.income) || 0) * (Number(g.count) || 0);
    });

    // --- 2. APPLY MULTIPLIERS ---
    const resonanceBlessing = game.blessings.find(b => b.id === 'resonance');
    const resonanceMult = 1 + (resonanceBlessing ? (Number(resonanceBlessing.level) || 0) * 0.10 : 0);

    const temptation = game.shopItems.find(item => item.id === 'buff_pot');
    const temptationMult = 1 + (temptation ? (Number(temptation.level) || 0) * 0.5 : 0);

    const achievementBonus = getAchievementMultiplierBonus();

    let totalGameMult = (game.multiplier || 1) * resonanceMult * (1.0 + achievementBonus);

    // --- 3. FINAL POWER CALCULATIONS ---
    // Hero's Wit logic: Add the 100s to baseCP BEFORE final calculation
    const heroWitBlessing = game.blessings.find(b => b.id === 'strong_start');
    const heroWitBonus = (heroWitBlessing ? (Number(heroWitBlessing.level) || 0) * 100 : 0);

    // This makes your core base 101, 201, 301, etc.
    let effectiveBaseCP = baseCP + heroWitBonus;

    // Apply multipliers to the combined base
    game.clickPower = effectiveBaseCP * totalGameMult * temptationMult * (petBuffs.clickMult || 1) * (petBuffs.globalMult || 1);
    
    // finalPPS (Removed temptationMult here as requested previously)
    let finalPPS = basePPS * totalGameMult * (petBuffs.ppsMult || 1) * (petBuffs.globalMult || 1);

    game.currentDiscount = petBuffs.discount || 1;

    // --- 4. MAIN RESOURCE DISPLAYS ---
    const primoEl = document.getElementById('primogems') || document.getElementById('primo-count');
    if (primoEl) primoEl.innerText = formatNumbers(game.primos);

    const statTotalEl = document.getElementById('stat-total');
    if (statTotalEl) statTotalEl.innerText = formatNumbers(game.primos);

    const ppsEl = document.getElementById('stat-pps') || document.getElementById('primos-per-sec');
    if (ppsEl) ppsEl.innerText = formatNumbers(finalPPS);

    const cpEl = document.getElementById('stat-click') || document.getElementById('click-power-text');
    if (cpEl) cpEl.innerText = formatNumbers(game.clickPower);

    const multEl = document.getElementById('stat-mult');
    if (multEl) {
        multEl.innerText = totalGameMult.toFixed(2) + 'x';
    }

    if (document.getElementById('stat-total-ever')) {
        document.getElementById('stat-total-ever').innerText = formatNumbers(game.totalPrimosEver);
    }

    // --- 5. DYNAMIC LIST RENDERING ---
    // This is where the shop items get redrawn.
    renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    renderList('gen-upgrades', game.generators, buyGenerator);

    // --- 6. SPECIAL STATS & BUTTONS ---
    const prestigeDisplay = document.getElementById('stat-prestige');
    if (prestigeDisplay) {
        prestigeDisplay.innerText = formatNumbers(game.prestigePoints || 0);
    }

    const ascBtn = document.getElementById('ascension-btn');
    if (ascBtn) {
        const canAscend = game.primos >= 1000000;
        ascBtn.classList.toggle('disabled', !canAscend);
        ascBtn.innerText = canAscend ? "Ascend Now!" : "Ascend (Requires 1M)";
    }

    if (typeof updatePartySidebar === "function") {
        updatePartySidebar();
    }
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

// --- RENDERING FUNCTIONS ---
function renderList(containerId, data, clickFn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const existingCards = container.querySelectorAll('.upgrade-card');

    // --- NEW: Check for Temptation Multiplier for the Preview ---
    const temptation = game.shopItems.find(item => item.id === 'buff_pot');
    const temptationMult = 1 + (temptation ? (Number(temptation.level) || 0) * 0.5 : 0);

    // --- PET DISCOUNT LOGIC ---
    const effectiveDiscount = game.currentDiscount || 1;

    data.forEach((item, index) => {
        const rate = item.rate || (item.power ? 1.5 : 1.75);

        const discountedBaseCost = item.cost * effectiveDiscount;
        let displayAmt = buyAmount === 'max' ? getMaxAffordable(game.primos, discountedBaseCost, rate) : buyAmount;
        let effectiveAmt = (displayAmt <= 0) ? 1 : displayAmt;

        let totalCost = getMultiCost(item.cost, rate, effectiveAmt) * effectiveDiscount;
        const canAfford = game.primos >= totalCost;
        let displayLvl = item.level !== undefined ? item.level : item.count;

        let card = existingCards[index];
        if (!card) {
            card = document.createElement('div');
            card.className = 'upgrade-card';
            container.appendChild(card);
        }

        card.classList.toggle('disabled', !canAfford);

        const costStyle = effectiveDiscount < 1 ? 'color: #ffe164; font-weight: bold;' : '';

        // --- FIXED PREVIEW TEXT ---
        // We multiply the displayed power by temptationMult so +10 becomes +15 in the UI
        let powerValue = item.power ? (item.power * temptationMult) : (item.income * temptationMult);
        let powerLabel = item.power ? `+${formatNumbers(powerValue)} Click` : `+${formatNumbers(powerValue)}/s`;

        const newHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${powerLabel}</small><br>
                <small style="color: #64ffbf;">Buying: ${displayAmt}x</small>
            </div>
            <div>
                <span>Cost: <span class="cost-val" style="${costStyle}">${formatNumbers(totalCost)}</span></span><br>
                <small>Lvl: <span class="lvl-val">${displayLvl}</span></small>
            </div>
        `;

        if (card.innerHTML !== newHTML) {
            card.innerHTML = newHTML;
        }

        card.onclick = () => {
            if (canAfford) {
                clickFn(index);
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

    // Ensure items exist in the game object
    if (!game.shopItems || game.shopItems.length === 0) {
        game.shopItems = [
            { id: 'time_warp', name: 'Time Warp', cost: 500, desc: 'Instantly gain 30 minutes of passive income.' },
            { id: 'seelie', name: 'Follower Seelie', cost: 1000, desc: 'A floating companion. Max 3.' }
        ];
    }

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

        // Matches your .upgrade-card.disabled CSS
        card.className = `upgrade-card ${(!canAfford || isMaxSeelie || isOnCooldown) ? 'disabled' : ''}`;

        let costDisplay;
        if (isMaxSeelie) {
            costDisplay = `<span class="highlight">MAXED</span>`;
        } else if (isOnCooldown) {
            costDisplay = `<span class="highlight">${cooldownText}</span>`;
        } else {
            // Using formatNumbers for consistent 1.0K, 1.0M styling
            costDisplay = `Cost: <span class="highlight">${formatNumbers(item.cost)}</span>`;
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

function renderPetShop() {
    const container4 = document.getElementById('pet-shop-list-4');
    const container5 = document.getElementById('pet-shop-list-5');
    if (!container4 || !container5) return;

    container4.innerHTML = '';
    container5.innerHTML = '';

    const availablePets = game.pets.filter(pet => !game.ownedPets.includes(pet.id));

    availablePets.forEach((pet) => {
        const card = document.createElement('div');

        const effectiveDiscount = game.currentDiscount || 1;
        const finalCost = pet.cost * effectiveDiscount;
        const canAfford = game.primos >= finalCost;
        const is5Star = pet.rarity === 5;

        // Apply classes for rarity and the disabled state if too expensive
        card.className = `pet-card rarity-${pet.rarity} ${(!canAfford || !isLoggedIn) ? 'disabled' : ''}`;

        // Buff Text Logic
        let buffText = "";
        if (pet.buffType === 'click') buffText = `+${(pet.buffValue * 100)}% Click`;
        else if (pet.buffType === 'pps_mult') buffText = `${pet.buffValue}x PPS`;
        else if (pet.buffType === 'global_mult') buffText = `${pet.buffValue}x Global`;
        else if (pet.buffType === 'discount') buffText = `-${(pet.buffValue * 100)}% Cost`;
        else buffText = pet.buffType.replace('_', ' ');

        // Visual feedback for discounted prices
        const costStyle = (effectiveDiscount < 1) ? 'color: #ffe164; font-weight: bold;' : 'color: #64ffbf;';

        // Get glow color for the vision tag
        let glowColor = "#ffffff";
        if (pet.vision === 'Pyro') glowColor = "#ff4e4e";
        else if (pet.vision === 'Anemo') glowColor = "#72e5d3";
        else if (pet.vision === 'Cryo') glowColor = "#a0e9ff";
        else if (pet.vision === 'Electro') glowColor = "#d28fd6";
        else if (pet.vision === 'Geo') glowColor = "#e3b342";
        else if (pet.vision === 'Hydro') glowColor = "#4cc2f1";
        else if (pet.vision === 'Dendro') glowColor = "#a5c83b";

        card.innerHTML = `
            <div class="pet-card-main">
                <div class="pet-card-left">
                    <div class="pet-icon-wrapper">
                        <img src="${pet.icon}" alt="${pet.name}" class="pet-chibi" draggable="false">
                        <div class="vision-tag" style="background: ${glowColor}; color: #000;">
                            ${pet.vision}
                        </div>
                    </div>
                    <div class="pet-info">
                        <strong class="pet-name">${pet.name}</strong>
                        <div class="pet-buff-tag">${buffText}</div>
                    </div>
                </div>
                <div class="pet-card-right" style="text-align: right;">
                    <span class="pet-cost" style="${costStyle}">${formatNumbers(finalCost)}</span>
                    <br><small style="font-size: 0.6rem; color: white; opacity: 0.7; letter-spacing: 1px;">PRIMOGEMS</small>
                </div>
            </div>
            <button class="equip-btn" style="background: rgba(255, 255, 255, 0.15); margin-top: 10px;">
                RECRUIT
            </button>
        `;

        card.onclick = () => {
            if (!isLoggedIn) {
                showNotification("Please Login to recruit companions!");
                if (typeof openAuth === 'function') openAuth();
                return;
            }

            if (game.primos >= finalCost) {
                game.primos -= finalCost;
                game.ownedPets.push(pet.id);
                showNotification(`${pet.name} joined your party!`);

                renderPetShop();
                if (typeof renderPets === 'function') renderPets();
                updateUI();
                saveCloudGame();
            } else {
                showNotification("Not enough Primogems!");
            }
        };

        if (is5Star) container5.appendChild(card);
        else container4.appendChild(card);
    });
}

function renderPets() {
    const container = document.getElementById('pets-grid');
    if (!container) return;
    container.innerHTML = '';

    game.pets.forEach(pet => {
        const isOwned = game.ownedPets.includes(pet.id);
        const isActive = game.activePets.includes(pet.id);

        const card = document.createElement('div');
        // Combined your rarity classes with the active/locked states
        card.className = `pet-card rarity-${pet.rarity} ${!isOwned ? 'locked' : ''} ${isActive ? 'active' : ''}`;

        const visionColors = {
            Anemo: '#64ffbf', Pyro: '#ff6464', Hydro: '#64c9ff',
            Electro: '#d164ff', Dendro: '#a2ff64', Cryo: '#64f7ff', Geo: '#ffe164'
        };
        const glowColor = visionColors[pet.vision] || '#ffffff';

        // Dynamic Glow for active pets
        if (isActive) card.style.boxShadow = `0 0 15px ${glowColor}`;

        // Buff Text for the Tag
        let buffText = "";
        if (pet.buffType === 'click') buffText = `+${(pet.buffValue * 100)}% Click`;
        else if (pet.buffType === 'pps_mult') buffText = `${pet.buffValue}x PPS`;
        else buffText = pet.buffType.replace('_', ' ');


        card.innerHTML = `
            <div class="pet-card-main">
                <div class="pet-card-left">
                    <div class="pet-icon-wrapper">
                        <img src="${pet.icon}" class="pet-chibi" alt="${pet.name}" draggable="false">
                        <div class="vision-tag" style="background: ${glowColor}; color: #000;">
                            ${pet.vision}
                        </div>
                    </div>
                    <div class="pet-info">
                        <div class="pet-name">${pet.name}</div>
                        <div class="pet-buff-tag">${buffText}</div>
                    </div>
                </div>
            </div>
            <button class="equip-btn ${isActive ? 'active' : ''}">
                ${isActive ? 'UNEQUIP' : (isOwned ? 'EQUIP' : 'LOCKED')}
            </button>
        `;

        card.onclick = () => {
            if (isOwned) {
                togglePetEquip(pet.id);
                renderPets();
                if (typeof updateSidebarParty === 'function') updateSidebarParty();
            } else {
                showNotification("This companion hasn't joined you yet!");
            }
        };

        container.appendChild(card);
    });

    if (document.getElementById('party-count')) {
        document.getElementById('party-count').innerText = game.activePets.length;
    }
}

function renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    container.innerHTML = '';

    if (!game.achievementsData || game.achievementsData.length === 0) {
        if (window.achievementsData) {
            game.achievementsData = window.achievementsData;
        } else {
            console.warn("Achievements layout data could not be found in window scope.");
            return;
        }
    }

    const userIsLoggedIn = (typeof isLoggedIn !== 'undefined' && isLoggedIn);

    // Calculate total passive generators owned safely using a reducer
    let totalGeneratorsOwned = 0;
    if (game.generators && Array.isArray(game.generators)) {
        totalGeneratorsOwned = game.generators.reduce((sum, g) => sum + (parseInt(g.count) || 0), 0);
    }

    // Calculate total click upgrade levels safely using a reducer
    let totalClickUpgradesOwned = 0;
    if (game.clickUpgrades && Array.isArray(game.clickUpgrades)) {
        totalClickUpgradesOwned = game.clickUpgrades.reduce((sum, up) => sum + (parseInt(up.level) || 0), 0);
    }

    // Loop directly over the game object's array
    game.achievementsData.forEach(ach => {
        try {
            const isOwned = game.completedAchievements && game.completedAchievements.includes(ach.id);

            let currentProgress = 0;
            let pct = 0;
            let displayCurrent = "0";

            if (userIsLoggedIn) {
                if (ach.type === 'clicks') {
                    currentProgress = parseInt(game.clicks) || 0;
                }
                else if (ach.type === 'clickUpgrades') {
                    currentProgress = totalClickUpgradesOwned;
                }
                else if (ach.type === 'totalGenerators') {
                    currentProgress = totalGeneratorsOwned;
                }
                else if (ach.type === 'totalPrimos') {
                    currentProgress = parseInt(game.totalPrimosEver) || parseInt(game.primos) || 0;
                }

                pct = Math.min(100, Math.floor((currentProgress / ach.target) * 100));
                displayCurrent = typeof formatNumbers === 'function' ? formatNumbers(Math.floor(currentProgress)) : Math.floor(currentProgress).toLocaleString();
            }

            const displayTarget = typeof formatNumbers === 'function' ? formatNumbers(ach.target) : ach.target.toLocaleString();

            const card = document.createElement('div');
            card.className = `achievement-row ${isOwned ? 'completed' : ''}`;
            card.style.textAlign = 'left';

            if (!userIsLoggedIn) {
                card.style.opacity = '0.4';
                card.style.filter = 'grayscale(1) brightness(0.6)';
                card.style.pointerEvents = 'none';
            }

            const qtyDisplay = isOwned ? 'MAX' : `${displayCurrent}/${displayTarget}`;
            const rewardText = !userIsLoggedIn ? 'CLOUD SAVE REQUIRED' : `+${(ach.bonus * 100)}% MULT`;

            card.innerHTML = `
                <div class="achievement-header" style="display: flex; justify-content: space-between; width: 100%;">
                    <span class="achievement-title" style="font-weight: 600;">
                        ${ach.title} ${isOwned ? '✓' : ''}
                    </span>
                    <span class="achievement-reward" style="color: ${!userIsLoggedIn ? '#8a9ba8' : '#ffd700'}; font-size: 0.75rem; letter-spacing: 1px; text-transform: uppercase;">
                        ${rewardText}
                    </span>
                </div>
                <div class="achievement-desc" style="opacity: 0.6; font-size: 0.8rem; color: rgba(255, 255, 255, 0.5);">${ach.desc}</div>
                <div class="achievement-progress-container" style="display: flex; align-items: center; gap: 12px; margin-top: 4px; width: 100%;">
                    <div class="achievement-progress-bg" style="flex-grow: 1; height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; overflow: hidden;">
                        <div class="achievement-progress-bar" style="width: ${pct}%; height: 100%; transition: width 0.3s ease; background: ${!userIsLoggedIn ? '#4a5568' : 'linear-gradient(90deg, #00b98e, #64ffbf)'};"></div>
                    </div>
                    <div class="achievement-qty" style="font-size: 0.75rem; font-family: 'Courier New', Courier, monospace; color: rgba(255, 255, 255, 0.7); min-width: 75px; text-align: right;">
                        ${userIsLoggedIn ? qtyDisplay : 'LOCKED'}
                    </div>
                </div>
            `;

            container.appendChild(card);
        } catch (err) {
            console.error("Error rendering individual achievement row: ", err);
        }
    });
}

function updateAchievements() {
    if (!game) return;
    
    // Ensure tracker history array is stable
    if (!game.completedAchievements || !Array.isArray(game.completedAchievements)) {
        game.completedAchievements = [];
    }

    // Rely on your global application data definitions
    const data = window.achievementsData || [];
    const userIsLoggedIn = (typeof isLoggedIn !== 'undefined' && isLoggedIn);
    let stateChanged = false;

    if (userIsLoggedIn && data.length > 0) {
        let totalGeneratorsOwned = null;
        let totalClickUpgradesOwned = null;

        data.forEach(ach => {
            if (game.completedAchievements.includes(ach.id)) return;

            let currentProgress = 0;

            if (ach.type === 'clicks') {
                currentProgress = parseInt(game.clicks) || 0;
            }
            else if (ach.type === 'clickUpgrades') {
                if (totalClickUpgradesOwned === null) {
                    totalClickUpgradesOwned = (game.clickUpgrades && Array.isArray(game.clickUpgrades))
                        ? game.clickUpgrades.reduce((sum, up) => sum + (parseInt(up.level) || 0), 0)
                        : 0;
                }
                currentProgress = totalClickUpgradesOwned;
            }
            else if (ach.type === 'totalGenerators') {
                if (totalGeneratorsOwned === null) {
                    totalGeneratorsOwned = (game.generators && Array.isArray(game.generators))
                        ? game.generators.reduce((sum, g) => sum + (parseInt(g.count) || 0), 0)
                        : 0;
                }
                currentProgress = totalGeneratorsOwned;
            }
            else if (ach.type === 'totalPrimos') {
                currentProgress = parseInt(game.totalPrimosEver) || parseInt(game.primos) || 0;
            }

            if (currentProgress >= ach.target) {
                game.completedAchievements.push(ach.id);
                stateChanged = true;
                if (typeof showNotification === 'function') {
                    showNotification(`Achievement Unlocked: ${ach.title}!`);
                }
            }
        });

        if (stateChanged) {
            if (typeof calculatePPS === 'function') calculatePPS();
            if (typeof saveCloudGame === 'function') saveCloudGame();
            
            const container = document.getElementById('achievements-list');
            if (container && container.parentElement.classList.contains('active')) {
                if (typeof renderAchievements === 'function') renderAchievements();
                else if (typeof updateUI === 'function') updateUI();
            }
        }
    }
}

function updatePartySidebar() {
    const slotText = document.querySelector('.active-party small');
    if (slotText) {
        slotText.innerText = `Slots Used: ${game.activePets.length}/4`;
    }

    const partyContainer = document.getElementById('party-icons-sidebar');
    if (partyContainer) {
        partyContainer.innerHTML = '';
        game.activePets.forEach(petId => {
            const pet = game.pets.find(p => p.id === petId);
            if (pet) {
                partyContainer.innerHTML += `
                    <img src="${pet.icon}" 
                         class="sidebar-pet-icon" 
                         style="width: 40px; height: 40px; margin: 5px; border-radius: 50%; border: 1px solid var(--accent-blue);" 
                         title="${pet.name}">`;
            }
        });
    }
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
