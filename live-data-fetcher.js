/**
 * Live Data Fetcher for BTC Hourly Analysis
 *
 * Fetches live 5-minute Bitcoin data from Coinbase API and merges with historical data
 * Provides auto-refresh capabilities without page reload
 */

class LiveDataFetcher {
  constructor(options = {}) {
    this.dataFile = options.dataFile || 'data/bitcoin_5m_combined.csv';
    this.refreshInterval = options.refreshInterval || 5 * 60 * 1000; // 5 minutes
    this.onDataUpdate = options.onDataUpdate || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.historicalData = [];
    this.liveData = [];
    this.lastTimestamp = null;
    this.isLive = false;
    this.refreshTimer = null;
    this.timeUpdateTimer = null;
    this.failureCount = 0;
    this.maxFailures = 3;
    this.enabled = options.enabled !== false; // Allow disabling via options
  }

  /**
   * Initialize and start live data fetching
   */
  async start() {
    // Check if live data is enabled
    if (!this.enabled) {
      console.log('Live data disabled by user');
      this.updateStatus('disabled', 'Live data disabled');
      return;
    }

    this.updateStatus('loading', 'Loading historical data...');

    try {
      // Load committed historical data
      await this.loadHistoricalData();

      // Check if we should skip fetch due to recent sync
      const lastSync = localStorage.getItem('btc-last-sync');
      const now = Date.now();
      if (lastSync) {
        const timeSinceSync = now - parseInt(lastSync);
        const fiveMinutes = 5 * 60 * 1000;

        if (timeSinceSync < fiveMinutes) {
          console.log(`Skipping fetch - last sync ${Math.floor(timeSinceSync / 1000)}s ago`);
          // Still merge data and show UI, just don't fetch
          const mergedData = this.getMergedData();
          this.onDataUpdate(mergedData);

          // Calculate remaining time until next 5-minute mark
          const remainingTime = fiveMinutes - timeSinceSync;
          this.startAutoRefresh(remainingTime);
          this.startTimeUpdates();
          this.isLive = true;
          this.updateStatus('live', `Live data active (last: ${this.getLastTimestampFormatted()})`);
          return;
        }
      }

      // Fetch live data to fill the gap
      await this.fetchLiveData();

      // Store sync time
      localStorage.setItem('btc-last-sync', now.toString());

      // Merge and notify
      const mergedData = this.getMergedData();
      this.onDataUpdate(mergedData);

      // Set up auto-refresh and time updates
      this.startAutoRefresh();
      this.startTimeUpdates();

      this.isLive = true;
      this.updateStatus('live', `Live data active (last: ${this.getLastTimestampFormatted()})`);

    } catch (error) {
      console.error('Failed to start live data:', error);
      this.updateStatus('error', `Failed to load data: ${error.message}`);
    }
  }

  /**
   * Load historical data from committed CSV file
   */
  async loadHistoricalData() {
    const response = await fetch(this.dataFile + '?t=' + Date.now()); // Cache bust
    if (!response.ok) {
      throw new Error(`Failed to load ${this.dataFile}: ${response.status}`);
    }

    const csvText = await response.text();
    this.historicalData = this.parseCSV(csvText);

    if (this.historicalData.length > 0) {
      this.lastTimestamp = new Date(this.historicalData[this.historicalData.length - 1].timestamp);
      console.log(`Loaded ${this.historicalData.length} historical bars, last: ${this.lastTimestamp.toISOString()}`);
    }
  }

  /**
   * Fetch live data from Coinbase API to fill the gap
   */
  async fetchLiveData() {
    if (!this.lastTimestamp) {
      console.log('No historical data, skipping live fetch');
      return;
    }

    // Calculate start time (5 minutes after last historical bar)
    const startTime = new Date(this.lastTimestamp.getTime() + 5 * 60 * 1000);
    const endTime = new Date();

    // Don't fetch if we're already up to date (within 5 minutes)
    if (endTime - startTime < 3 * 60 * 1000) { // 3 minute buffer
      console.log('Data is current, no live fetch needed');
      return;
    }

    console.log(`Fetching live data from ${startTime.toISOString()} to ${endTime.toISOString()}`);

    try {
      const url = 'https://api.exchange.coinbase.com/products/BTC-USD/candles';
      const params = new URLSearchParams({
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        granularity: '300' // 5 minutes
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 429) {
        throw new Error('Rate limited by Coinbase API');
      }

      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.status}`);
      }

      const candles = await response.json();

      if (candles && candles.length > 0) {
        // Convert Coinbase format to our format
        // Coinbase returns: [timestamp, low, high, open, close, volume]
        this.liveData = candles.map(candle => ({
          timestamp: new Date(candle[0] * 1000).toISOString(),
          open: candle[3],
          high: candle[2],
          low: candle[1],
          close: candle[4],
          volume: candle[5],
          source: 'coinbase-live'
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log(`Fetched ${this.liveData.length} live bars`);
        this.failureCount = 0; // Reset failure count on success
      }

    } catch (error) {
      console.error('Failed to fetch live data:', error);
      this.failureCount++;

      if (this.failureCount >= this.maxFailures) {
        this.updateStatus('error', 'Live updates paused due to API errors');
        this.stopAutoRefresh();
      }

      throw error;
    }
  }

  /**
   * Get merged historical + live data
   */
  getMergedData() {
    // Combine historical and live data, removing duplicates
    const allData = [...this.historicalData, ...this.liveData];

    // Remove duplicates by timestamp, keeping first occurrence
    const seen = new Set();
    const merged = allData.filter(bar => {
      const ts = bar.timestamp;
      if (seen.has(ts)) {
        return false;
      }
      seen.add(ts);
      return true;
    });

    // Sort by timestamp
    merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return merged;
  }

  /**
   * Start auto-refresh timer
   * If initialDelay is provided, waits that long before starting the regular interval
   */
  startAutoRefresh(initialDelay = null) {
    if (!this.enabled) return;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    const refreshFn = async () => {
      console.log('Auto-refreshing live data...');
      this.updateStatus('refreshing', 'Fetching latest data...');

      try {
        await this.fetchLiveData();
        localStorage.setItem('btc-last-sync', Date.now().toString());
        const mergedData = this.getMergedData();
        this.onDataUpdate(mergedData);
        this.updateStatus('live', `Live data active (last: ${this.getLastTimestampFormatted()})`);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    };

    // If we have an initial delay (for sync alignment), use setTimeout first
    if (initialDelay !== null && initialDelay > 0) {
      console.log(`Auto-refresh scheduled in ${Math.floor(initialDelay / 1000)}s, then every ${this.refreshInterval / 1000}s`);

      setTimeout(() => {
        // Do the first refresh
        refreshFn();

        // Then start regular interval
        this.refreshTimer = setInterval(refreshFn, this.refreshInterval);
      }, initialDelay);
    } else {
      // Start regular interval immediately
      this.refreshTimer = setInterval(refreshFn, this.refreshInterval);
      console.log(`Auto-refresh enabled (every ${this.refreshInterval / 1000}s)`);
    }
  }

  /**
   * Start time update timer (updates "x mins ago" every minute)
   */
  startTimeUpdates() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
    }

    // Update every 30 seconds
    this.timeUpdateTimer = setInterval(() => {
      if (this.isLive) {
        this.updateStatus('live', `Live data active (last: ${this.getLastTimestampFormatted()})`);
      }
    }, 30 * 1000);

    console.log('Time updates enabled (every 30s)');
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('Auto-refresh stopped');
    }
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
      console.log('Time updates stopped');
    }
  }

  /**
   * Manual refresh
   */
  async refresh() {
    console.log('Manual refresh triggered');
    this.updateStatus('refreshing', 'Refreshing...');

    try {
      // Reload historical data (in case new commit happened)
      await this.loadHistoricalData();

      // Fetch latest live data
      await this.fetchLiveData();

      // Store sync time
      localStorage.setItem('btc-last-sync', Date.now().toString());

      // Merge and notify
      const mergedData = this.getMergedData();
      this.onDataUpdate(mergedData);

      this.updateStatus('live', `Refreshed (last: ${this.getLastTimestampFormatted()})`);
    } catch (error) {
      console.error('Refresh failed:', error);
      this.updateStatus('error', `Refresh failed: ${error.message}`);
    }
  }

  /**
   * Update status and notify listeners
   */
  updateStatus(status, message) {
    this.onStatusChange({
      status, // 'loading', 'live', 'refreshing', 'error'
      message,
      timestamp: new Date(),
      liveBarCount: this.liveData.length,
      historicalBarCount: this.historicalData.length,
      lastTimestamp: this.lastTimestamp
    });
  }

  /**
   * Get last timestamp formatted
   */
  getLastTimestampFormatted() {
    const mergedData = this.getMergedData();
    if (mergedData.length === 0) return 'N/A';

    const lastBar = mergedData[mergedData.length - 1];
    const ts = new Date(lastBar.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - ts) / 1000 / 60);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes === 1) return '1 min ago';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}m ago`;
  }

  /**
   * Parse CSV text into array of objects
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj = {};

      headers.forEach((header, index) => {
        let value = values[index] ? values[index].trim() : '';

        // Convert numeric fields
        if (['open', 'high', 'low', 'close', 'volume'].includes(header)) {
          value = parseFloat(value);
        }

        obj[header] = value;
      });

      data.push(obj);
    }

    return data;
  }

  /**
   * Stop all operations
   */
  stop() {
    this.stopAutoRefresh();
    this.isLive = false;
    this.updateStatus('stopped', 'Live data stopped');
  }

  /**
   * Enable live data updates
   */
  enable() {
    this.enabled = true;
    localStorage.setItem('btc-live-data-enabled', 'true');
    if (!this.isLive) {
      this.start();
    }
  }

  /**
   * Disable live data updates
   */
  disable() {
    this.enabled = false;
    localStorage.setItem('btc-live-data-enabled', 'false');
    this.stopAutoRefresh();
    this.isLive = false;
    this.updateStatus('disabled', 'Live data disabled');
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isLive: this.isLive,
      enabled: this.enabled,
      liveBarCount: this.liveData.length,
      historicalBarCount: this.historicalData.length,
      lastTimestamp: this.lastTimestamp,
      failureCount: this.failureCount
    };
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.LiveDataFetcher = LiveDataFetcher;
}

// Export for Node.js (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiveDataFetcher;
}
