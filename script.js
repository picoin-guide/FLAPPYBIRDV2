// Game canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const muteBtn = document.getElementById('muteBtn');

// Game state
let gameState = 'menu'; // menu, playing, gameOver
let score = 0;
let highScore = localStorage.getItem('flappyBirdHighScore') || 0;
let soundEnabled = true;

// Game objects
const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 20,
    height: 20,
    velocity: 0,
    gravity: 0.5,
    jumpPower: -8,
    rotation: 0
};

let pipes = [];
const pipeWidth = 40;
const pipeGap = 100;
const pipeSpeed = 2;

// Initialize high score display
highScoreElement.textContent = highScore;

// Sound effects (using Web Audio API)
function createSound(frequency, duration, type = 'sine') {
    if (!soundEnabled) return { play: () => {} };
    
    return {
        play: () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration / 1000);
            } catch (error) {
                console.log('Audio not supported');
            }
        }
    };
}

const sounds = {
    jump: createSound(800, 100, 'square'),
    score: createSound(1000, 200, 'sine'),
    hit: createSound(200, 300, 'sawtooth')
};

// Game functions
function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    score = 0;
    scoreElement.textContent = score;
    gameState = 'menu';
    startBtn.textContent = 'Start Game';
    startBtn.disabled = false;
}

function startGame() {
    gameState = 'playing';
    startBtn.textContent = 'Playing...';
    startBtn.disabled = true;
}

function gameOver() {
    gameState = 'gameOver';
    sounds.hit.play();
    
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('flappyBirdHighScore', highScore);
    }
    
    startBtn.textContent = 'Try Again';
    startBtn.disabled = false;
}

function jump() {
    if (gameState === 'playing') {
        bird.velocity = bird.jumpPower;
        sounds.jump.play();
    }
}

function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - 50;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomHeight: canvas.height - topHeight - pipeGap,
        scored: false
    });
}

function updateBird() {
    if (gameState !== 'playing') return;
    
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    
    // Rotation based on velocity
    bird.rotation = Math.min(Math.max(bird.velocity * 3, -30), 90);
    
    // Check boundaries
    if (bird.y <= 0 || bird.y + bird.height >= canvas.height) {
        gameOver();
    }
}

function updatePipes() {
    if (gameState !== 'playing') return;
    
    // Create new pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 150) {
        createPipe();
    }
    
    // Update existing pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;
        
        // Score when bird passes pipe
        if (!pipes[i].scored && pipes[i].x + pipeWidth < bird.x) {
            score++;
            pipes[i].scored = true;
            scoreElement.textContent = score;
            sounds.score.play();
        }
        
        // Remove off-screen pipes
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
        
        // Check collision
        if (bird.x < pipes[i].x + pipeWidth &&
            bird.x + bird.width > pipes[i].x &&
            (bird.y < pipes[i].topHeight || 
             bird.y + bird.height > canvas.height - pipes[i].bottomHeight)) {
            gameOver();
        }
    }
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
    ctx.rotate(bird.rotation * Math.PI / 180);
    
    // Bird body
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-bird.width/2, -bird.height/2, bird.width, bird.height);
    
    // Bird eye
    ctx.fillStyle = '#000';
    ctx.fillRect(bird.width/4, -bird.height/4, 3, 3);
    
    // Bird beak
    ctx.fillStyle = '#FF8C00';
    ctx.fillRect(bird.width/2, -2, 6, 4);
    
    ctx.restore();
}

function drawPipe(pipe) {
    // Pipe color
    ctx.fillStyle = '#228B22';
    
    // Top pipe
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    
    // Bottom pipe
    ctx.fillRect(pipe.x, canvas.height - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);
    
    // Pipe caps
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(pipe.x - 5, pipe.topHeight - 15, pipeWidth + 10, 15);
    ctx.fillRect(pipe.x - 5, canvas.height - pipe.bottomHeight, pipeWidth + 10, 15);
}

function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#98DDF3');
    gradient.addColorStop(1, '#DEB887');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 3; i++) {
        const x = (i * 120) + 50;
        const y = 60 + i * 20;
        drawCloud(x, y);
    }
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.arc(x + 15, y, 15, 0, Math.PI * 2);
    ctx.arc(x + 30, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawGameState() {
    if (gameState === 'menu') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Flappy Bird', canvas.width/2, canvas.height/2 - 50);
        
        ctx.font = '16px Arial';
        ctx.fillText('Click Start or press SPACE', canvas.width/2, canvas.height/2 + 20);
    } else if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 30);
        
        ctx.font = '18px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 10);
        ctx.fillText(`Best: ${highScore}`, canvas.width/2, canvas.height/2 + 35);
    }
}

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Update and draw game objects
    updateBird();
    updatePipes();
    
    drawBird();
    pipes.forEach(drawPipe);
    
    // Draw UI
    drawGameState();
    
    requestAnimationFrame(gameLoop);
}

// Event listeners
startBtn.addEventListener('click', () => {
    if (gameState === 'menu') {
        startGame();
    } else if (gameState === 'gameOver') {
        resetGame();
        startGame();
    }
});

muteBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    muteBtn.textContent = soundEnabled ? '🔊' : '🔇';
    
    // Recreate sounds with new enabled state
    sounds.jump = createSound(800, 100, 'square');
    sounds.score = createSound(1000, 200, 'sine');
    sounds.hit = createSound(200, 300, 'sawtooth');
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'menu') {
            startGame();
        } else if (gameState === 'playing') {
            jump();
        } else if (gameState === 'gameOver') {
            resetGame();
            startGame();
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameState === 'playing') {
        jump();
    }
});

// Start the game loop
gameLoop();