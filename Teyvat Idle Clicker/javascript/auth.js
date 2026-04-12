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

        document.getElementById('profile-overlay').style.display = 'flex';
    } else {
        showNotification("Please login to view profile!");
    }
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
            
            // Saves the full game object to the new user document
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
                cloudData.shopItems[index].name = localShop.name;
                cloudData.shopItems[index].desc = localShop.desc;
                cloudData.shopItems[index].cost = localShop.cost;
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

        // If name is missing, pull from cloud data (now contains dedicated username)
        if (!cloudData.playerName) {
            cloudData.playerName = "Traveler";
        }

        game = cloudData;
        calculateOfflineEarnings();
        updateUI();
        saveCloudGame();
        console.log("Sync Complete!");
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
    if (event.target == authOverlay) authOverlay.style.display = "none";
    if (event.target == profOverlay) profOverlay.style.display = "none";
}

setInterval(saveCloudGame, 30000);
