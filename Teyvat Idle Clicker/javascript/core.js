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
    // Fetch Resonance Blessing for the +10% per level bonus
    const resonanceBlessing = game.blessings.find(b => b.id === 'resonance');
    const resonanceMult = 1 + (resonanceBlessing ? resonanceBlessing.level * 0.10 : 0);

    // Combine Ascension (game.multiplier) and Blessings
    let totalGameMult = (game.multiplier || 1) * resonanceMult;

    // Apply everything to Click Power and PPS
    game.clickPower = baseCP * (game.clickMultiplier || 1) * petBuffs.clickMult * totalGameMult;
    let finalPPS = basePPS * totalGameMult * petBuffs.ppsMult;

    // --- 3. MAIN RESOURCE DISPLAYS ---
    document.getElementById('primogems').innerText = formatNumbers(game.primos);
    document.getElementById('stat-total').innerText = formatNumbers(game.primos);

    // Multiplier and Power stats - Updated to show the calculated totalGameMult
    document.getElementById('stat-mult').innerText = totalGameMult.toFixed(2) + 'x';
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

        card.className = `pet-card rarity-${pet.rarity} ${(!canAfford || !isLoggedIn) ? 'disabled' : ''}`;

        // Buff Text Logic for the tag
        let buffText = "";
        if (pet.buffType === 'click') buffText = `+${(pet.buffValue * 100)}% Click`;
        else if (pet.buffType === 'pps_mult') buffText = `${pet.buffValue}x PPS`;
        else if (pet.buffType === 'global_mult') buffText = `${pet.buffValue}x Global`;
        else if (pet.buffType === 'discount') buffText = `-${(pet.buffValue * 100)}% Cost`;
        else buffText = pet.buffType.replace('_', ' ');

        const costStyle = (effectiveDiscount < 1) ? 'color: #ffe164; font-weight: bold;' : 'color: #64ffbf;';

        card.innerHTML = `
            <div class="pet-card-main">
                <div class="pet-card-left">
                    <div class="pet-icon-wrapper">
                        <img src="${pet.icon}" alt="${pet.name}" class="pet-chibi" draggable="false">
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
