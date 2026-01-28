// Main app functionality
let currentBalance = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadBalance();
    loadHistory();
    setupNavigation();
    
    // Load default game (Plinko)
    loadGame('plinko');
});

// Load balance
async function loadBalance() {
    try {
        const response = await fetch('/api/balance');
        if (response.status === 401) {
            // Not authenticated, redirect to login
            window.location.href = '/login';
            return;
        }
        const data = await response.json();
        if (data.error) {
            console.error('Balance error:', data.error);
            window.location.href = '/login';
            return;
        }
        currentBalance = data.balance;
        updateBalanceDisplay();
    } catch (error) {
        console.error('Error loading balance:', error);
        // On error, try to redirect to login
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    }
}

// Update balance display
function updateBalanceDisplay() {
    const balanceElement = document.getElementById('balance');
    balanceElement.textContent = formatMoney(currentBalance);
    
    // Animate balance change
    balanceElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        balanceElement.style.transform = 'scale(1)';
    }, 200);
}

// Load history
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        if (response.status === 401) {
            return; // User not authenticated, will be redirected by loadBalance
        }
        const data = await response.json();
        if (data.error) {
            console.error('History error:', data.error);
            return;
        }
        
        const historyList = document.getElementById('history-list');
        
        if (data.length === 0) {
            historyList.innerHTML = '<div class="history-empty">Aucune partie jouée</div>';
            return;
        }
        
        historyList.innerHTML = data.map(item => {
            const profit = item.win - item.bet;
            const profitClass = profit >= 0 ? 'win' : 'lose';
            const profitSign = profit >= 0 ? '+' : '';
            
            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-game">${item.game}</span>
                        <span class="history-profit ${profitClass}">${profitSign}${formatMoney(profit)}</span>
                    </div>
                    <div class="history-details">
                        <span>Mise: ${formatMoney(item.bet)}</span>
                        <span>x${item.multiplier.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Setup navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const game = item.dataset.game;
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Load game
            loadGame(game);
        });
    });
}

// Load game
function loadGame(game) {
    const container = document.getElementById('game-container');
    
    switch(game) {
        case 'plinko':
            container.innerHTML = getPlinkoHTML();
            initPlinko();
            break;
        case 'crash':
            container.innerHTML = getCrashHTML();
            initCrash();
            break;
        case 'dice':
            container.innerHTML = getDiceHTML();
            initDice();
            break;
        case 'mines':
            container.innerHTML = getMinesHTML();
            initMines();
            break;
    }
}

// Format money
function formatMoney(amount) {
    return amount.toFixed(2) + '€';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'};
        color: white;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
