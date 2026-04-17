const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

function startNextWave() {
    if (isWaveActive) return;

    isWaveActive = true;
    enemiesToSpawn = 5 + (wave * 2);

    const waveBtn = document.getElementById('next-wave-btn');
    if (waveBtn) waveBtn.style.display = "none";
}

function spawnEnemy() {
    enemies.push(new Enemy());
    enemiesToSpawn--;
}

function resetGame() {
    gold = 500;
    lives = 25;
    wave = 1;
    enemies = [];
    towers = [];
    isGameOver = false;
    isWaveActive = false;
    enemiesToSpawn = 0;
    spawnTimer = 0;

    // Reset the Overlay to default "Game Over" state
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
        overlay.style.display = 'none';

        // Reset text and style in case they won previously
        const title = overlay.querySelector('h1');
        if (title) {
            title.innerText = "DOMAIN CRUMBLED";
            title.style.color = "#ffffff";
        }

        // Reset button behavior
        const btn = document.getElementById('rebuild-btn');
        if (btn) {
            btn.innerText = "REBUILD DOMAIN";
            btn.onclick = resetGame;
        }
    }

    // Restore the tower menu
    const menu = document.getElementById('tower-menu');
    if (menu) {
        menu.style.opacity = "1";
        menu.style.pointerEvents = "auto";
    }

    // Show the Start Wave button
    const waveBtn = document.getElementById('next-wave-btn');
    if (waveBtn) {
        waveBtn.style.display = "block";
    }

    updateUI();
    animate();
}

function animate() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Path
    ctx.strokeStyle = "#1a1d23";
    ctx.lineWidth = 40;
    ctx.beginPath();
    path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Update Towers
    towers.forEach(t => t.update());

    // --- PROJECTILE LOGIC ---
    projectiles = projectiles.filter(p => p.active);
    projectiles.forEach(p => p.update());

    // --- WAVE SPAWNING LOGIC ---
    if (isWaveActive && enemiesToSpawn > 0) {
        spawnTimer++;
        if (spawnTimer >= 60) {
            spawnEnemy();
            spawnTimer = 0;
        }
    }

    // --- WAVE CLEAR DETECTION & WIN CONDITION ---
    if (isWaveActive && enemiesToSpawn === 0 && enemies.length === 0) {
        isWaveActive = false;

        if (wave >= MAX_WAVES) {
            showWinScreen();
        } else {
            wave++;
            gold += waveClearBonus;
            updateUI();

            const waveBtn = document.getElementById('next-wave-btn');
            if (waveBtn) waveBtn.style.display = "block";
        }
    }

    // Enemy Logic & Filtering
    enemies = enemies.filter(e => {
        if (!e.active) return false;

        if (e.hp <= 0) {
            gold += 20;
            updateUI();
            return false;
        }
        return true;
    });

    enemies.forEach(e => e.update());

    requestAnimationFrame(animate);
}
function selectTower(type) {
    selectedType = type;
}

canvas.addEventListener('click', (e) => {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 1. Prevent clicks in the footer area
    if (mouseY > canvas.height - 80) return;

    // 2. Check if clicking an existing tower to UPGRADE or SELL
    const clickedTower = towers.find(t => {
        const dist = Math.hypot(t.x - mouseX, t.y - mouseY);
        return dist < 20;
    });

    if (clickedTower) {
        selectedTowerInstance = clickedTower;
        showTowerInfo(clickedTower);
        selectedType = null;
        return;
    }

    // 3. Handle Tower Placement (only if no tower was clicked)
    if (selectedType) {
        const cost = towerData[selectedType].cost;
        if (gold >= cost) {
            towers.push(new Tower(mouseX, mouseY, selectedType));
            gold -= cost;
            selectedType = null;
            document.getElementById('tower-info-panel').style.display = 'none';
            selectedTowerInstance = null;
            updateUI();
        } else {
            console.log("Not enough gold!");
        }
    } else {
        document.getElementById('tower-info-panel').style.display = 'none';
        selectedTowerInstance = null;
    }
});

animate();
