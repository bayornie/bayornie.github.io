function updateUI() {
    document.getElementById('gold-val').innerText = gold;
    document.getElementById('lives-val').innerText = lives;
    document.getElementById('wave-val').innerText = wave;
}

function showTowerInfo(tower) {
    const panel = document.getElementById('tower-info-panel');
    panel.style.display = 'block';

    document.getElementById('info-type').innerText = tower.type.toUpperCase() + " TOWER";
    document.getElementById('info-level').innerText = tower.level;
    document.getElementById('info-damage').innerText = Math.floor(tower.damage);
    document.getElementById('info-range').innerText = Math.floor(tower.range);

    const upgradeCost = Math.floor(tower.baseCost * 1.2 * tower.level);
    document.getElementById('upgrade-cost').innerText = upgradeCost;
    document.getElementById('sell-gold').innerText = tower.sellValue;

    document.getElementById('upgrade-btn').onclick = () => {
        if (tower.upgrade()) {
            showTowerInfo(tower);
        } else {
            console.log("Not enough gold!");
        }
    };

    document.getElementById('sell-btn').onclick = () => {
        gold += tower.sellValue;
        towers = towers.filter(t => t !== tower);
        panel.style.display = 'none';
        selectedTowerInstance = null;
        updateUI();
    };

    document.getElementById('close-info').onclick = () => {
        panel.style.display = 'none';
        selectedTowerInstance = null;
    };
}

function endGame() {
    isGameOver = true;

    // Show the Glassmorphic Overlay
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }

    // Dim the tower menu to prevent interaction
    const menu = document.getElementById('tower-menu');
    if (menu) {
        menu.style.opacity = "0.3";
        menu.style.pointerEvents = "none";
    }
}

function showWinScreen() {
    isGameOver = true;

    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
        const title = overlay.querySelector('h1');
        title.innerText = "DOMAIN CONQUERED";
        title.style.color = "#ece5d8";

        const btn = document.getElementById('rebuild-btn');
        btn.innerText = "RETURN TO TITLE";
        btn.onclick = () => window.location.href = 'titlescreen.html';

        overlay.style.display = 'flex';
    }

    // Dim the menu
    const menu = document.getElementById('tower-menu');
    if (menu) {
        menu.style.opacity = "0.3";
        menu.style.pointerEvents = "none";
    }
}
