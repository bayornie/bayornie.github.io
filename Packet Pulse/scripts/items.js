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
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.0;
const ZOOM_SENSITIVITY = 0.001;

// Game State
let scale = 1.0;
let totalBytes = 0;
let connections = [];
let packets = [];
let isDragging = false;
let startNode = null;
let spawnTimer = 0;
let mousePos = { x: 0, y: 0 };
let isPanning = false;
let lastPointer = { x: 0, y: 0 };
let camera = { x: 0, y: 0 };

seed = 12345;

let nodes = [{ id: 1, x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, active: true, provisionCost: 0 }];
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
        provisionCost: Math.floor(distanceToHub * 5) 
    };

    if (nodes.every(n => Math.hypot(n.x - newNode.x, n.y - newNode.y) > minDistance)) {
        nodes.push(newNode);
    }
}