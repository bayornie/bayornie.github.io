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
        const profName = document.getElementById('prof-name');
        if (profName) {
            profName.innerText = game.playerName || "Traveler";
        }

        if (document.getElementById('prof-total-ever')) {
            document.getElementById('prof-total-ever').innerText = formatNumbers(game.totalPrimosEver);
        }

        if (document.getElementById('prof-current-primos')) {
            document.getElementById('prof-current-primos').innerText = formatNumbers(game.primos);
        }

        if (document.getElementById('prof-power')) {
            document.getElementById('prof-power').innerText = formatNumbers(game.clickPower);
        }

        if (document.getElementById('prof-per-sec')) {
            let basePPS = 0;
            game.generators.forEach(gen => {
                basePPS += (gen.count * gen.income);
            });

            // Ensure this uses game.multiplier to match your sidebar and config.js
            let finalPPS = basePPS * (game.multiplier || 1);
            document.getElementById('prof-per-sec').innerText = formatNumbers(finalPPS);
        }

        // --- UPDATED SECTION ---
        // Show profile and ensure settings is hidden
        document.getElementById('profile-overlay').style.display = 'flex';
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.style.display = 'none';
        }
        // -----------------------

    } else {
        showNotification("Please login to view profile!");
    }
}

function toggleProfileView() {
    document.getElementById('profile-overlay').style.display = 'none';
    document.getElementById('settings-overlay').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settings-overlay').style.display = 'none';
    document.getElementById('profile-overlay').style.display = 'flex';
}

function handleLogout() {
    saveCloudGame().then(() => {
        auth.signOut().then(() => {
            location.reload();
        });
    });
}

// --- NEW PASSWORD RESET LOGIC ---
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

// --- UPDATED AUTH HANDLER ---
async function handleAuth(type) {
    let email, pass, username;

    if (type === 'register') {
        // Correctly maps the new registration fields
        email = document.getElementById('reg-email').value;
        username = document.getElementById('reg-username').value;
        pass = document.getElementById('reg-password').value;
    } else {
        // Correctly maps the login fields (ensure login email id matches index.html)
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
            game.playerName = username; // Preserving your username field assignment
            const userCredential = await auth.createUserWithEmailAndPassword(email, pass);

            await userCredential.user.sendEmailVerification();
            await db.collection("users").doc(userCredential.user.uid).set(game);

            showNotification(`Ad Astra Abyssosque, ${game.playerName}!`);
        } else {
            // Logic for existing users logging back in
            await auth.signInWithEmailAndPassword(email, pass);
            showNotification("Welcome back, Traveler!");
        }

        document.getElementById('auth-overlay').style.display = 'none';
    } catch (error) {
        showNotification(error.message);
    }
}

auth.onAuthStateChanged((user) => {
    const loginTrigger = document.getElementById('login-nav-btn');
    const userControls = document.getElementById('user-controls');

    if (user) {
        isLoggedIn = true;
        document.getElementById('auth-overlay').style.display = 'none';
        if (loginTrigger) loginTrigger.style.display = 'none';
        if (userControls) userControls.style.display = 'block';
        loadCloudGame(user.uid);
    } else {
        isLoggedIn = false;
        if (loginTrigger) {
            loginTrigger.style.display = 'block';
            loginTrigger.innerText = "Login / Register";
        }
        if (userControls) userControls.style.display = 'none';
        updateUI();
    }
});

async function saveCloudGame() {
    game.lastLogin = Date.now();
    const user = auth.currentUser;
    if (user) {
        await db.collection("users").doc(user.uid).set(game);
        console.log("Cloud Saved!");
    }
}

async function loadCloudGame(uid) {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
        let cloudData = doc.data();

        // 1. SMART SYNC: Click Upgrades
        game.clickUpgrades.forEach((localItem, index) => {
            if (!cloudData.clickUpgrades[index]) {
                cloudData.clickUpgrades.push(localItem);
            } else {
                cloudData.clickUpgrades[index].name = localItem.name;
                cloudData.clickUpgrades[index].power = localItem.power;
                cloudData.clickUpgrades[index].rate = localItem.rate;
            }
        });

        // 2. SMART SYNC: Generators
        game.generators.forEach((localGen, index) => {
            if (!cloudData.generators[index]) {
                cloudData.generators.push(localGen);
            } else {
                cloudData.generators[index].name = localGen.name;
                cloudData.generators[index].income = localGen.income;
                cloudData.generators[index].rate = localGen.rate;
            }
        });

        // 3. SMART SYNC: Blessings
        game.blessings.forEach((localBlessing, index) => {
            if (!cloudData.blessings[index]) {
                cloudData.blessings.push(localBlessing);
            } else {
                cloudData.blessings[index].name = localBlessing.name;
                cloudData.blessings[index].desc = localBlessing.desc;
            }
        });

        // 4. SMART SYNC: Shop Items
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

                // Set the cost based on the level saved in the cloud
                item.cost = Math.floor(base * Math.pow(rate, item.level || 0));

                // Sync Seelie MAX text if necessary
                if (item.id === 'seelie' && (item.level || 0) >= 3) {
                    item.name = "Follower Seelie (MAX)";
                }
            }
        });

        // 5. SMART SYNC: Pets
        if (cloudData.ownedPets === undefined) cloudData.ownedPets = [];
        if (cloudData.activePets === undefined) cloudData.activePets = [];

        if (!cloudData.pets) {
            cloudData.pets = JSON.parse(JSON.stringify(game.pets));
        }

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

        // --- SYNC AUDIO PREFERENCES ---
        if (cloudData.currentTrackIndex === undefined) cloudData.currentTrackIndex = 0;
        if (cloudData.bgmVolume === undefined) cloudData.bgmVolume = 0.5;
        if (cloudData.isMusicMuted === undefined) cloudData.isMusicMuted = false;

        // We refresh the bgmList from the local code to ensure file paths are always correct
        cloudData.bgmList = JSON.parse(JSON.stringify(game.bgmList));

        // ─── INTEGRATED INTEGRATION: METRICS TRACKING VARIABLES ───
        if (cloudData.clicks === undefined) cloudData.clicks = 0;
        if (cloudData.totalPrimosEver === undefined) cloudData.totalPrimosEver = cloudData.primos || 0;

        // Ensure historical achievements data tracking container is structured
        if (!cloudData.completedAchievements || !Array.isArray(cloudData.completedAchievements)) {
            cloudData.completedAchievements = [];
        }

        // Force reload raw matrix rules into the game instance object to support code additions
        if (window.achievementsData) {
            cloudData.achievementsData = window.achievementsData;
        }

        // --- STABLE PLAYER NAME RESOLUTION (FROM MOBILE VERSION) ---
        cloudData.playerName = cloudData.playerName || cloudData.username || cloudData.displayName || "Traveler";
        if (!cloudData.playerName || cloudData.playerName === "Traveler") {
            const user = auth.currentUser;
            const emailName = user && user.email ? user.email.split('@')[0] : "Traveler";
            cloudData.playerName = emailName;
        }

        // Commit processed save dataset into your global engine reference
        game = cloudData;
        isDataLoaded = true;

        // --- INTERFACE ELEMENT BINDINGS ---
        const tabName = document.getElementById('prof-name-tab');
        const travelerName = document.querySelector('.traveler-name');
        if (tabName) tabName.innerText = game.playerName;
        if (travelerName) travelerName.innerText = game.playerName;

        // --- ENGINE REFRESH PROCESSES ---
        if (typeof calculateOfflineEarnings === "function") calculateOfflineEarnings();
        if (typeof updateAchievements === "function") updateAchievements(); // Verification calculation

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
    const profOverlay = document.getElementById('profile-overlay');
    const settingsOverlay = document.getElementById('settings-overlay');
    const musicOverlay = document.getElementById('music-overlay');

    if (event.target == authOverlay) authOverlay.style.display = "none";
    if (event.target == profOverlay) profOverlay.style.display = "none";
    if (event.target == settingsOverlay) settingsOverlay.style.display = "none";
    if (event.target == musicOverlay) musicOverlay.style.display = "none";
}

// --- SEND VERIFICATION EMAIL ---
function sendVerification() {
    const user = auth.currentUser;
    if (user) {
        user.sendEmailVerification()
            .then(() => {
                showNotification("Verification link sent! Check your inbox.");
            })
            .catch((error) => {
                showNotification("Error: " + error.message);
            });
    }
}

// --- UPDATE EMAIL ADDRESS ---
async function changeEmail() {
    const user = auth.currentUser;
    const newEmail = document.getElementById('new-email-input').value;

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

function openMusicModal() {
    document.getElementById('music-overlay').style.display = 'flex';
    renderMusicList();
}

function closeMusicModal() {
    document.getElementById('music-overlay').style.display = 'none';
}

function renderMusicList() {
    const container = document.getElementById('track-list-container');
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
        btn.onclick = () => playTrack(index);
        container.appendChild(btn);
    });
}

function updateVolume(val) {
    game.bgmVolume = val;
    bgmPlayer.volume = val;
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
