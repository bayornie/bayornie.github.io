class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.baseCost = towerData[type].cost;
        this.range = towerData[type].range;
        this.damage = towerData[type].damage;
        this.sellValue = Math.floor(this.baseCost * 0.7);
        this.fireRate = 60;
        this.timer = 0;
        this.color = towerData[type].color;
    }

    upgrade() {
        const upgradeCost = Math.floor(this.baseCost * 1.2 * this.level);
        if (gold >= upgradeCost) {
            gold -= upgradeCost;
            this.level++;
            this.damage = Math.floor(this.damage * 1.4);
            this.range = Math.floor(this.range * 1.05);
            this.sellValue += Math.floor(upgradeCost * 0.7);
            updateUI();
            if (typeof showTowerInfo === "function") showTowerInfo(this);
            return true;
        }
        return false;
    }

    update() {
        this.timer++;
        if (selectedTowerInstance === this) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.stroke();
        }

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        ctx.shadowBlur = 0;

        if (this.timer % this.fireRate === 0) this.shoot();
    }

    shoot() {
        let target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < this.range);
        if (!target) return;

        projectiles.push(new Projectile(
            this.x,
            this.y,
            target,
            this.damage,
            this.color,
            this.type
        ));
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor() {
        this.x = path[0].x;
        this.y = path[0].y;
        this.maxHp = 100 + (wave - 1) * 30;
        this.hp = this.maxHp;
        this.baseSpeed = 1;
        this.speed = this.baseSpeed;
        this.nodeIndex = 0;
        this.active = true;
        this.appliedElement = null;
        this.statusTimer = 0;
        this.isBleeding = false;
        this.isBurned = false;
        this.isPoisoned = false;
        this.isQuickened = false;
        this.hasDendroCore = false;
    }

    update() {
        if (isGameOver || !this.active) return;

        if (this.statusTimer > 0) {
            this.statusTimer--;
            if (this.isBurned) this.hp -= 0.15;
            if (this.isBleeding) this.hp -= 0.2;
            if (this.isPoisoned) this.hp -= 0.1;
        } else {
            this.appliedElement = null;
            this.isBurned = false;
            this.isBleeding = false;
            this.isPoisoned = false;
            this.isQuickened = false;
            this.hasDendroCore = false;
            this.speed = this.baseSpeed;
        }

        let target = path[this.nodeIndex + 1];
        if (target) {
            let dx = target.x - this.x;
            let dy = target.y - this.y;
            let dist = Math.hypot(dx, dy);
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            if (dist < 5) this.nodeIndex++;
        } else {
            lives--;
            this.active = false;
            this.hp = 0;
            updateUI();
            if (lives <= 0) endGame();
        }
        this.draw();
    }

    draw() {
        // Health Bar Background
        ctx.fillStyle = "#333";
        ctx.fillRect(this.x - 10, this.y - 15, 20, 3);

        // Dynamic Health Bar
        let healthWidth = (this.hp / this.maxHp) * 20;
        ctx.fillStyle = this.hp > this.maxHp / 2 ? "#00ff00" : "#ff4d4d";
        ctx.fillRect(this.x - 10, this.y - 15, Math.max(0, healthWidth), 3);

        // Visual Aura
        if (this.appliedElement) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
            ctx.strokeStyle = towerData[this.appliedElement].color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Optional: Visual for Dendro Core
        if (this.hasDendroCore) {
            ctx.fillStyle = "#72e000";
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y - 8, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slime Sprite
        ctx.fillStyle = "#ff00ff";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Projectile {
    constructor(x, y, target, damage, color, type) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.color = color;
        this.type = type;
        this.speed = 7;
        this.active = true;
    }

    update() {
        if (!this.target || !this.target.active || this.target.hp <= 0) {
            this.active = false;
            return;
        }

        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let dist = Math.hypot(dx, dy);

        if (dist < 10) {
            handleReaction(this.target, this.type, this.damage);
            this.active = false;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        this.draw();
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function handleReaction(target, towerType, towerDamage) {
    let finalDamage = towerDamage;

    if (target.appliedElement && target.appliedElement !== towerType) {
        const reaction = `${target.appliedElement}+${towerType}`;

        switch (reaction) {
            case 'pyro+electro': case 'electro+pyro':
                finalDamage *= 2.5;
                console.log("OVERLOADED!");
                break;
            case 'cryo+electro': case 'electro+cryo':
                finalDamage *= 1.5;
                target.speed *= 0.8;
                console.log("SUPERCONDUCT!");
                break;
            case 'hydro+electro': case 'electro+hydro':
                finalDamage += 25;
                console.log("ELECTRO-CHARGED!");
                break;
            case 'anemo+pyro': case 'anemo+electro': case 'anemo+hydro': case 'anemo+cryo':
            case 'pyro+anemo': case 'electro+anemo': case 'hydro+anemo': case 'cryo+anemo':
                finalDamage *= 1.5;
                console.log("SWIRL!");
                break;
            case 'cryo+hydro+geo':
                if (target.speed === 0) {
                    finalDamage *= 3.0;
                    target.speed = target.baseSpeed;
                    console.log("SHATTERED!");
                }
                break;
            case 'dendro+pyro': case 'pyro+dendro':
                target.isBurned = true;
                finalDamage *= 1.2;
                console.log("BURNING!");
                break;
            case 'dendro+hydro': case 'hydro+dendro':
                target.hasDendroCore = true;
                console.log("BLOOM!");
                break;
            case 'electro+dendro':
                if (target.hasDendroCore) {
                    finalDamage *= 3.0;
                    target.hasDendroCore = false;
                    console.log("HYPERBLOOM!");
                }
                break;
            case 'pyro+dendro':
                if (target.hasDendroCore) {
                    finalDamage *= 3.0;
                    target.hasDendroCore = false;
                    console.log("BURGEON!");
                }
                break;
            case 'hydro+pyro': case 'pyro+hydro':
                finalDamage *= 2.0;
                console.log("VAPORIZE!");
                break;
            case 'cryo+pyro': case 'pyro+cryo':
                finalDamage *= 2.0;
                console.log("MELT!");
                break;
            case 'dendro+electro': case 'electro+dendro':
                if (!target.isQuickened) {
                    target.isQuickened = true;
                    console.log("QUICKEN!");
                } else if (towerType === 'dendro') {
                    finalDamage *= 2.25;
                    console.log("SPREAD!");
                } else if (towerType === 'electro') {
                    finalDamage *= 2.15;
                    console.log("AGGRAVATE!");
                }
                break;
            case 'geo+hydro': case 'geo+pyro': case 'geo+cryo': case 'geo+electro':
            case 'hydro+geo': case 'pyro+geo': case 'cryo+geo': case 'electro+geo':
                gold += 5;
                console.log("CRYSTALLIZE!");
                break;
        }

        if (!target.isQuickened) {
            target.appliedElement = null;
            target.statusTimer = 0;
        }
    } else {
        target.appliedElement = towerType;
        target.statusTimer = 180;
    }

    target.hp -= finalDamage;
}
