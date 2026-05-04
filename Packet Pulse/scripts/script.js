// script.js
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateEmergencyUI();
    drawGrid();

    // --- UPGRADE: SSD RAID 10 ---
    const incomeRate = upgrades.ssdRaid10.owned ? 0.3 : 0.2;
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

    // --- Auto-Save ---
    frameCount++;
    if (frameCount % 300 === 0) {
        if (typeof db !== 'undefined' && db && nodes && upgrades && camera && connections) {
            saveGame(nodes, upgrades, camera, totalBytes, connections);
            console.log("Network state backed up to IndexedDB.");
        }
    }

    if (frameCount % 60 === 0) {
        triggerRandomEvent();
    }

    requestAnimationFrame(update);
}

function updateTelemetry(topNode) {
    const yieldElement = document.getElementById('best-node-id');

    if (upgrades.powerBiDashboard.owned && topNode) {
        const yieldValue = ((topNode.totalData || 0) / (topNode.provisionCost || 1)).toFixed(2);
        yieldElement.innerText = `${yieldValue}x ROI`;
    } else {
        yieldElement.innerText = "--";
    }
}

function drawNodes() {
    let topNode = null;
    if (upgrades.powerBiDashboard.owned) {
        const activeRemoteNodes = nodes.filter(n => n.active && !n.isHub);
        if (activeRemoteNodes.length > 0) {
            topNode = activeRemoteNodes.reduce((prev, curr) => {
                const prevYield = (prev.totalData || 0) / (prev.provisionCost || 1);
                const currYield = (curr.totalData || 0) / (curr.provisionCost || 1);
                return (currYield > prevYield) ? curr : prev;
            });
        }
    }

    // --- Identify Cheapest Node for Analysis Mode ---
    const cheapestNode = (typeof isAnalysisMode !== 'undefined' && isAnalysisMode) ? getCheapestAvailableNode() : null;

    nodes.forEach(node => {
        const screenX = (node.x - camera.x) * scale;
        const screenY = (node.y - camera.y) * scale;
        const radius = 22 * scale;

        // --- 1. Top Node Indicator ---
        if (upgrades.powerBiDashboard.owned && node === topNode && node.active && !node.isHub) {
            ctx.save();
            ctx.beginPath();
            const pulse = (Math.sin(Date.now() / 200) * 2) * scale;
            ctx.setLineDash([5 * scale, 5 * scale]);
            ctx.arc(screenX, screenY, radius + (10 * scale) + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = "#ffd700";
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
            ctx.restore();
        }

        // --- Cheapest Node Indicator ---
        if (cheapestNode && node === cheapestNode) {
            ctx.save();
            ctx.beginPath();
            const pulse = (Math.sin(Date.now() / 150) * 5) * scale;
            ctx.arc(screenX, screenY, radius + (12 * scale) + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 150, 0.8)";
            ctx.lineWidth = 3 * scale;
            ctx.stroke();

            ctx.fillStyle = "#00ff96";
            ctx.font = `bold ${11 * scale}px Consolas`;
            ctx.textAlign = "center";
            ctx.fillText("CHEAPEST PATH", screenX, screenY + radius + (35 * scale));
            ctx.restore();
        }

        // --- 2. Real Node Effect ---
        ctx.save();
        ctx.shadowBlur = node.active ? 25 * scale : 5 * scale;
        ctx.shadowColor = node.active ? (node.vlanColor || '#00f2ff') : '#333';

        const gradient = ctx.createRadialGradient(
            screenX - radius * 0.3, screenY - radius * 0.3, radius * 0.1,
            screenX, screenY, radius
        );

        if (node.active) {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.3, node.vlanColor || '#00f2ff');
            gradient.addColorStop(1, '#00444a');
        } else {
            gradient.addColorStop(0, '#444');
            gradient.addColorStop(1, '#111');
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = node.active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
        ctx.restore();

        // --- UI Labels & Recovery ---
        if (!node.active && scale > 0.4) {
            const finalCost = (typeof upgrades !== 'undefined' && upgrades.activeDirectory.owned)
                ? node.provisionCost * 0.85
                : node.provisionCost;
            ctx.fillStyle = "#ff0055";
            ctx.font = `bold ${12 * scale}px Consolas`;
            ctx.textAlign = "center";
            ctx.fillText(formatData(finalCost), screenX, screenY - (radius + 12 * scale));
        }

        if (node.recoveryTimer > 0 && node.active) {
            const alpha = 0.5 + Math.sin(Date.now() / 100) * 0.5;
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.font = `bold ${11 * scale}px Consolas`;
            ctx.textAlign = "center";
            ctx.fillText("RECOVERING...", screenX, screenY + radius + (20 * scale));
        }
    });

    // --- Push data to the UI ---
    updateTelemetry(topNode);
}

function centerCameraOnHub() {
    if (hubNode) {
        camera.x = hubNode.x - (window.innerWidth / 2) / scale;
        camera.y = hubNode.y - (window.innerHeight / 2) / scale;
    }
}

function drawConnections() {
    ctx.lineWidth = 4 * scale;
    connections.forEach(conn => {
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

    const startX = (startNode.x - camera.x) * scale;
    const startY = (startNode.y - camera.y) * scale;

    ctx.moveTo(startX, startY);
    ctx.lineTo(mousePos.x, mousePos.y);

    ctx.strokeStyle = 'rgba(0, 242, 255, 0.5)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    ctx.setLineDash([]);
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
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const detectionRadius = 30 * scale;

    startNode = nodes.find(n => Math.hypot((n.x - camera.x) * scale - x, (n.y - camera.y) * scale - y) < detectionRadius);

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
        lastPointer.x = x;
        lastPointer.y = y;
    }
});

canvas.addEventListener('pointerup', (e) => {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const detectionRadius = 30 * scale;
        const endNode = nodes.find(n => Math.hypot((n.x - camera.x) * scale - x, (n.y - camera.y) * scale - y) < detectionRadius);

        if (endNode && endNode !== startNode) {
            if (canConnect(startNode, endNode)) {
                const dist = Math.hypot(startNode.x - endNode.x, startNode.y - endNode.y);
                const canReach = upgrades.microwaveLink.owned || dist < 600;

                if (canReach) {
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
    }
    isDragging = false;
    isPanning = false;
});

canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    if (isPanning) {
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const dx = currentX - lastPointer.x;
        const dy = currentY - lastPointer.y;

        camera.x -= dx / scale;
        camera.y -= dy / scale;

        lastPointer.x = currentX;
        lastPointer.y = currentY;
    }
});

// Mobile Pinch-to-Zoom
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const touchDetectionRadius = 45 * scale;

        startNode = nodes.find(n =>
            Math.hypot((n.x - camera.x) * scale - x, (n.y - camera.y) * scale - y) < touchDetectionRadius
        );

        if (startNode) {
            isDragging = true;
            mousePos.x = x;
            mousePos.y = y;
        } else {
            isPanning = true;
            lastPointer.x = x;
            lastPointer.y = y;
        }
    } else if (e.touches.length === 2) {
        isPanning = false;
        isDragging = false;
        initialDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (isDragging) {
            mousePos.x = x;
            mousePos.y = y;
        } else if (isPanning) {
            const dx = x - lastPointer.x;
            const dy = y - lastPointer.y;
            camera.x -= dx / scale;
            camera.y -= dy / scale;
            lastPointer.x = x;
            lastPointer.y = y;
        }
    } else if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );

        if (initialDist > 0) {
            const zoomDelta = (dist - initialDist) * 0.005;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            applyZoom(zoomDelta, midX, midY);
        }
        initialDist = dist;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    isDragging = false;
    isPanning = false;
    startNode = null;

    if (e.touches.length < 2) {
        initialDist = 0;
    }
}, { passive: false });

window.addEventListener('orientationchange', () => {
    setTimeout(resize, 100);
});

// Initialization sequence
initDB().then(() => {
    console.log("Database initialized. Checking for saves...");
    return loadGame();
}).then(savedData => {
    if (savedData) {
        totalBytes = savedData.totalBytes;
        nodes = savedData.nodes;
        camera = savedData.camera;
        connections = savedData.connections || [];

        for (let key in upgrades) {
            if (savedData.upgrades && savedData.upgrades[key]) {
                upgrades[key].owned = savedData.upgrades[key].owned;
            }
        }

        if (typeof renderUpgrades === 'function') renderUpgrades();

        if (nodes.length > 0) {
            nodes[0].isHub = true;
            nodes[0].active = true;
            nodes[0].provisionCost = 0;
            hubNode = nodes[0];
        }

        console.log("Network state restored.");
    } else {
        if (nodes.length > 0) {
            hubNode = nodes[0];
            hubNode.isHub = true;
            hubNode.active = true;
        }
        centerCameraOnHub();
        console.log("No save found. Camera centered on Hub.");
    }

    const purgeBtn = document.getElementById('purge-threats');
    if (purgeBtn) {
        purgeBtn.addEventListener('click', manualPurge);
    }

    if (typeof resize === 'function') resize();

    update();
}).catch(err => {
    console.error("Critical Boot Error:", err);
    update();
});