// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let users = JSON.parse(localStorage.getItem('tv_users')) || [];
let priceCache = {};
let currentAsset = 'BTC/USD';
let currentDuration = 60;
let tradeInProgress = false;
let activeTrade = null;

// ============================================
// INITIALIZATION
// ============================================
window.addEventListener('load', () => {
    checkAuth();
    if (currentUser) {
        initApp();
    }
});

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
function switchToRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    clearErrors();
}

function switchToLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    clearErrors();
}

function clearErrors() {
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('register-error').classList.add('hidden');
}

function showError(type, message) {
    clearErrors();
    const errorEl = document.getElementById(`${type}-error`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function registerUser() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    // Validation
    if (!name) {
        showError('register', '❌ Full name is required');
        return;
    }
    if (!email || !email.includes('@')) {
        showError('register', '❌ Valid email is required');
        return;
    }
    if (password.length < 6) {
        showError('register', '❌ Password must be 6+ characters');
        return;
    }
    if (password !== confirmPassword) {
        showError('register', '❌ Passwords do not match');
        return;
    }

    // Check if email exists
    if (users.find(u => u.email === email)) {
        showError('register', '❌ Email already registered');
        return;
    }

    // Create user
    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: btoa(password), // Simple encoding
        balance: 10000,
        trades: [],
        totalPL: 0,
        winRate: 0,
        createdAt: new Date().toISOString(),
        depositAddress: {
            BTC: 'bc1q' + Math.random().toString(36).substr(2, 39),
            ETH: '0x' + Math.random().toString(16).substr(2, 40),
            USDT: 'T' + Math.random().toString(36).substr(2, 33)
        }
    };

    users.push(newUser);
    localStorage.setItem('tv_users', JSON.stringify(users));

    currentUser = newUser;
    localStorage.setItem('tv_current_user', JSON.stringify(currentUser));

    // Clear form and redirect
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm-password').value = '';

    initApp();
}

function loginUser() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showError('login', '❌ Email and password required');
        return;
    }

    const user = users.find(u => u.email === email && u.password === btoa(password));

    if (!user) {
        showError('login', '❌ Invalid email or password');
        return;
    }

    currentUser = user;
    localStorage.setItem('tv_current_user', JSON.stringify(currentUser));

    // Clear form and redirect
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';

    initApp();
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('tv_current_user');
        location.reload();
    }
}

function checkAuth() {
    const saved = localStorage.getItem('tv_current_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        const userExists = users.find(u => u.id === currentUser.id);
        return !!userExists;
    }
    return false;
}

// ============================================
// APP INITIALIZATION
// ============================================
function initApp() {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('navbar').classList.remove('hidden');

    // Set user name
    document.getElementById('user-name').textContent = currentUser.name.split(' ')[0];

    // Update balance
    updateBalanceDisplay();

    // Navigate to home
    navigateTo('home');

    // Fetch prices and start interval
    refreshAllPrices();
    setInterval(refreshAllPrices, 5000);

    // Set trade duration default
    setTradeDuration(60);
}

// ============================================
// PRICE & MARKET DATA
// ============================================
const priceData = {
    'BTC/USD': { price: 95000, change: 2.5, high: 96000, low: 94000 },
    'ETH/USD': { price: 3500, change: 1.8, high: 3600, low: 3400 },
    'XRP/USD': { price: 2.5, change: 0.5, high: 2.6, low: 2.4 },
    'EUR/USD': { price: 1.0950, change: 0.3, high: 1.1000, low: 1.0900 },
    'GBP/USD': { price: 1.2680, change: -0.2, high: 1.2750, low: 1.2600 },
    'JPY/USD': { price: 0.0068, change: 0.1, high: 0.0069, low: 0.0067 },
    'XAU/USD': { price: 2050, change: 1.2, high: 2070, low: 2040 },
    'XAG/USD': { price: 24.5, change: 0.8, high: 25.0, low: 24.0 },
    'CRUDE/USD': { price: 78, change: 1.5, high: 80, low: 76 }
};

async function refreshAllPrices() {
    // Simulate live price updates with small random changes
    for (let asset in priceData) {
        const changePercent = (Math.random() - 0.5) * 0.5;
        priceData[asset].price *= (1 + changePercent / 100);
        priceData[asset].change = changePercent;
        
        updatePriceDisplay(asset);
    }
    updateTicker();
}

function updatePriceDisplay(asset) {
    const data = priceData[asset];
    if (!data) return;

    const shortAsset = asset.split('/')[0].toLowerCase();
    
    // Update market page prices
    const marketPrice = document.getElementById(`market-${shortAsset}-price`);
    const marketChange = document.getElementById(`market-${shortAsset}-change`);
    
    if (marketPrice) {
        marketPrice.textContent = '$' + data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    }
    if (marketChange) {
        marketChange.textContent = (data.change > 0 ? '+' : '') + data.change.toFixed(2) + '%';
        marketChange.className = 'text-lg font-mono ' + (data.change > 0 ? 'price-up' : 'price-down');
    }
}

function updateTicker() {
    let html = '';
    for (let asset in priceData) {
        const data = priceData[asset];
        const color = data.change > 0 ? 'text-green-400' : 'text-red-400';
        const changeStr = (data.change > 0 ? '+' : '') + data.change.toFixed(2) + '%';
        html += `<span class="${color}">${asset} $${data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${changeStr}</span>`;
    }
    document.getElementById('ticker').innerHTML = html + html;
}

// ============================================
// NAVIGATION
// ============================================
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    
    // Show selected page
    const pageEl = document.getElementById(page + '-page');
    if (pageEl) {
        pageEl.classList.remove('hidden');
    }

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.style.color = '';
    });
    const navLink = document.getElementById('nav-' + page);
    if (navLink) {
        navLink.style.color = '#F0B90B';
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Load page-specific content
    if (page === 'trade') {
        changeAsset();
        loadTradingView();
    } else if (page === 'assets') {
        updatePortfolio();
    } else if (page === 'markets') {
        refreshAllPrices();
    }
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function toggleFAQ(element) {
    const answer = element.querySelector('p');
    answer.classList.toggle('hidden');
    const icon = element.querySelector('i');
    icon.style.transform = answer.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

// ============================================
// TRADING FUNCTIONS
// ============================================
function selectAssetForTrade(asset) {
    currentAsset = asset;
    navigateTo('trade');
}

function changeAsset() {
    currentAsset = document.getElementById('asset-select').value;
    updateTradeDisplay();
    loadTradingView();
}

function updateTradeDisplay() {
    const data = priceData[currentAsset];
    if (!data) return;

    document.getElementById('trade-current-price').textContent = '$' + data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    document.getElementById('chart-price').textContent = '$' + data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    document.getElementById('chart-change').textContent = (data.change > 0 ? '+' : '') + data.change.toFixed(2) + '%';
    document.getElementById('chart-change').className = data.change > 0 ? 'text-lg font-mono price-up' : 'text-lg font-mono price-down';
}

function setTradeDuration(seconds) {
    currentDuration = seconds;
    ['30', '45', '60'].forEach(n => {
        const el = document.getElementById(`trade-dur-${n}`);
        if (el) {
            if (parseInt(n) === seconds) {
                el.classList.remove('bg-[#1F252F]', 'hover:bg-[#2F3540]');
                el.classList.add('bg-[#F0B90B]', 'text-black', 'font-bold');
            } else {
                el.classList.remove('bg-[#F0B90B]', 'text-black', 'font-bold');
                el.classList.add('bg-[#1F252F]', 'hover:bg-[#2F3540]');
            }
        }
    });
}

function placeTrade(direction) {
    if (tradeInProgress) {
        alert('⏱️ You have a trade in progress. Wait for it to complete.');
        return;
    }

    const amount = parseFloat(document.getElementById('trade-amount').value) || 100;

    if (isNaN(amount) || amount < 10 || amount > 50000) {
        alert('❌ Trade amount must be between $10 and $50,000');
        return;
    }

    if (amount > currentUser.balance) {
        alert('❌ Insufficient balance. Available: $' + currentUser.balance.toFixed(2));
        return;
    }

    // Create trade
    tradeInProgress = true;
    const openPrice = priceData[currentAsset].price;
    const tradeId = Date.now();

    activeTrade = {
        id: tradeId,
        asset: currentAsset,
        direction: direction,
        amount: amount,
        openPrice: openPrice,
        duration: currentDuration,
        startTime: Date.now(),
        status: 'running'
    };

    // Update UI
    document.getElementById('btn-buy').disabled = true;
    document.getElementById('btn-sell').disabled = true;
    document.getElementById('trade-in-progress').classList.remove('hidden');
    document.getElementById('trade-status').innerHTML = '';

    // Run trade timer
    runTradeTimer();
}

function runTradeTimer() {
    const startTime = Date.now();
    const duration = currentDuration * 1000;

    const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);

        document.getElementById('trade-progress-bar').style.width = progress + '%';
        document.getElementById('trade-progress-text').textContent = 
            `${Math.round(progress)}% complete - ${Math.round((duration - elapsed) / 1000)}s remaining`;

        if (elapsed >= duration) {
            clearInterval(timer);
            completeTrade();
        }
    }, 100);
}

function completeTrade() {
    const closePrice = priceData[currentAsset].price;
    const priceDiff = closePrice - activeTrade.openPrice;
    const profitLoss = activeTrade.direction === 'BUY' 
        ? priceDiff > 0 ? activeTrade.amount * (priceDiff / activeTrade.openPrice) * 0.85 : -activeTrade.amount * 0.85
        : priceDiff < 0 ? activeTrade.amount * (Math.abs(priceDiff) / activeTrade.openPrice) * 0.85 : -activeTrade.amount * 0.85;

    const isWin = profitLoss > 0;

    // Update user balance
    currentUser.balance += profitLoss;
    currentUser.totalPL += profitLoss;
    currentUser.trades.push({
        id: activeTrade.id,
        asset: activeTrade.asset,
        direction: activeTrade.direction,
        amount: activeTrade.amount,
        openPrice: activeTrade.openPrice,
        closePrice: closePrice,
        profitLoss: profitLoss,
        isWin: isWin,
        timestamp: new Date().toLocaleString(),
        duration: currentDuration
    });

    // Calculate win rate
    const wins = currentUser.trades.filter(t => t.isWin).length;
    currentUser.winRate = Math.round((wins / currentUser.trades.length) * 100);

    // Save user
    updateUserInStorage();
    updateBalanceDisplay();

    // Show result
    const resultColor = isWin ? 'text-green-400' : 'text-red-400';
    const resultText = isWin ? '✅ WIN!' : '❌ LOSS';
    
    document.getElementById('trade-status').innerHTML = `
        <div class="p-4 rounded-2xl ${isWin ? 'bg-green-900/50 border border-green-600' : 'bg-red-900/50 border border-red-600'}">
            <p class="text-2xl font-bold ${resultColor} mb-2">${resultText}</p>
            <p class="text-gray-200 mb-2">${activeTrade.asset} ${activeTrade.direction}</p>
            <p class="text-xl font-mono ${resultColor}">
                ${isWin ? '+' : ''}$${profitLoss.toFixed(2)}
            </p>
            <p class="text-sm text-gray-400 mt-2">
                Open: $${activeTrade.openPrice.toFixed(8)} | Close: $${closePrice.toFixed(8)}
            </p>
        </div>
    `;

    // Reset UI
    document.getElementById('trade-in-progress').classList.add('hidden');
    document.getElementById('btn-buy').disabled = false;
    document.getElementById('btn-sell').disabled = false;
    tradeInProgress = false;
    activeTrade = null;

    // Auto-hide result after 5 seconds
    setTimeout(() => {
        document.getElementById('trade-status').innerHTML = '';
    }, 5000);
}

// ============================================
// PORTFOLIO FUNCTIONS
// ============================================
function updateBalanceDisplay() {
    const balance = currentUser.balance;
    document.getElementById('balance-display').textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('available-balance').textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updatePortfolio() {
    document.getElementById('total-balance').textContent = '$' + currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('total-pl').textContent = (currentUser.totalPL > 0 ? '+' : '') + '$' + currentUser.totalPL.toFixed(2);
    document.getElementById('total-pl').style.color = currentUser.totalPL > 0 ? '#10b981' : '#ef4444';
    document.getElementById('win-rate').textContent = currentUser.winRate + '%';
    document.getElementById('total-trades').textContent = currentUser.trades.length;

    // Update trade history
    updateTradeHistory();
}

function updateTradeHistory() {
    const historyBody = document.getElementById('history-body');
    
    if (currentUser.trades.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">No trades yet</td></tr>';
        return;
    }

    historyBody.innerHTML = currentUser.trades.map(trade => `
        <tr class="border-b border-gray-700 hover:bg-[#1F252F]">
            <td class="text-left py-3 px-2 text-sm">${trade.timestamp}</td>
            <td class="text-left py-3 px-2 text-sm font-bold">${trade.asset}</td>
            <td class="text-left py-3 px-2 text-sm">
                <span class="${trade.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}">
                    ${trade.direction}
                </span>
            </td>
            <td class="text-right py-3 px-2 text-sm">$${trade.amount.toFixed(2)}</td>
            <td class="text-right py-3 px-2 text-sm font-bold ${trade.profitLoss > 0 ? 'text-green-400' : 'text-red-400'}">
                ${trade.profitLoss > 0 ? '+' : ''}$${trade.profitLoss.toFixed(2)}
            </td>
            <td class="text-center py-3 px-2 text-sm">
                <span class="px-2 py-1 rounded-full text-xs ${trade.isWin ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}">
                    ${trade.isWin ? '✅ Win' : '❌ Loss'}
                </span>
            </td>
        </tr>
    `).join('');
}

// ============================================
// DEPOSIT / WITHDRAW FUNCTIONS
// ============================================
function showDepositModal() {
    document.getElementById('deposit-modal').classList.remove('hidden');
    updateDepositAddress();
}

function hideDepositModal() {
    document.getElementById('deposit-modal').classList.add('hidden');
}

function updateDepositAddress() {
    const crypto = document.getElementById('crypto-select').value;
    const address = currentUser.depositAddress[crypto];
    document.getElementById('deposit-address').textContent = address;
}

function copyAddress() {
    const address = document.getElementById('deposit-address').textContent;
    navigator.clipboard.writeText(address).then(() => {
        alert('✅ Address copied to clipboard!');
    });
}

function showWithdrawModal() {
    document.getElementById('withdraw-modal').classList.remove('hidden');
    document.getElementById('withdraw-error').classList.add('hidden');
}

function hideWithdrawModal() {
    document.getElementById('withdraw-modal').classList.add('hidden');
    document.getElementById('withdraw-amount').value = '';
    document.getElementById('withdraw-address').value = '';
}

function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const address = document.getElementById('withdraw-address').value.trim();
    const errorEl = document.getElementById('withdraw-error');

    // Validation
    if (!amount || isNaN(amount) || amount < 10) {
        errorEl.textContent = '❌ Minimum withdrawal is $10';
        errorEl.classList.remove('hidden');
        return;
    }

    if (amount > currentUser.balance) {
        errorEl.textContent = '❌ Insufficient balance';
        errorEl.classList.remove('hidden');
        return;
    }

    if (!address) {
        errorEl.textContent = '❌ Please enter a wallet address';
        errorEl.classList.remove('hidden');
        return;
    }

    // Validate TRC20 address (starts with T and ~34 chars)
    if (!address.startsWith('T') || address.length < 30) {
        errorEl.textContent = '❌ Invalid USDT TRC20 address. Must start with T';
        errorEl.classList.remove('hidden');
        return;
    }

    // Process withdrawal
    currentUser.balance -= amount;
    currentUser.trades.push({
        id: Date.now(),
        type: 'WITHDRAWAL',
        asset: 'USDT',
        amount: amount,
        address: address.substring(0, 15) + '...',
        timestamp: new Date().toLocaleString(),
        status: 'Completed'
    });

    updateUserInStorage();
    updateBalanceDisplay();
    updatePortfolio();

    // Show success message
    alert(`✅ Withdrawal of $${amount.toFixed(2)} USDT submitted!\n\nTo: ${address.substring(0, 15)}...\n\nTransaction will complete in 1-5 minutes.`);

    hideWithdrawModal();
}

// ============================================
// TRADINGVIEW CHART
// ============================================
function loadTradingView() {
    const container = document.getElementById('tradingview-chart');
    
    // Clear previous chart
    container.innerHTML = '';

    // Create a simplified candlestick chart representation
    container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: flex-end; gap: 2px; padding: 20px; box-sizing: border-box;">
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 45%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #ef4444, rgba(239, 68, 68, 0.3)); height: 32%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 58%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 50%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #ef4444, rgba(239, 68, 68, 0.3)); height: 38%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 62%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 48%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #ef4444, rgba(239, 68, 68, 0.3)); height: 35%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 55%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 60%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #ef4444, rgba(239, 68, 68, 0.3)); height: 42%;"></div>
            <div style="flex: 1; background: linear-gradient(to top, #10b981, rgba(16, 185, 129, 0.3)); height: 52%;"></div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            Live Candlestick Chart • 1-minute intervals • Asset: ${currentAsset}
        </div>
    `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function updateUserInStorage() {
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
    }
    localStorage.setItem('tv_users', JSON.stringify(users));
    localStorage.setItem('tv_current_user', JSON.stringify(currentUser));
}