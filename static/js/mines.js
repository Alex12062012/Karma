// Mines game
function getMinesHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">Mines</h1>
            <p class="game-description">Révélez les cases sûres et évitez les mines pour gagner !</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <div style="width: 100%; max-width: 550px;">
                    <div id="mines-stats" style="display: none; margin-bottom: 24px; padding: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Multiplicateur actuel</div>
                                <div id="mines-current-multiplier" style="font-size: 32px; font-weight: 900; color: var(--accent-green);">1.00x</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Gain potentiel</div>
                                <div id="mines-potential-win" style="font-size: 24px; font-weight: 700; color: var(--accent-blue);">0.00€</div>
                            </div>
                            <button id="mines-cashout" class="btn-play" style="width: auto; padding: 12px 24px; font-size: 14px;">
                                Encaisser
                            </button>
                        </div>
                    </div>
                    
                    <div id="mines-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 550px; margin: 0 auto;">
                        <!-- Grid will be generated here -->
                    </div>
                </div>
            </div>
            
            <div class="controls-panel">
                <div id="mines-start-controls">
                    <div class="control-group">
                        <label class="control-label">Mise</label>
                        <input type="number" class="control-input" id="mines-bet" value="10" min="1" step="1">
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label">Nombre de mines</label>
                        <select class="control-select" id="mines-count">
                            <option value="1">1 Mine</option>
                            <option value="3" selected>3 Mines</option>
                            <option value="5">5 Mines</option>
                            <option value="10">10 Mines</option>
                            <option value="15">15 Mines</option>
                        </select>
                    </div>
                    
                    <button class="btn-play" id="mines-start">Démarrer</button>
                    
                    <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Grille 5x5 (25 cases)</div>
                        <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                            Plus vous révélez de cases sûres, plus le multiplicateur augmente. Encaissez avant de toucher une mine !
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let minesGameActive = false;
let minesRevealed = [];

function initMines() {
    generateMinesGrid();
    
    document.getElementById('mines-start').addEventListener('click', startMinesGame);
}

function generateMinesGrid() {
    const grid = document.getElementById('mines-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
        const tile = document.createElement('div');
        tile.className = 'mines-tile';
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
            position: relative;
            overflow: hidden;
        `;
        
        tile.addEventListener('click', () => revealMinesTile(i));
        tile.addEventListener('mouseenter', () => {
            if (!minesGameActive) return;
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

async function startMinesGame() {
    const betInput = document.getElementById('mines-bet');
    const minesCount = document.getElementById('mines-count').value;
    const startBtn = document.getElementById('mines-start');
    
    const bet = parseFloat(betInput.value);
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    startBtn.disabled = true;
    
    try {
        const response = await fetch('/api/play/mines', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'start', bet, mines: parseInt(minesCount)})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            startBtn.disabled = false;
            return;
        }
        
        minesGameActive = true;
        minesRevealed = [];
        
        // Update UI
        currentBalance = data.balance;
        updateBalanceDisplay();
        
        document.getElementById('mines-start-controls').style.display = 'none';
        document.getElementById('mines-stats').style.display = 'block';
        
        // Reset grid
        generateMinesGrid();
        
        updateMinesStats(1.0, bet);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du démarrage', 'error');
        startBtn.disabled = false;
    }
}

async function revealMinesTile(position) {
    if (!minesGameActive || minesRevealed.includes(position)) return;
    
    try {
        const response = await fetch('/api/play/mines', {
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
            // Hit a mine
            tile.innerHTML = '💣';
            tile.style.background = 'var(--accent-red)';
            tile.style.borderColor = 'var(--accent-red)';
            tile.classList.add('revealed');
            
            // Reveal all mines
            setTimeout(() => {
                data.mines.forEach(minePos => {
                    const mineTile = document.querySelector(`[data-position="${minePos}"]`);
                    if (mineTile && minePos !== position) {
                        mineTile.innerHTML = '💣';
                        mineTile.style.background = 'rgba(255, 71, 87, 0.3)';
                        mineTile.style.borderColor = 'var(--accent-red)';
                    }
                });
                
                setTimeout(() => {
                    endMinesGame();
                    showNotification('Mine touchée !', 'error');
                }, 1000);
            }, 500);
            
        } else {
            // Safe tile
            tile.innerHTML = '💎';
            tile.style.background = 'var(--accent-green)';
            tile.style.borderColor = 'var(--accent-green)';
            tile.classList.add('revealed');
            tile.style.animation = 'pulse 0.3s ease';
            
            minesRevealed.push(position);
            
            const betInput = document.getElementById('mines-bet');
            const bet = parseFloat(betInput.value);
            updateMinesStats(data.multiplier, bet);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors de la révélation', 'error');
    }
}

function updateMinesStats(multiplier, bet) {
    document.getElementById('mines-current-multiplier').textContent = multiplier.toFixed(2) + 'x';
    document.getElementById('mines-potential-win').textContent = formatMoney(bet * multiplier);
    
    const cashoutBtn = document.getElementById('mines-cashout');
    cashoutBtn.onclick = cashoutMines;
}

async function cashoutMines() {
    if (!minesGameActive) return;
    
    try {
        const response = await fetch('/api/play/mines', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'cashout'})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        // Reveal all mines
        data.mines.forEach(minePos => {
            const mineTile = document.querySelector(`[data-position="${minePos}"]`);
            if (mineTile && !minesRevealed.includes(minePos)) {
                mineTile.innerHTML = '💣';
                mineTile.style.background = 'rgba(255, 71, 87, 0.2)';
                mineTile.style.borderColor = 'rgba(255, 71, 87, 0.3)';
            }
        });
        
        setTimeout(() => {
            currentBalance = data.balance;
            updateBalanceDisplay();
            loadHistory();
            
            endMinesGame();
            
            const betInput = document.getElementById('mines-bet');
            const profit = data.win - parseFloat(betInput.value);
            showNotification(`Encaissé ${data.multiplier.toFixed(2)}x ! +${formatMoney(profit)}`, 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors de l\'encaissement', 'error');
    }
}

function endMinesGame() {
    minesGameActive = false;
    minesRevealed = [];
    
    document.getElementById('mines-start-controls').style.display = 'block';
    document.getElementById('mines-stats').style.display = 'none';
    document.getElementById('mines-start').disabled = false;
    
    setTimeout(() => {
        generateMinesGrid();
    }, 2000);
}
