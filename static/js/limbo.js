// Limbo game - Choose your target multiplier
function getLimboHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">🚀 Limbo</h1>
            <p class="game-description">Choisissez votre multiplicateur cible. Plus haut = Plus risqué !</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <div style="width: 100%; max-width: 600px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 500px;">
                    <div id="limbo-result" style="font-size: 120px; font-weight: 900; color: var(--accent-green); margin-bottom: 40px; text-shadow: 0 0 40px currentColor;">
                        ?
                    </div>
                    
                    <div id="limbo-message" style="font-size: 20px; color: var(--text-secondary); text-align: center;">
                        Choisissez votre cible et tentez votre chance !
                    </div>
                </div>
            </div>
            
            <div class="controls-panel">
                <div class="control-group">
                    <label class="control-label">Mise</label>
                    <input type="number" class="control-input" id="limbo-bet" value="10" min="1" step="1">
                </div>
                
                <div class="control-group">
                    <label class="control-label">Multiplicateur cible</label>
                    <input type="number" class="control-input" id="limbo-target" value="2.00" min="1.01" max="1000" step="0.01">
                </div>
                
                <div style="padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-muted); font-size: 12px;">CHANCE DE GAGNER</span>
                        <span id="limbo-chance" style="color: var(--accent-blue); font-weight: 700;">50.00%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted); font-size: 12px;">GAIN POTENTIEL</span>
                        <span id="limbo-potential" style="color: var(--accent-green); font-weight: 700;">20.00€</span>
                    </div>
                </div>
                
                <button class="btn-play" id="limbo-play">Jouer</button>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                    <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                        Le résultat est un nombre aléatoire.<br>
                        Si ≥ votre cible, vous gagnez !<br>
                        Sinon, vous perdez votre mise.
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initLimbo() {
    const targetInput = document.getElementById('limbo-target');
    const betInput = document.getElementById('limbo-bet');
    const playBtn = document.getElementById('limbo-play');
    
    targetInput.addEventListener('input', updateLimboStats);
    betInput.addEventListener('input', updateLimboStats);
    playBtn.addEventListener('click', playLimbo);
    
    updateLimboStats();
}

function updateLimboStats() {
    const target = parseFloat(document.getElementById('limbo-target').value);
    const bet = parseFloat(document.getElementById('limbo-bet').value);
    
    // Chance = 99 / target (simplified)
    const chance = Math.min(99 / target, 99);
    const potential = bet * target;
    
    document.getElementById('limbo-chance').textContent = chance.toFixed(2) + '%';
    document.getElementById('limbo-potential').textContent = formatMoney(potential);
}

async function playLimbo() {
    if (isPlaying) return;
    
    const betInput = document.getElementById('limbo-bet');
    const targetInput = document.getElementById('limbo-target');
    const playBtn = document.getElementById('limbo-play');
    const resultDiv = document.getElementById('limbo-result');
    const messageDiv = document.getElementById('limbo-message');
    
    const bet = parseFloat(betInput.value);
    const target = parseFloat(targetInput.value);
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    if (target < 1.01 || target > 1000) {
        showNotification('Cible invalide (1.01 - 1000.00)', 'error');
        return;
    }
    
    isPlaying = true;
    playBtn.disabled = true;
    playBtn.textContent = 'En cours...';
    
    // Animate counting
    let count = 0;
    const countInterval = setInterval(() => {
        const randomNum = (Math.random() * 100).toFixed(2);
        resultDiv.textContent = randomNum + 'x';
        resultDiv.style.color = 'var(--text-secondary)';
        count++;
        
        if (count >= 20) {
            clearInterval(countInterval);
        }
    }, 50);
    
    try {
        const response = await fetch('/api/play/limbo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({bet, target})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            clearInterval(countInterval);
            resultDiv.textContent = '?';
            return;
        }
        
        setTimeout(() => {
            clearInterval(countInterval);
            
            resultDiv.textContent = data.result.toFixed(2) + 'x';
            
            if (data.won) {
                resultDiv.style.color = 'var(--accent-green)';
                resultDiv.style.textShadow = '0 0 40px var(--accent-green)';
                messageDiv.textContent = `Gagné ! ${data.result.toFixed(2)}x ≥ ${target.toFixed(2)}x`;
                messageDiv.style.color = 'var(--accent-green)';
                
                const profit = data.win - bet;
                showNotification(`Gagné ${data.multiplier.toFixed(2)}x ! +${formatMoney(profit)}`, 'success');
            } else {
                resultDiv.style.color = 'var(--accent-red)';
                resultDiv.style.textShadow = '0 0 40px var(--accent-red)';
                messageDiv.textContent = `Perdu ! ${data.result.toFixed(2)}x < ${target.toFixed(2)}x`;
                messageDiv.style.color = 'var(--accent-red)';
                
                showNotification(`Perdu ! (${data.result.toFixed(2)}x)`, 'error');
            }
            
            currentBalance = data.balance;
            updateBalanceDisplay();
            loadHistory();
            
            setTimeout(() => {
                resultDiv.textContent = '?';
                resultDiv.style.color = 'var(--accent-green)';
                resultDiv.style.textShadow = '0 0 40px var(--accent-green)';
                messageDiv.textContent = 'Choisissez votre cible et tentez votre chance !';
                messageDiv.style.color = 'var(--text-secondary)';
            }, 3000);
            
        }, 1000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du jeu', 'error');
        clearInterval(countInterval);
        resultDiv.textContent = '?';
    } finally {
        isPlaying = false;
        playBtn.disabled = false;
        playBtn.textContent = 'Jouer';
    }
}
