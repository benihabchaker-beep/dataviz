// Mode client uniquement - pas d'appels API backend
console.info('Mode client : Utilisation de localStorage pour les données.');

// State
let domains = [];
let chart;
let matrixChart;

// DOM Elements
const domainInput = document.getElementById('domainInput');
const addDomainBtn = document.getElementById('addDomainBtn');
const domainListEl = document.getElementById('domainList');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const ctx = document.getElementById('rankChart').getContext('2d');
const suggestionsList = document.getElementById('suggestions');

// Initialize Date Inputs
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const startDefault = new Date(yesterday);
startDefault.setDate(yesterday.getDate() - 365);
const formatDate = date => date.toISOString().split('T')[0];
startDateInput.value = formatDate(startDefault);
endDateInput.value = formatDate(yesterday);
startDateInput.max = formatDate(yesterday);
endDateInput.max = formatDate(yesterday);

// --- Data Functions (defined early) ---

async function fetchDomainData(domain) {
    try {
        console.log(`Fetching ${domain} from ${startDateInput.value} to ${endDateInput.value}`);
        const ranks = dataHandler.getRanks(domain, startDateInput.value, endDateInput.value);
        console.log(`Loaded ${domain}: ${ranks.length} data points`);

        // If no data in range, show all available dates for debugging
        if (ranks.length === 0) {
            const allRanks = dataHandler.getRanks(domain);
            console.warn(`No data in range for ${domain}. Total available: ${allRanks.length}`);
            if (allRanks.length > 0) {
                console.log(`Available date range: ${allRanks[0].date} to ${allRanks[allRanks.length - 1].date}`);
            }
        }

        return ranks;
    } catch (error) {
        console.error(`Error fetching data for ${domain}:`, error);
        return [];
    }
}

function processMultipleDomains(domainDataMap, start, end) {
    const allDates = new Set();
    Object.values(domainDataMap).forEach(ranks => {
        if (ranks && Array.isArray(ranks)) {
            ranks.forEach(r => { if (r && r.date) allDates.add(r.date); });
        }
    });
    let sortedDates = Array.from(allDates).sort();
    const startDate = new Date(start);
    const endDate = new Date(end);
    sortedDates = sortedDates.filter(d => { const curr = new Date(d); return curr >= startDate && curr <= endDate; });
    const colors = ['#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#fbbf24'];
    const datasets = domains.map((domain, i) => {
        const ranks = domainDataMap[domain] || [];
        const dataPoints = sortedDates.map(date => {
            const entry = ranks.find(r => r && r.date === date);
            return entry ? entry.rank : null;
        });
        return {
            label: domain,
            data: dataPoints,
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length].replace(')', ', 0.1)').replace('rgb', 'rgba'),
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.1,
            fill: false,
            spanGaps: false
        };
    });
    return { labels: sortedDates, datasets };
}

function calculateDomainStats(ranks, domain) {
    if (!ranks || ranks.length === 0) return null;
    const values = ranks.map(r => r.rank);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    return { domain, x: mean, y: stdDev, r: 10, stats: { min: Math.min(...values), max: Math.max(...values), count: n } };
}

function renderMatrix(domainDataMap) {
    const ctxMatrix = document.getElementById('matrixChart').getContext('2d');
    if (matrixChart) matrixChart.destroy();
    const colors = ['#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#fbbf24'];
    const bubbleData = domains.map((domain, i) => {
        const stats = calculateDomainStats(domainDataMap[domain], domain);
        if (!stats) return null;
        return { label: domain, data: [stats], backgroundColor: colors[i % colors.length].replace('rgb', 'rgba').replace(')', ', 0.6)'), borderColor: colors[i % colors.length], borderWidth: 2 };
    }).filter(d => d);
    if (bubbleData.length === 0) return;
    const allStats = bubbleData.map(d => d.data[0]);
    const maxVolatility = Math.max(...allStats.map(s => s.y));
    const minVolatility = Math.min(...allStats.map(s => s.y));
    const volatilityRange = maxVolatility - minVolatility;
    bubbleData.forEach(dataset => {
        const stat = dataset.data[0];
        if (volatilityRange > 0) {
            const normalizedVolatility = (stat.y - minVolatility) / volatilityRange;
            stat.r = 10 + Math.log1p(normalizedVolatility * 10) * 5;
        } else {
            stat.r = 12;
        }
    });
    const yAxisMax = maxVolatility < 10 ? 10 : maxVolatility * 1.3;
    matrixChart = new Chart(ctxMatrix, {
        type: 'bubble',
        data: { datasets: bubbleData },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                zoom: { pan: { enabled: true, mode: 'xy', modifierKey: 'shift' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, drag: { enabled: true, backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: 'rgba(56, 189, 248, 0.8)', borderWidth: 1 }, mode: 'xy' } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw.domain}: Avg Rank #${Math.round(ctx.raw.x)}, Volatility ±${ctx.raw.y.toFixed(1)}` }, backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#cbd5e1', borderColor: '#334155', borderWidth: 1 },
                legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
                title: { display: true, text: 'Stability vs. Popularity Analysis', color: '#94a3b8', font: { size: 16, weight: '500' } }
            },
            scales: {
                x: { title: { display: true, text: 'Average Rank (Better →)', color: '#94a3b8', font: { size: 13 } }, reverse: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { title: { display: true, text: 'Volatility - Standard Deviation (More Stable ↓)', color: '#94a3b8', font: { size: 13 } }, grid: { color: '#334155' }, ticks: { color: '#94a3b8', callback: (value) => value.toFixed(1) }, beginAtZero: true, max: yAxisMax, grace: '5%' }
            }
        }
    });
}

function renderChart(labels, datasets, domainDataMap) {
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#94a3b8' } },
                zoom: { pan: { enabled: true, mode: 'x', modifierKey: 'shift' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, drag: { enabled: true, backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: 'rgba(56, 189, 248, 0.8)', borderWidth: 1 }, mode: 'x' } },
                tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#cbd5e1', borderColor: '#334155', borderWidth: 1 }
            },
            scales: {
                x: { grid: { color: '#334155', drawBorder: false }, ticks: { color: '#94a3b8' } },
                y: { reverse: true, grid: { color: '#334155', drawBorder: false }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Rank', color: '#64748b' } }
            }
        }
    });
    if (domainDataMap) renderMatrix(domainDataMap);
}

async function handleCompare() {
    if (domains.length === 0) {
        if (chart) chart.destroy();
        if (matrixChart) matrixChart.destroy();
        return;
    }
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');

    console.log('=== Starting comparison ===');
    console.log('Domains:', domains);
    console.log('Date range:', startDateInput.value, 'to', endDateInput.value);

    try {
        const domainDataMap = {};
        for (const domain of domains) {
            try {
                domainDataMap[domain] = await fetchDomainData(domain);
            } catch (e) {
                console.error(`Failed to fetch ${domain}`, e);
                domainDataMap[domain] = [];
            }
        }

        console.log('Fetched data for all domains:', Object.keys(domainDataMap).map(d => `${d}: ${domainDataMap[d].length} points`));

        const { labels, datasets } = processMultipleDomains(domainDataMap, startDateInput.value, endDateInput.value);

        console.log(`Processed data: ${labels.length} date labels, ${datasets.length} datasets`);

        if (labels.length === 0) {
            // Check if we have ANY data at all
            const totalPoints = Object.values(domainDataMap).reduce((sum, ranks) => sum + ranks.length, 0);
            if (totalPoints === 0) {
                throw new Error('Aucune donnée trouvée. Veuillez d\'abord importer des fichiers CSV via la page d\'import.');
            } else {
                throw new Error('No data found in the selected date range. Try adjusting the dates.');
            }
        }
        renderChart(labels, datasets, domainDataMap);
    } catch (err) {
        console.error('Comparison error:', err);
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    } finally {
        loadingEl.classList.add('hidden');
    }
}

// --- Domain Management ---

function renderDomainTags() {
    domainListEl.innerHTML = '';
    domains.forEach((domain, index) => {
        const tag = document.createElement('div');
        tag.className = 'domain-tag';
        tag.innerHTML = `<span>${domain}</span><button class="remove-domain" data-index="${index}" title="Remove">×</button>`;
        domainListEl.appendChild(tag);
    });
    document.querySelectorAll('.remove-domain').forEach(btn => {
        btn.addEventListener('click', (e) => removeDomain(parseInt(e.target.dataset.index)));
    });
}

function addDomain() {
    const val = domainInput.value.trim();
    if (!val) return;
    if (!dataHandler.hasDomain(val)) {
        alert(`Domaine "${val}" introuvable. Veuillez d'abord importer un fichier CSV pour ce domaine.`);
        return;
    }
    if (domains.includes(val)) {
        alert('Domaine déjà ajouté à la comparaison.');
        return;
    }
    if (domains.length >= 5) alert('Maximum 5 domaines recommandés pour une meilleure visibilité.');
    domains.push(val);
    domainInput.value = '';
    renderDomainTags();
    handleCompare();
}

function removeDomain(index) {
    domains.splice(index, 1);
    renderDomainTags();
    if (domains.length > 0) {
        handleCompare();
    } else {
        if (chart) chart.destroy();
        if (matrixChart) matrixChart.destroy();
    }
}

addDomainBtn.addEventListener('click', addDomain);
domainInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addDomain(); });

// Update chart when date range changes
startDateInput.addEventListener('change', () => {
    if (domains.length > 0) handleCompare();
});
endDateInput.addEventListener('change', () => {
    if (domains.length > 0) handleCompare();
});

// --- View Switching ---

const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.view-panel');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const view = tab.dataset.view;
        panels.forEach(p => {
            if (p.id === `${view}-view`) {
                p.classList.add('active');
                p.classList.remove('hidden');
            } else {
                p.classList.remove('active');
                p.classList.add('hidden');
            }
        });
    });
});

// --- Autocomplete & Suggestions ---

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

async function fetchSuggestions(query) {
    try {
        const suggestions = dataHandler.getSuggestions(query || '');
        suggestionsList.innerHTML = '';
        if (suggestions.length === 0) {
            dataHandler.getAvailableDomains().slice(0, 10).forEach(d => {
                const option = document.createElement('option');
                option.value = d.domain;
                suggestionsList.appendChild(option);
            });
        } else {
            suggestions.forEach(domain => {
                const option = document.createElement('option');
                option.value = domain;
                suggestionsList.appendChild(option);
            });
        }
    } catch (e) {
        console.error("Suggestion error:", e);
    }
}

const handleInput = debounce((e) => fetchSuggestions(e.target.value), 300);
domainInput.addEventListener('input', handleInput);
fetchSuggestions('');

// --- Export Functions ---

function getActiveChart() {
    const activeTab = document.querySelector('.tab-btn.active');
    return (activeTab && activeTab.dataset.view === 'matrix') ? matrixChart : chart;
}

document.getElementById('exportPng').addEventListener('click', () => {
    const activeChart = getActiveChart();
    if (!activeChart) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = activeChart.width;
    tempCanvas.height = activeChart.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(activeChart.canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `tranco_export_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});

document.getElementById('exportHtml').addEventListener('click', () => {
    const activeChart = getActiveChart();
    if (!activeChart) return;
    const config = activeChart.config;
    const htmlContent = `<!DOCTYPE html><html><head><title>Tranco Rank Export</title><script src="https://cdn.jsdelivr.net/npm/chart.js"></script><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:2rem;display:flex;justify-content:center}.container{width:100%;max-width:1000px}h1{text-align:center;color:#38bdf8}</style></head><body><div class="container"><h1>Rank Comparison</h1><canvas id="exportedChart"></canvas></div><script>const ctx=document.getElementById('exportedChart').getContext('2d');new Chart(ctx,{type:'${config.type}',data:${JSON.stringify(config.data)},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#94a3b8'}}},scales:${JSON.stringify(config.options.scales)}}});</script></body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.download = `tranco_export_${Date.now()}.html`;
    link.href = URL.createObjectURL(blob);
    link.click();
});

document.getElementById('resetZoom').addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-btn.active');
    const view = activeTab ? activeTab.dataset.view : 'timeline';
    if (view === 'matrix' && matrixChart) {
        matrixChart.resetZoom();
    } else if (view === 'timeline' && chart) {
        chart.resetZoom();
    }
});

// --- Initialize ---

// Wait for dataHandler to be ready
window.addEventListener('DOMContentLoaded', () => {
    // Check if dataHandler is available
    if (typeof dataHandler === 'undefined') {
        errorEl.textContent = 'Erreur : Gestionnaire de données non chargé. Veuillez rafraîchir la page.';
        errorEl.classList.remove('hidden');
        return;
    }

    // Load available domains from localStorage
    const availableDomains = dataHandler.getAvailableDomains();

    if (availableDomains.length === 0) {
        // No data uploaded yet - show helpful message
        errorEl.innerHTML = `
            <strong>Aucune donnée trouvée.</strong><br>
            Veuillez importer des fichiers CSV via la <a href="upload.html" style="color: #38bdf8; text-decoration: underline;">page d'import</a> d'abord.<br>
            <small style="opacity: 0.7;">Format CSV : date,rang (une ligne par date)</small>
        `;
        errorEl.classList.remove('hidden');
        loadingEl.classList.add('hidden');
        return;
    }

    // Initialize with first 2 available domains (or all if less than 2)
    domains = availableDomains.slice(0, Math.min(2, availableDomains.length)).map(d => d.domain);

    // Find the actual date range from all available data
    let minDate = null;
    let maxDate = null;

    availableDomains.forEach(domainInfo => {
        const allRanks = dataHandler.getRanks(domainInfo.domain);
        if (allRanks.length > 0) {
            const firstDate = allRanks[0].date;
            const lastDate = allRanks[allRanks.length - 1].date;

            if (!minDate || firstDate < minDate) minDate = firstDate;
            if (!maxDate || lastDate > maxDate) maxDate = lastDate;
        }
    });

    // Set date inputs to actual data range
    if (minDate && maxDate) {
        startDateInput.value = minDate;
        endDateInput.value = maxDate;
        startDateInput.min = minDate;
        startDateInput.max = maxDate;
        endDateInput.min = minDate;
        endDateInput.max = maxDate;

        console.log(`Data date range: ${minDate} to ${maxDate}`);
    }

    console.log('Initialized with domains:', domains);
    console.log('Available domains:', availableDomains.map(d => `${d.domain} (${d.count} points)`));

    renderDomainTags();
    handleCompare();
});
