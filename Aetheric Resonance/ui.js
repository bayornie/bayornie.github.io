function setUIVisible(visible) {
    const ui = document.querySelector('.game-ui');
    if (ui) ui.style.display = visible ? 'block' : 'none';
}

function updateLevelUI() {
    const lvlDisplay = document.getElementById('level-text');
    if (lvlDisplay) lvlDisplay.innerText = `LVL ${currentLevel}`;

    const xpCircle = document.getElementById('xp-circle');
    if (xpCircle) {
        const radius = 34;
        const circumference = 2 * Math.PI * radius; 
        const percentage = Math.min(currentXP / xpRequired, 1);
        const offset = circumference - (percentage * circumference);
        
        xpCircle.style.strokeDasharray = circumference;
        xpCircle.style.strokeDashoffset = offset;
    }

    const burstBar = document.getElementById('burst-bar');
    if (burstBar) burstBar.style.width = burstMeter + "%";
}

function drawEnemyHP() {
    if (!hpBarGraphics || !hpBarGraphics.scene) return;
    
    hpBarGraphics.clear();
    if (!dummy || !dummy.active || !dummy.visible) return;
    
    const enemyConfig = enemies[currentStage - 1];
    hpBarGraphics.fillStyle(0x000000, 0.8).fillRect(dummy.x - 40, dummy.y - 100, 80, 8);
    hpBarGraphics.fillStyle(0xff0000, 1).fillRect(dummy.x - 40, dummy.y - 100, (dummyHP / enemyConfig.hp) * 80, 8);
}

function drawPlayerStats(scene) {
    if (!playerGuiGraphics || !playerGuiGraphics.scene) return;

    playerGuiGraphics.clear();
    const startX = 580; 
    const startY = 20;
    const barWidth = 200;
    const barHeight = 20;

    // HP Bar
    playerGuiGraphics.fillStyle(0x000000, 0.7).fillRect(startX, startY, barWidth, barHeight);
    playerGuiGraphics.fillStyle(0x00ff00, 1).fillRect(startX, startY, barWidth * (playerStats.hp / playerStats.maxHp), barHeight);

    if (!scene.hpNumText || !scene.hpNumText.active) {
        scene.hpNumText = scene.add.text(startX + 5, startY + 2, '', { fontSize: '14px', fill: '#000000', fontWeight: 'bold' }).setScrollFactor(0).setDepth(101);
    }
    scene.hpNumText.setText(`${Math.ceil(playerStats.hp)} / ${playerStats.maxHp}`);

    // Stamina Bar
    const stamY = startY + 25;
    playerGuiGraphics.fillStyle(0x000000, 0.7).fillRect(startX, stamY, barWidth, 15);
    playerGuiGraphics.fillStyle(0x00ffff, 1).fillRect(startX, stamY, barWidth * (playerStats.currentStamina / playerStats.stamina), 15);

    if (!scene.stamNumText || !scene.stamNumText.active) {
        scene.stamNumText = scene.add.text(startX + 5, stamY + 1, '', { fontSize: '12px', fill: '#000000', fontWeight: 'bold' }).setScrollFactor(0).setDepth(101);
    }
    scene.stamNumText.setText(`${Math.ceil(playerStats.currentStamina)} / ${playerStats.stamina}`);
}

function createDamagePopUp(scene, x, y, damage, color = '#ff0000') {
    if (!scene || !scene.add) return;
    const text = scene.add.text(x, y, `-${damage}`, {
        fontSize: '28px', fill: color, fontWeight: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    scene.tweens.add({
        targets: text,
        y: y - 100,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.out',
        onComplete: () => text.destroy()
    });
}
