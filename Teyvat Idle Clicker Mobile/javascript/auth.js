let isDataLoaded = false;

// --- AUTH & CLOUD SAVE LOGIC ---
function openAuth() {
    clearAuthInputs();
    document.getElementById('auth-overlay').style.display = 'flex';
}

// --- AUTH UI HELPERS ---
function clearAuthInputs() {
    const inputs = document.querySelectorAll('#auth-overlay input');
    inputs.forEach(input => {
        input.value = '';
    });
}

function openProfile() {
    const user = auth.currentUser;
    if (user) {
        const travelerName = document.querySelector('.traveler-name');
        if (travelerName) {
            travelerName.innerText = game.playerName || "Traveler";
        }

        // --- DIRECT ENGINE EVALUATION ---
        
        // 1. Calculate Click Power
        const clickPowerEl = document.getElementById('tab-click-power');
        if (clickPowerEl) {
            let actualClickPower = 1;
            if (typeof getClickPower === "function") {
                actualClickPower = getClickPower();
            } else if (game.clickPower) {
                actualClickPower = game.clickPower;
            } else if (Array.isArray(game.clickUpgrades)) {
                actualClickPower = game.clickUpgrades.reduce((total, up) => total + ((up.level || 0) * (up.power || 0)), 1);
            }
            
            clickPowerEl.innerText = typeof formatNumbers === "function" ? formatNumbers(actualClickPower) : actualClickPower;
        }

        // 2. Calculate Generator Income
        const passiveIncomeEl = document.getElementById('tab-pps');
        if (passiveIncomeEl) {
            let actualPPS = 0;
            if (typeof getPrimosPerSecond === "function") {
                actualPPS = getPrimosPerSecond();
            } else if (game.pps) {
                actualPPS = game.pps;
            } else if (Array.isArray(game.generators)) {
                actualPPS = game.generators.reduce((total, gen) => total + ((gen.count || gen.level || 0) * (gen.income || 0)), 0);
            }
            
            const formattedPPS = typeof formatNumbers === "function" ? formatNumbers(actualPPS) : actualPPS;
            passiveIncomeEl.innerText = formattedPPS + "/s";
        }

        updateUI();

        if (typeof showPanel === "function") {
            showPanel('profile');
        } else {
            document.getElementById('profile-panel').style.display = 'block';
        }

        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.style.display = 'none';
        }
    } else {
        if (typeof showNotification === "function") showNotification("Please login to view profile!");
    }
}

function toggleProfileView() {
    const profPanel = document.getElementById('profile-panel');
    if (profPanel) profPanel.style.display = 'none';
    document.getElementById('settings-overlay').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settings-overlay').style.display = 'none';
    const profPanel = document.getElementById('profile-panel');
    if (profPanel) profPanel.style.display = 'block';
}

function handleLogout() {
    // Hide the main screen containers immediately to prevent layout popping
    const appContainer = document.getElementById('game-app') || document.body;
    if (appContainer) {
        appContainer.style.opacity = '0';
        appContainer.style.pointerEvents = 'none';
    }

    auth.signOut().then(() => {
        isLoggedIn = false;
        isDataLoaded = false;

        // 1. Hide User Data Panels
        const profilePanel = document.getElementById('profile-panel');
        const settingsOverlay = document.getElementById('settings-overlay');
        if (profilePanel) profilePanel.style.display = 'none';
        if (settingsOverlay) settingsOverlay.style.display = 'none';

        // 2. Clear character party icons
        const miniList = document.getElementById('mini-pet-list');
        if (miniList) miniList.innerHTML = '';

        showNotification("Logged out successfully!");

        if (typeof clearAuthInputs === 'function') clearAuthInputs();

        // 4. Reload the page
        location.reload();
    }).catch((error) => {
        if (appContainer) {
            appContainer.style.opacity = '1';
            appContainer.style.pointerEvents = 'auto';
        }
        console.error("Logout Error:", error);
        showNotification("Error logging out.");
    });
}

// --- PASSWORD RESET LOGIC ---
function resetPassword() {
    const email = document.getElementById('login-email').value;

    if (!email) {
        showNotification("Enter your email in the login box first!");
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => {
            showNotification("Reset link sent! Check your inbox.");
        })
        .catch((error) => {
            showNotification(error.message);
        });
}

// --- AUTHENTICATION HANDLER ---
async function handleAuth(type) {
    let email, pass, username;

    if (type === 'register') {
        email = document.getElementById('reg-email').value;
        username = document.getElementById('reg-username').value;
        pass = document.getElementById('reg-password').value;
    } else {
        email = document.getElementById('login-email').value;
        pass = document.getElementById('password').value;
    }

    if (!email || !pass || (type === 'register' && !username)) {
        showNotification("Please fill in all fields!");
        return;
    }

    if (pass.length < 6) {
        showNotification("Password must be at least 6 characters!");
        return;
    }

    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

        if (type === 'register') {
            game.playerName = username;
            const userCredential = await auth.createUserWithEmailAndPassword(email, pass);

            await userCredential.user.sendEmailVerification();
            await db.collection("users").doc(userCredential.user.uid).set(game);

            showNotification(`Ad Astra Abyssosque, ${game.playerName}!`);
        } else {
            await auth.signInWithEmailAndPassword(email, pass);
            showNotification("Welcome back, Traveler!");
        }

        document.getElementById('auth-overlay').style.display = 'none';
    } catch (error) {
        showNotification(error.message);
    }
}

auth.onAuthStateChanged((user) => {
    const profilePanel = document.getElementById('profile-panel');
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const authOverlay = document.getElementById('auth-overlay');

    if (user) {
        isLoggedIn = true;
        if (authOverlay) authOverlay.style.display = 'none';

        if (loggedOutView) loggedOutView.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'block';

        loadCloudGame(user.uid);

    } else {
        isLoggedIn = false;

        if (loggedOutView) loggedOutView.style.display = 'flex';
        if (loggedInView) loggedInView.style.display = 'none';

        const miniList = document.getElementById('active-pets-mini');
        if (miniList) miniList.innerHTML = '';

        const tabName = document.getElementById('prof-name-tab');
        if (tabName) tabName.innerText = "Traveler";
    }
});

async function saveCloudGame() {
    game.lastLogin = Date.now();
    const user = auth.currentUser;

    if (user && isLoggedIn && isDataLoaded) {
        if (game.playerName === "Traveler") {
            console.log("Sync in progress... save paused to protect username.");
            return;
        }

        await db.collection("users").doc(user.uid).set(game);
        console.log("Cloud Saved!");
    } else {
        console.log("Save blocked: Data not yet loaded from cloud.");
    }
}

async function loadCloudGame(uid) {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
        let cloudData = doc.data();

        // Preserve all your existing merge logic for upgrades/generators/pets
        game.clickUpgrades.forEach((localItem, index) => {
            if (!cloudData.clickUpgrades[index]) {
                cloudData.clickUpgrades.push(localItem);
            } else {
                cloudData.clickUpgrades[index].name = localItem.name;
                cloudData.clickUpgrades[index].power = localItem.power;
                cloudData.clickUpgrades[index].rate = localItem.rate;
            }
        });

        game.generators.forEach((localGen, index) => {
            if (!cloudData.generators[index]) {
                cloudData.generators.push(localGen);
            } else {
                cloudData.generators[index].name = localGen.name;
                cloudData.generators[index].income = localGen.income;
                cloudData.generators[index].rate = localGen.rate;
            }
        });

        game.blessings.forEach((localBlessing, index) => {
            if (!cloudData.blessings[index]) {
                cloudData.blessings.push(localBlessing);
            } else {
                cloudData.blessings[index].name = localBlessing.name;
                cloudData.blessings[index].desc = localBlessing.desc;
            }
        });

        game.shopItems.forEach((localShop, index) => {
            if (!cloudData.shopItems[index]) {
                cloudData.shopItems.push(localShop);
            } else {
                let item = cloudData.shopItems[index];
                item.name = localShop.name;
                item.desc = localShop.desc;
                const baseCosts = { 'time_warp': 20000, 'seelie': 150000, 'buff_pot': 300000, 'primordial_shard': 750000 };
                const rates = { 'time_warp': 2, 'seelie': 2.5, 'buff_pot': 2, 'primordial_shard': 3 };
                let base = baseCosts[item.id] || 100000;
                let rate = rates[item.id] || 2;
                item.cost = Math.floor(base * Math.pow(rate, item.level || 0));
                if (item.id === 'seelie' && (item.level || 0) >= 3) item.name = "Follower Seelie (MAX)";
            }
        });

        if (cloudData.ownedPets === undefined) cloudData.ownedPets = [];
        if (cloudData.activePets === undefined) cloudData.activePets = [];
        if (!cloudData.pets) cloudData.pets = JSON.parse(JSON.stringify(game.pets));

        game.pets.forEach((localPet, index) => {
            if (!cloudData.pets[index]) {
                cloudData.pets.push(localPet);
            } else {
                cloudData.pets[index].name = localPet.name;
                cloudData.pets[index].cost = localPet.cost;
                cloudData.pets[index].icon = localPet.icon;
                cloudData.pets[index].buffType = localPet.buffType;
                cloudData.pets[index].buffValue = localPet.buffValue;
                cloudData.pets[index].rarity = localPet.rarity;
                if (localPet.interval) cloudData.pets[index].interval = localPet.interval;
            }
        });

        if (cloudData.seelies === undefined) cloudData.seelies = 0;
        if (cloudData.prestigePoints === undefined) cloudData.prestigePoints = 0;
        cloudData.playerName = cloudData.playerName || cloudData.username || cloudData.displayName || "Traveler";
        if (cloudData.currentTrackIndex === undefined) cloudData.currentTrackIndex = 0;
        if (cloudData.bgmVolume === undefined) cloudData.bgmVolume = 0.5;
        if (cloudData.isMusicMuted === undefined) cloudData.isMusicMuted = false;
        cloudData.bgmList = JSON.parse(JSON.stringify(game.bgmList));
        if (cloudData.clicks === undefined) cloudData.clicks = 0;
        if (cloudData.totalPrimosEver === undefined) cloudData.totalPrimosEver = cloudData.primos || 0;
        if (!cloudData.completedAchievements || !Array.isArray(cloudData.completedAchievements)) {
            cloudData.completedAchievements = [];
        }

        if (window.achievementsData) {
            cloudData.achievementsData = window.achievementsData;
        }

        game = cloudData;
        isDataLoaded = true;

        if (!game.playerName || game.playerName === "Traveler") {
            const user = auth.currentUser;
            const emailName = user.email ? user.email.split('@')[0] : "Traveler";
            game.playerName = cloudData.username || cloudData.displayName || emailName;
        }

        const tabName = document.getElementById('prof-name-tab');
        const travelerName = document.querySelector('.traveler-name');

        if (tabName) tabName.innerText = game.playerName;
        if (travelerName) travelerName.innerText = game.playerName;

        if (typeof calculateOfflineEarnings === "function") calculateOfflineEarnings();
        if (typeof updateAchievements === "function") updateAchievements();

        updateUI();
        saveCloudGame();

        console.log("Sync Complete! Player: " + game.playerName);
    }
}

function toggleAuth() {
    clearAuthInputs();
    const isLogin = document.getElementById('login-form').style.display !== 'none';
    document.getElementById('login-form').style.display = isLogin ? 'none' : 'block';
    document.getElementById('register-form').style.display = isLogin ? 'block' : 'none';
}

window.onclick = function (event) {
    const authOverlay = document.getElementById('auth-overlay');
    const settingsOverlay = document.getElementById('settings-overlay');
    const musicOverlay = document.getElementById('music-overlay');

    if (event.target == authOverlay) authOverlay.style.display = "none";
    if (event.target == settingsOverlay) settingsOverlay.style.display = "none";
    if (event.target == musicOverlay) musicOverlay.style.display = "none";
}

function resendVerification() {
    const user = auth.currentUser;
    if (user) {
        user.sendEmailVerification()
            .then(() => showNotification("Verification link sent! Check your inbox."))
            .catch((error) => showNotification("Error: " + error.message));
    }
}

async function updateEmail() {
    const user = auth.currentUser;
    const newEmail = document.getElementById('update-email-input').value;

    if (!newEmail) {
        showNotification("Please enter a new email address.");
        return;
    }

    try {
        await user.updateEmail(newEmail);
        showNotification("Email updated! A confirmation was sent to your old address.");
        game.playerEmail = newEmail;
        saveCloudGame();
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            showNotification("Security sensitive! Please logout and log back in to change email.");
        } else {
            showNotification(error.message);
        }
    }
}

// --- MUSIC HANDLING --- //
function openMusicSelect() {
    openMusicModal();
}

function openMusicModal() {
    document.getElementById('music-overlay').style.display = 'flex';
    renderMusicList();
}

function closeMusicModal() {
    document.getElementById('music-overlay').style.display = 'none';
}

function renderMusicList() {
    const container = document.getElementById('track-list-container');
    if (!container) return;
    container.innerHTML = '';

    game.bgmList.forEach((track, index) => {
        const isPlaying = game.currentTrackIndex === index;
        const btn = document.createElement('div');
        btn.className = `nav-item ${isPlaying ? 'active' : ''}`;
        btn.style.marginBottom = "8px";
        btn.innerHTML = `
            <span>${track.title}</span>
            ${isPlaying ? '<small> (Playing)</small>' : ''}
        `;
        btn.onclick = () => { if (typeof playTrack === "function") playTrack(index); };
        container.appendChild(btn);
    });
}

function setVolume(val) {
    if (window.bgmPlayer) {
        window.bgmPlayer.volume = val;
    }

    game.bgmVolume = val;

    const volPerc = document.getElementById('vol-perc');
    if (volPerc) {
        volPerc.innerText = Math.round(val * 100) + "%";
    }
}

// --- LEADERBOARD FUNCTIONS --- //
function updatePlayerScore(score) {
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;

    if (user) {
        db.collection("users").doc(user.uid).set({
            totalPrimosEver: score,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
}

function loadLeaderboard() {
    const db = firebase.firestore();
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    db.collection("users")
        .orderBy("totalPrimosEver", "desc")
        .limit(10)
        .get()
        .then((querySnapshot) => {
            list.innerHTML = "";
            let rank = 1;

            if (querySnapshot.empty) {
                list.innerHTML = "<tr><td colspan='3' style='text-align:center; opacity:0.5;'>No travelers found.</td></tr>";
                return;
            }

            const currentUser = firebase.auth().currentUser;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const name = data.playerName || data.username || data.displayName || "Unknown Traveler";
                const rawScore = Math.floor(data.totalPrimosEver || 0);
                const scoreDisplay = typeof formatNumbers === "function" ? formatNumbers(rawScore) : rawScore.toLocaleString();
                const row = document.createElement('tr');
                
                if (rank === 1) row.classList.add('rank-1');
                else if (rank === 2) row.classList.add('rank-2');
                else if (rank === 3) row.classList.add('rank-3');

                if (currentUser && doc.id === currentUser.uid) {
                    row.classList.add('current-user-row');
                }

                row.innerHTML = `
                    <td>${rank++}</td>
                    <td>${name}</td>    
                    <td class="highlight">${scoreDisplay}</td>
                `;

                list.appendChild(row);
            });
        })
        .catch(err => {
            console.error("Leaderboard error:", err);
            if (typeof showNotification === "function") {
                showNotification("Failed to load rankings.");
            }
        });
}

setInterval(saveCloudGame, 10000);