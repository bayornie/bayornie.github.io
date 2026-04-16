const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.range = 150;
        this.burstMeter = 0;
        this.fireRate = 60;
        this.timer = 0;
        this.color = towerData[type].color;
    }

    update() {
        this.timer++;

        // Draw Range (Subtle)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.stroke();

        // Draw Tower with Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        ctx.shadowBlur = 0;

        // Draw Burst Meter
        ctx.fillStyle = "#333";
        ctx.fillRect(this.x - 15, this.y - 25, 30, 5);
        ctx.fillStyle = this.burstMeter >= 10 ? "#fff" : this.color;
        ctx.fillRect(this.x - 15, this.y - 25, (Math.min(this.burstMeter, 10) / 10) * 30, 5);

        if (this.timer % this.fireRate === 0) this.shoot();
    }

    shoot() {
        let target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < this.range);
        if (target) {
            target.hp -= 10;
            this.burstMeter++;
            if (this.burstMeter >= 10) {
                this.triggerBurst();
                this.burstMeter = 0;
            }
        }
    }

    triggerBurst() {
        // Visual Flare
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        enemies.forEach(e => {
            let dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist < this.range * 1.5) {
                switch (this.type) {
                    case 'pyro': e.hp -= 50; break;
                    case 'geo': e.hp -= 30; e.isBleeding = true; break;
                    case 'dendro': e.speed = 0; setTimeout(() => e.speed = 1.5, 2000); break;
                    case 'anemo': e.x = this.x; e.y = this.y; break;
                    case 'hydro': e.speed = 0.7; break;
                    case 'cryo': e.speed = 0.2; break;
                    case 'electro': e.hp -= 20; /* Chain Logic */ break;
                }
            }
        });
    }
}

class Enemy {
    constructor() {
        this.x = path[0].x;
        this.y = path[0].y;
        this.maxHp = 100 + (wave - 1) * 30;
        this.hp = this.maxHp;
        this.speed = 4;
        this.nodeIndex = 0;
        this.isBleeding = false;
        this.active = true;
    }

    update() {
        if (isGameOver || !this.active) return;

        // Apply Status Effects
        if (this.isBleeding) this.hp -= 0.1;

        // Movement Logic
        let target = path[this.nodeIndex + 1];
        if (target) {
            let dx = target.x - this.x;
            let dy = target.y - this.y;
            let dist = Math.hypot(dx, dy);

            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;

            if (dist < 5) this.nodeIndex++;
        } else {
            // REACHED THE END: Subtract life and deactivate enemy
            lives--;
            this.active = false;
            this.hp = 0; // Ensures it gets filtered out of the array
            updateUI();

            if (lives <= 0) {
                endGame();
            }
        }

        this.draw();
    }

    draw() {
        // Enemy Health Bar Background
        ctx.fillStyle = "#333";
        ctx.fillRect(this.x - 10, this.y - 15, 20, 3);

        // Dynamic Health Bar Color (Turns red as HP drops)
        let healthWidth = (this.hp / this.maxHp) * 20;
        ctx.fillStyle = this.hp > 50 ? "#00ff00" : "#ff4d4d";
        ctx.fillRect(this.x - 10, this.y - 15, Math.max(0, healthWidth), 3);

        // Enemy Sprite (Slime)
        ctx.fillStyle = "#ff00ff";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Visual cue for Bleeding
        if (this.isBleeding) {
            ctx.strokeStyle = "#ff4d4d";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

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

function updateUI() {
    document.getElementById('gold-val').innerText = gold;
    document.getElementById('lives-val').innerText = lives;
    document.getElementById('wave-val').innerText = wave;
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
            showWinScreen(); // Trigger victory logic
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

    if (mouseY > canvas.height - 80) return;

    if (selectedType) {
        const cost = towerData[selectedType].cost;
        if (gold >= cost) {
            towers.push(new Tower(mouseX, mouseY, selectedType));
            gold -= cost;
            updateUI();
            selectedType = null;
        } else {
            console.log("Not enough gold!");
        }
    }
});

animate();
