function setUIVisible(visible) {
    const ui = document.querySelector('.game-ui');
    if (ui) ui.style.display = visible ? 'block' : 'none';
}

function updateLevelUI() {
    const lvlDisplay = document.getElementById('level-text');
    if (lvlDisplay) lvlDisplay.innerText = `LVL ${currentLevel}`;

    const xpCircle = document.getElementById('xp-circle');
    if (xpCircle) {
        const radius = 33; // Matches the updated SVG radius in index.html
        const circumference = 2 * Math.PI * radius;
        const percentage = Math.min(currentXP / xpRequired, 1);
        const offset = circumference - (percentage * circumference);

        xpCircle.style.strokeDasharray = circumference;
        xpCircle.style.strokeDashoffset = offset;
    }

    const burstBar = document.getElementById('burst-bar');
    if (burstBar) {
        burstBar.style.width = burstMeter + "%";

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
    const barX = dummy.x - 40;
    const barY = dummy.y - 100;

    hpBarGraphics.fillStyle(0x000000, 0.8).fillRect(barX, barY, 80, 8);
    const hpRatio = Math.max(0, dummyHP / enemyConfig.hp);
    hpBarGraphics.fillStyle(0xff4500, 1).fillRect(barX, barY, hpRatio * 80, 8);
}

function drawPlayerStats(scene) {
    if (!playerGuiGraphics || !playerGuiGraphics.scene) return;

    playerGuiGraphics.clear();

    const barWidth = 150;
    // Shifted startX and startY so they don't cover your MENU/STATS buttons
    const startX = 20;
    const startY = 80; // Pushed down to clear the Menu/Stats buttons
    const barHeight = 15;

    // HP Bar
    playerGuiGraphics.fillStyle(0x1a1c23, 0.7).fillRect(startX, startY, barWidth, barHeight);
    const hpRatio = Math.max(0, playerStats.hp / playerStats.maxHp);
    playerGuiGraphics.fillStyle(0x2ecc71, 1).fillRect(startX, startY, barWidth * hpRatio, barHeight);

    if (!scene.hpNumText || !scene.hpNumText.active) {
        scene.hpNumText = scene.add.text(startX + (barWidth / 2), startY + (barHeight / 2), '', {
            fontSize: '11px', fill: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    }
    scene.hpNumText.setText(`${Math.ceil(playerStats.hp)} / ${playerStats.maxHp}`);

    // Stamina Bar
    const stamY = startY + barHeight + 5;
    playerGuiGraphics.fillStyle(0x1a1c23, 0.7).fillRect(startX, stamY, barWidth, 10);
    const stamRatio = Math.max(0, playerStats.currentStamina / playerStats.stamina);
    playerGuiGraphics.fillStyle(0x3498db, 1).fillRect(startX, stamY, barWidth * stamRatio, 10);

    if (!scene.stamNumText || !scene.stamNumText.active) {
        scene.stamNumText = scene.add.text(startX + (barWidth / 2), stamY + 5, '', {
            fontSize: '9px', fill: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    }
    scene.stamNumText.setText(`STAMINA: ${Math.ceil(playerStats.currentStamina)}`);
}

function createDamagePopUp(scene, x, y, damage, color = '#ff0000') {
    if (!scene || !scene.add) return;
    const displayValue = typeof damage === 'number' ? `-${Math.ceil(damage)}` : damage;

    const text = scene.add.text(x, y, displayValue, {
        fontSize: '28px', fill: color, fontWeight: 'bold', stroke: '#000', strokeThickness: 4, fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(150);

    scene.tweens.add({
        targets: text,
        y: y - 120,
        alpha: 0,
        scale: 1.5,
        duration: 900,
        ease: 'Power2.out',
        onComplete: () => text.destroy()
    });
}
