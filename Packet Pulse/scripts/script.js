// script.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function formatData(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
        // VLAN Segmentation: 50% faster if nodes share a VLAN ID
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

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- UPGRADE: SSD RAID 10 ---
    const incomeRate = upgrades.ssdRaid10.owned ? 0.10 : 0.05;
    let previousTotal = Math.floor(totalBytes);

    nodes.forEach(node => {
        // --- UPGRADE: Hyper-V Cluster Scaling ---
        if (node.recoveryTimer > 0) {
            node.recoveryTimer--;
            if (node.recoveryTimer <= 0) {
                const isStillConnected = connections.some(c => c.from === node || c.to === node);
                if (!isStillConnected) node.active = false;
            }
        }

        if (node.active) totalBytes += incomeRate;
    });

    if (Math.floor(totalBytes) !== previousTotal) {
        document.getElementById('currency').innerText = formatData(totalBytes);
    }

    drawConnections();
    if (isDragging && startNode) drawTempLine();

    // --- UPGRADE: Cisco Firepower ---
    maliciousPackets = maliciousPackets.filter(p => {
        if (upgrades.ciscoFirewall.owned) {
            const distToHub = Math.hypot(p.x - hubNode.x, p.y - hubNode.y);
            if (distToHub < 400) {
                showNotification("FIREWALL: Malicious packet neutralized.");
                return false;
            }
        }
        return !p.reached;
    });

    drawNodes();

    // --- UPGRADE: DHCP Super-Scoping ---
    spawnTimer++;
    const currentSpawnRate = upgrades.dhcpScoping.owned ? SPAWN_RATE * 0.8 : SPAWN_RATE;

    if (spawnTimer >= currentSpawnRate) {
        connections.forEach(conn => {
            // --- UPGRADE: F5 Load Balancer ---
            const bursts = (upgrades.f5LoadBalancer.owned && (conn.from.isHub || conn.to.isHub)) ? 3 : 1;
            for (let i = 0; i < bursts; i++) {
                packets.push(new Packet(conn.from, conn.to));
                packets.push(new Packet(conn.to, conn.from));
            }
        });
        spawnTimer = 0;
    }

    packets = packets.filter(p => !p.reached);
    [...packets, ...maliciousPackets].forEach(p => {
        p.move();
        p.draw(ctx);
    });

    requestAnimationFrame(update);
}

function drawNodes() {
    let topNode = null;
    if (upgrades.powerBiDashboard.owned) {
        topNode = nodes.reduce((prev, curr) => {
            const prevYield = (prev.totalData || 0) / (prev.provisionCost || 1);
            const currYield = (curr.totalData || 0) / (curr.provisionCost || 1);
            return (currYield > prevYield) ? curr : prev;
        });
    }

    nodes.forEach(node => {
        const screenX = (node.x - camera.x) * scale;
        const screenY = (node.y - camera.y) * scale;
        const radius = 22 * scale;

        // --- UPGRADE: Power BI / DAX Measure ---
        if (upgrades.powerBiDashboard.owned && node === topNode && node.active && !node.isHub) {
            ctx.beginPath();
            ctx.setLineDash([5 * scale, 5 * scale]);
            ctx.arc(screenX, screenY, radius + (8 * scale), 0, Math.PI * 2);
            ctx.strokeStyle = "#ffd700";
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.shadowBlur = node.active ? 20 * scale : 0;
        ctx.shadowColor = node.vlanColor || '#00f2ff';

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.active ? (node.vlanColor || '#00f2ff') : '#1a1a2e';
        ctx.fill();

        ctx.strokeStyle = node.active ? '#fff' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 3 * scale;
        ctx.stroke();
        ctx.closePath();
        ctx.shadowBlur = 0;

        if (!node.active && scale > 0.4) {
            const finalCost = upgrades.activeDirectory.owned ? node.provisionCost * 0.85 : node.provisionCost;
            const label = formatData(finalCost);

            ctx.fillStyle = "#ff0055";
            ctx.font = `${11 * scale}px Consolas`;
            ctx.textAlign = "center";
            ctx.fillText(label, screenX, screenY - (32 * scale));
        }

        // --- UPGRADE: Hyper-V  ---
        if (node.recoveryTimer > 0 && node.active) {
            ctx.fillStyle = "#ffff00";
            ctx.font = `bold ${10 * scale}px Consolas`;
            ctx.fillText("RECOVERING...", screenX, screenY + (35 * scale));
        }
    });
}

function drawConnections() {
    ctx.lineWidth = 4 * scale;
    connections.forEach(conn => {
        // Visual indicator for VLANs
        ctx.strokeStyle = (upgrades.enterpriseSwitch.owned && conn.from.vlan === conn.to.vlan)
            ? conn.from.vlanColor
            : 'rgba(255, 0, 255, 0.6)';

        ctx.beginPath();
        ctx.moveTo((conn.from.x - camera.x) * scale, (conn.from.y - camera.y) * scale);
        ctx.lineTo((conn.to.x - camera.x) * scale, (conn.to.y - camera.y) * scale);
        ctx.stroke();
    });
}

function drawTempLine() {
    if (!startNode) return;
    
    ctx.beginPath();
    ctx.setLineDash([5 * scale, 5 * scale]);
    
    // Project start node to screen coordinates
    const startX = (startNode.x - camera.x) * scale;
    const startY = (startNode.y - camera.y) * scale;
    
    ctx.moveTo(startX, startY);
    ctx.lineTo(mousePos.x, mousePos.y);
    
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.5)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    ctx.setLineDash([]);
}

function triggerRandomEvent() {
    const eventChance = Math.random();

    // 1. Network Glitch (Affects IPS)
    if (eventChance < 0.05 && connections.length > 0) {
        if (!upgrades.ips.owned) {
            connections.splice(Math.floor(Math.random() * connections.length), 1);
            showNotification("CRITICAL: Connection severed by Network Glitch!");
        } else {
            showNotification("IPS: Network Glitch detected and auto-repaired.");
        }
    }

    // 2. Malicious Packet Spawn (Affects Firewall)
    if (eventChance < 0.1) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        maliciousPackets.push(new MaliciousPacket(randomNode, hubNode));
    }
}

function getBestROINode() {
    return nodes.reduce((prev, curr) => {
        const prevROI = (prev.totalData || 0) / (prev.provisionCost || 1);
        const currROI = (curr.totalData || 0) / (curr.provisionCost || 1);
        return (currROI > prevROI) ? curr : prev;
    });
}

function showNotification(text) {
    const log = document.getElementById('system-log') || createLogElement();
    const entry = document.createElement('div');
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    log.prepend(entry);

    if (log.children.length > 5) log.lastChild.remove();
}

function createLogElement() {
    const el = document.createElement('div');
    el.id = 'system-log';
    el.style = "position:absolute; bottom:20px; left:20px; color:#00f2ff; font-family:Consolas; font-size:12px; pointer-events:none;";
    document.body.appendChild(el);
    return el;
}

function applyZoom(delta, centerX, centerY) {
    const oldScale = scale;
    scale = Math.min(Math.max(scale + delta, MIN_ZOOM), MAX_ZOOM);

    const zoomFactor = scale / oldScale;
    camera.x = (centerX / oldScale + camera.x) - (centerX / scale);
    camera.y = (centerY / oldScale + camera.y) - (centerY / scale);
}

// Mouse Wheel Zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    let zoomDelta;

    if (e.ctrlKey) {
        zoomDelta = -e.deltaY * (ZOOM_SENSITIVITY * 5);
    } else {
        zoomDelta = -e.deltaY * ZOOM_SENSITIVITY;
    }

    applyZoom(zoomDelta, e.clientX, e.clientY);
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    const detectionRadius = 30 * scale;

    startNode = nodes.find(n => Math.hypot((n.x - camera.x) * scale - x, (n.y - camera.y) * scale - y) < detectionRadius);

    // --- UPGRADE: Power Query Unpivoting (Selling) ---
    if (isSellMode && startNode && startNode.active && !startNode.isHub) {
        totalBytes += startNode.provisionCost * 0.8;
        startNode.active = false;
        connections = connections.filter(c => c.from !== startNode && c.to !== startNode);
        return;
    }

    if (startNode) {
        isDragging = true;
    } else {
        isPanning = true;
        lastPointer.x = e.clientX;
        lastPointer.y = e.clientY;
    }
});

canvas.addEventListener('pointermove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;

    if (isPanning) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;

        camera.x -= dx / scale;
        camera.y -= dy / scale;

        lastPointer.x = e.clientX;
        lastPointer.y = e.clientY;
    }
});

canvas.addEventListener('pointerup', (e) => {
    if (isDragging) {
        const x = e.clientX;
        const y = e.clientY;
        const detectionRadius = 30 * scale;
        const endNode = nodes.find(n => Math.hypot((n.x - camera.x) * scale - x, (n.y - camera.y) * scale - y) < detectionRadius);

        if (endNode && endNode !== startNode) {
            const dist = Math.hypot(startNode.x - endNode.x, startNode.y - endNode.y);

            // --- UPGRADE: Microwave PtP Link (Ignore distance) ---
            const canConnect = upgrades.microwaveLink.owned || dist < 600;

            if (canConnect) {
                const connected = connections.some(c => (c.from === startNode && c.to === endNode) || (c.from === endNode && c.to === startNode));
                if (!connected) {
                    const finalCost = upgrades.activeDirectory.owned ? endNode.provisionCost * 0.85 : endNode.provisionCost;

                    if (endNode.active || totalBytes >= finalCost) {
                        if (!endNode.active) {
                            totalBytes -= finalCost;
                            endNode.active = true;
                        }
                        connections.push({ from: startNode, to: endNode });
                    }
                }
            }
        }
    }
    isDragging = false;
    isPanning = false;
});

// Mobile Pinch-to-Zoom
let initialDist = 0;
canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        isPanning = false;
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );

        if (initialDist > 0) {
            const zoomDelta = (dist - initialDist) * 0.005;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            applyZoom(zoomDelta, midX, midY);
        }
        initialDist = dist;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    initialDist = 0;
});

update();