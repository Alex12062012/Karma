// Pump game - Click to cash out before the balloon pops!
function getPumpHTML() {
    return `
        <div class="game-header">
            <h1 class="game-title">💰 Pump</h1>
            <p class="game-description">Gonflez le ballon et encaissez avant qu'il n'explose !</p>
        </div>
        
        <div class="game-content">
            <div class="game-area">
                <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 500px;">
                    <div id="pump-balloon" style="position: relative; transition: all 0.3s ease;">
                        <svg width="200" height="200" viewBox="0 0 200 200" id="balloon-svg">
                            <defs>
                                <linearGradient id="balloon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:#00d9a3;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#00b386;stop-opacity:1" />
                                </linearGradient>
                            </defs>
                            <ellipse cx="100" cy="100" rx="60" ry="80" fill="url(#balloon-gradient)" opacity="0.8"/>
                            <path d="M100 180 Q100 185 105 190 L95 190 Q100 185 100 180" fill="#888"/>
                        </svg>
                        <div id="pump-multiplier" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; font-weight: 900; color: white; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                            1.00x
                        </div>
                    </div>
                    
                    <div id="pump-message" style="margin-top: 40px; font-size: 18px; color: var(--text-secondary); text-align: center;">
                        Placez votre mise pour commencer
                    </div>
                </div>
            </div>
            
            <div class="controls-panel">
                <div id="pump-controls">
                    <div class="control-group">
                        <label class="control-label">Mise</label>
                        <input type="number" class="control-input" id="pump-bet" value="10" min="1" step="1">
                    </div>
                    
                    <button class="btn-play" id="pump-start">Démarrer</button>
                    <button class="btn-play" id="pump-cashout" style="display: none; background: linear-gradient(135deg, var(--accent-yellow), #f59e0b);">
                        💰 Encaisser
                    </button>
                    
                    <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                            Le ballon gonfle automatiquement !<br>
                            Plus il gonfle, plus vous gagnez.<br>
                            Mais attention... il peut exploser ! 💥
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let pumpActive = false;
let pumpInterval = null;
let pumpMultiplier = 1.0;
let pumpMaxMultiplier = 1.0;

function initPump() {
    document.getElementById('pump-start').addEventListener('click', startPump);
}

async function startPump() {
    const betInput = document.getElementById('pump-bet');
    const bet = parseFloat(betInput.value);
    
    if (bet > currentBalance) {
        showNotification('Solde insuffisant', 'error');
        return;
    }
    
    document.getElementById('pump-start').style.display = 'none';
    document.getElementById('pump-cashout').style.display = 'block';
    document.getElementById('pump-bet').disabled = true;
    
    try {
        const response = await fetch('/api/play/pump', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'start', bet})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            resetPump();
            return;
        }
        
        pumpActive = true;
        pumpMultiplier = 1.0;
        pumpMaxMultiplier = data.maxMultiplier;
        
        currentBalance = data.balance;
        updateBalanceDisplay();
        
        document.getElementById('pump-message').textContent = 'Le ballon gonfle... Encaissez avant qu\'il n\'explose !';
        document.getElementById('pump-cashout').onclick = () => cashoutPump(bet);
        
        animatePump();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du démarrage', 'error');
        resetPump();
    }
}

function animatePump() {
    const balloon = document.getElementById('pump-balloon');
    const multiplierDisplay = document.getElementById('pump-multiplier');
    const svg = document.getElementById('balloon-svg');
    
    let baseSize = 200;
    let iteration = 0;
    
    pumpInterval = setInterval(() => {
        if (!pumpActive) {
            clearInterval(pumpInterval);
            return;
        }
        
        iteration++;
        
        // Increase multiplier (slows down as it gets higher)
        const increment = 0.01 + Math.random() * 0.02;
        pumpMultiplier += increment;
        
        // Check if popped
        if (pumpMultiplier >= pumpMaxMultiplier) {
            popBalloon(balloon, svg);
            return;
        }
        
        // Update size
        const scale = 1 + (pumpMultiplier - 1) * 0.5;
        balloon.style.transform = `scale(${scale})`;
        multiplierDisplay.textContent = pumpMultiplier.toFixed(2) + 'x';
        
        // Change color as it gets dangerous
        const dangerLevel = pumpMultiplier / pumpMaxMultiplier;
        if (dangerLevel > 0.7) {
            svg.querySelector('ellipse').setAttribute('fill', 'url(#balloon-danger)');
            if (!document.getElementById('balloon-danger')) {
                const defs = svg.querySelector('defs');
                const dangerGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                dangerGrad.setAttribute('id', 'balloon-danger');
                dangerGrad.innerHTML = `
                    <stop offset="0%" style="stop-color:#ff4757;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#ff6348;stop-opacity:1" />
                `;
                defs.appendChild(dangerGrad);
            }
        }
        
    }, 100);
}

function popBalloon(balloon, svg) {
    clearInterval(pumpInterval);
    pumpActive = false;
    
    // Explosion effect
    balloon.style.transform = 'scale(0)';
    balloon.style.opacity = '0';
    
    document.getElementById('pump-message').innerHTML = `💥 <span style="color: var(--accent-red); font-weight: 700;">EXPLOSION à ${pumpMaxMultiplier.toFixed(2)}x !</span>`;
    document.getElementById('pump-message').style.fontSize = '20px';
    
    setTimeout(async () => {
        try {
            const response = await fetch('/api/play/pump', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'pop'})
            });
            
            const data = await response.json();
            currentBalance = data.balance;
            updateBalanceDisplay();
            loadHistory();
            
            showNotification(`Le ballon a explosé à ${pumpMaxMultiplier.toFixed(2)}x !`, 'error');
            
            setTimeout(() => resetPump(), 2000);
            
        } catch (error) {
            console.error('Error:', error);
            resetPump();
        }
    }, 500);
}

async function cashoutPump(bet) {
    if (!pumpActive) return;
    
    clearInterval(pumpInterval);
    pumpActive = false;
    
    document.getElementById('pump-cashout').disabled = true;
    
    try {
        const response = await fetch('/api/play/pump', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'cashout', multiplier: pumpMultiplier})
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        currentBalance = data.balance;
        updateBalanceDisplay();
        loadHistory();
        
        const profit = data.win - bet;
        showNotification(`Encaissé à ${data.multiplier.toFixed(2)}x ! +${formatMoney(profit)}`, 'success');
        
        document.getElementById('pump-message').innerHTML = `✅ <span style="color: var(--accent-green); font-weight: 700;">Encaissé ! ${formatMoney(data.win)}</span>`;
        
        setTimeout(() => resetPump(), 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors de l\'encaissement', 'error');
        resetPump();
    }
}

function resetPump() {
    pumpActive = false;
    pumpMultiplier = 1.0;
    clearInterval(pumpInterval);
    
    const balloon = document.getElementById('pump-balloon');
    balloon.style.transform = 'scale(1)';
    balloon.style.opacity = '1';
    
    const svg = document.getElementById('balloon-svg');
    svg.querySelector('ellipse').setAttribute('fill', 'url(#balloon-gradient)');
    
    document.getElementById('pump-multiplier').textContent = '1.00x';
    document.getElementById('pump-message').textContent = 'Placez votre mise pour commencer';
    document.getElementById('pump-message').style.fontSize = '18px';
    
    document.getElementById('pump-start').style.display = 'block';
    document.getElementById('pump-cashout').style.display = 'none';
    document.getElementById('pump-bet').disabled = false;
}
