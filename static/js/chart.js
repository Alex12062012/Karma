// Balance Chart Popup
function createBalanceChart() {
    const overlay = document.createElement('div');
    overlay.id = 'balance-chart-overlay';
    overlay.style.cssText = `
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
    
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 32px;
        width: 90%;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 32px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
    `;
    closeBtn.onclick = () => overlay.remove();
    
    const title = document.createElement('h2');
    title.textContent = 'Évolution du solde';
    title.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 24px;
        font-weight: 700;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 400;
    canvas.style.cssText = `
        width: 100%;
        height: auto;
        border-radius: 8px;
    `;
    
    popup.style.position = 'relative';
    popup.appendChild(closeBtn);
    popup.appendChild(title);
    popup.appendChild(canvas);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Draw chart
    drawBalanceChart(canvas);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

async function drawBalanceChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Get transaction history
    let transactions = [];
    try {
        const response = await fetch('/api/history');
        transactions = await response.json();
    } catch (error) {
        console.error('Error loading history:', error);
        return;
    }
    
    // Calculate balance over time (starting from 1000)
    let balanceHistory = [{balance: 1000, time: 0}];
    let runningBalance = 1000;
    
    transactions.reverse().forEach((tx, index) => {
        runningBalance = runningBalance - tx.bet + tx.win;
        balanceHistory.push({
            balance: runningBalance,
            time: index + 1
        });
    });
    
    if (balanceHistory.length < 2) {
        // Not enough data
        ctx.fillStyle = 'var(--text-secondary)';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Pas assez de données', width / 2, height / 2);
        return;
    }
    
    // Clear canvas
    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate bounds
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const minBalance = Math.min(...balanceHistory.map(h => h.balance), 0);
    const maxBalance = Math.max(...balanceHistory.map(h => h.balance), 1000);
    const balanceRange = maxBalance - minBalance || 1;
    
    // Draw grid
    ctx.strokeStyle = '#1a2c38';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Y-axis labels
        const balanceValue = maxBalance - (balanceRange / 5) * i;
        ctx.fillStyle = '#7e8a9d';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(balanceValue.toFixed(0) + '€', padding - 10, y + 4);
    }
    
    // Draw 1000€ reference line
    const y1000 = padding + chartHeight - ((1000 - minBalance) / balanceRange) * chartHeight;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, y1000);
    ctx.lineTo(width - padding, y1000);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw chart line
    const isProfit = balanceHistory[balanceHistory.length - 1].balance >= 1000;
    ctx.strokeStyle = isProfit ? '#00d9a3' : '#ff4757';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    balanceHistory.forEach((point, index) => {
        const x = padding + (index / (balanceHistory.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.balance - minBalance) / balanceRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Add glow effect
    ctx.shadowColor = isProfit ? '#00d9a3' : '#ff4757';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Fill area under curve
    ctx.lineTo(width - padding, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, isProfit ? 'rgba(0, 217, 163, 0.3)' : 'rgba(255, 71, 87, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw current balance indicator
    const lastPoint = balanceHistory[balanceHistory.length - 1];
    const lastX = width - padding;
    const lastY = padding + chartHeight - ((lastPoint.balance - minBalance) / balanceRange) * chartHeight;
    
    ctx.fillStyle = isProfit ? '#00d9a3' : '#ff4757';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw current balance text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(lastPoint.balance.toFixed(2) + '€', width / 2, 30);
    
    const profit = lastPoint.balance - 1000;
    const profitText = profit >= 0 ? `+${profit.toFixed(2)}€` : `${profit.toFixed(2)}€`;
    ctx.font = '16px Inter';
    ctx.fillStyle = isProfit ? '#00d9a3' : '#ff4757';
    ctx.fillText(profitText, width / 2, 50);
    
    // X-axis label
    ctx.fillStyle = '#7e8a9d';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Parties jouées', width / 2, height - 10);
}

// Add balance chart button to sidebar
function addBalanceChartButton() {
    const sidebar = document.querySelector('.sidebar-footer');
    if (!sidebar) return;
    
    const chartBtn = document.createElement('button');
    chartBtn.className = 'btn-chart';
    chartBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 14V10H4V14H2ZM7 14V2H9V14H7ZM12 14V6H14V14H12Z"/>
        </svg>
        Graphique du solde
    `;
    chartBtn.style.cssText = `
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 8px;
    `;
    
    chartBtn.addEventListener('mouseenter', () => {
        chartBtn.style.background = 'var(--bg-hover)';
        chartBtn.style.borderColor = 'var(--accent-green)';
        chartBtn.style.color = 'var(--accent-green)';
    });
    
    chartBtn.addEventListener('mouseleave', () => {
        chartBtn.style.background = 'var(--bg-tertiary)';
        chartBtn.style.borderColor = 'var(--border-color)';
        chartBtn.style.color = 'var(--text-secondary)';
    });
    
    chartBtn.addEventListener('click', createBalanceChart);
    
    const balanceDiv = sidebar.querySelector('.user-balance');
    if (balanceDiv) {
        balanceDiv.parentElement.insertBefore(chartBtn, balanceDiv.nextSibling);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addBalanceChartButton, 100);
});
