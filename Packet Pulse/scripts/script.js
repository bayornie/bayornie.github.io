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
        this.speed = 1.5;
        this.progress = 0;
        this.reached = false;
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
        ctx.arc(this.x - camera.x, this.y - camera.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0055";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff0055";
        ctx.fill();
        ctx.closePath();
    }

    completeTransmission() {
        totalBytes += 32;
        document.getElementById('currency').innerText = formatData(totalBytes);
    }
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Passive Income
    let previousTotal = Math.floor(totalBytes);
    nodes.forEach(node => { if (node.active) totalBytes += 0.05; });
    if (Math.floor(totalBytes) !== previousTotal) {
        document.getElementById('currency').innerText = formatData(totalBytes);
    }

    drawConnections();
    if (isDragging && startNode) drawTempLine();
    drawNodes();

    // Packet Logic
    spawnTimer++;
    if (spawnTimer >= SPAWN_RATE) {
        connections.forEach(conn => {
            packets.push(new Packet(conn.from, conn.to));
            packets.push(new Packet(conn.to, conn.from));
        });
        spawnTimer = 0;
    }

    packets = packets.filter(p => !p.reached);
    packets.forEach(p => {
        p.move();
        p.draw(ctx);
    });

    requestAnimationFrame(update);
}

function drawNodes() {
    nodes.forEach(node => {
        const screenX = node.x - camera.x;
        const screenY = node.y - camera.y;

        ctx.shadowBlur = node.active ? 20 : 0;
        ctx.shadowColor = '#00f2ff';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 22, 0, Math.PI * 2);
        ctx.fillStyle = node.active ? '#00f2ff' : '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = node.active ? '#fff' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
        ctx.shadowBlur = 0;

        if (!node.active) {
            const label = formatData(node.provisionCost);
            ctx.fillStyle = "#ff0055";
            ctx.font = "11px Consolas";
            ctx.textAlign = "center";
            ctx.fillText(label, screenX, screenY - 32);
        }
    });
}

function drawConnections() {
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
    ctx.lineWidth = 4;
    connections.forEach(conn => {
        ctx.beginPath();
        ctx.moveTo(conn.from.x - camera.x, conn.from.y - camera.y);
        ctx.lineTo(conn.to.x - camera.x, conn.to.y - camera.y);
        ctx.stroke();
    });
}

function drawTempLine() {
    ctx.beginPath();
    ctx.moveTo(startNode.x - camera.x, startNode.y - camera.y);
    ctx.lineTo(mousePos.x - camera.x, mousePos.y - camera.y);
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function applyZoom(delta, centerX, centerY) {
    const oldScale = scale;
    scale = Math.min(Math.max(scale + delta, MIN_ZOOM), MAX_ZOOM);

    const zoomFactor = scale / oldScale;
    // Adjust camera so we zoom toward the pointer position[cite: 2]
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

// Universal Pointer Handling
canvas.addEventListener('pointerdown', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    const detectionRadius = 30 * scale;
    startNode = nodes.find(n => Math.hypot((n.x - camera.x) * scale - x, (n.y - camera.y) * scale - y) < detectionRadius);

    if (startNode) {
        isDragging = true;
    } else {
        isPanning = true;
        lastPointer.x = e.clientX;
        lastPointer.y = e.clientY;
    }
});
canvas.addEventListener('pointermove', (e) => {
    if (isDragging) {
        mousePos.x = e.clientX + camera.x;
        mousePos.y = e.clientY + camera.y;
    } else if (isPanning) {
        camera.x -= (e.clientX - lastPointer.x);
        camera.y -= (e.clientY - lastPointer.y);
        lastPointer.x = e.clientX;
        lastPointer.y = e.clientY;
    }
});

canvas.addEventListener('pointerup', (e) => {
    if (isDragging) {
        const x = e.clientX;
        const y = e.clientY;
        const detectionRadius = 30 * scale;
        const endNode = nodes.find(n => Math.hypot((n.x - camera.x) - x, (n.y - camera.y) - y) < 30);

        if (endNode && endNode !== startNode) {
            const connected = connections.some(c => (c.from === startNode && c.to === endNode) || (c.from === endNode && c.to === startNode));
            if (!connected) {
                if (endNode.active || totalBytes >= endNode.provisionCost) {
                    if (!endNode.active) {
                        totalBytes -= endNode.provisionCost;
                        endNode.active = true;
                    }
                    connections.push({ from: startNode, to: endNode });
                }
            }
        }
    }
    isDragging = false;
    isPanning = false;
    initialDist = 0;
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

update();