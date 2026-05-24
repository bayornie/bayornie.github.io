console.log("core.js is loaded and running!");
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

    if (index >= game.bgmList.length) index = 0;
    if (index < 0) index = game.bgmList.length - 1;

    game.currentTrackIndex = index;
    const track = game.bgmList[index];

    window.bgmPlayer = bgmPlayer;
    bgmPlayer.src = track.file;
    bgmPlayer.volume = game.bgmVolume;

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

// --- AUTH FUNCTIONS ---
function handleLogout() {
    auth.signOut().then(() => {
        isLoggedIn = false;

        // 1. Hide Game UI Panels
        const profilePanel = document.getElementById('profile-panel');
        if (profilePanel) profilePanel.style.display = 'none';

        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) settingsOverlay.style.display = 'none';

        // 2. Clear visual character icons
        const miniList = document.getElementById('mini-pet-list');
        if (miniList) miniList.innerHTML = '';

        // 3. Reset stats
        document.querySelectorAll('.stat-primos').forEach(el => el.innerText = '0');

        showNotification("Logged out successfully!");

        if (typeof clearAuthInputs === 'function') clearAuthInputs();

        // 4. Force reload to return to the initial state
        location.reload();
    }).catch((error) => {
        console.error("Logout Error:", error);
        showNotification("Error during logout.");
    });
}

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
    const sets = typeof getActiveSetCounts === "function" ? getActiveSetCounts() : {};

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
    let critChanceFromBlessing = critLevel * 0.05;

    // ARTIFACT STAT POOL ADDITION HOOK
    if (typeof getArtifactStatModifier === "function") {
        critChanceFromBlessing += getArtifactStatModifier("critChance");
    }
    // MARECHAUSSEE HUNTER STACK HOOK
    if (game.marechausseeStacks > 0) {
        critChanceFromBlessing += (game.marechausseeStacks * 0.12);
    }

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
        let baseCritMultiplier = 2.0;

        // ARTIFACT CRIT DAMAGE HOOK
        if (typeof getArtifactStatModifier === "function") {
            baseCritMultiplier += getArtifactStatModifier("critClickMult");
        }

        if (hasSkirk && hasKaeya) {
            totalCritMult = baseCritMultiplier * 3.0;
            label = "ABYSSAL FREEZE!";
            color = "#b7a8ff";
        } else if (hasSkirk) {
            totalCritMult = baseCritMultiplier * 1.5;
            label = "ABYSSAL!";
            color = "#a155ff";
        } else if (hasKaeya) {
            totalCritMult = baseCritMultiplier;
            label = "FREEZE!";
            color = "#8deaff";
        } else if (rolledBlessingCrit) {
            totalCritMult = baseCritMultiplier;
            label = "CRIT!";
            color = "#ff4e4e";
        }

        amount *= totalCritMult;

        // --- THUNDERING FURY 4-PIECE MECHANIC ---
        if (sets["thundering_fury"] >= 4 && Math.random() < 0.01) {
            if (game.timeWarpCooldown > 0) {
                game.timeWarpCooldown = Math.max(0, game.timeWarpCooldown - 30000);
                showNotification("Thundering Fury: Time Warp CD Reduced by 30s!", "electro");
            }
        }
    }

    // --- MARECHAUSSEE HUNTER TIMER REFRESH HOOK ---
    if (sets["marechaussee"] >= 4) {
        if (!game.marechausseeStacks) game.marechausseeStacks = 0;
        if (game.marechausseeStacks < 3) {
            game.marechausseeStacks++;
            showNotification(`Marechaussee Hunter: Crit Rate +${game.marechausseeStacks * 12}%`, "pyro");
        }
        if (game.marechausseeTimer) clearTimeout(game.marechausseeTimer);
        game.marechausseeTimer = setTimeout(() => {
            game.marechausseeStacks = 0;
        }, 5000);
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

document.addEventListener('click', (e) => {
    if (e.target.closest('#domain-combat-box')) {
        handleDomainClick(e);
    }
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

    // ARTIFACT PPS MODIFIER HOOK
    if (typeof getArtifactStatModifier === "function") {
        finalPPS *= (1 + getArtifactStatModifier("ppsMult"));
    }

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
    // 1. HARD RESET: Remove inline display to let CSS control visibility
    const battleView = document.querySelector('.domain-battle-view');
    if (battleView) {
        battleView.style.display = "";
        battleView.classList.remove('active');
    }

    // 2. THE GREAT RESET
    const allPanels = document.querySelectorAll('.game-panel, .overlay, .auth-overlay, .modal-overlay, #settings-overlay, #music-overlay');
    allPanels.forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });

    // 3. TARGET THE NEW PANEL
    let targetId = panelId.includes('-panel') ? panelId : `${panelId}-panel`;
    const targetPanel = document.getElementById(targetId) || document.getElementById(panelId);

    if (targetPanel) {
        if (targetPanel.classList.contains('game-panel')) {
            targetPanel.style.display = 'block';
        } else {
            targetPanel.style.display = 'flex';
            targetPanel.style.flexDirection = 'column';
        }

        targetPanel.style.alignItems = 'center';
        targetPanel.style.textAlign = 'center';
        targetPanel.classList.add('active');

        const stretchContainers = targetPanel.querySelectorAll('.upgrade-list, .shop-grid, .pet-list, .profile-container, .stats-container, #shop-container, #pet-shop-container, .leaderboard-card');
        stretchContainers.forEach(container => {
            container.style.width = '100%';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'stretch';
        });
    }

    // 3. UPDATE NAV BUTTONS
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (window.event && window.event.currentTarget && window.event.currentTarget.classList.contains('nav-item')) {
        window.event.currentTarget.classList.add('active');
    } else {
        const navBtn = document.querySelector(`nav button[onclick*="'${panelId}'"]`);
        if (navBtn) navBtn.classList.add('active');
    }

    // 4. DATA RE-RENDERING
    if (panelId.includes('upgrades')) renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    if (panelId.includes('generators')) renderList('gen-upgrades', game.generators, buyGenerator);
    if (panelId.includes('prestige')) renderPrestigeUpgrades();
    if (panelId.includes('pets')) renderPets();
    if (panelId.includes('shop') || panelId.includes('domain')) {
        renderShopItems();
        if (panelId.includes('shop')) renderPetShop();
    }

    if (panelId.includes('achievements')) {
        renderAchievements();
    }
    if (panelId === 'fate-shop' || panelId === 'fate-shop-panel') {
        const fateShopPanel = document.getElementById('fate-shop-panel');
        if (fateShopPanel) fateShopPanel.style.display = 'block';
        renderFateShop();
    }
    if (panelId === 'domain' || panelId === 'domain-panel') {
        const engine = getDomainEngine();
        if (engine && engine.isFightActive) {
            toggleDomainView('battle');
        } else {
            toggleDomainView('selection');
            initDomainMenu();
        }
    }

    // Refresh stats for Profile or Statistics tabs
    if (panelId.includes('profile') || panelId.includes('stats')) {
        if (typeof updateProfileTabStats === 'function') updateProfileTabStats();
    }
}

// Maps the 'Select Track' button in HTML to the modal logic
function openMusicSelect() {
    showPanel('music');
}

function updateProfileTabStats() {
    const totalEver = document.getElementById('tab-total-ever');
    const currentPrimos = document.getElementById('tab-current-primos');

    if (totalEver) totalEver.innerText = formatNumbers(game.totalPrimosEver);
    if (currentPrimos) currentPrimos.innerText = formatNumbers(game.primos);
}

function updateUI() {
    // --- PET BUFF CALCULATIONS ---
    const petBuffs = calculatePetBuffs();

    // --- RECALCULATE BASE STATS ---
    let baseCP = 1;
    game.clickUpgrades.forEach(up => {
        baseCP += (Number(up.level) || 0) * (Number(up.power) || 0);
    });

    let basePPS = 0;
    game.generators.forEach(g => {
        let genIncome = Number(g.income) || 0;

        // Katheryne's Directive: Affects the BASE income of the generator directly (+15% per level)
        if (game.katheryneMultiplier) {
            genIncome *= game.katheryneMultiplier;
        }

        basePPS += genIncome * (Number(g.count) || 0);
    });

    // --- APPLY MULTIPLIERS ---
    const resonanceBlessing = game.blessings.find(b => b.id === 'resonance');
    const resonanceMult = 1 + (resonanceBlessing ? (Number(resonanceBlessing.level) || 0) * 0.10 : 0);

    const temptation = game.shopItems.find(item => item.id === 'buff_pot');
    const temptationMult = 1 + (temptation ? (Number(temptation.level) || 0) * 0.5 : 0);

    const achievementBonus = getAchievementMultiplierBonus();

    let totalGameMult = (game.multiplier || 1) * resonanceMult * (1.0 + achievementBonus);

    // --- FINAL POWER CALCULATIONS ---
    const seelieBlessing = game.blessings.find(b => b.id === 'strong_start');
    const seelieBonus = (seelieBlessing ? (Number(seelieBlessing.level) || 0) * 100 : 0);

    let effectiveBaseCP = baseCP + seelieBonus;

    game.clickPower = (effectiveBaseCP * totalGameMult * temptationMult * (petBuffs.clickMult || 1) * (petBuffs.globalMult || 1)) + (petBuffs.flatClick || 0);

    // ARTIFACT CLICK MODIFIER HOOK
    if (typeof getArtifactStatModifier === "function") {
        game.clickPower *= (1 + getArtifactStatModifier("clickPower"));
    }
    // SHIMENAWA 4PC BURST STATE HOOK
    if (game.shimenawaBurstActive) {
        game.clickPower *= 1.50;
    }

    // Calculate regular passive income with general multipliers
    let finalPPS = basePPS * totalGameMult * temptationMult * (petBuffs.ppsMult || 1) * (petBuffs.globalMult || 1);

    // ARTIFACT PPS MODIFIER HOOK
    if (typeof getArtifactStatModifier === "function") {
        finalPPS *= (1 + getArtifactStatModifier("ppsMult"));
    }

    // Abyssal Leyline Shard: Multiplies final generator output by x2.5)
    if (game.abyssalGeneratorMultiplier) {
        finalPPS *= game.abyssalGeneratorMultiplier;
    }

    game.pps = finalPPS;

    game.currentDiscount = petBuffs.discount || 1;

    // --- MAIN RESOURCE DISPLAYS ---
    const primoEl = document.getElementById('primogems') || document.getElementById('primo-count');
    if (primoEl) primoEl.innerText = formatNumbers(game.primos);

    const statPrimosEl = document.getElementById('stat-primogems');
    if (statPrimosEl) statPrimosEl.innerText = formatNumbers(game.primos);

    const statPrimosMobile = document.getElementById('stat-primos-mobile');
    if (statPrimosMobile) statPrimosMobile.innerText = formatNumbers(game.primos);

    const ppsEl = document.getElementById('stat-pps') || document.getElementById('primos-per-sec');
    if (ppsEl) ppsEl.innerText = formatNumbers(finalPPS);

    const cpEl = document.getElementById('stat-click') || document.getElementById('click-power-text');
    if (cpEl) cpEl.innerText = formatNumbers(game.clickPower);

    const multEl = document.getElementById('stat-mult');
    if (multEl) multEl.innerText = totalGameMult.toFixed(2) + 'x';

    const profName = document.getElementById('prof-name-tab');
    if (profName) profName.innerText = game.playerName || "Traveler";

    const tabCurrentPrimos = document.getElementById('tab-current-primos');
    if (tabCurrentPrimos) tabCurrentPrimos.innerText = formatNumbers(game.primos);

    const tabClickPower = document.getElementById('tab-click-power');
    if (tabClickPower) tabClickPower.innerText = formatNumbers(game.clickPower);

    const tabPps = document.getElementById('tab-pps');
    if (tabPps) tabPps.innerText = formatNumbers(finalPPS) + "/s";

    const totalEverVal = formatNumbers(game.totalPrimosEver);
    if (document.getElementById('stat-total-ever')) {
        document.getElementById('stat-total-ever').innerText = totalEverVal;
    }
    if (document.getElementById('tab-total-ever')) {
        document.getElementById('tab-total-ever').innerText = totalEverVal;
    }

    // --- DYNAMIC LIST RENDERING ---
    renderList('click-upgrades', game.clickUpgrades, buyClickUpgrade);
    renderList('gen-upgrades', game.generators, buyGenerator);

    // --- SPECIAL STATS & BUTTONS ---
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
        toggleIcon.innerText = "🔒";
    } else {
        passwordInput.type = "password";
        toggleIcon.innerText = "👁️";
    }
}

function toggleDomainView(view) {
    const selectionView = document.querySelector('.domain-selection-view');
    const battleView = document.querySelector('.domain-battle-view');

    if (view === 'battle') {
        selectionView.style.display = 'none';
        battleView.style.display = 'block';
    } else {
        selectionView.style.display = 'block';
        battleView.style.display = 'none';
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

        const newHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.power ? '+' + item.power + ' Click' : '+' + item.income.toFixed(1) + '/s'}</small><br>
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
    // --- 1. RENDER STANDARD WANDERER GOODS ---
    const container = document.getElementById('shop-items');
    if (container) {
        container.innerHTML = '';

        if (!game.shopItems || game.shopItems.length === 0) {
            game.shopItems = [
                { id: 'time_warp', name: 'Time Warp', cost: 500, desc: 'Instantly gain 30 minutes of passive income.' },
                { id: 'seelie', name: 'Follower Seelie', cost: 1000, desc: 'A floating companion. Max 3.' }
            ];
        }

        game.shopItems.forEach((item, index) => {
            const card = document.createElement('div');
            let isOnCooldown = false;
            let cooldownText = "";

            if (item.id === 'time_warp' && game.lastWarpTime) {
                const now = Date.now();
                const cooldownPeriod = 3600000;
                const timePassed = now - game.lastWarpTime;

                if (timePassed < cooldownPeriod) {
                    isOnCooldown = true;
                    const minsLeft = Math.ceil((cooldownPeriod - timePassed) / 60000);
                    cooldownText = `Ready in ${minsLeft}m`;
                }
            }

            const isMaxSeelie = item.id === 'seelie' && (game.seelies || 0) >= 3;
            const canAfford = game.primos >= item.cost;

            card.className = `upgrade-card ${(!canAfford || isMaxSeelie || isOnCooldown) ? 'disabled' : ''}`;

            let costDisplay;
            if (isMaxSeelie) {
                costDisplay = `<span class="highlight">MAXED</span>`;
            } else if (isOnCooldown) {
                costDisplay = `<span class="highlight">${cooldownText}</span>`;
            } else {
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
                    showNotification("Maximum number of Seelies reached!");
                } else if (isOnCooldown) {
                    showNotification("Item is still on cooldown!");
                } else {
                    buyShopItem(index);
                }
            };

            container.appendChild(card);
        });
    }

    // --- 2. RENDER SEPARATE DOMAIN TICKET EXCHANGE LINE ---
    const ticketContainer = document.getElementById('domain-ticket-shop-list');
    if (ticketContainer) {
        ticketContainer.innerHTML = '';

        const ticketItem = game.domainTicket && game.domainTicket[0];

        if (ticketItem) {
            const canAffordTicket = game.primos >= ticketItem.cost;
            const ticketCard = document.createElement('div');

            ticketCard.className = `upgrade-card ${(!canAffordTicket || !isLoggedIn) ? 'disabled' : ''}`;
            ticketCard.style.display = 'flex';
            ticketCard.style.justifyContent = 'space-between';
            ticketCard.style.alignItems = 'center';
            ticketCard.style.textAlign = 'left';

            ticketCard.innerHTML = `
                <div style="flex-grow: 1; padding-right: 15px;">
                    <strong style="display: inline-block; text-align: left;">${ticketItem.icon} ${ticketItem.name}</strong><br>
                    <small style="display: inline-block; text-align: left; margin-top: 4px;">${ticketItem.desc}</small>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <span>Cost: <span class="highlight">${formatNumbers(ticketItem.cost)}</span></span>
                </div>
            `;

            ticketCard.onclick = () => {
                if (!isLoggedIn) {
                    showNotification("🔒 This feature requires an active account. Please log in first!");
                    if (typeof openAuth === "function") openAuth();
                    return;
                }

                if (game.primos >= ticketItem.cost) {
                    game.primos -= ticketItem.cost;
                    game.domainTickets = (game.domainTickets || 0) + 1;

                    showNotification("Successfully purchased 1 Abyssal Domain Ticket! 🎫");

                    updateUI();
                    saveCloudGame();
                    renderShopItems();
                } else {
                    showNotification(`Insufficient Primogems! Purchasing requires ${formatNumbers(ticketItem.cost)}.`);
                }
            };

            if (!isLoggedIn) {
                ticketCard.style.opacity = '0.35';
                ticketCard.style.filter = 'grayscale(0.85)';
                ticketCard.style.cursor = 'not-allowed';
            }

            ticketContainer.appendChild(ticketCard);
        }
    }
}

function renderPetShop() {
    const container4 = document.getElementById('pet-shop-list-4');
    const container5 = document.getElementById('pet-shop-list-5');
    if (!container4 || !container5) return;

    container4.innerHTML = `<h2 class="shop-section-title">RECRUIT COMPANIONS</h2>`;
    container5.innerHTML = '';

    const availablePets = game.pets.filter(pet => !game.ownedPets.includes(pet.id));

    availablePets.forEach((pet) => {
        const card = document.createElement('div');
        const effectiveDiscount = game.currentDiscount || 1;
        const finalCost = pet.cost * effectiveDiscount;
        const canAfford = game.primos >= finalCost;

        card.className = `pet-card rarity-${pet.rarity} ${(!canAfford || !isLoggedIn) ? 'disabled' : ''}`;

        let buffText = "";
        if (pet.buffType === 'click') buffText = `+${(pet.buffValue * 100)}% Click`;
        else if (pet.buffType === 'pps_mult') buffText = `${pet.buffValue}x PPS`;
        else if (pet.buffType === 'global_mult') buffText = `${pet.buffValue}x Global`;
        else if (pet.buffType === 'discount') buffText = `-${(pet.buffValue * 100)}% Cost`;
        else buffText = pet.buffType.replace('_', ' ');

        const visionColors = {
            'Pyro': "#ff4e4e", 'Anemo': "#72e5d3", 'Cryo': "#a0e9ff",
            'Electro': "#d28fd6", 'Geo': "#e3b342", 'Hydro': "#4cc2f1", 'Dendro': "#a5c83b"
        };
        let glowColor = visionColors[pet.vision] || "#ffffff";

        card.innerHTML = `
            <div class="pet-icon-wrapper">
                <img src="${pet.icon}" alt="${pet.name}" class="pet-chibi" draggable="false">
                <div class="vision-tag" style="background: ${glowColor}; color: #000;">
                    ${pet.vision}
                </div>
            </div>
            <div class="pet-main-info">
                <strong class="pet-name">${pet.name}</strong>
                <div class="pet-buff-tag">${buffText}</div>
                <div class="pet-mobile-cost">
                    <span style="${effectiveDiscount < 1 ? 'color: #ffe164;' : 'color: #64ffbf;'}">
                        ${formatNumbers(finalCost)} Primos
                    </span>
                </div>
            </div>
            <button class="pet-btn">RECRUIT</button>
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

        if (pet.rarity === 5) container5.appendChild(card);
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
        card.className = `pet-card rarity-${pet.rarity} ${!isOwned ? 'locked' : ''} ${isActive ? 'active' : ''}`;

        const visionColors = {
            Anemo: '#64ffbf', Pyro: '#ff6464', Hydro: '#64c9ff',
            Electro: '#d164ff', Dendro: '#a2ff64', Cryo: '#64f7ff', Geo: '#ffe164'
        };
        const glowColor = visionColors[pet.vision] || '#ffffff';

        if (isActive) card.style.boxShadow = `0 0 15px ${glowColor}`;

        let buffText = "";
        if (pet.buffType === 'click') buffText = `+${(pet.buffValue * 100)}% Click`;
        else if (pet.buffType === 'pps_mult') buffText = `${pet.buffValue}x PPS`;
        else buffText = pet.buffType.replace('_', ' ');

        card.innerHTML = `
            <div class="pet-icon-wrapper">
                <img src="${pet.icon}" class="pet-chibi" alt="${pet.name}" draggable="false" 
                     style="${!isOwned ? 'filter: grayscale(1) brightness(0.5);' : ''}">
                <div class="vision-tag" style="background: ${glowColor}; color: #000;">
                    ${pet.vision}
                </div>
            </div>
            <div class="pet-main-info">
                <div class="pet-name">${pet.name}</div>
                <div class="pet-buff-tag">${buffText}</div>
            </div>
            <button class="pet-btn ${isActive ? 'active' : ''}">
                ${isActive ? 'REMOVE' : (isOwned ? 'DEPLOY' : 'LOCKED')}
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

function renderFateShop() {
    // 1. Update the live counter values inside the permanent HTML header structures
    const acquaintCountEl = document.getElementById('fate-shop-acquaint-count');
    const intertwinedCountEl = document.getElementById('fate-shop-intertwined-count');

    if (acquaintCountEl) acquaintCountEl.innerText = game.acquaintFates || 0;
    if (intertwinedCountEl) intertwinedCountEl.innerText = game.intertwinedFates || 0;

    // 2. Target the exact grid IDs defined inside your index.html panel
    const acquaintGrid = document.getElementById('acquaint-grid');
    const intertwinedGrid = document.getElementById('intertwined-grid');

    // Safety exit check to prevent errors if the elements aren't rendered yet
    if (!acquaintGrid || !intertwinedGrid) return;

    // Clear out the cards inside the grids to prevent duplicate duplication loops
    acquaintGrid.innerHTML = '';
    intertwinedGrid.innerHTML = '';

    // SAFETY CATCH: If fateShopItems array got flattened or hasn't loaded yet, drop execution gracefully
    if (!game.fateShopItems || !Array.isArray(game.fateShopItems)) {
        console.warn("Fate Shop structural arrays are not initialized yet.");
        return;
    }

    // 3. Loop through your game save object's array and build out the item cards
    game.fateShopItems.forEach(item => {
        const balance = item.costType === 'intertwined' ? (game.intertwinedFates || 0) : (game.acquaintFates || 0);
        const canAfford = balance >= item.cost;

        const textEmoji = item.costType === 'intertwined' ? '✨' : '💫';
        const accentColor = item.costType === 'intertwined' ? '#b7a8ff' : '#8deaff';

        const card = document.createElement('div');
        card.className = `upgrade-card ${!canAfford ? 'disabled' : ''}`;

        card.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: rgba(18, 22, 35, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            cursor: pointer;
            position: relative;
            gap: 14px;
            transition: all 0.2s ease;
        `;

        card.innerHTML = `
            <div style="
                width: 46px; 
                height: 46px; 
                background: rgba(255, 255, 255, 0.03); 
                border: 1px solid rgba(255, 255, 255, 0.08); 
                border-radius: 10px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                flex-shrink: 0;
                box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
            ">
                <span style="font-size: 1.6rem; filter: drop-shadow(0 0 6px ${accentColor}60);">${textEmoji}</span>
            </div>

            <div style="flex-grow: 1; text-align: left; display: flex; flex-direction: column; gap: 3px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="color: #fff; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.3px;">${item.name}</strong>
                    <span style="
                        background: rgba(255, 255, 255, 0.05); 
                        color: rgba(255, 255, 255, 0.4); 
                        font-size: 0.68rem; 
                        padding: 1px 6px; 
                        border-radius: 4px; 
                        font-weight: 700;
                        text-transform: uppercase;
                    ">Shop</span>
                </div>
                <small style="color: rgba(255, 255, 255, 0.45); font-size: 0.8rem; line-height: 1.3;">
                    ${item.desc || 'No description provided.'}
                </small>
            </div>

            <div style="
                text-align: right; 
                display: flex; 
                flex-direction: column; 
                justify-content: center; 
                align-items: flex-end;
                padding-left: 10px;
            ">
                <span style="font-size: 0.72rem; color: rgba(255, 255, 255, 0.35); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px;">Cost</span>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="color: ${accentColor}; font-weight: 700; font-size: 1.15rem; letter-spacing: -0.3px;">
                        ${item.cost}
                    </span>
                    <span style="font-size: 0.95rem; opacity: 0.85;">${textEmoji}</span>
                </div>
            </div>
        `;

        // GLOBAL INTERCEPT: Check if player is logged out
        if (!isLoggedIn) {
            card.style.opacity = '0.35';
            card.style.filter = 'grayscale(0.85)';
            card.style.cursor = 'not-allowed';

            card.onclick = () => {
                showNotification("🔒 This feature requires an active account. Please log in first!");
            };
        } else {
            if (canAfford) {
                card.onmouseenter = () => {
                    card.style.background = 'rgba(24, 29, 47, 0.85)';
                    card.style.border = `1px solid ${accentColor}35`;
                    card.style.boxShadow = `0 4px 20px ${accentColor}08`;
                };
                card.onmouseleave = () => {
                    card.style.background = 'rgba(18, 22, 35, 0.65)';
                    card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                    card.style.boxShadow = 'none';
                };
            } else {
                card.style.opacity = '0.35';
                card.style.cursor = 'not-allowed';
            }

            card.onclick = () => {
                if (canAfford) {
                    buyFateShopItem(item.id);
                } else {
                    showNotification("Insufficient Fates for this transaction.");
                }
            };
        }

        if (item.costType === 'intertwined') {
            intertwinedGrid.appendChild(card);
        } else {
            acquaintGrid.appendChild(card);
        }
    });

    // 4. LOCK THE STATION FORGE SLOTS MANUALLY AT THE BOTTOM OF RENDERING
    const forgeGrid = document.querySelector('.forge-stations-grid');
    if (forgeGrid) {
        const buttons = forgeGrid.querySelectorAll('.equip-btn');
        const inputs = forgeGrid.querySelectorAll('.forge-quantity-input');

        if (!isLoggedIn) {
            forgeGrid.classList.add('locked-shop');
            forgeGrid.style.pointerEvents = 'none'; // Locks absolute mouse clicks/hovers
            buttons.forEach(btn => btn.disabled = true);
            inputs.forEach(input => input.disabled = true);
        } else {
            forgeGrid.classList.remove('locked-shop');
            forgeGrid.style.pointerEvents = 'auto'; // Restores mouse clicks
            buttons.forEach(btn => btn.disabled = false);
            inputs.forEach(input => input.disabled = false);
        }
    }
}

// Call this when your Domain selection screen is generated
function initDomainMenu() {
    const container = document.getElementById('domain-selection-container');
    console.log("Initializing Domain Menu..."); // Debug: Is the function running?

    if (!container) {
        console.warn("Domain container not found! Check your HTML IDs.");
        return;
    }

    container.innerHTML = '';

    DOMAIN_DATABASE.forEach(domain => {
        const card = document.createElement('div');
        card.className = 'domain-card';
        card.innerHTML = `
            <h3>${domain.name}</h3>
            <button class="challenge-btn" data-id="${domain.id}">CHALLENGE</button>
        `;

        // Using addEventListener is more robust than .onclick
        const btn = card.querySelector('.challenge-btn');
        btn.addEventListener('click', () => {
            console.log("CHALLENGE clicked for:", domain.id);
            // Before launching, ensure the engine exists
            if (typeof getDomainEngine === 'function') {
                launchDomainFight(domain.id);
            } else {
                console.error("launchDomainFight or getDomainEngine is not defined!");
            }
        });
        container.appendChild(card);
    });
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'domain-boss-image' || e.target.closest('#domain-combat-box')) {
        handleDomainClick(e);
    }
});

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

function generateRandomArtifact(rarity = 5) {
    // 1. Correctly reference keys from the new game config setup
    const randomSetObj = game.artifactSets[Math.floor(Math.random() * game.artifactSets.length)];
    const randomSetId = randomSetObj.id; // e.g., 'gladiator'
    const randomSlot = game.artifactSlots[Math.floor(Math.random() * game.artifactSlots.length)];

    // Choose main stat randomly from pool
    const mainStatRef = game.statPool[Math.floor(Math.random() * game.statPool.length)];

    // Define base values depending on type
    let mainValue = mainStatRef.isPercent ? 0.08 : 10;
    if (mainStatRef.type === "critClickMult") mainValue = 0.15; // Baseline Main Stat CRIT DMG
    if (rarity === 5) mainValue *= 1.5;

    const artifact = {
        id: "art_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
        name: `${randomSetObj.name} ${randomSlot.charAt(0).toUpperCase() + randomSlot.slice(1)}`,
        set: randomSetId,
        slot: randomSlot,
        rarity: rarity,
        level: 0,
        mainStat: { type: mainStatRef.type, name: mainStatRef.name, value: mainValue, isPercent: mainStatRef.isPercent },
        substats: []
    };

    // Roll 3 distinct random substats
    let filteredPool = game.statPool.filter(s => s.type !== mainStatRef.type);
    while (artifact.substats.length < 3 && filteredPool.length > 0) {
        const idx = Math.floor(Math.random() * filteredPool.length);
        const subRef = filteredPool.splice(idx, 1)[0];

        let subValue = subRef.isPercent ? 0.02 : 3;
        if (subRef.type === "critClickMult") subValue = 0.04;

        artifact.substats.push({
            type: subRef.type,
            name: subRef.name,
            value: subValue,
            isPercent: subRef.isPercent
        });
    }

    return artifact;
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
        const petData = game.pets.find(p => p.id === petId);
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
    document.querySelectorAll('.btn-mult').forEach(btn => {
        const btnText = btn.innerText.toLowerCase().replace('x', '');
        const targetText = amt.toString().toLowerCase();
        if (btnText === targetText) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    if (typeof updateUI === "function") updateUI();
}

function getMultiCost(baseCost, rate, count) {
    return baseCost * (Math.pow(rate, count) - 1) / (rate - 1);
}

function getMaxAffordable(primos, currentCost, rate) {
    if (primos < currentCost) return 0;
    let n = Math.floor(Math.log((primos * (rate - 1) / currentCost) + 1) / Math.log(rate));
    return n;
}

function spawnText(x, y, txt, color = "#ffffff") {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.innerText = txt;
    el.style.color = color;
    const randomX = (Math.random() - 0.5) * 40;
    const randomY = (Math.random() - 0.5) * 20;
    el.style.left = (x + randomX) + 'px';
    el.style.top = (y + randomY) + 'px';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 800);
}