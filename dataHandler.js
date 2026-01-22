// Client-side data handler - no backend needed
class DataHandler {
    constructor() {
        this.loadedDomains = this.loadFromLocalStorage();
    }

    // Load data from localStorage
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('domainData');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            return {};
        }
    }

    // Save data to localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('domainData', JSON.stringify(this.loadedDomains));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }

    // Parse CSV file
    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    const ranks = [];

                    for (let line of lines) {
                        line = line.trim();
                        if (!line) continue;

                        const parts = line.split(',');
                        if (parts.length >= 2) {
                            let date = parts[0].trim();
                            const rank = parseInt(parts[1].trim());

                            if (date && !isNaN(rank)) {
                                // Convert YYYY-MM to YYYY-MM-01
                                if (date.length === 7 && date.match(/^\d{4}-\d{2}$/)) {
                                    date = date + '-01';
                                }
                                ranks.push({ date, rank });
                            }
                        }
                    }

                    // Sort by date
                    ranks.sort((a, b) => a.date.localeCompare(b.date));

                    resolve(ranks);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Upload and store CSV data
    async uploadCSV(file, domainName = null) {
        try {
            // Extract domain name from filename if not provided
            if (!domainName) {
                domainName = file.name.replace('.csv', '');
            }

            const ranks = await this.parseCSV(file);

            if (ranks.length === 0) {
                throw new Error('No valid data found in CSV file');
            }

            // Store domain data
            this.loadedDomains[domainName] = {
                domain: domainName,
                ranks: ranks,
                uploadDate: new Date().toISOString(),
                filename: file.name,
                size: file.size
            };

            this.saveToLocalStorage();

            return {
                success: true,
                domain: domainName,
                count: ranks.length
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    // Get available domains
    getAvailableDomains() {
        return Object.keys(this.loadedDomains).map(domain => ({
            domain: domain,
            filename: this.loadedDomains[domain].filename,
            size: this.loadedDomains[domain].size,
            uploadDate: this.loadedDomains[domain].uploadDate,
            count: this.loadedDomains[domain].ranks.length
        }));
    }

    // Get ranks for a domain with date filtering
    getRanks(domain, startDate = null, endDate = null) {
        const domainData = this.loadedDomains[domain];

        if (!domainData) {
            return [];
        }

        let ranks = domainData.ranks;

        // Filter by date range if provided
        if (startDate && endDate) {
            ranks = ranks.filter(r => r.date >= startDate && r.date <= endDate);
        }

        return ranks;
    }

    // Delete a domain
    deleteDomain(domain) {
        if (this.loadedDomains[domain]) {
            delete this.loadedDomains[domain];
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Get suggestions based on query
    getSuggestions(query) {
        if (!query || query.length < 1) return [];

        const lowerQuery = query.toLowerCase();
        return Object.keys(this.loadedDomains)
            .filter(domain => domain.toLowerCase().includes(lowerQuery))
            .slice(0, 10);
    }

    // Check if domain exists
    hasDomain(domain) {
        return this.loadedDomains.hasOwnProperty(domain);
    }
}

// Create global instance
const dataHandler = new DataHandler();
