// canvas.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

let scale = 1;
let camera = { x: 0, y: 0 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3  ;
const ZOOM_SENSITIVITY = 0.001;

function formatData(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = (bytes / Math.pow(k, i)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return val + ' ' + sizes[i];
}

function drawGrid() {
    const gridSize = 100 * scale;
    const offsetX = (-camera.x * scale) % gridSize;
    const offsetY = (-camera.y * scale) % gridSize;

    ctx.save();
    
    // Fill background with a solid dark color first to remove the "vignette" look
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    // Using your existing neon blue telemetry color for the grid lines
    ctx.strokeStyle = "rgba(0, 242, 255, 0.05)";
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }

    // Draw horizontal lines
    for (let y = offsetY; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }

    ctx.stroke();
    ctx.restore();
}