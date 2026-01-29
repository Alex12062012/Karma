// Plinko game
function getPlinkoHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">Plinko</h1>
            <p class="game-description">Laissez tomber la balle et regardez-la rebondir à travers les piquets pour gagner !</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <canvas id="plinko-canvas" width="600" height="700"></canvas>
            </div>
            
            <div class="controls-panel">
                <div class="control-group">
                    <label class="control-label">Mise</label>
                    <input type="number" class="control-input" id="plinko-bet" value="10" min="1" step="1">
                </div>
                
                <div class="control-group">
                    <label class="control-label">Niveau de risque</label>
                    <select class="control-select" id="plinko-risk">
                        <option value="low">Faible</option>
                        <option value="medium" selected>Moyen</option>
                        <option value="high">Élevé</option>
                    </select>
                </div>
                
                <button class="btn-play" id="plinko-play">Jouer</button>
                
                <div class="multipliers-display" id="plinko-multipliers"></div>
            </div>
        </div>
    `;
}

let plinkoCanvas, plinkoCtx;
let isPlaying = false;

function initPlinko() {
    plinkoCanvas = document.getElementById('plinko-canvas');
    plinkoCtx = plinkoCanvas.getContext('2d');
    
    const playBtn = document.getElementById('plinko-play');
    const riskSelect = document.getElementById('plinko-risk');
    
    // Update multipliers display
    updatePlinkoMultipliers();
    riskSelect.addEventListener('change', updatePlinkoMultipliers);
    
    playBtn.addEventListener('click', playPlinko);
    
    drawPlinkoBoard();
}

function updatePlinkoMultipliers() {
    const risk = document.getElementById('plinko-risk').value;
    const multipliers = {
        low: [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 1.3, 1.1, 1.0, 0.9, 0.7, 0.5],
        medium: [0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0, 2.0, 1.5, 1.0, 0.7, 0.5, 0.3],
        high: [0.2, 0.3, 0.5, 1.0, 2.0, 5.0, 10.0, 5.0, 2.0, 1.0, 0.5, 0.3, 0.2]
    };
    
    const display = document.getElementById('plinko-multipliers');
    display.innerHTML = `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Multiplicateurs</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; font-weight: 600;">
                ${multipliers[risk].map(m => {
                    const color = m >= 3 ? 'var(--accent-green)' : m >= 1.5 ? 'var(--accent-blue)' : m >= 1 ? 'var(--accent-yellow)' : 'var(--accent-red)';
                    return `<span style="flex: 1; min-width: 40px; padding: 6px; background: ${color}15; color: ${color}; border: 1px solid ${color}30; border-radius: 4px; text-align: center;">${m}x</span>`;
                }).join('')}
            </div>
        </div>
    `;
}

function drawPlinkoBoard() {
    const width = plinkoCanvas.width;
    const height = plinkoCanvas.height;
    
    plinkoCtx.clearRect(0, 0, width, height);
    
    // Background
    plinkoCtx.fillStyle = '#0f1923';
    plinkoCtx.fillRect(0, 0, width, height);
    
    // Draw pegs (16 rows) - PYRAMID SHAPE avec espacement pour la balle
    const rows = 16;
    const startY = 80;
    const rowSpacing = 35;
    const pegRadius = 5;
    const ballRadius = 10; // Rayon de la balle
    const minPegSpacing = ballRadius * 3; // Espacement minimum entre piquets
    const maxWidth = 500;
    
    for (let row = 0; row < rows; row++) {
        const pegsInRow = row + 3;
        const y = startY + row * rowSpacing;
        
        // Center the pegs and create pyramid shape
        const rowWidth = (maxWidth / rows) * (row + 1);
        const spacing = Math.max(rowWidth / (pegsInRow - 1), minPegSpacing);
        const actualRowWidth = spacing * (pegsInRow - 1);
        const startX = (width - actualRowWidth) / 2;
        
        for (let i = 0; i < pegsInRow; i++) {
            const x = startX + spacing * i;
            
            // Peg glow
            const gradient = plinkoCtx.createRadialGradient(x, y, 0, x, y, pegRadius * 3);
            gradient.addColorStop(0, 'rgba(0, 217, 163, 0.4)');
            gradient.addColorStop(1, 'rgba(0, 217, 163, 0)');
            plinkoCtx.fillStyle = gradient;
            plinkoCtx.beginPath();
            plinkoCtx.arc(x, y, pegRadius * 3, 0, Math.PI * 2);
            plinkoCtx.fill();
            
            // Peg with shadow
            plinkoCtx.shadowColor = 'rgba(0, 217, 163, 0.5)';
            plinkoCtx.shadowBlur = 10;
            plinkoCtx.fillStyle = '#00d9a3';
            plinkoCtx.beginPath();
            plinkoCtx.arc(x, y, pegRadius, 0, Math.PI * 2);
            plinkoCtx.fill();
            plinkoCtx.shadowBlur = 0;
        }
    }
    
    // Draw buckets at bottom
    const buckets = 13;
    const bucketWidth = width / buckets;
    const bucketHeight = 50;
    const bucketY = height - bucketHeight - 10;
    
    for (let i = 0; i < buckets; i++) {
        const x = i * bucketWidth;
        
        plinkoCtx.strokeStyle = '#2d3f4d';
        plinkoCtx.lineWidth = 2;
        plinkoCtx.strokeRect(x, bucketY, bucketWidth, bucketHeight);
    }
}

async function playPlinko() {
    if (isPlaying) return;
    
    const betInput = document.getElementById('plinko-bet');
    const riskSelect = document.getElementById('plinko-risk');
    const playBtn = document.getElementById('plinko-play');
    
    const bet = parseFloat(betInput.value);
    const risk = riskSelect.value;
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    isPlaying = true;
    playBtn.disabled = true;
    playBtn.textContent = 'En cours...';
    
    try {
        const response = await fetch('/api/play/plinko', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({bet, risk})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        // Animate ball drop
        await animatePlinko(data.path, data.multiplier);
        
        // Update balance
        currentBalance = data.balance;
        updateBalanceDisplay();
        loadHistory();
        
        const profit = data.win - bet;
        if (profit > 0) {
            showNotification(`Gagné ! +${formatMoney(profit)}`, 'success');
        } else {
            showNotification(`Perdu ${formatMoney(bet)}`, 'error');
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

async function animatePlinko(path, multiplier) {
    return new Promise(resolve => {
        drawPlinkoBoard();
        
        const width = plinkoCanvas.width;
        const height = plinkoCanvas.height;
        const ballRadius = 10;
        const rows = 16;
        const startY = 60;
        const rowSpacing = 35;
        const maxWidth = 500;
        const minPegSpacing = ballRadius * 3;
        
        let currentRow = 0;
        let ball = {
            x: width / 2,
            y: startY
        };
        
        const animateToRow = () => {
            if (currentRow >= rows) {
                // Animation vers le bucket final
                const buckets = 13;
                const bucketWidth = width / buckets;
                const finalPosition = path[path.length - 1];
                const finalX = (finalPosition + 0.5) * bucketWidth;
                const bucketY = height - 60;
                
                let step = 0;
                const steps = 30;
                const startX = ball.x;
                const startY = ball.y;
                
                const moveToFinal = () => {
                    step++;
                    const progress = step / steps;
                    const easeProgress = 1 - Math.pow(1 - progress, 2);
                    
                    ball.x = startX + (finalX - startX) * easeProgress;
                    ball.y = startY + (bucketY - startY) * easeProgress;
                    
                    drawPlinkoBoard();
                    drawBall(ball.x, ball.y);
                    
                    if (step < steps) {
                        requestAnimationFrame(moveToFinal);
                    } else {
                        // Flash du bucket
                        let flashCount = 0;
                        const flash = setInterval(() => {
                            drawPlinkoBoard();
                            
                            if (flashCount % 2 === 0) {
                                plinkoCtx.fillStyle = 'rgba(251, 191, 36, 0.4)';
                                plinkoCtx.fillRect(finalPosition * bucketWidth, height - 60, bucketWidth, 50);
                            }
                            
                            plinkoCtx.fillStyle = '#fbbf24';
                            plinkoCtx.font = 'bold 28px Inter';
                            plinkoCtx.textAlign = 'center';
                            plinkoCtx.shadowColor = '#fbbf24';
                            plinkoCtx.shadowBlur = 10;
                            plinkoCtx.fillText(`${multiplier}x`, finalX, height - 28);
                            plinkoCtx.shadowBlur = 0;
                            
                            flashCount++;
                            if (flashCount >= 6) {
                                clearInterval(flash);
                                drawPlinkoBoard();
                                resolve();
                            }
                        }, 150);
                    }
                };
                
                moveToFinal();
                return;
            }
            
            // Calculer position cible pour cette rangée
            const pegsInRow = currentRow + 3;
            const rowWidth = (maxWidth / rows) * (currentRow + 1);
            const spacing = Math.max(rowWidth / (pegsInRow - 1), minPegSpacing);
            const actualRowWidth = spacing * (pegsInRow - 1);
            const startX = (width - actualRowWidth) / 2;
            
            const pegIndex = path[currentRow];
            const targetX = startX + spacing * pegIndex;
            const targetY = startY + currentRow * rowSpacing;
            
            // Animer vers le piquet
            let step = 0;
            const steps = 15;
            const startBallX = ball.x;
            const startBallY = ball.y;
            
            const moveToTarget = () => {
                step++;
                const progress = step / steps;
                const easeProgress = 1 - Math.pow(1 - progress, 2);
                
                ball.x = startBallX + (targetX - startBallX) * easeProgress;
                ball.y = startBallY + (targetY - startBallY) * easeProgress;
                
                drawPlinkoBoard();
                drawBall(ball.x, ball.y);
                
                if (step < steps) {
                    requestAnimationFrame(moveToTarget);
                } else {
                    currentRow++;
                    setTimeout(animateToRow, 50);
                }
            };
            
            moveToTarget();
        };
        
        animateToRow();
    });
}

function drawBall(x, y) {
    const ballRadius = 10;
    
    // Ball glow
    const gradient = plinkoCtx.createRadialGradient(x, y, 0, x, y, ballRadius * 2);
    gradient.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
    gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
    plinkoCtx.fillStyle = gradient;
    plinkoCtx.beginPath();
    plinkoCtx.arc(x, y, ballRadius * 2, 0, Math.PI * 2);
    plinkoCtx.fill();
    
    // Ball avec ombre
    plinkoCtx.shadowColor = 'rgba(251, 191, 36, 0.8)';
    plinkoCtx.shadowBlur = 15;
    plinkoCtx.fillStyle = '#fbbf24';
    plinkoCtx.beginPath();
    plinkoCtx.arc(x, y, ballRadius, 0, Math.PI * 2);
    plinkoCtx.fill();
    plinkoCtx.shadowBlur = 0;
}
