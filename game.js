// Botón temporal para probar la carta de amor desde el menú principal
document.addEventListener('DOMContentLoaded', function() {
    const testBtn = document.getElementById('test-love-letter');
    if (testBtn) {
        testBtn.addEventListener('click', function() {
            const modal = document.getElementById('love-letter-modal');
            if (modal) modal.classList.remove('hidden');
            // Pausar el juego completamente
            gameState.paused = true;
            gameState._wasRunning = gameState.gameRunning;
            gameState.gameRunning = false;
        });
    }
});
// ============================================
// CONFIGURACIÓN DE PERSONALIZACIÓN
// ============================================
// Imágenes personalizadas - se cargan automáticamente
const CUSTOM_IMAGES = {
    sunflower: 'images/girasol.png',
    background: 'images/cielo.jpg',
    sun: 'images/sol.png',
    enemy: 'images/enemy.png',
    powerup: 'images/brownie.png',
    grass: 'images/grass.jpg',
    // Nuevos objetos después de 20 puntos
    burger: 'images/burger.png',
    cockroach: 'images/cucaracha.png',
    cocacola: 'images/cocacola.png'
};

// ============================================
// CONFIGURACIÓN DEL JUEGO
// ============================================
const CONFIG = {
    width: 640,
    height: 360,
    scale: 2,
    gravity: 0.5,
    initialSpeed: 0.8,      // Reducido de 2 a 0.8 (más suave)
    speedIncrease: 0.03,    // Reducido de 0.1 a 0.03 (incremento más gradual)
    spawnRate: 0.005,       // Muy reducido para que caigan menos objetos
    maxObjectsOnScreen: 5   // Límite máximo de objetos en pantalla
};

// Estado del juego
let gameState = {
    score: 0,
    lives: 3,
    gameRunning: false,
    paused: false,
    speed: CONFIG.initialSpeed,
    highScore: localStorage.getItem('highScore') || 0,
    customImages: {}
};

// Elementos del DOM
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const messageOverlay = document.getElementById('message-overlay');
const messageContent = document.getElementById('message-content');

// Configurar canvas
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;
canvas.style.width = (CONFIG.width * CONFIG.scale) + 'px';
canvas.style.height = (CONFIG.height * CONFIG.scale) + 'px';
ctx.imageSmoothingEnabled = false;

// Objetos del juego
let sunflower = {
    x: CONFIG.width / 2,
    y: CONFIG.height - 60,
    width: 30,  // Más delgado (reducido de 40 a 30)
    height: 50,
    speed: 5,
    image: null
};

let fallingObjects = [];
let clouds = [];
let powerUps = [];
let keys = {};
let floatingMessages = []; // Mensajes flotantes que no pausan el juego
let lastTargetedEnemyTime = 0; // Última vez que cayó un enemigo dirigido
let lastMinimumCheckTime = 0; // Última vez que se verificó el mínimo de objetos
const TARGETED_ENEMY_INTERVAL = 3000; // 3 segundos en milisegundos
const MINIMUM_CHECK_INTERVAL = 1000; // Verificar mínimo cada segundo

// Mensajes de amor
const loveMessages = {
    5: "Eres increíble 💛",
    10: "Eres maravillosa ✨",
    15: "Eres inteligente 🌸",
    25: "Eres el amor de mi vida.\nFeliz cumpleaños <3 🌻"
};

let lastMessageScore = 0;
let specialMessageShown = false;

// Crear sprites pixel art
function createSunflowerSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    // Tallo verde
    ctx.fillStyle = '#228B22';
    ctx.fillRect(18, 35, 4, 15);
    
    // Círculo central (cara)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(20, 20, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Ojos
    ctx.fillStyle = '#000';
    ctx.fillRect(14, 16, 3, 3);
    ctx.fillRect(23, 16, 3, 3);
    
    // Sonrisa
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, 22, 6, 0, Math.PI);
    ctx.stroke();
    
    // Pétalos
    ctx.fillStyle = '#FFD700';
    // Pétalo superior
    ctx.beginPath();
    ctx.ellipse(20, 5, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pétalo inferior
    ctx.beginPath();
    ctx.ellipse(20, 35, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pétalos laterales
    ctx.beginPath();
    ctx.ellipse(5, 20, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(35, 20, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
}

function createSunSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    
    // Círculo central
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(15, 15, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Rayos
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(15 + Math.cos(angle) * 12, 15 + Math.sin(angle) * 12);
        ctx.lineTo(15 + Math.cos(angle) * 18, 15 + Math.sin(angle) * 18);
        ctx.stroke();
    }
    
    // Carita feliz
    ctx.fillStyle = '#000';
    ctx.fillRect(10, 11, 3, 3);
    ctx.fillRect(17, 11, 3, 3);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(15, 17, 4, 0, Math.PI);
    ctx.stroke();
    
    return canvas;
}

function createEnemySprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    
    // Nube gris suave
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.arc(10, 15, 8, 0, Math.PI * 2);
    ctx.arc(20, 15, 8, 0, Math.PI * 2);
    ctx.arc(15, 10, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Carita triste (opcional, para mantener tierno)
    ctx.fillStyle = '#000';
    ctx.fillRect(11, 12, 2, 2);
    ctx.fillRect(17, 12, 2, 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(15, 18, 3, Math.PI, 0);
    ctx.stroke();
    
    return canvas;
}

function createPowerUpSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 25;
    canvas.height = 25;
    const ctx = canvas.getContext('2d');
    
    // Estrella/Corazón brillante
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    // Forma de estrella
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x = 12.5 + Math.cos(angle) * 10;
        const y = 12.5 + Math.sin(angle) * 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Brillo
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.arc(12.5, 12.5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
}

function createBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    const ctx = canvas.getContext('2d');
    
    // Cielo degradado - azul pastel muy claro
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    gradient.addColorStop(0, '#F0F8FF');  // Azul muy claro casi blanco
    gradient.addColorStop(0.5, '#E6F3FF'); // Azul pastel claro
    gradient.addColorStop(1, '#E0F8E0');   // Verde pastel muy claro
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    
    // Nubes decorativas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 5; i++) {
        const x = (i * 150) % CONFIG.width;
        const y = 30 + (i * 40) % 100;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.arc(x + 20, y, 15, 0, Math.PI * 2);
        ctx.arc(x + 10, y - 10, 15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Suelo con pasto
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, CONFIG.height - 20, CONFIG.width, 20);
    
    // Florecitas
    ctx.fillStyle = '#FF69B4';
    for (let i = 0; i < 10; i++) {
        const x = (i * 70) % CONFIG.width;
        const y = CONFIG.height - 15;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return canvas;
}

// Cargar imágenes personalizadas desde las rutas especificadas en CUSTOM_IMAGES
function loadCustomImages() {
    let loadedCount = 0;
    const totalImages = Object.keys(CUSTOM_IMAGES).length;
    
    Object.keys(CUSTOM_IMAGES).forEach(key => {
        if (CUSTOM_IMAGES[key]) {
            const img = new Image();
            img.onload = function() {
                gameState.customImages[key] = img;
                loadedCount++;
                console.log(`Imagen personalizada cargada: ${key} (${loadedCount}/${totalImages})`);
            };
            img.onerror = function() {
                console.error(`Error al cargar imagen: ${CUSTOM_IMAGES[key]}`);
                loadedCount++;
            };
            img.src = CUSTOM_IMAGES[key];
        }
    });
}

// Inicializar sprites
let backgroundSprite = createBackground();
sunflower.image = createSunflowerSprite();
let sunSprite = createSunSprite();
let enemySprite = createEnemySprite();
let powerUpSprite = createPowerUpSprite();

// Cargar imágenes personalizadas si están especificadas
loadCustomImages();

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState.gameRunning = false;
});
// Los mensajes ahora son flotantes y no requieren interacción

// Las imágenes personalizadas se cargan automáticamente desde CUSTOM_IMAGES al inicio

// Controles
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys['left'] = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys['right'] = true;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys['left'] = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys['right'] = false;
    }
});

// Funciones del juego
function startGame() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.gameRunning = true;
    gameState.paused = false;
    gameState.speed = CONFIG.initialSpeed;
    fallingObjects = [];
    powerUps = [];
    floatingMessages = [];
    lastMessageScore = 0;
    specialMessageShown = false;
    lastTargetedEnemyTime = Date.now(); // Inicializar tiempo para enemigos dirigidos
    lastMinimumCheckTime = Date.now(); // Inicializar tiempo para verificación de mínimos
    
    sunflower.x = CONFIG.width / 2;
    sunflower.speed = 2.5; // Velocidad base del girasol
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    messageOverlay.classList.add('hidden');
    
    updateDisplay();
    gameLoop();
}

function updateDisplay() {
    scoreDisplay.textContent = `Puntos: ${gameState.score}`;
    const hearts = '❤️'.repeat(gameState.lives);
    livesDisplay.textContent = hearts || '💔';
}

// Mostrar mensaje flotante (no pausa el juego)
function showFloatingMessage(text) {
    floatingMessages.push({
        text: text,
        x: CONFIG.width / 2,
        y: CONFIG.height / 2,
        alpha: 1.0,
        life: 0,
        maxLife: 300 // Duración en frames (5 segundos a 60fps) - más tiempo para leer
    });
    // Sonido de campanita (simulado con vibración si está disponible)
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Mostrar carta de amor especial
function showLoveLetterModal() {
    const modal = document.getElementById('love-letter-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    // Pausar el juego completamente
    gameState.paused = true;
    gameState._wasRunning = gameState.gameRunning;
    gameState.gameRunning = false;
}

function hideLoveLetterModal() {
    const modal = document.getElementById('love-letter-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Reanudar el juego si estaba corriendo
    gameState.paused = false;
    if (gameState._wasRunning) {
        gameState.gameRunning = true;
        gameLoop();
    }
    // Mostrar mensaje flotante motivacional
    showFloatingMessage("Bueno, a ver cuál es tu récord 😋");
}

function spawnObject() {
    // No spawnear si hay demasiados objetos en pantalla
    if (fallingObjects.length + powerUps.length >= CONFIG.maxObjectsOnScreen) {
        return;
    }
    
    // No spawnear power-ups si ya hay uno en pantalla
    const hasPowerUp = powerUps.length > 0;
    
    // Calcular proporción de enemigos basada en puntos
    // A más puntos, más enemigos (pero sin saturar)
    const enemyRatio = Math.min(0.3 + (gameState.score * 0.01), 0.5); // Máximo 50% enemigos
    const powerUpRatio = hasPowerUp ? 0 : 0.08; // Aumentado a 8% de probabilidad si no hay power-up
    
    // Después de 20 puntos, hay variedad de objetos
    const hasVariety = gameState.score >= 20;
    
    const rand = Math.random();
    if (rand < (1 - enemyRatio - powerUpRatio)) {
        // Objetos positivos
        if (hasVariety) {
            // Después de 20 puntos, usar burger en lugar de sun
            fallingObjects.push({
                x: Math.random() * (CONFIG.width - 40),
                y: -40,
                width: 40,
                height: 40,
                type: 'burger',
                speed: gameState.speed
            });
        } else {
            // Sol/rayo positivo (original) - solo antes de 20 puntos
            fallingObjects.push({
                x: Math.random() * (CONFIG.width - 40),
                y: -40,
                width: 40,
                height: 40,
                type: 'sun',
                speed: gameState.speed
            });
        }
    } else if (rand < (1 - powerUpRatio)) {
        // Objetos dañinos
        if (hasVariety && Math.random() < 0.5) {
            // Cucaracha (nuevo enemigo)
            fallingObjects.push({
                x: Math.random() * (CONFIG.width - 40),
                y: -40,
                width: 40,
                height: 40,
                type: 'cockroach',
                speed: gameState.speed
            });
        } else {
            // Enemy original
            fallingObjects.push({
                x: Math.random() * (CONFIG.width - 40),
                y: -40,
                width: 40,
                height: 40,
                type: 'enemy',
                speed: gameState.speed
            });
        }
    } else if (!hasPowerUp) {
        // Power-up
        if (hasVariety && Math.random() < 0.5) {
            // Coca Cola (nuevo power-up)
            powerUps.push({
                x: Math.random() * (CONFIG.width - 35),
                y: -35,
                width: 35,
                height: 35,
                type: 'cocacola',
                speed: gameState.speed * 0.8,
                active: false,
                duration: 0
            });
        } else {
            // Brownie (power-up original)
            powerUps.push({
                x: Math.random() * (CONFIG.width - 35),
                y: -35,
                width: 35,
                height: 35,
                type: 'powerup',
                speed: gameState.speed * 0.8,
                active: false,
                duration: 0
            });
        }
    }
}

// Spawnear enemigo dirigido hacia el girasol
function spawnTargetedEnemy() {
    const hasVariety = gameState.score >= 20;
    const enemyType = hasVariety && Math.random() < 0.5 ? 'cockroach' : 'enemy';
    
    fallingObjects.push({
        x: sunflower.x + (sunflower.width / 2) - 20, // Centrado en el girasol
        y: -40,
        width: 40,
        height: 40,
        type: enemyType,
        speed: gameState.speed,
        targeted: true // Marcar como enemigo dirigido
    });
}

// Asegurar que haya al menos un objeto positivo y uno negativo
function ensureMinimumObjects() {
    const positiveObjects = fallingObjects.filter(obj => obj.type === 'sun' || obj.type === 'burger');
    const negativeObjects = fallingObjects.filter(obj => obj.type === 'enemy' || obj.type === 'cockroach');
    
    // Si no hay objetos positivos, spawnear uno
    if (positiveObjects.length === 0 && fallingObjects.length + powerUps.length < CONFIG.maxObjectsOnScreen) {
        const hasVariety = gameState.score >= 20;
        fallingObjects.push({
            x: Math.random() * (CONFIG.width - 40),
            y: -40,
            width: 40,
            height: 40,
            type: hasVariety ? 'burger' : 'sun',
            speed: gameState.speed
        });
    }
    
    // Si no hay objetos negativos, spawnear uno
    if (negativeObjects.length === 0 && fallingObjects.length + powerUps.length < CONFIG.maxObjectsOnScreen) {
        const hasVariety = gameState.score >= 20;
        const enemyType = hasVariety && Math.random() < 0.5 ? 'cockroach' : 'enemy';
        fallingObjects.push({
            x: Math.random() * (CONFIG.width - 40),
            y: -40,
            width: 40,
            height: 40,
            type: enemyType,
            speed: gameState.speed
        });
    }
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function update() {
    // Si la carta de amor está abierta, no actualizar nada del juego
    const loveLetterOpen = document.getElementById('love-letter-modal') && !document.getElementById('love-letter-modal').classList.contains('hidden');
    if (!gameState.gameRunning || loveLetterOpen) return;

    // Movimiento del girasol (más suave)
    const moveSpeed = sunflower.speed * 0.8; // Reducir velocidad de movimiento
    if (keys['left'] || keys['ArrowLeft'] || keys['a'] || keys['A']) {
        sunflower.x = Math.max(0, sunflower.x - moveSpeed);
    }
    if (keys['right'] || keys['ArrowRight'] || keys['d'] || keys['D']) {
        sunflower.x = Math.min(CONFIG.width - sunflower.width, sunflower.x + moveSpeed);
    }

    // Spawn de enemigo dirigido cada 3 segundos
    const currentTime = Date.now();
    if (currentTime - lastTargetedEnemyTime >= TARGETED_ENEMY_INTERVAL) {
        if (fallingObjects.length + powerUps.length < CONFIG.maxObjectsOnScreen) {
            spawnTargetedEnemy();
            lastTargetedEnemyTime = currentTime;
        }
    }

    // Spawn de objetos aleatorios
    if (Math.random() < CONFIG.spawnRate) {
        spawnObject();
    }

    // Asegurar que siempre haya al menos un objeto positivo y uno negativo (cada segundo)
    if (currentTime - lastMinimumCheckTime >= MINIMUM_CHECK_INTERVAL) {
        ensureMinimumObjects();
        lastMinimumCheckTime = currentTime;
    }

    // Actualizar mensajes flotantes
    for (let i = floatingMessages.length - 1; i >= 0; i--) {
        const msg = floatingMessages[i];
        msg.life++;
        msg.y -= 0.5; // Mover hacia arriba más suavemente
        msg.alpha = 1 - (msg.life / msg.maxLife); // Fade out suave

        if (msg.life >= msg.maxLife) {
            floatingMessages.splice(i, 1);
        }
    }

    // Actualizar objetos que caen
    for (let i = fallingObjects.length - 1; i >= 0; i--) {
        const obj = fallingObjects[i];
        obj.y += obj.speed;

        // Colisión con girasol
        if (checkCollision(sunflower, obj)) {
            // Objetos positivos (dan puntos)
            if (obj.type === 'sun' || obj.type === 'burger') {
                gameState.score++;
                gameState.speed = Math.min(gameState.speed + CONFIG.speedIncrease, 3); // Limitar velocidad máxima
                // Sonido de "pling!" (simulado)
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }

                // Verificar mensajes de amor
                if (gameState.score in loveMessages && gameState.score !== lastMessageScore) {
                    lastMessageScore = gameState.score;
                    if (gameState.score === 25) {
                        showLoveLetterModal();
                    } else {
                        showFloatingMessage(loveMessages[gameState.score]);
                    }
                }
            } 
            // Objetos negativos (quitan vidas)
            else if (obj.type === 'enemy' || obj.type === 'cockroach') {
                gameState.lives--;
                // Sonido de "oh!" (simulado)
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
                if (gameState.lives <= 0) {
                    endGame();
                    return;
                }
            }
            fallingObjects.splice(i, 1);
            updateDisplay();
            continue;
        }

        // Eliminar si sale de pantalla
        if (obj.y > CONFIG.height) {
            fallingObjects.splice(i, 1);
        }
    }

    // Actualizar power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const power = powerUps[i];
        power.y += power.speed;

        if (checkCollision(sunflower, power)) {
            // Activar power-up (aumentar velocidad temporalmente)
            sunflower.speed = 4;
            powerUps.splice(i, 1);
            setTimeout(() => {
                sunflower.speed = 2.5;
            }, 5000);
            // Sonido de power-up
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            continue;
        }

        if (power.y > CONFIG.height) {
            powerUps.splice(i, 1);
        }
    }
}

function render() {
    // Limpiar canvas
    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
    
    // Dibujar fondo (cielo)
    if (gameState.customImages['background']) {
        ctx.drawImage(gameState.customImages['background'], 0, 0, CONFIG.width, CONFIG.height - 20);
    } else {
        ctx.drawImage(backgroundSprite, 0, 0);
    }
    
    // Dibujar suelo (grass)
    if (gameState.customImages['grass']) {
        ctx.drawImage(gameState.customImages['grass'], 0, CONFIG.height - 20, CONFIG.width, 20);
    } else {
        // Suelo predeterminado
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, CONFIG.height - 20, CONFIG.width, 20);
    }
    
    // Dibujar objetos que caen
    fallingObjects.forEach(obj => {
        let sprite;
        if (obj.type === 'sun') {
            sprite = gameState.customImages['sun'] || sunSprite;
        } else if (obj.type === 'burger') {
            sprite = gameState.customImages['burger'] || sunSprite; // Fallback a sol si no hay imagen
        } else if (obj.type === 'cockroach') {
            sprite = gameState.customImages['cockroach'] || enemySprite; // Fallback a enemy si no hay imagen
        } else {
            sprite = gameState.customImages['enemy'] || enemySprite;
        }
        if (sprite) {
            ctx.drawImage(sprite, obj.x, obj.y, obj.width, obj.height);
        }
    });
    
    // Dibujar power-ups
    powerUps.forEach(power => {
        let sprite;
        if (power.type === 'cocacola') {
            sprite = gameState.customImages['cocacola'] || powerUpSprite;
        } else {
            sprite = gameState.customImages['powerup'] || powerUpSprite;
        }
        if (sprite) {
            ctx.drawImage(sprite, power.x, power.y, power.width, power.height);
        }
    });
    
    // Dibujar girasol
    const sunflowerImg = gameState.customImages['sunflower'] || sunflower.image;
    if (sunflowerImg) {
        ctx.drawImage(sunflowerImg, sunflower.x, sunflower.y, sunflower.width, sunflower.height);
    }
    
    // Dibujar mensajes flotantes
    floatingMessages.forEach(msg => {
        ctx.save();
        ctx.globalAlpha = msg.alpha;
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Sombra del texto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(msg.text, msg.x + 2, msg.y + 2);
        
        // Texto principal
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 2;
        ctx.strokeText(msg.text, msg.x, msg.y);
        ctx.fillText(msg.text, msg.x, msg.y);
        
        ctx.restore();
    });
}

function endGame() {
    gameState.gameRunning = false;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
    }
    
    document.getElementById('final-score').textContent = `Puntos finales: ${gameState.score}`;
    document.getElementById('high-score').textContent = `Récord: ${gameState.highScore}`;
    
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
    if (!gameState.gameRunning) return;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}


// Evento para cerrar la carta de amor
document.addEventListener('DOMContentLoaded', function() {
    const closeLoveLetterBtn = document.getElementById('close-love-letter');
    if (closeLoveLetterBtn) {
        closeLoveLetterBtn.addEventListener('click', hideLoveLetterModal);
    }
});

// Inicializar
updateDisplay();

