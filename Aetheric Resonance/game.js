function applyStageAssets() {
    if (!dummy || !background) return;
    const stage = enemies[currentStage - 1];
    const act = stage.acts[currentAct - 1]; 

    dummy.setTint(act.color);
    dummy.setScale(act.scaleX, act.scaleY);
    background.setTexture(stage.bg);
    dummyHP = act.hp; // Pull HP from the Act data
}

class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    preload() {
        this.load.image('menu_bg', 'img/bg/mmbg.jpg');
    }

    create() {
        setUIVisible(false);
        document.body.style.background = `url('img/bg/main.jpg') no-repeat center center fixed`;
        document.body.style.backgroundSize = "cover";

        const bg = this.add.image(400, 300, 'menu_bg').setDisplaySize(800, 600);
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.3);

        const title = this.add.text(400, 200, 'AETHERIC RESONANCE', {
            fontSize: '56px', fill: '#bc8cf2', fontFamily: 'Georgia, serif', stroke: '#4a0e78', strokeThickness: 8
        }).setOrigin(0.5).setShadow(2, 2, '#000', 10, true, true);

        this.add.text(400, 260, '— SORCERER CHRONICLES —', {
            fontSize: '18px', fill: '#ffffff', letterSpacing: 10
        }).setOrigin(0.5);

        const btnBg = this.add.rectangle(400, 420, 280, 70, 0x000000, 0.6).setStrokeStyle(2, 0xbc8cf2);
        this.add.text(400, 420, 'START JOURNEY', {
            fontSize: '26px', fill: '#fff', fontWeight: 'bold', letterSpacing: 2
        }).setOrigin(0.5);

        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0xbc8cf2, 0.3);
            btnBg.setStrokeStyle(3, 0xffffff);
            title.setScale(1.05);
        });
        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x000000, 0.6);
            btnBg.setStrokeStyle(2, 0xbc8cf2);
            title.setScale(1);
        });
        btnBg.on('pointerdown', () => this.scene.start('LevelSelect'));
    }
}

class LevelSelect extends Phaser.Scene {
    constructor() { super('LevelSelect'); }

    create() {
        setUIVisible(false);
        this.add.text(400, 60, 'SELECT EXPEDITION', {
            fontSize: '32px', fill: '#bc8cf2', fontWeight: 'bold', letterSpacing: 4
        }).setOrigin(0.5);

        enemies.forEach((enemy, index) => {
            const isUnlocked = currentLevel >= enemy.req;
            const x = index < 5 ? 220 : 580;
            const y = 150 + ((index % 5) * 80);

            const card = this.add.rectangle(x, y, 320, 60, 0x000000, isUnlocked ? 0.7 : 0.3).setStrokeStyle(1, isUnlocked ? 0xbc8cf2 : 0x444444);
            const label = isUnlocked ? `STAGE ${index + 1}: ${enemy.name.toUpperCase()}` : `LOCKED (REQ. LVL ${enemy.req})`;
            this.add.text(x, y, label, {
                fontSize: '18px', fill: isUnlocked ? '#fff' : '#666', fontFamily: 'monospace'
            }).setOrigin(0.5);

            if (isUnlocked) {
                card.setInteractive({ useHandCursor: true });
                card.on('pointerover', () => {
                    card.setStrokeStyle(2, 0xffffff);
                    card.setFillStyle(0xbc8cf2, 0.2);
                });
                card.on('pointerout', () => {
                    card.setStrokeStyle(1, 0xbc8cf2);
                    card.setFillStyle(0x000000, 0.7);
                });
                card.on('pointerdown', () => {
                    selectedStage = index + 1;
                    this.scene.start('ActSelect'); // Now goes to Act selection
                });
            }
        });

        const backBtnText = this.add.text(400, 560, '← RETURN TO CAMP', { fontSize: '18px', fill: '#bc8cf2' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        backBtnText.on('pointerdown', () => this.scene.start('MainMenu'));
    }
}

class ActSelect extends Phaser.Scene {
    constructor() {
        super('ActSelect');
    }

    create() {
        // Hide the HUD/Health Bars while picking an Act
        setUIVisible(false);

        const stageData = enemies[selectedStage - 1];

        // Header Text
        this.add.text(400, 60, `${stageData.name.toUpperCase()} - SELECT ACT`, {
            fontSize: '32px',
            fill: '#bc8cf2',
            fontWeight: 'bold',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Generate buttons for each Act (Act 1 to Act 5)
        stageData.acts.forEach((act, index) => {
            const yPos = 180 + (index * 75);
            
            // The Button Background (Glassmorphism style)
            const btn = this.add.rectangle(400, yPos, 450, 55, 0x000000, 0.7)
                .setStrokeStyle(2, 0xbc8cf2);
            
            // The Act Text
            const txt = this.add.text(400, yPos, `ACT ${index + 1}: ${act.name}`, {
                fontSize: '20px',
                fill: '#ffffff',
                fontFamily: 'monospace'
            }).setOrigin(0.5);

            // Interaction
            btn.setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => {
                btn.setStrokeStyle(3, 0xffffff);
                btn.setFillStyle(0xbc8cf2, 0.2);
                txt.setScale(1.1);
            });

            btn.on('pointerout', () => {
                btn.setStrokeStyle(2, 0xbc8cf2);
                btn.setFillStyle(0x000000, 0.7);
                txt.setScale(1);
            });

            btn.on('pointerdown', () => {
                selectedAct = index + 1; // Save the choice
                this.scene.start('GameScene'); // Start the fight
            });
        });

        // Back Button
        const backBtn = this.add.text(400, 560, '← BACK TO EXPEDITIONS', {
            fontSize: '18px',
            fill: '#bc8cf2'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => this.scene.start('LevelSelect'));
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        this.load.spritesheet('hero', 'https://labs.phaser.io/assets/sprites/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.image('smoke', 'https://labs.phaser.io/assets/particles/white-flare.png');
        this.load.image('bg_forest', 'img/bg/lushforest.png');
        this.load.image('bg_graveyard', 'img/bg/cemetery.png');
        this.load.image('bg_castle', 'img/bg/stonecastle.png');
        this.load.image('bg_library', 'img/bg/magiclibrary.png');
        this.load.image('bg_hell', 'img/bg/lavacave.png');
        this.load.image('bg_sky', 'img/bg/cloudysky.png');
        this.load.image('bg_mountain', 'img/bg/snowymountain.png');
        this.load.image('bg_volcano', 'img/bg/volcano.png');
        this.load.image('bg_desert', 'img/bg/desert.png');
        this.load.image('bg_space', 'img/bg/space.png');
    }

    create() {
        this.input.mouse.disableContextMenu();
        setUIVisible(true);
        currentStage = selectedStage;
        currentAct = selectedAct; // Tracking Act level
        
        background = this.add.image(400, 300, enemies[currentStage - 1].bg).setDisplaySize(800, 600);

        const platforms = this.physics.add.staticGroup();
        platforms.create(400, 585, 'ground').setScale(2.5).refreshBody();

        player = this.physics.add.sprite(100, 400, 'hero').setScale(2.2).setOrigin(0.5, 1).setCollideWorldBounds(true);
        dummy = this.physics.add.sprite(600, 400, 'hero').setOrigin(0.5, 1).setCollideWorldBounds(true);

        applyStageAssets();
        dummy.setDragX(1000);
        dummy.setBounce(0.2);

        this.physics.add.collider([player, dummy], platforms);
        weaponStick = this.add.rectangle(0, 0, 4, 40, 0x964B00).setOrigin(0.5, 1);
        kunais = this.physics.add.group();

        this.physics.add.overlap(kunais, dummy, (target, kunai) => {
            if (player.active && target.active && kunai && kunai.active) {
                dummyHP -= playerStats.kunai;
                createDamagePopUp(this, target.x, target.y - 100, playerStats.kunai, '#bc8cf2');
                if (kunai.isBurnShot) {
                    applyStatus('burn', 3000);
                    createDamagePopUp(this, target.x, target.y - 130, "BURNED", '#ff4500');
                }
                const pushDir = kunai.body.velocity.x > 0 ? 1 : -1;
                target.body.setVelocityY(-100);
                target.setVelocityX(pushDir * 150);
                burstMeter = Math.min(100, burstMeter + 4);
                target.setTint(0xff0000);
                this.time.delayedCall(150, () => { if (!enemyStatus.type) target.clearTint(); });
                kunai.destroy();
                checkDeath(this);
            }
        }, null, this);

        hpBarGraphics = this.add.graphics();
        playerGuiGraphics = this.add.graphics().setScrollFactor(0).setDepth(100);
        keys = this.input.keyboard.addKeys('W,A,S,D,E,Q,SPACE,ESC');
        setupMobileControls(this);

        this.smokeEmitter = this.add.particles(0, 0, 'smoke', {
            speed: { min: 50, max: 150 }, scale: { start: 0.4, end: 0 }, lifespan: 600, emitting: false
        });

        this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('hero', { start: 5, end: 8 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'idle', frames: [{ key: 'hero', frame: 4 }], frameRate: 20 });

        // --- MENU SYSTEM ---
        const menuBtn = this.add.text(20, 20, '☰ MENU', { fontSize: '20px', fill: '#fff', backgroundColor: '#2a2a2a', padding: 5 }).setInteractive().setScrollFactor(0).setDepth(100);
        const menuPanel = this.add.container(400, 300).setDepth(101).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.6).setInteractive();
        const menuBg = this.add.rectangle(0, 0, 220, 220, 0x1a1a1a).setStrokeStyle(3, 0xbc8cf2);
        const homeText = this.add.text(0, -60, '🏠 Home', { fontSize: '22px', fill: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const stagesText = this.add.text(0, 0, '⚔️ Stages', { fontSize: '22px', fill: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const resumeText = this.add.text(0, 60, '▶ Resume', { fontSize: '22px', fill: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuPanel.add([overlay, menuBg, homeText, stagesText, resumeText]);

        menuBtn.on('pointerdown', () => { menuPanel.setVisible(true); this.physics.world.pause(); });
        const closeMenu = () => { menuPanel.setVisible(false); this.physics.world.resume(); };
        overlay.on('pointerdown', closeMenu);
        resumeText.on('pointerdown', closeMenu);
        homeText.on('pointerdown', () => { this.physics.world.resume(); setUIVisible(false); this.scene.start('MainMenu'); });
        stagesText.on('pointerdown', () => { this.physics.world.resume(); setUIVisible(false); this.scene.start('LevelSelect'); });

        // --- STATS SYSTEM ---
        const statsBtn = this.add.text(20, 60, 'STATS', { fontSize: '20px', fill: '#fff', backgroundColor: '#2a2a2a', padding: { x: 10, y: 5 } }).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(100);
        const statsPanel = this.add.container(400, 300).setDepth(102).setVisible(false).setScrollFactor(0);
        const statsOverlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.7).setInteractive();
        const statsBg = this.add.rectangle(0, 0, 320, 480, 0x1a1a1a).setStrokeStyle(3, 0xbc8cf2);
        const sTitle = this.add.text(0, -200, 'CHARACTER STATS', { fontSize: '26px', fill: '#bc8cf2', fontWeight: 'bold' }).setOrigin(0.5);
        const pointsText = this.add.text(0, -160, `Available Points: ${playerStats.statPoints}`, { fontSize: '18px', fill: '#00ff00' }).setOrigin(0.5);

        const createStatRow = (label, y, statKey, increment) => {
            const displayVal = statKey === 'hp' ? playerStats.maxHp : playerStats[statKey];
            const txt = this.add.text(-130, y, `${label}: ${displayVal}`, { fontSize: '20px', fill: '#fff' });
            const btn = this.add.text(100, y, '[ + ]', { fontSize: '20px', fill: '#bc8cf2' }).setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => {
                if (playerStats.statPoints > 0) {
                    if (statKey === 'hp') { playerStats.maxHp += increment; playerStats.hp = playerStats.maxHp; }
                    else { playerStats[statKey] += increment; if (statKey === 'stamina') playerStats.currentStamina = playerStats.stamina; }
                    playerStats.statPoints--;
                    txt.setText(`${label}: ${statKey === 'hp' ? playerStats.maxHp : playerStats[statKey]}`);
                    pointsText.setText(`Available Points: ${playerStats.statPoints}`);
                }
            });
            return [txt, btn];
        };

        const swordRow = createStatRow('Sword ATK', -80, 'sword', 2);
        const kunaiRow = createStatRow('Kunai ATK', -20, 'kunai', 1);
        const hpRow = createStatRow('Max Health', 40, 'hp', 5);
        const stamRow = createStatRow('Max Stamina', 100, 'stamina', 10);
        const closeStats = this.add.text(0, 190, 'CLOSE', { fontSize: '22px', fill: '#ff4444' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        statsPanel.add([statsOverlay, statsBg, sTitle, pointsText, ...swordRow, ...kunaiRow, ...hpRow, ...stamRow, closeStats]);
        statsBtn.on('pointerdown', () => { statsPanel.setVisible(true); this.physics.world.pause(); });
        closeStats.on('pointerdown', () => { statsPanel.setVisible(false); this.physics.world.resume(); });

        this.input.on('pointerdown', (p) => {
            if (menuPanel.visible || statsPanel.visible) return;
            if (p.leftButtonDown()) performSwordSwing(this);
            else if (p.rightButtonDown()) throwKunai(this, p);
        });

        this.input.keyboard.on('keydown-ESC', () => {
            if (!statsPanel.visible) {
                if (menuPanel.visible) closeMenu();
                else { menuPanel.setVisible(true); this.physics.world.pause(); }
            }
        });
    }

    update(time, delta) {
        if (this.physics.world.isPaused) return;
        const now = this.time.now;
        handleEnemyStatus(this, delta);
        if (now - lastSwordTime > 150) {
            weaponStick.setPosition(player.x + (player.flipX ? -15 : 15), player.y - 20);
            weaponStick.angle = 0;
        }
        if (now - lastRegenTime > 1000) {
            lastRegenTime = now;
            if (playerStats.hp < playerStats.maxHp) playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + 1);
        }
        if (playerStats.currentStamina < playerStats.stamina) {
            playerStats.currentStamina = Math.min(playerStats.stamina, playerStats.currentStamina + 0.25);
        }

        if (!isDashing && player.active) {
            if (keys.A.isDown) { player.setVelocityX(-250); player.setFlipX(true); player.anims.play('walk', true); }
            else if (keys.D.isDown) { player.setVelocityX(250); player.setFlipX(false); player.anims.play('walk', true); }
            else { player.setVelocityX(0); player.anims.play('idle'); }

            if (player.body.touching.down) jumpCount = 0;
            if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) {
                if (player.body.touching.down) { player.setVelocityY(-600); jumpCount = 1; }
                else if (jumpCount === 1) { player.setVelocityY(-550); jumpCount = 2; this.smokeEmitter.explode(10, player.x, player.y); }
            }
        }

        if (dummy.active && player.active) {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, dummy.x, dummy.y);
            const actConfig = enemies[currentStage - 1].acts[currentAct - 1];
            let playerToLeft = player.x < dummy.x;

            if (enemyStatus.type !== 'freeze') {
                if (dummy.body.touching.down && Math.abs(dummy.body.velocity.x) < 150) {
                    dummy.setVelocityX(playerToLeft ? -120 : 120);
                }
                if (selectedStage >= 4 && player.y < dummy.y - 100 && dummy.body.touching.down) dummy.setVelocityY(-600);
                dummy.setFlipX(!playerToLeft);

                if (dist <= 100 && (now - lastEnemyAttackTime > 1500)) {
                    lastEnemyAttackTime = now;
                    playerStats.hp -= actConfig.atk;
                    createDamagePopUp(this, player.x, player.y - 80, actConfig.atk, '#ff0000');
                    if (playerStats.hp <= 0) handlePlayerDeath(this);
                }
            }
        }

        if (Phaser.Input.Keyboard.JustDown(keys.E)) performRaidenDash(this);
        if (Phaser.Input.Keyboard.JustDown(keys.Q)) useBurst(this);

        updateLevelUI();
        drawEnemyHP();
        drawPlayerStats(this);
    }
}

function setupMobileControls(scene) {
    // Force check: If it's a desktop and NOT in touch-simulation mode, remove existing buttons and exit
    const isMobile = scene.sys.game.device.os.android || scene.sys.game.device.os.iOS || scene.sys.game.device.input.touch;
    if (!isMobile) return;

    const centerX = 120, centerY = 480; 
    const btnX = 680, btnY = 480;      

    // --- MOVEMENT D-PAD ---
    const createMoveBtn = (x, y, label, key) => {
        const btn = scene.add.circle(x, y, 35, 0x000000, 0.5).setStrokeStyle(2, 0xbc8cf2).setInteractive().setScrollFactor(0).setDepth(1000);
        scene.add.text(x, y, label, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        
        btn.on('pointerdown', () => { keys[key].isDown = true; btn.setFillStyle(0xbc8cf2, 0.5); });
        btn.on('pointerup', () => { keys[key].isDown = false; btn.setFillStyle(0x000000, 0.5); });
        btn.on('pointerout', () => { keys[key].isDown = false; btn.setFillStyle(0x000000, 0.5); });
    };

    createMoveBtn(centerX - 60, centerY, '←', 'A');
    createMoveBtn(centerX + 60, centerY, '→', 'D');
    createMoveBtn(centerX, centerY - 60, '↑', 'W');

    // --- ACTION BUTTONS ---
    const createActionBtn = (x, y, label, color, callback) => {
        const btn = scene.add.circle(x, y, 40, 0x000000, 0.6).setStrokeStyle(2, color).setInteractive().setScrollFactor(0).setDepth(1000);
        scene.add.text(x, y, label, { fontSize: '18px', fill: '#fff', fontWeight: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        
        btn.on('pointerdown', (pointer) => { 
            pointer.event.stopPropagation(); // Prevents "ghost" clicks on the background
            btn.setFillStyle(color, 0.4);
            callback(pointer);
        });
        btn.on('pointerup', () => btn.setFillStyle(0x000000, 0.6));
    };

    createActionBtn(btnX, btnY + 40, 'SWORD', 0xffffff, () => performSwordSwing(scene));
    
    // FIX: Kunai target logic
    createActionBtn(btnX + 70, btnY - 20, 'KUNAI', 0xbc8cf2, (p) => {
        // If dummy exists, aim at dummy; otherwise aim at the pointer's location
        const targetX = dummy && dummy.active ? dummy.x : p.worldX;
        const targetY = dummy && dummy.active ? dummy.y : p.worldY;
        throwKunai(scene, { worldX: targetX, worldY: targetY });
    });

    createActionBtn(btnX - 70, btnY - 20, 'DASH', 0x00ff00, () => performRaidenDash(scene));
    createActionBtn(btnX, btnY - 80, 'BURST', 0x00ffff, () => useBurst(scene));
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    // --- ADD THIS SCALE SECTION ---
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 3 
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1000 }, debug: false }
    },
    scene: [MainMenu, LevelSelect, ActSelect, GameScene]
};
const game = new Phaser.Game(config);
