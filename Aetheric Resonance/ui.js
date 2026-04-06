function setUIVisible(visible) {
    const ui = document.querySelector('.game-ui');
    if (ui) ui.style.display = visible ? 'block' : 'none';
}

function updateLevelUI() {
    const lvlDisplay = document.getElementById('level-text');
    if (lvlDisplay) lvlDisplay.innerText = `LVL ${currentLevel}`;

    const xpCircle = document.getElementById('xp-circle');
    if (xpCircle) {
        const radius = 35; // Matches the SVG circle radius in index.html
        const circumference = 2 * Math.PI * radius;
        const percentage = Math.min(currentXP / xpRequired, 1);
        const offset = circumference - (percentage * circumference);

        xpCircle.style.strokeDasharray = circumference;
        xpCircle.style.strokeDashoffset = offset;
    }

    const burstBar = document.getElementById('burst-bar');
    if (burstBar) {
        // We use the burstMeter percentage to fill the health-bar styled element
        burstBar.style.width = burstMeter + "%";

        // Visual feedback when Burst is ready
        if (burstMeter >= 100) {
            burstBar.style.boxShadow = "0 0 15px #00ffff";
            burstBar.style.background = "linear-gradient(90deg, #00ffff, #ffffff)";
        } else {
            burstBar.style.boxShadow = "0 0 10px #bc8cf2";
            burstBar.style.background = "linear-gradient(90deg, #bc8cf2, #ffffff)";
        }
    }
}

function drawEnemyHP() {
    if (!hpBarGraphics || !hpBarGraphics.scene) return;

    hpBarGraphics.clear();
    if (!dummy || !dummy.active || !dummy.visible) return;

    const enemyConfig = enemies[currentStage - 1];

    // Position bar relative to the enemy's head
    const barX = dummy.x - 40;
    const barY = dummy.y - 100;

    // Background Shadow
    hpBarGraphics.fillStyle(0x000000, 0.8).fillRect(barX, barY, 80, 8);

    // HP Fill (Red)
    const hpRatio = Math.max(0, dummyHP / enemyConfig.hp);
    hpBarGraphics.fillStyle(0xff4500, 1).fillRect(barX, barY, hpRatio * 80, 8);
}

function drawPlayerStats(scene) {
    if (!playerGuiGraphics || !playerGuiGraphics.scene) return;

    playerGuiGraphics.clear();

    const barWidth = 200;
    const startX = scene.scale.width - barWidth - 30; // Right-aligned with padding
    const startY = 30;
    const barHeight = 18;

    // HP Bar Container
    playerGuiGraphics.fillStyle(0x1a1c23, 0.7).fillRect(startX, startY, barWidth, barHeight);
    // HP Fill (Green)
    const hpRatio = Math.max(0, playerStats.hp / playerStats.maxHp);
    playerGuiGraphics.fillStyle(0x2ecc71, 1).fillRect(startX, startY, barWidth * hpRatio, barHeight);

    // HP Text
    if (!scene.hpNumText || !scene.hpNumText.active) {
        scene.hpNumText = scene.add.text(startX + 100, startY + 9, '', {
            fontSize: '12px', fill: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    }
    scene.hpNumText.setText(`${Math.ceil(playerStats.hp)} / ${playerStats.maxHp}`);

    // Stamina Bar Container (Below HP)
    const stamY = startY + 25;
    playerGuiGraphics.fillStyle(0x1a1c23, 0.7).fillRect(startX, stamY, barWidth, 12);
    // Stamina Fill (Blue/Cyan)
    const stamRatio = Math.max(0, playerStats.currentStamina / playerStats.stamina);
    playerGuiGraphics.fillStyle(0x3498db, 1).fillRect(startX, stamY, barWidth * stamRatio, 12);

    // Stamina Text
    if (!scene.stamNumText || !scene.stamNumText.active) {
        scene.stamNumText = scene.add.text(startX + 100, stamY + 6, '', {
            fontSize: '10px', fill: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    }
    scene.stamNumText.setText(`${Math.ceil(playerStats.currentStamina)}`);
}

function createDamagePopUp(scene, x, y, damage, color = '#ff0000') {
    if (!scene || !scene.add) return;

    // Convert numbers to rounded strings, but allow custom text (like "LEVEL UP")
    const displayValue = typeof damage === 'number' ? `-${Math.ceil(damage)}` : damage;

    const text = scene.add.text(x, y, displayValue, {
        fontSize: '28px',
        fill: color,
        fontWeight: 'bold',
        stroke: '#000',
        strokeThickness: 4,
        fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(150);

    scene.tweens.add({
        targets: text,
        y: y - 120, // Rise higher for better visibility
        alpha: 0,
        scale: 1.5, // Slight growth effect
        duration: 900,
        ease: 'Power2.out',
        onComplete: () => text.destroy()
    });
}
