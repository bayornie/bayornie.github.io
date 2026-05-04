// class.js
class Packet {
    constructor(fromNode, toNode) {
        this.from = fromNode;
        this.to = toNode;
        this.x = fromNode.x;
        this.y = fromNode.y;
        this.progress = 0;
        this.reached = false;

        // --- UPGRADE: Fiber Optics & VLAN Speed ---
        let baseSpeed = upgrades.fiberOptics.owned ? 4.5 : 1.5;
        if (upgrades.enterpriseSwitch.owned && this.from.vlan === this.to.vlan) {
            baseSpeed *= 1.5;
        }
        // GPO Boost: Small global multiplier
        if (upgrades.gpoBoost.owned) baseSpeed *= 1.05;

        this.speed = baseSpeed;
    }

    move() {
        this.progress += this.speed / Math.hypot(this.to.x - this.from.x, this.to.y - this.from.y);
        if (this.progress >= 1) {
            this.reached = true;
            this.completeTransmission();
        } else {
            this.x = this.from.x + (this.to.x - this.from.x) * this.progress;
            this.y = this.from.y + (this.to.y - this.from.y) * this.progress;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc((this.x - camera.x) * scale, (this.y - camera.y) * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0055";
        ctx.shadowBlur = 10 * scale;
        ctx.shadowColor = "#ff0055";
        ctx.fill();
        ctx.closePath();
    }

    completeTransmission() {
        // --- UPGRADE: SQL Indexing ---
        let amount = upgrades.sqlIndexing.owned ? 128 : 32;

        // --- UPGRADE: Cat6e Shielding ---
        if (upgrades.cat6eShielding.owned && Math.random() < 0.10) {
            amount *= 2;
        }

        // --- UPGRADE: AES-256 Encryption ---
        if (upgrades.aesEncryption.owned) {
            amount *= 1.1;
        }

        // --- ANALYSIS: Power BI Tracking ---
        if (this.to) {
            this.to.totalData = (this.to.totalData || 0) + amount;
        }

        totalBytes += amount;
        document.getElementById('currency').innerText = formatData(totalBytes);
    }
}

class MaliciousPacket extends Packet {
    constructor(fromNode, toNode) {
        super(fromNode, toNode);
        this.color = "#ffff00";
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc((this.x - camera.x) * scale, (this.y - camera.y) * scale, 6 * scale, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15 * scale;
        ctx.shadowColor = "#ffff00";
        ctx.fill();
        ctx.closePath();
    }

    completeTransmission() {
        let penalty = 500;
        if (upgrades.aesEncryption.owned) penalty *= 0.5;

        totalBytes = Math.max(0, totalBytes - penalty);
        showNotification("SECURITY BREACH: " + formatData(penalty) + " lost!");
    }
}