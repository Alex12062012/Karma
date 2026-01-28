// Dice game
function getDiceHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">Dice</h1>
            <p class="game-description">Choisissez un nombre et prédisez si le résultat sera au-dessus ou en-dessous !</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <div style="width: 100%; max-width: 500px;">
                    <div style="position: relative; height: 300px; display: flex; align-items: center; justify-content: center; margin-bottom: 40px;">
                        <div id="dice-result" style="font-size: 120px; font-weight: 900; color: var(--accent-green); text-shadow: 0 0 40px var(--accent-green);">?</div>
                    </div>
                    
                    <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                            <span style="color: var(--text-secondary);">Cible</span>
                            <span id="dice-target-display" style="font-weight: 700; font-size: 20px;">50.00</span>
                        </div>
                        
                        <input type="range" id="dice-target" min="1" max="99" value="50" step="0.01" 
                            style="width: 100%; height: 8px; border-radius: 4px; background: linear-gradient(to right, var(--accent-green) 0%, var(--accent-red) 100%); cursor: pointer; -webkit-appearance: none; appearance: none;">
                        
                        <div style="display: flex; justify-content: space-between; margin-top: 24px; gap: 12px;">
                            <div style="flex: 1; padding: 16px; background: var(--bg-primary); border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Chance de gagner</div>
                                <div id="dice-winchance" style="font-size: 24px; font-weight: 700; color: var(--accent-blue);">50%</div>
                            </div>
                            <div style="flex: 1; padding: 16px; background: var(--bg-primary); border-radius: 8px; text-align: center;">
                                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Multiplicateur</div>
                                <div id="dice-multiplier" style="font-size: 24px; font-weight: 700; color: var(--accent-green);">2.00x</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="controls-panel">
                <div class="control-group">
                    <label class="control-label">Mise</label>
                    <input type="number" class="control-input" id="dice-bet" value="10" min="1" step="1">
                </div>
                
                <div class="control-group">
                    <label class="control-label">Prédiction</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="dice-prediction-btn active" data-over="false" style="padding: 12px; background: var(--accent-red); border: 2px solid var(--accent-red); border-radius: 8px; color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            Roll Under
                        </button>
                        <button class="dice-prediction-btn" data-over="true" style="padding: 12px; background: transparent; border: 2px solid var(--border-color); border-radius: 8px; color: var(--text-secondary); font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            Roll Over
                        </button>
                    </div>
                </div>
                
                <button class="btn-play" id="dice-play">Jouer</button>
            </div>
        </div>
    `;
}

let diceOver = false;

function initDice() {
    const targetInput = document.getElementById('dice-target');
    const targetDisplay = document.getElementById('dice-target-display');
    const playBtn = document.getElementById('dice-play');
    
    // Prediction buttons
    document.querySelectorAll('.dice-prediction-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dice-prediction-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.borderColor = 'var(--border-color)';
                b.style.color = 'var(--text-secondary)';
            });
            
            const isOver = btn.dataset.over === 'true';
            diceOver = isOver;
            
            btn.style.background = isOver ? 'var(--accent-green)' : 'var(--accent-red)';
            btn.style.borderColor = isOver ? 'var(--accent-green)' : 'var(--accent-red)';
            btn.style.color = 'white';
            
            updateDiceStats();
        });
    });
    
    targetInput.addEventListener('input', (e) => {
        targetDisplay.textContent = parseFloat(e.target.value).toFixed(2);
        updateDiceStats();
    });
    
    playBtn.addEventListener('click', playDice);
    
    updateDiceStats();
}

function updateDiceStats() {
    const target = parseFloat(document.getElementById('dice-target').value);
    // When diceOver is true (Roll Over): win if roll > target
    // When diceOver is false (Roll Under): win if roll < target
    // So moving right = higher target = harder to roll over = lower win chance
    const winChance = diceOver ? (100 - target) : target;
    const multiplier = winChance > 0 ? (98 / winChance) : 0;
    
    document.getElementById('dice-winchance').textContent = winChance.toFixed(2) + '%';
    document.getElementById('dice-multiplier').textContent = multiplier.toFixed(2) + 'x';
}

async function playDice() {
    if (isPlaying) return;
    
    const betInput = document.getElementById('dice-bet');
    const targetInput = document.getElementById('dice-target');
    const playBtn = document.getElementById('dice-play');
    const resultDiv = document.getElementById('dice-result');
    
    const bet = parseFloat(betInput.value);
    const target = parseFloat(targetInput.value);
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    isPlaying = true;
    playBtn.disabled = true;
    playBtn.textContent = 'En cours...';
    
    try {
        const response = await fetch('/api/play/dice', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({bet, target, over: diceOver})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        // Animate roll
        await animateDiceRoll(data.roll, data.won);
        
        // Update balance
        currentBalance = data.balance;
        updateBalanceDisplay();
        loadHistory();
        
        if (data.won) {
            const profit = data.win - bet;
            showNotification(`Gagné ${data.multiplier}x ! +${formatMoney(profit)}`, 'success');
        } else {
            showNotification(`Perdu ! (${data.roll.toFixed(2)})`, 'error');
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

async function animateDiceRoll(finalRoll, won) {
    return new Promise(resolve => {
        const resultDiv = document.getElementById('dice-result');
        let iterations = 0;
        const maxIterations = 30;
        
        const animate = setInterval(() => {
            const randomRoll = (Math.random() * 100).toFixed(2);
            resultDiv.textContent = randomRoll;
            resultDiv.style.color = 'var(--text-secondary)';
            resultDiv.style.textShadow = 'none';
            
            iterations++;
            
            if (iterations >= maxIterations) {
                clearInterval(animate);
                
                // Show final result
                resultDiv.textContent = finalRoll.toFixed(2);
                resultDiv.style.color = won ? 'var(--accent-green)' : 'var(--accent-red)';
                resultDiv.style.textShadow = `0 0 40px ${won ? 'var(--accent-green)' : 'var(--accent-red)'}`;
                resultDiv.style.transform = 'scale(1.2)';
                
                setTimeout(() => {
                    resultDiv.style.transform = 'scale(1)';
                    resolve();
                }, 500);
            }
        }, 50);
    });
}
