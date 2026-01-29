// BlackJack game
function getBlackJackHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">🃏 BlackJack</h1>
            <p class="game-description">Battez le croupier en vous approchant de 21 sans dépasser !
                <button id="bj-rules" style="background: var(--accent-blue); border: none; color: white; padding: 4px 12px; border-radius: 6px; margin-left: 10px; cursor: pointer; font-size: 14px; font-weight: 600;">
                    ? Règles
                </button>
            </p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <div style="width: 100%; max-width: 700px;">
                    <!-- Dealer -->
                    <div style="margin-bottom: 40px;">
                        <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 12px;">CROUPIER</div>
                        <div id="dealer-cards" style="display: flex; gap: 10px; min-height: 120px; align-items: center;">
                            <div class="card-placeholder"></div>
                        </div>
                        <div id="dealer-score" style="margin-top: 12px; font-size: 20px; font-weight: 700; color: var(--text-primary);">-</div>
                    </div>
                    
                    <!-- Player -->
                    <div>
                        <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 12px;">VOUS</div>
                        <div id="player-cards" style="display: flex; gap: 10px; min-height: 120px; align-items: center;">
                            <div class="card-placeholder"></div>
                        </div>
                        <div id="player-score" style="margin-top: 12px; font-size: 20px; font-weight: 700; color: var(--accent-green);">-</div>
                    </div>
                    
                    <div id="game-message" style="margin-top: 30px; text-align: center; font-size: 18px; font-weight: 600; color: var(--text-secondary); min-height: 30px;"></div>
                </div>
            </div>
            
            <div class="controls-panel">
                <div id="bj-bet-controls">
                    <div class="control-group">
                        <label class="control-label">Mise</label>
                        <input type="number" class="control-input" id="bj-bet" value="10" min="1" step="1">
                    </div>
                    
                    <button class="btn-play" id="bj-deal">Distribuer</button>
                </div>
                
                <div id="bj-game-controls" style="display: none;">
                    <button class="btn-play" id="bj-hit" style="background: linear-gradient(135deg, var(--accent-blue), #2563eb); margin-bottom: 10px;">
                        👆 Tirer une carte
                    </button>
                    <button class="btn-play" id="bj-stand" style="background: linear-gradient(135deg, var(--accent-yellow), #f59e0b);">
                        ✋ Rester
                    </button>
                </div>
            </div>
        </div>
    `;
}

let bjGameActive = false;

function initBlackJack() {
    document.getElementById('bj-deal').addEventListener('click', dealBlackJack);
    document.getElementById('bj-rules').addEventListener('click', showBlackJackRules);
}

function showBlackJackRules() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 32px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <h2 style="margin: 0 0 20px 0; font-size: 24px; color: var(--text-primary);">📖 Règles du BlackJack</h2>
            
            <div style="color: var(--text-secondary); line-height: 1.8; font-size: 15px;">
                <p><strong style="color: var(--text-primary);">Objectif :</strong> Battre le croupier en ayant un total de cartes proche de 21 sans le dépasser.</p>
                
                <p><strong style="color: var(--text-primary);">Valeurs des cartes :</strong></p>
                <ul style="margin-left: 20px;">
                    <li>Cartes 2-10 : valeur nominale</li>
                    <li>Valet, Dame, Roi : 10 points</li>
                    <li>As : 1 ou 11 points (au choix)</li>
                </ul>
                
                <p><strong style="color: var(--text-primary);">Déroulement :</strong></p>
                <ol style="margin-left: 20px;">
                    <li>Vous et le croupier recevez 2 cartes</li>
                    <li>Une carte du croupier est cachée</li>
                    <li>Vous pouvez :
                        <ul style="margin-left: 20px; margin-top: 5px;">
                            <li><strong>Tirer</strong> : prendre une carte supplémentaire</li>
                            <li><strong>Rester</strong> : conserver votre main</li>
                        </ul>
                    </li>
                    <li>Si vous dépassez 21, vous perdez (Bust)</li>
                    <li>Le croupier tire jusqu'à atteindre 17+</li>
                    <li>Le plus proche de 21 gagne !</li>
                </ol>
                
                <p><strong style="color: var(--text-primary);">Gains :</strong></p>
                <ul style="margin-left: 20px;">
                    <li>Victoire normale : x2</li>
                    <li>BlackJack (21 avec 2 cartes) : x2.5</li>
                </ul>
            </div>
            
            <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; margin-top: 20px; padding: 12px; background: var(--accent-green); border: none; border-radius: 8px; color: white; font-size: 16px; font-weight: 600; cursor: pointer;">
                Compris !
            </button>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
}

async function dealBlackJack() {
    const betInput = document.getElementById('bj-bet');
    const bet = parseFloat(betInput.value);
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/play/blackjack', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'deal', bet})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        bjGameActive = true;
        currentBalance = data.balance;
        updateBalanceDisplay();
        
        document.getElementById('bj-bet-controls').style.display = 'none';
        document.getElementById('bj-game-controls').style.display = 'block';
        
        displayBlackJackHand(data.playerHand, data.dealerHand, data.playerScore, data.dealerScore, true);
        document.getElementById('game-message').textContent = '';
        
        document.getElementById('bj-hit').onclick = () => hitBlackJack(bet);
        document.getElementById('bj-stand').onclick = () => standBlackJack(bet);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors de la distribution', 'error');
    }
}

async function hitBlackJack(bet) {
    try {
        const response = await fetch('/api/play/blackjack', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'hit'})
        });
        
        const data = await response.json();
        
        displayBlackJackHand(data.playerHand, data.dealerHand, data.playerScore, data.dealerScore, true);
        
        if (data.gameOver) {
            endBlackJack(data, bet);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function standBlackJack(bet) {
    try {
        const response = await fetch('/api/play/blackjack', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'stand'})
        });
        
        const data = await response.json();
        
        displayBlackJackHand(data.playerHand, data.dealerHand, data.playerScore, data.dealerScore, false);
        endBlackJack(data, bet);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayBlackJackHand(playerHand, dealerHand, playerScore, dealerScore, hideDealer) {
    const playerCardsDiv = document.getElementById('player-cards');
    const dealerCardsDiv = document.getElementById('dealer-cards');
    
    playerCardsDiv.innerHTML = playerHand.map(card => createCardHTML(card)).join('');
    dealerCardsDiv.innerHTML = dealerHand.map((card, i) => {
        if (hideDealer && i === 1) return createCardHTML('??');
        return createCardHTML(card);
    }).join('');
    
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('dealer-score').textContent = hideDealer ? '?' : dealerScore;
}

function createCardHTML(card) {
    const isRed = card.includes('♥') || card.includes('♦');
    return `
        <div style="width: 70px; height: 100px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: ${isRed ? '#ff4757' : '#2d3f4d'}; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            ${card}
        </div>
    `;
}

function endBlackJack(data, bet) {
    bjGameActive = false;
    
    currentBalance = data.balance;
    updateBalanceDisplay();
    loadHistory();
    
    const messageDiv = document.getElementById('game-message');
    
    if (data.result === 'win') {
        messageDiv.innerHTML = `<span style="color: var(--accent-green);">✅ Vous gagnez !</span>`;
        const profit = data.win - bet;
        showNotification(`Gagné ! +${formatMoney(profit)}`, 'success');
    } else if (data.result === 'lose') {
        messageDiv.innerHTML = `<span style="color: var(--accent-red);">❌ Vous perdez !</span>`;
        showNotification('Perdu !', 'error');
    } else {
        messageDiv.innerHTML = `<span style="color: var(--accent-yellow);">➖ Égalité !</span>`;
        showNotification('Égalité !', 'info');
    }
    
    document.getElementById('bj-game-controls').style.display = 'none';
    document.getElementById('bj-bet-controls').style.display = 'block';
}
