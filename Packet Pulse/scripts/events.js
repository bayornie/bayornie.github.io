// events.js
function showNotification(text) {
    const log = document.getElementById('system-log') || createLogElement();
    const entry = document.createElement('div');

    entry.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    entry.style.transition = "opacity 0.8s ease, transform 0.8s ease";
    entry.style.opacity = "1";

    log.prepend(entry);

    // 1. Cap the list at 5 items immediately
    if (log.children.length > 5) {
        log.lastChild.remove();
    }

    // 2. Automatic removal timer
    setTimeout(() => {
        entry.style.opacity = "0";
        entry.style.transform = "translateX(-20px)";
        setTimeout(() => {
            if (entry.parentNode === log) {
                entry.remove();
            }
        }, 800);
    }, 4000);
}

function updateEmergencyUI() {
    const btnContainer = document.getElementById('emergency-protocols');
    if (!btnContainer) return;

    if (maliciousPackets.length > 0) {
        btnContainer.style.display = 'block';
    } else {
        btnContainer.style.display = 'none';
    }
}

function manualPurge() {
    const purgeCost = 5000;
    if (totalBytes >= purgeCost) {
        totalBytes -= purgeCost;
        maliciousPackets = [];
        showNotification("SYSTEM: Manual purge complete. Threats neutralized.");
        updateEmergencyUI();
        saveGame(nodes, upgrades, camera, totalBytes, connections);
    } else {
        showNotification("ALERT: Insufficient bandwidth for purge protocol.");
    }
}

function createLogElement() {
    const el = document.createElement('div');
    el.id = 'system-log';
    el.style = "position:absolute; bottom:20px; left:20px; color:#00f2ff; font-family:Consolas; font-size:12px; pointer-events:none;";
    document.body.appendChild(el);
    return el;
}

function canConnect(sourceNode, targetNode) {
    const isHubPresent = (sourceNode.isHub || sourceNode.id === 1 ||
        targetNode.isHub || targetNode.id === 1);

    if (isHubPresent) return true;

    if (!upgrades.enterpriseSwitch.owned) {
        showNotification("SYSTEM: Enterprise Switch required for Mesh Topology.");
        return false;
    }
    return true;
}

function getBestROINode() {
    if (!nodes || nodes.length === 0) return null;
    const potentialNodes = nodes.filter(n => n.id !== 1 && n.active);
    if (potentialNodes.length === 0) return null;

    return potentialNodes.reduce((prev, curr) => {
        const prevROI = (prev.totalData || 0) / (prev.provisionCost || 1);
        const currROI = (curr.totalData || 0) / (curr.provisionCost || 1);
        return (currROI > prevROI) ? curr : prev;
    });
}
function triggerRandomEvent() {
    const eventChance = Math.random();

    // 1. Network Glitch
    if (eventChance < 0.05 && connections.length > 0) {
        if (!upgrades.ciscoFirewall.owned) {
            connections.splice(Math.floor(Math.random() * connections.length), 1);
            showNotification("CRITICAL: Connection severed by Network Glitch!");
        } else {
            showNotification("FIREWALL: Network Glitch detected and auto-repaired.");
        }
    }

    // 2. Malicious Packet Spawn
    if (eventChance < 0.05) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        if (hubNode && randomNode) {
            maliciousPackets.push(new MaliciousPacket(randomNode, hubNode));
        }
    }
}

function getCheapestAvailableNode() {
    const inactiveNodes = nodes.filter(n => !n.active);
    if (inactiveNodes.length === 0) return null;

    return inactiveNodes.reduce((prev, curr) => {
        const prevCost = upgrades.activeDirectory.owned ? prev.provisionCost * 0.85 : prev.provisionCost;
        const currCost = upgrades.activeDirectory.owned ? curr.provisionCost * 0.85 : curr.provisionCost;
        return (currCost < prevCost) ? curr : prev;
    });
}

function toggleAnalysisMode() {
    isAnalysisMode = !isAnalysisMode;
    const btn = document.getElementById('toggle-analysis');

    if (isAnalysisMode) {
        btn.innerText = "ANALYSIS: ON";
        btn.style.borderColor = "#00ff96";
        btn.style.color = "#00ff96";
        showNotification("SYSTEM: Node cost analysis active.");
    } else {
        btn.innerText = "ANALYSIS: OFF";
        btn.style.borderColor = "#f73a3a";
        btn.style.color = "#f73a3a";
    }
}

// --- SHOP & INTERACTION LOGIC ---
function toggleShop() {
    const modalElement = document.getElementById('procurementModal');
    if (!modalElement) return;

    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) {
        modal = new bootstrap.Modal(modalElement);
    }
    modal.show();
}

function renderUpgrades() {
    const list = document.getElementById('upgrade-list');
    if (!list) return;
    list.innerHTML = '';

    for (let key in upgrades) {
        const upg = upgrades[key];
        const div = document.createElement('div');
        const isSpecial = key === 'enterpriseSwitch' ? 'border: 1px solid #ff0055;' : '';

        div.className = "upgrade-item d-flex justify-content-between align-items-center p-3 mb-2";
        div.style = `${isSpecial} background: rgba(0, 20, 20, 0.4); border-radius: 4px;`;

        div.innerHTML = `
            <div style="flex: 1; padding-right: 15px;">
                <div class="fw-bold" style="color: #00f2ff; letter-spacing: 1px;">
                    ${upg.label}
                </div>
                <div style="font-size: 0.7rem; color: #ffffff; opacity: 0.8; margin: 2px 0;">
                    ${upg.description}
                </div>
                <div style="font-size: 0.75rem; color: rgba(0, 242, 255, 0.5); font-family: 'Consolas', monospace;">
                    COST: ${formatData(upg.cost)}
                </div>
            </div>
            <button onclick="buyUpgrade('${key}')" 
                class="btn-telemetry px-3 py-1" 
                style="min-width: 100px; font-size: 0.8rem; height: fit-content;"
                ${upg.owned ? 'disabled' : ''}>
                ${upg.owned ? 'INSTALLED' : 'PROVISION'}
            </button>
        `;
        list.appendChild(div);
    }
}

function buyUpgrade(key) {
    const upg = upgrades[key];

    if (totalBytes >= upg.cost && !upg.owned) {
        totalBytes -= upg.cost;
        upg.owned = true;

        const currencyEl = document.getElementById('currency');
        if (currencyEl) currencyEl.innerText = formatData(totalBytes);

        showNotification(`PROVISIONED: ${upg.label}`);
        renderUpgrades();
    } else if (totalBytes < upg.cost) {
        showNotification("ALERT: Insufficient Bandwidth Assets.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('procurementModal');
    if (modalEl) {
        modalEl.addEventListener('show.bs.modal', renderUpgrades);
    }
});