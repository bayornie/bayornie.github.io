// items.js
let seed = 12345;

function seededRandom() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
}

// Configuration
const SPAWN_RATE = 60;
const minDistance = 100;
const WORLD_SIZE = 3000;
const upgrades = {
    // Hardware
    enterpriseSwitch: {
        owned: false,
        cost: 100000,
        label: "Enterprise Core Switch",
        description: "Enables Mesh Topology. Allows connecting nodes to each other instead of just the Hub."
    },
    fiberOptics: {
        owned: false,
        cost: 150000,
        label: "ISP-Grade Fiber Optics",
        description: "Reduces signal attenuation. Increases the base data yield of all active links by 25%."
    },
    microwaveLink: {
        owned: false,
        cost: 200000,
        label: "Microwave PtP Link",
        description: "Long-range wireless transmission. Allows connecting nodes that are further apart."
    },
    cat6eShielding: {
        owned: false,
        cost: 250000,
        label: "Cat6e S/FTP Shielding",
        description: "Reduces electromagnetic interference. Lowers the chance of a link dropping during spikes."
    },
    f5LoadBalancer: {
        owned: false,
        cost: 300000,
        label: "F5 Big-IP Load Balancer",
        description: "Distributes packet traffic evenly across all paths to prevent node saturation."
    },

    // Software
    activeDirectory: {
        owned: false,
        cost: 60000,
        label: "Active Directory (AD DS)",
        description: "Centralized management. Grants a 15% discount on all future node provisioning costs."
    },
    dhcpScoping: {
        owned: false,
        cost: 120000,
        label: "DHCP Super-Scoping",
        description: "Expands the available IP pool. Increases the maximum number of active nodes allowed."
    },
    hyperVCluster: {
        owned: false,
        cost: 180000,
        label: "Hyper-V Cluster Scaling",
        description: "Virtualizes hardware resources. Improves the recovery speed of offline nodes."
    },
    ssdRaid10: {
        owned: false,
        cost: 240000,
        label: "SSD RAID 10 Array",
        description: "High-speed data redundancy. Prevents data loss when a connection is severed."
    },
    gpoBoost: {
        owned: false,
        cost: 300000,
        label: "Group Policy Objects",
        description: "Automated network rules. Increases the global bandwidth generation multiplier."
    },

    // Analysis
    powerBiDashboard: {
        owned: false,
        cost: 300000,
        label: "Power BI Dashboard",
        description: "Visual analytics. Highlights the most profitable node on the map with a gold ring."
    },
    sqlIndexing: {
        owned: false,
        cost: 450000,
        label: "SQL Columnstore Indexing",
        description: "Optimizes query performance. Data from nodes is processed 2x faster."
    },
    unpivotingTool: {
        owned: false,
        cost: 600000,
        label: "Power Query Unpivoting",
        description: "Restructures messy datasets. Converts low-yield nodes into high-efficiency streams."
    },

    // Security
    ciscoFirewall: {
        owned: false,
        cost: 700000,
        label: "Cisco Firepower",
        description: "Next-gen threat protection. Decreases the frequency of network 'glitch' events."
    },
    upsSystem: {
        owned: false,
        cost: 850000,
        label: "UPS System",
        description: "Backup power supply. Nodes stay active for 10 seconds even if disconnected from the Hub."
    },
    aesEncryption: {
        owned: false,
        cost: 1000000,
        label: "AES-256 Encryption",
        description: "Military-grade security. Doubles the Bandwidth value of every packet delivered."
    }
};

// Game State
let isAnalysisMode = false;
let maliciousPackets = [];
let isSellMode = false;
let totalBytes = 1000;
let connections = [];
let packets = [];
let isDragging = false;
let startNode = null;
let spawnTimer = 0;
let mousePos = { x: 0, y: 0 };
let isPanning = false;
let lastPointer = { x: 0, y: 0 };
let frameCount = 0;

seed = 12345;

let nodes = [{ 
    id: 1, 
    x: WORLD_SIZE / 2, 
    y: WORLD_SIZE / 2, 
    active: true, 
    isHub: true,
    totalData: 0,
    recoveryTimer: 0,
    provisionCost: 0 
}];
let hubNode = nodes[0];

function centerCamera() {
    camera.x = hubNode.x - (window.innerWidth / 2);
    camera.y = hubNode.y - (window.innerHeight / 2);
}
centerCamera();

while (nodes.length < 100) {
    let nextId = nodes.length + 1;
    let newX = seededRandom() * WORLD_SIZE;
    let newY = seededRandom() * WORLD_SIZE;
    let distanceToHub = Math.hypot(newX - hubNode.x, newY - hubNode.y);

    let newNode = {
        id: nextId,
        x: newX,
        y: newY,
        active: false,
        totalData: 0,
        recoveryTimer: 0,
        provisionCost: Math.floor(distanceToHub * 5)
    };

    if (nodes.every(n => Math.hypot(n.x - newNode.x, n.y - newNode.y) > minDistance)) {
        nodes.push(newNode);
    }
}