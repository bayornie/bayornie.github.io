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

        // 1. Total Primogems Collected (Lifetime)
        if (document.getElementById('prof-total-ever')) {
            document.getElementById('prof-total-ever').innerText = formatNumbers(game.totalPrimosEver);
        }

        // 2. Current Primogems (Spendable Stash)
        if (document.getElementById('prof-current-primos')) {
            document.getElementById('prof-current-primos').innerText = formatNumbers(game.primos);
        }

        // 3. Click Power (Using the recalculated value from updateUI)
        if (document.getElementById('prof-power')) {
            document.getElementById('prof-power').innerText = formatNumbers(game.clickPower);
        }

        // 4. Passive Income (Matching the sidebar 'Per Second' stat)
        if (document.getElementById('prof-per-sec')) {
            let basePPS = 0;
            game.generators.forEach(gen => {
                basePPS += (gen.count * gen.income);
            });

            let finalPPS = basePPS * (game.prestigeMultiplier || 1) * (game.globalMultiplier || 1);
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

async function handleAuth(type) {
    const usernameInput = document.getElementById(type === 'login' ? 'username' : 'reg-username').value;
    const email = usernameInput + "@game.com";
    const pass = document.getElementById(type === 'login' ? 'password' : 'reg-password').value;

    if (pass.length < 6) {
        showNotification("Password must be at least 6 characters!");
        return;
    }

    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

        if (type === 'register') {
            game.playerName = usernameInput;
            const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
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
        document.getElementById('auth-overlay').style.display = 'none';
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

        // Ensure the pets array exists in cloudData
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

        // Safety for new variables
        if (cloudData.seelies === undefined) cloudData.seelies = 0;
        if (cloudData.prestigePoints === undefined) cloudData.prestigePoints = 0;

        // If name is missing or the generic "Traveler", pull the real username from their email
        if (!cloudData.playerName || cloudData.playerName === "Traveler") {
            const userEmail = auth.currentUser.email;
            if (userEmail) {
                // Takes 'Byoku' from 'Byoku@game.com'
                const recoveredName = userEmail.split('@')[0];
                cloudData.playerName = recoveredName.charAt(0).toUpperCase() + recoveredName.slice(1);
            } else {
                cloudData.playerName = "Traveler";
            }
        }

        game = cloudData;
        calculateOfflineEarnings();
        updateUI();
        saveCloudGame();
        console.log("Sync Complete: Player Name and Balance updated!");
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
