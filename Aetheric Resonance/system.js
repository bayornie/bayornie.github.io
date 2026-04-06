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
                let burnDamage = (playerStats.kunai * 1.5) + 1.5;
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

    const mouse = scene.input.activePointer;
    
    // 1. Force character to face the mouse side
    player.setFlipX(mouse.x < player.x);
    
    // 2. Position the stick in the correct hand immediately
    const side = player.flipX ? -1 : 1;
    const handXOffset = side * 15;
    weaponStick.setPosition(player.x + handXOffset, player.y - 20);

    scene.tweens.add({ 
        targets: weaponStick, 
        angle: side * 150, 
        duration: 150, 
        yoyo: true,
        onComplete: () => {
            weaponStick.angle = 0; //
            weaponStick.setPosition(player.x + (player.flipX ? -15 : 15), player.y - 20);
        }
    });

    // --- HIT DETECTION ---
    // Using your original distance check logic
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

    const isBurn = Math.random() < 0.20;
    const k = scene.add.container(player.x, player.y - 24, [
        scene.add.graphics().fillStyle(isBurn ? 0xff4500 : 0xbc8cf2).fillTriangle(-5, 10, 5, 10, 0, -15)
    ]);

    scene.physics.world.enable(k);
    k.isBurnShot = isBurn;
    kunais.add(k);
    k.body.setAllowGravity(false);

    const angle = Phaser.Math.Angle.Between(player.x, player.y - 24, p.x, p.y);
    k.rotation = angle + Math.PI / 2;
    scene.physics.velocityFromRotation(angle, 1400, k.body.velocity);
}

function checkDeath(scene) {
    if (!player || !player.active || !dummy || !dummy.active || dummyHP > 0 || scene.physics.world.isPaused) return; 

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
    
    scene.add.text(400, 300, 'YOU DIED', { 
        fontSize: '64px', fill: '#ff0000', stroke: '#000', strokeThickness: 6 
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
        scene.time.delayedCall(150, () => { 
            isDashing = false; 
            if (player && player.active) player.clearTint().setVelocityX(0); 
        });
    }
}

function useBurst(scene) {
    if (burstMeter >= 100 && dummy && dummy.active && player && player.active && !scene.physics.world.isPaused) {
        burstMeter = 0;
        scene.cameras.main.flash(500, 188, 140, 242);
        dummyHP -= (playerStats.sword * 3) + 10;
        createDamagePopUp(scene, dummy.x, dummy.y - 120, (playerStats.sword * 3) + 10, '#ffff00');
        checkDeath(scene);
    }
}
