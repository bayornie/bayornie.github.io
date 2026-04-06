function applyStatus(type, duration) {
    if (!enemyStatus) return;
    enemyStatus.type = type;
    enemyStatus.duration = duration;
}

function handleEnemyStatus(scene, delta) {
    if (!dummy || !dummy.active || !enemyStatus || scene.physics.world.isPaused) return;

    if (enemyStatus.duration > 0) {
        enemyStatus.duration -= delta;
        if (enemyStatus.type === 'freeze') {
            dummy.setVelocityX(0);
            dummy.setTint(0x00ffff);
        } else if (enemyStatus.type === 'burn') {
            dummy.setTint(0xff4500);
            burnTickTimer += delta;
            if (burnTickTimer >= 1000) {
                burnTickTimer = 0;
                let burnDamage = Math.floor((playerStats.kunai * 1.5) + 1.5);
                dummyHP -= burnDamage;
                createDamagePopUp(scene, dummy.x, dummy.y - 120, burnDamage, '#ff4500');
                checkDeath(scene);
            }
        }
    } else if (enemyStatus.type) {
        enemyStatus.type = null;
        burnTickTimer = 0;
        applyStageAssets();
    }
}

function performSwordSwing(scene) {
    if (!player || !player.active || !dummy || !dummy.active || scene.physics.world.isPaused) return;

    const now = scene.time.now;
    if (now - lastSwordTime < 400) return;
    lastSwordTime = now;

    // --- IMPROVED: Directional Logic ---
    const mouse = scene.input.activePointer;
    
    // If it's a mouse click (button 0, 1, or 2) and the mouse moved, flip to face it
    if (mouse.button !== -1 && (mouse.x !== player.x)) {
        player.setFlipX(mouse.worldX < player.x);
    }

    const side = player.flipX ? -1 : 1;
    const handXOffset = side * 15;
    weaponStick.setPosition(player.x + handXOffset, player.y - 20);

    scene.tweens.add({
        targets: weaponStick,
        angle: side * 150,
        duration: 150,
        yoyo: true,
        onComplete: () => {
            if (weaponStick) {
                weaponStick.angle = 0;
                weaponStick.setPosition(player.x + (player.flipX ? -15 : 15), player.y - 20);
            }
        }
    });

    // --- HIT DETECTION ---
    const hitDistance = Phaser.Math.Distance.Between(player.x + (45 * side), player.y, dummy.x, dummy.y);

    if (hitDistance < 85) {
        dummyHP -= playerStats.sword;
        createDamagePopUp(scene, dummy.x, dummy.y - 100, playerStats.sword, '#ffffff');

        if (Math.random() < 0.25) {
            applyStatus('freeze', 2000);
            createDamagePopUp(scene, dummy.x, dummy.y - 130, "FROZEN", '#00ffff');
        }

        burstMeter = Math.min(100, burstMeter + 5);
        dummy.body.setVelocityY(-300);
        dummy.setVelocityX(500 * side);

        checkDeath(scene);
    }
}

function throwKunai(scene, p) {
    if (!player || !player.active || scene.physics.world.isPaused) return;
    const now = scene.time.now;
    if (now - lastKunaiTime < 400) return;
    lastKunaiTime = now;

    // --- UPDATED: Target Fallback ---
    // If p is passed (from mobile btn or click), use it. 
    // Otherwise, calculate a point in front of where the player is facing.
    const target = p ? 
        { x: p.worldX || p.x, y: p.worldY || p.y } : 
        { x: player.x + (player.flipX ? -200 : 200), y: player.y - 24 };

    const isBurn = Math.random() < 0.20;
    
    // Create kunai container
    const k = scene.add.container(player.x, player.y - 24);
    const gfx = scene.add.graphics().fillStyle(isBurn ? 0xff4500 : 0xbc8cf2).fillTriangle(-5, 10, 5, 10, 0, -15);
    k.add(gfx);

    scene.physics.world.enable(k);
    k.isBurnShot = isBurn;
    kunais.add(k);
    k.body.setAllowGravity(false);

    const angle = Phaser.Math.Angle.Between(player.x, player.y - 24, target.x, target.y);
    k.rotation = angle + Math.PI / 2;
    scene.physics.velocityFromRotation(angle, 1400, k.body.velocity);
}

function checkDeath(scene) {
    if (!player || !player.active || !dummy || !dummy.active || dummyHP > 0) return;

    const config = enemies[currentStage - 1];
    dummy.setActive(false).setVisible(false);
    dummy.body.enable = false;

    if (scene.smokeEmitter) scene.smokeEmitter.explode(20, dummy.x, dummy.y);

    currentXP += config.xp;
    while (currentXP >= xpRequired) {
        currentXP -= xpRequired;
        currentLevel++;
        playerStats.statPoints += 3;
        xpRequired += 10;
        // Visual feedback for level up
        createDamagePopUp(scene, player.x, player.y - 100, "LEVEL UP!", "#00ff00");
    }

    updateLevelUI();

    scene.time.delayedCall(3000, () => {
        if (player && player.active && !scene.physics.world.isPaused) {
            dummyHP = config.hp;
            dummy.setActive(true).setVisible(true).setPosition(600, 400);
            dummy.body.enable = true;
            applyStageAssets();
        }
    });
}

function handlePlayerDeath(scene) {
    scene.physics.world.pause();
    player.setActive(false).setVisible(false);
    player.body.enable = false;

    const deathText = scene.add.text(400, 300, 'EXPEDITION FAILED', {
        fontSize: '64px', fill: '#ff0000', stroke: '#000', strokeThickness: 6, fontFamily: 'Georgia'
    }).setOrigin(0.5).setDepth(200);

    scene.time.delayedCall(2000, () => {
        playerStats.hp = playerStats.maxHp;
        playerStats.currentStamina = playerStats.stamina;
        scene.scene.restart();
    });
}

function performRaidenDash(scene) {
    if (playerStats.currentStamina >= 20 && player && player.active && !scene.physics.world.isPaused) {
        playerStats.currentStamina -= 20;
        isDashing = true;
        player.setVelocityX(1800 * (player.flipX ? -1 : 1)).setTint(0xbc8cf2);
        
        // Add a "trail" effect if you have particles, otherwise tint works well
        scene.time.delayedCall(150, () => {
            isDashing = false;
            if (player && player.active) {
                player.clearTint();
                player.setVelocityX(0);
            }
        });
    }
}

function useBurst(scene) {
    if (burstMeter >= 100 && dummy && dummy.active && !scene.physics.world.isPaused) {
        burstMeter = 0;
        scene.cameras.main.flash(500, 188, 140, 242);
        
        let burstDmg = Math.floor((playerStats.sword * 3) + 10);
        dummyHP -= burstDmg;
        
        createDamagePopUp(scene, dummy.x, dummy.y - 120, `BURST: ${burstDmg}`, '#ffff00');
        
        // Screenshake for impact
        scene.cameras.main.shake(200, 0.02);
        
        checkDeath(scene);
    }
}
