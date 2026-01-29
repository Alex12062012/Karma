// Roulette game
function getRouletteHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">🎰 Roulette</h1>
            <p class="game-description">Le classique des casinos ! Misez sur Rouge/Noir, Pair/Impair ou un numéro.</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 500px;">
                    <canvas id="roulette-canvas" width="400" height="400"></canvas>
                    <div id="roulette-result" style="margin-top: 20px; font-size: 48px; font-weight: 900; color: var(--accent-green);">
                        ?
                    </div>
                </div>
            </div>
            
            <div class="controls-panel">
                <div class="control-group">
                    <label class="control-label">Mise</label>
                    <input type="number" class="control-input" id="roulette-bet" value="10" min="1" step="1">
                </div>
                
                <div class="control-group">
                    <label class="control-label">Type de pari</label>
                    <select class="control-select" id="roulette-type">
                        <option value="red">Rouge (x2)</option>
                        <option value="black">Noir (x2)</option>
                        <option value="even">Pair (x2)</option>
                        <option value="odd">Impair (x2)</option>
                        <option value="low">1-18 (x2)</option>
                        <option value="high">19-36 (x2)</option>
                    </select>
                </div>
                
                <button class="btn-play" id="roulette-play">Lancer la roue</button>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                    <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                        <strong style="color: var(--text-primary);">Numéros rouges:</strong><br>
                        1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36<br><br>
                        <strong style="color: var(--text-primary);">Numéros noirs:</strong><br>
                        2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35<br><br>
                        <strong style="color: var(--text-primary);">0 = Zéro (maison gagne)</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let rouletteCanvas, rouletteCtx;
const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const blackNumbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

function initRoulette() {
    rouletteCanvas = document.getElementById('roulette-canvas');
    rouletteCtx = rouletteCanvas.getContext('2d');
    
    document.getElementById('roulette-play').addEventListener('click', playRoulette);
    drawRouletteWheel(0);
}

function drawRouletteWheel(rotation) {
    const ctx = rouletteCtx;
    const centerX = 200;
    const centerY = 200;
    const radius = 180;
    
    ctx.clearRect(0, 0, 400, 400);
    
    // Draw wheel segments
    const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    const segmentAngle = (Math.PI * 2) / numbers.length;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    for (let i = 0; i < numbers.length; i++) {
        const startAngle = i * segmentAngle;
        const endAngle = (i + 1) * segmentAngle;
        const num = numbers[i];
        
        // Color
        if (num === 0) {
            ctx.fillStyle = '#00d9a3';
        } else if (redNumbers.includes(num)) {
            ctx.fillStyle = '#ff4757';
        } else {
            ctx.fillStyle = '#2d3f4d';
        }
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#0a0a0f';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Number
        ctx.save();
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(num, radius - 30, 5);
        ctx.restore();
    }
    
    ctx.restore();
    
    // Center circle
    ctx.fillStyle = '#1a2c38';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Pointer
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 10);
    ctx.lineTo(centerX - 10, centerY - radius - 30);
    ctx.lineTo(centerX + 10, centerY - radius - 30);
    ctx.closePath();
    ctx.fill();
}

async function playRoulette() {
    if (isPlaying) return;
    
    const betInput = document.getElementById('roulette-bet');
    const typeSelect = document.getElementById('roulette-type');
    const playBtn = document.getElementById('roulette-play');
    const resultDiv = document.getElementById('roulette-result');
    
    const bet = parseFloat(betInput.value);
    const betType = typeSelect.value;
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    isPlaying = true;
    playBtn.disabled = true;
    playBtn.textContent = 'En cours...';
    resultDiv.textContent = '...';
    
    try {
        const response = await fetch('/api/play/roulette', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({bet, betType})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        // Animate wheel
        await animateRouletteWheel(data.number);
        
        // Show result
        const num = data.number;
        let color = '#00d9a3';
        if (num !== 0) {
            color = redNumbers.includes(num) ? '#ff4757' : '#2d3f4d';
        }
        
        resultDiv.textContent = num;
        resultDiv.style.color = color;
        resultDiv.style.textShadow = `0 0 20px ${color}`;
        
        currentBalance = data.balance;
        updateBalanceDisplay();
        loadHistory();
        
        if (data.won) {
            const profit = data.win - bet;
            showNotification(`Gagné ! ${num} - +${formatMoney(profit)}`, 'success');
        } else {
            showNotification(`Perdu ! ${num}`, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du jeu', 'error');
    } finally {
        isPlaying = false;
        playBtn.disabled = false;
        playBtn.textContent = 'Lancer la roue';
    }
}

async function animateRouletteWheel(finalNumber) {
    return new Promise(resolve => {
        const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
        const targetIndex = numbers.indexOf(finalNumber);
        const segmentAngle = (Math.PI * 2) / numbers.length;
        
        const totalRotations = 5;
        const targetRotation = (totalRotations * Math.PI * 2) + (targetIndex * segmentAngle);
        
        let currentRotation = 0;
        const duration = 3000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            currentRotation = targetRotation * easeProgress;
            
            drawRouletteWheel(currentRotation);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        
        animate();
    });
}
