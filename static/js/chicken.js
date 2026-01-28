// Chicken game - Find bones (safe), avoid foxes (danger)
function getChickenHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">🐔 Chicken</h1>
            <p class="game-description">Trouvez les os sans tomber sur les renards !</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <div style="width: 100%; max-width: 550px;">
                    <div id="chicken-stats" style="display: none; margin-bottom: 24px; padding: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Multiplicateur</div>
                                <div id="chicken-multiplier" style="font-size: 32px; font-weight: 900; color: var(--accent-green);">1.00x</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Gain potentiel</div>
                                <div id="chicken-win" style="font-size: 24px; font-weight: 700; color: var(--accent-blue);">0.00€</div>
                            </div>
                            <button id="chicken-cashout" class="btn-play" style="width: auto; padding: 12px 24px; font-size: 14px;">
                                Encaisser
                            </button>
                        </div>
                    </div>
                    
                    <div id="chicken-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                        <!-- Grid will be generated here -->
                    </div>
                </div>
            </div>
            
            <div class="controls-panel">
                <div id="chicken-controls">
                    <div class="control-group">
                        <label class="control-label">Mise</label>
                        <input type="number" class="control-input" id="chicken-bet" value="10" min="1" step="1">
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label">Renards</label>
                        <select class="control-select" id="chicken-foxes">
                            <option value="2">2 Renards (facile)</option>
                            <option value="4" selected>4 Renards (moyen)</option>
                            <option value="6">6 Renards (difficile)</option>
                            <option value="8">8 Renards (extrême)</option>
                        </select>
                    </div>
                    
                    <button class="btn-play" id="chicken-start">Démarrer</button>
                    
                    <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                            🦴 Trouvez les os<br>
                            🦊 Évitez les renards<br>
                            Encaissez quand vous voulez !
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let chickenActive = false;
let chickenRevealed = [];

function initChicken() {
    generateChickenGrid();
    document.getElementById('chicken-start').addEventListener('click', startChickenGame);
}

function generateChickenGrid() {
    const grid = document.getElementById('chicken-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
        const tile = document.createElement('div');
        tile.className = 'chicken-tile';
        tile.dataset.position = i;
        tile.style.cssText = `
            aspect-ratio: 1;
            background: var(--bg-secondary);
            border: 2px solid var(--border-color);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            transition: all 0.2s ease;
        `;
        
        tile.addEventListener('click', () => revealChickenTile(i));
        tile.addEventListener('mouseenter', () => {
            if (!chickenActive) return;
            tile.style.background = 'var(--bg-tertiary)';
            tile.style.transform = 'scale(1.05)';
        });
        tile.addEventListener('mouseleave', () => {
            if (!tile.classList.contains('revealed')) {
                tile.style.background = 'var(--bg-secondary)';
                tile.style.transform = 'scale(1)';
            }
        });
        
        grid.appendChild(tile);
    }
}

async function startChickenGame() {
    const betInput = document.getElementById('chicken-bet');
    const foxes = document.getElementById('chicken-foxes').value;
    
    const bet = parseFloat(betInput.value);
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/play/chicken', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'start', bet, foxes: parseInt(foxes)})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        chickenActive = true;
        chickenRevealed = [];
        
        currentBalance = data.balance;
        updateBalanceDisplay();
        
        document.getElementById('chicken-controls').style.display = 'none';
        document.getElementById('chicken-stats').style.display = 'block';
        
        generateChickenGrid();
        updateChickenStats(1.0, bet);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du démarrage', 'error');
    }
}

async function revealChickenTile(position) {
    if (!chickenActive || chickenRevealed.includes(position)) return;
    
    try {
        const response = await fetch('/api/play/chicken', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'reveal', position})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        const tile = document.querySelector(`[data-position="${position}"]`);
        
        if (data.hit) {
            // Hit a fox - game over
            tile.innerHTML = '🦊';
            tile.style.background = 'var(--accent-red)';
            tile.style.borderColor = 'var(--accent-red)';
            tile.classList.add('revealed');
            
            setTimeout(() => {
                data.foxes.forEach(pos => {
                    const foxTile = document.querySelector(`[data-position="${pos}"]`);
                    if (foxTile && pos !== position) {
                        foxTile.innerHTML = '🦊';
                        foxTile.style.background = 'rgba(255, 71, 87, 0.3)';
                        foxTile.style.borderColor = 'var(--accent-red)';
                    }
                });
                
                setTimeout(() => {
                    endChickenGame();
                    showNotification('Renard attrapé !', 'error');
                }, 1000);
            }, 500);
            
        } else {
            // Safe tile - found bone
            tile.innerHTML = '🦴';
            tile.style.background = 'var(--accent-green)';
            tile.style.borderColor = 'var(--accent-green)';
            tile.classList.add('revealed');
            tile.style.animation = 'pulse 0.3s ease';
            
            chickenRevealed.push(position);
            
            const betInput = document.getElementById('chicken-bet');
            const bet = parseFloat(betInput.value);
            updateChickenStats(data.multiplier, bet);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors de la révélation', 'error');
    }
}

function updateChickenStats(multiplier, bet) {
    document.getElementById('chicken-multiplier').textContent = multiplier.toFixed(2) + 'x';
    document.getElementById('chicken-win').textContent = formatMoney(bet * multiplier);
    
    const cashoutBtn = document.getElementById('chicken-cashout');
    cashoutBtn.onclick = cashoutChicken;
}

async function cashoutChicken() {
    if (!chickenActive) return;
    
    try {
        const response = await fetch('/api/play/chicken', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'cashout'})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        data.foxes.forEach(pos => {
            const foxTile = document.querySelector(`[data-position="${pos}"]`);
            if (foxTile && !chickenRevealed.includes(pos)) {
                foxTile.innerHTML = '🦊';
                foxTile.style.background = 'rgba(255, 71, 87, 0.2)';
                foxTile.style.borderColor = 'rgba(255, 71, 87, 0.3)';
            }
        });
        
        setTimeout(() => {
            currentBalance = data.balance;
            updateBalanceDisplay();
            loadHistory();
            
            endChickenGame();
            
            const betInput = document.getElementById('chicken-bet');
            const profit = data.win - parseFloat(betInput.value);
            showNotification(`Encaissé ${data.multiplier.toFixed(2)}x ! +${formatMoney(profit)}`, 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors de l\'encaissement', 'error');
    }
}

function endChickenGame() {
    chickenActive = false;
    chickenRevealed = [];
    
    document.getElementById('chicken-controls').style.display = 'block';
    document.getElementById('chicken-stats').style.display = 'none';
    
    setTimeout(() => {
        generateChickenGrid();
    }, 2000);
}
