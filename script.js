// Local Flask Backend
const API_BASE = 'http://localhost:8000/api/ranks';


const domain1Input = document.getElementById('domain1');
const domain2Input = document.getElementById('domain2');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const compareBtn = document.getElementById('compareBtn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const ctx = document.getElementById('rankChart').getContext('2d');

let chart;

// Warning: Tranco library downloads lists (~10MB compressed). 
// Large ranges will result in slow first-time fetches.
console.info('Backend mode: functionality enabled.');


// Initialize Date Inputs
// Tranco API usually has a lag of 1 day, and history is ~30-35 days.
// Let's set default range to last 30 days.
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const startDefault = new Date(yesterday);
startDefault.setDate(yesterday.getDate() - 7); // Default to 7 days to avoid massive initial downloads

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

startDateInput.value = formatDate(startDefault);
endDateInput.value = formatDate(yesterday);
startDateInput.max = formatDate(yesterday);
endDateInput.max = formatDate(yesterday);

async function fetchDomainData(domain) {
    if (!domain) return null;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    try {
        const url = new URL(API_BASE);
        url.searchParams.append('domain', domain);
        url.searchParams.append('start_date', startDate);
        url.searchParams.append('end_date', endDate);

        const response = await fetch(url);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Failed to fetch data for ${domain}`);
        }
        const data = await response.json();
        return data.ranks || [];
    } catch (err) {
        console.error(err);
        throw err;
    }
}

function processData(ranks1, ranks2, start, end) {
    // Backend returns data within the requested range.
    // However, there might be gaps or different lengths if one domain wasn't found on some days.

    // Create a superset of all dates returned
    const allDates = new Set();
    ranks1.forEach(r => allDates.add(r.date));
    ranks2.forEach(r => allDates.add(r.date));

    let sortedDates = Array.from(allDates).sort();

    // Verify range (optional client-side clip)
    const startDate = new Date(start);
    const endDate = new Date(end);

    sortedDates = sortedDates.filter(d => {
        const curr = new Date(d);
        return curr >= startDate && curr <= endDate;
    });

    const data1 = sortedDates.map(date => {
        const entry = ranks1.find(r => r.date === date);
        return entry ? entry.rank : null;
    });

    const data2 = sortedDates.map(date => {
        const entry = ranks2.find(r => r.date === date);
        return entry ? entry.rank : null;
    });

    return { labels: sortedDates, data1, data2 };
}

function renderChart(labels, data1, data2, label1, label2) {
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: label1,
                    data: data1,
                    borderColor: '#38bdf8', // accent-color
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0.1,
                    fill: false
                },
                {
                    label: label2,
                    data: data2,
                    borderColor: '#f472b6', // Pinkish for contrast
                    backgroundColor: 'rgba(244, 114, 182, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10
                },
                legend: {
                    labels: {
                        color: '#94a3b8'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    reverse: true, // Rank 1 is top
                    grid: {
                        color: '#334155',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    title: {
                        display: true,
                        text: 'Rank',
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

async function handleCompare() {
    const d1 = domain1Input.value.trim();
    const d2 = domain2Input.value.trim();
    const start = startDateInput.value;
    const end = endDateInput.value;

    if (!d1 || !d2) {
        alert('Please enter two domains to compare.');
        return;
    }

    loadingEl.textContent = 'Loading data... (First run may take a few minutes to download lists)';
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');

    try {
        const [ranks1, ranks2] = await Promise.all([
            fetchDomainData(d1),
            fetchDomainData(d2)
        ]);

        if (ranks1.length === 0 && ranks2.length === 0) {
            throw new Error('No data found for either domain.');
        }

        const { labels, data1, data2 } = processData(ranks1, ranks2, start, end);

        if (labels.length === 0) {
            throw new Error('No common data found in the selected range.');
        }

        renderChart(labels, data1, data2, d1, d2);
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    } finally {
        loadingEl.classList.add('hidden');
    }
}

compareBtn.addEventListener('click', handleCompare);

// Initial load
handleCompare();
