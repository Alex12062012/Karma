// Crash game
function getCrashHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">Crash</h1>
            <p class="game-description">Encaissez avant que le multiplicateur ne crash !</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <canvas id="crash-canvas" width="700" height="500"></canvas>
            </div>
            
            <div class="controls-panel">
                <div class="control-group">
                    <label class="control-label">Mise</label>
                    <input type="number" class="control-input" id="crash-bet" value="10" min="1" step="1">
                </div>
                
                <div class="control-group">
                    <label class="control-label">Encaissement automatique à</label>
                    <input type="number" class="control-input" id="crash-autocashout" value="2.00" min="1.01" step="0.01">
                </div>
                
                <button class="btn-play" id="crash-play">Jouer</button>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Derniers crashs</div>
                    <div id="crash-history" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
                </div>
            </div>
        </div>
    `;
}

let crashCanvas, crashCtx;
let crashHistory = [];

function initCrash() {
    crashCanvas = document.getElementById('crash-canvas');
    crashCtx = crashCanvas.getContext('2d');
    
    const playBtn = document.getElementById('crash-play');
    playBtn.addEventListener('click', playCrash);
    
    drawCrashBoard();
    generateCrashHistory();
}

function generateCrashHistory() {
    crashHistory = [];
    for (let i = 0; i < 10; i++) {
        const crash = (1.0 + Math.random() * 9).toFixed(2);
        crashHistory.push(parseFloat(crash));
    }
    updateCrashHistory();
}

function updateCrashHistory() {
    const historyDiv = document.getElementById('crash-history');
    historyDiv.innerHTML = crashHistory.slice(-10).reverse().map(crash => {
        const color = crash >= 5 ? 'var(--accent-green)' : crash >= 2 ? 'var(--accent-blue)' : 'var(--accent-red)';
        return `<span style="padding: 6px 10px; background: ${color}20; color: ${color}; border: 1px solid ${color}40; border-radius: 6px; font-weight: 700; font-size: 12px;">${crash}x</span>`;
    }).join('');
}

function drawCrashBoard(currentMultiplier = 1.00) {
    const width = crashCanvas.width;
    const height = crashCanvas.height;
    
    crashCtx.clearRect(0, 0, width, height);
    
    // Background
    crashCtx.fillStyle = '#0f1923';
    crashCtx.fillRect(0, 0, width, height);
    
    // Grid
    crashCtx.strokeStyle = '#1a2c38';
    crashCtx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        const y = height - (i * height / 10);
        crashCtx.beginPath();
        crashCtx.moveTo(0, y);
        crashCtx.lineTo(width, y);
        crashCtx.stroke();
    }
    
    for (let i = 0; i <= 10; i++) {
        const x = i * width / 10;
        crashCtx.beginPath();
        crashCtx.moveTo(x, 0);
        crashCtx.lineTo(x, height);
        crashCtx.stroke();
    }
    
    // Display current multiplier
    crashCtx.fillStyle = '#ffffff';
    crashCtx.font = 'bold 64px Inter';
    crashCtx.textAlign = 'center';
    crashCtx.fillText(`${currentMultiplier.toFixed(2)}x`, width / 2, height / 2);
}

async function playCrash() {
    if (isPlaying) return;
    
    const betInput = document.getElementById('crash-bet');
    const autocashoutInput = document.getElementById('crash-autocashout');
    const playBtn = document.getElementById('crash-play');
    
    const bet = parseFloat(betInput.value);
    const autoCashout = parseFloat(autocashoutInput.value);
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    isPlaying = true;
    playBtn.disabled = true;
    playBtn.textContent = 'En cours...';
    
    try {
        const response = await fetch('/api/play/crash', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({bet, autoCashout})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        // Animate crash
        await animateCrash(data.path, data.crashPoint, data.won, data.multiplier);
        
        // Update history
        crashHistory.push(data.crashPoint);
        updateCrashHistory();
        
        // Update balance
        currentBalance = data.balance;
        updateBalanceDisplay();
        loadHistory();
        
        if (data.won) {
            const profit = data.win - bet;
            showNotification(`Encaissé à ${data.multiplier.toFixed(2)}x ! +${formatMoney(profit)}`, 'success');
        } else {
            showNotification(`Crashed à ${data.crashPoint.toFixed(2)}x !`, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du jeu', 'error');
    } finally {
        isPlaying = false;
        playBtn.disabled = false;
        playBtn.textContent = 'Jouer';
    }
}

async function animateCrash(path, crashPoint, won, cashedOut) {
    return new Promise(resolve => {
        const width = crashCanvas.width;
        const height = crashCanvas.height;
        const padding = 50;
        
        let currentIndex = 0;
        const maxMultiplier = Math.max(...path, 10);
        
        const animate = () => {
            if (currentIndex >= path.length) {
                // Show crash effect
                for (let flash = 0; flash < 3; flash++) {
                    setTimeout(() => {
                        crashCtx.fillStyle = won ? 'rgba(0, 217, 163, 0.3)' : 'rgba(255, 71, 87, 0.3)';
                        crashCtx.fillRect(0, 0, width, height);
                        
                        crashCtx.fillStyle = won ? '#00d9a3' : '#ff4757';
                        crashCtx.font = 'bold 72px Inter';
                        crashCtx.textAlign = 'center';
                        crashCtx.fillText(won ? `${cashedOut.toFixed(2)}x` : 'CRASHED!', width / 2, height / 2);
                        crashCtx.font = 'bold 36px Inter';
                        crashCtx.fillText(`${crashPoint.toFixed(2)}x`, width / 2, height / 2 + 60);
                        
                        setTimeout(() => drawCrashBoard(crashPoint), 100);
                    }, flash * 200);
                }
                
                setTimeout(resolve, 1000);
                return;
            }
            
            const currentMultiplier = path[currentIndex];
            
            crashCtx.clearRect(0, 0, width, height);
            crashCtx.fillStyle = '#0f1923';
            crashCtx.fillRect(0, 0, width, height);
            
            // Grid
            crashCtx.strokeStyle = '#1a2c38';
            crashCtx.lineWidth = 1;
            for (let i = 0; i <= 10; i++) {
                const y = height - (i * height / 10);
                crashCtx.beginPath();
                crashCtx.moveTo(0, y);
                crashCtx.lineTo(width, y);
                crashCtx.stroke();
            }
            
            // Draw graph
            crashCtx.strokeStyle = '#00d9a3';
            crashCtx.lineWidth = 3;
            crashCtx.beginPath();
            
            for (let i = 0; i <= currentIndex; i++) {
                const x = padding + (i / path.length) * (width - padding * 2);
                const y = height - padding - ((path[i] - 1) / (maxMultiplier - 1)) * (height - padding * 2);
                
                if (i === 0) {
                    crashCtx.moveTo(x, y);
                } else {
                    crashCtx.lineTo(x, y);
                }
            }
            crashCtx.stroke();
            
            // Glow effect
            crashCtx.shadowColor = '#00d9a3';
            crashCtx.shadowBlur = 20;
            crashCtx.stroke();
            crashCtx.shadowBlur = 0;
            
            // Display multiplier
            crashCtx.fillStyle = '#ffffff';
            crashCtx.font = 'bold 64px Inter';
            crashCtx.textAlign = 'center';
            crashCtx.fillText(`${currentMultiplier.toFixed(2)}x`, width / 2, 80);
            
            currentIndex++;
            setTimeout(() => requestAnimationFrame(animate), 30);
        };
        
        animate();
    });
}
