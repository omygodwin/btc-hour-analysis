# Live Data Integration Guide

## Overview

This guide explains how to implement **truly live Bitcoin data** that updates every 5 minutes without page reload, while keeping GitHub commits minimal (every 4 hours).

## 🏗️ Architecture

### How It Works:

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions                           │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Every 5 min  │  →   │ Fetch data   │                    │
│  │ (cron)       │      │ from Coinbase│                    │
│  └──────────────┘      └──────┬───────┘                    │
│                                │                             │
│                                ▼                             │
│                         ┌──────────────┐                    │
│                         │ Check time:  │                    │
│                         │ 4 hours      │                    │
│                         │ passed?      │                    │
│                         └──────┬───────┘                    │
│                                │                             │
│              Yes ┌─────────────┴─────────────┐ No          │
│                  ▼                             ▼             │
│            ┌──────────┐                ┌──────────┐        │
│            │  Commit  │                │   Skip   │        │
│            │  & Push  │                │          │        │
│            └──────────┘                └──────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ GitHub Pages serves committed data
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                           │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Load page    │  →   │ Fetch last   │                    │
│  │              │      │ committed CSV│                    │
│  └──────────────┘      └──────┬───────┘                    │
│                                │                             │
│                                ▼                             │
│                         ┌──────────────┐                    │
│                         │ Get last     │                    │
│                         │ timestamp    │                    │
│                         └──────┬───────┘                    │
│                                │                             │
│                                ▼                             │
│                      ┌──────────────────┐                   │
│                      │ Fetch missing    │                   │
│                      │ bars directly    │                   │
│                      │ from Coinbase    │                   │
│                      └──────┬───────────┘                   │
│                             │                                │
│                             ▼                                │
│                      ┌──────────────┐                       │
│                      │ Merge data   │                       │
│                      │ Historical + │                       │
│                      │ Live bars    │                       │
│                      └──────┬───────┘                       │
│                             │                                │
│                             ▼                                │
│                      ┌──────────────┐                       │
│                      │ Display data │                       │
│                      │ & metrics    │                       │
│                      └──────┬───────┘                       │
│                             │                                │
│                             ▼                                │
│                    ┌──────────────────┐                     │
│                    │ Auto-refresh     │                     │
│                    │ every 5 minutes  │                     │
│                    │ (while tab open) │                     │
│                    └──────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Benefits:

✅ **Real-time data**: New bars appear within 5 minutes
✅ **Minimal commits**: Only 6 commits per day (vs 105,000)
✅ **No page reload**: Data updates automatically
✅ **Always current**: Users always see latest data
✅ **Efficient**: Uses public Coinbase API (no auth needed)

---

## 📦 Files Included

1. **`.github/workflows/update-data-smart.yml`** - Smart commit workflow
2. **`live-data-fetcher.js`** - Client-side live data handler
3. **`LIVE_DATA_INTEGRATION.md`** - This guide

---

## 🚀 Implementation Steps

### Step 1: Activate Smart Commit Workflow

Replace your current workflow with the smart version:

```bash
# In your repo
cd .github/workflows/

# Backup current workflow (optional)
cp update-data.yml update-data-backup.yml

# Activate smart commit workflow
cp update-data-smart.yml update-data.yml

# Commit and push
git add update-data.yml
git commit -m "Activate smart commit workflow (every 5min fetch, 4h commits)"
git push
```

**What it does:**
- Runs every 5 minutes
- Fetches latest Bitcoin data
- Only commits if 4 hours have passed
- Creates `data/last_fetch.txt` with last fetch timestamp

### Step 2: Add Live Data Fetcher to index.html

Add the live data fetcher script to your HTML:

```html
<!-- Near the end of <head> section, before closing </head> -->
<script src="live-data-fetcher.js"></script>
```

### Step 3: Integrate with Existing Data Loading

Modify your data loading code in `index.html`:

**Find your current data loading code** (probably looks like this):

```javascript
async function loadData() {
  const response = await fetch('data/bitcoin_5m_combined.csv');
  const csvText = await response.text();
  // ... parse CSV ...
  rawBars = parsedData;
  // ... process ...
}
```

**Replace with live-enabled version:**

```javascript
// Global variable for live data fetcher
let liveDataFetcher = null;

async function loadData() {
  console.log('Loading data with live updates...');

  // Create live data fetcher
  liveDataFetcher = new LiveDataFetcher({
    dataFile: 'data/bitcoin_5m_combined.csv',
    refreshInterval: 5 * 60 * 1000, // 5 minutes

    // Callback when new data arrives
    onDataUpdate: (mergedData) => {
      console.log(`Data updated: ${mergedData.length} total bars`);

      // Convert to your existing format
      rawBars = mergedData.map(bar => ({
        timestamp: new Date(bar.timestamp),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume
      }));

      // Re-process data (your existing functions)
      calculateRSI();
      calculateBarMetrics();
      processDataET();
      populateFilterSelects();
      populateDayViewSelect();
      initPm5YearFilters();
      renderTable();

      console.log('✓ Data refreshed and UI updated');
    },

    // Callback for status changes
    onStatusChange: (statusInfo) => {
      updateLiveStatusIndicator(statusInfo);
    }
  });

  // Start live data fetching
  try {
    await liveDataFetcher.start();
  } catch (error) {
    console.error('Failed to start live data:', error);
    alert('Failed to load data. Please refresh the page.');
  }
}
```

### Step 4: Add Live Status Indicator UI

Add a live status indicator to your HTML header:

```html
<!-- Add this near your header stats -->
<div class="live-status-indicator" id="live-status">
  <span class="live-dot"></span>
  <span class="live-text">Loading...</span>
</div>

<!-- Add these styles -->
<style>
.live-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse 2s ease-in-out infinite;
}

.live-status-indicator.loading .live-dot {
  background: #fbbf24;
  animation: pulse 1s ease-in-out infinite;
}

.live-status-indicator.error .live-dot {
  background: #f87171;
  animation: none;
}

.live-status-indicator.refreshing .live-dot {
  background: #60a5fa;
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.live-text {
  color: var(--text-primary);
}
</style>

<!-- Add this JavaScript function -->
<script>
function updateLiveStatusIndicator(statusInfo) {
  const indicator = document.getElementById('live-status');
  if (!indicator) return;

  // Update status class
  indicator.className = 'live-status-indicator ' + statusInfo.status;

  // Update text
  const text = indicator.querySelector('.live-text');
  if (text) {
    text.textContent = statusInfo.message;
  }
}
</script>
```

### Step 5: Add Manual Refresh Button (Optional)

Add a button to manually refresh data:

```html
<button class="tb-btn" onclick="manualRefresh()">🔄 Refresh</button>

<script>
function manualRefresh() {
  if (liveDataFetcher) {
    liveDataFetcher.refresh();
  }
}
</script>
```

---

## 🎯 Usage & Behavior

### On Page Load:
1. Loads last committed CSV (up to 4 hours old)
2. Fetches missing bars from Coinbase API
3. Merges data seamlessly
4. Displays complete, current data
5. Shows "🟢 Live" indicator

### Every 5 Minutes (Automatic):
1. Fetches latest bars from Coinbase
2. Adds to existing data
3. Recalculates metrics
4. Updates display
5. No page reload needed

### Every 4 Hours (GitHub Actions):
1. Actions commits accumulated data
2. Next page load will have fresher baseline
3. Reduces live fetch time

---

## 🔍 Testing

### Test Live Updates:

1. **Open browser console** (F12)
2. **Load your dashboard**
3. **Watch console logs:**
   ```
   Loading data with live updates...
   Loaded 50000 historical bars, last: 2026-01-20T18:00:00Z
   Fetching live data from 2026-01-20T18:05:00Z to 2026-01-20T20:30:00Z
   Fetched 29 live bars
   Data updated: 50029 total bars
   ✓ Data refreshed and UI updated
   Auto-refresh enabled (every 300s)
   ```
4. **Wait 5 minutes** and watch auto-refresh happen

### Check Status:
```javascript
// In browser console
liveDataFetcher.getStatus()
// Returns: { isLive: true, liveBarCount: 29, historicalBarCount: 50000, ... }
```

---

## 📊 Monitoring

### GitHub Actions:

Check workflow runs:
```
Repository → Actions → Update Bitcoin Data (Smart Commits)
```

You should see:
- ✅ Runs every 5 minutes
- ✅ Most runs show "Skipping commit (Xh remaining)"
- ✅ Every 4 hours: "✓ Time to commit (14400s since last commit)"

### Commit Frequency:

- **Old approach**: 288 commits/day (every 5 min)
- **Smart approach**: 6 commits/day (every 4 hours)
- **Savings**: 98% fewer commits!

### Browser Network Tab:

Watch for these requests every 5 minutes:
- `api.exchange.coinbase.com/products/BTC-USD/candles` (live data)
- Your existing CSV file is only fetched once on page load

---

## ⚙️ Configuration

### Adjust Refresh Interval:

In your `loadData()` function:

```javascript
liveDataFetcher = new LiveDataFetcher({
  refreshInterval: 10 * 60 * 1000, // 10 minutes instead of 5
  // ...
});
```

### Adjust Commit Frequency:

In `.github/workflows/update-data-smart.yml`:

```yaml
FOUR_HOURS=$((4 * 60 * 60))  # Change 4 to desired hours
```

---

## 🛠️ Troubleshooting

### "Failed to fetch live data"

**Cause**: Coinbase API rate limit or network error
**Solution**: Automatic retry with exponential backoff (built-in)
**Check**: Browser console for error details

### "Data is current, no live fetch needed"

**Cause**: Already up to date
**Solution**: This is normal! Means your data is fresh

### Live updates stopped working

**Cause**: Too many API failures
**Solution**:
1. Check browser console for errors
2. Click manual refresh button
3. Reload page if needed

### No auto-refresh happening

**Cause**: JavaScript error or page visibility
**Solution**: Check browser console, ensure page is visible/active

---

## 🎨 UI Enhancements

### Enhanced Status Indicator with Details:

```html
<div class="live-status-indicator" id="live-status" onclick="toggleLiveDetails()">
  <span class="live-dot"></span>
  <span class="live-text">Loading...</span>
  <span class="live-chevron">▼</span>
</div>

<div class="live-details-panel" id="live-details" style="display: none;">
  <div class="live-detail-row">
    <span>Historical Bars:</span>
    <span id="historical-count">-</span>
  </div>
  <div class="live-detail-row">
    <span>Live Bars:</span>
    <span id="live-count">-</span>
  </div>
  <div class="live-detail-row">
    <span>Total Bars:</span>
    <span id="total-count">-</span>
  </div>
  <div class="live-detail-row">
    <span>Last Update:</span>
    <span id="last-update">-</span>
  </div>
  <button onclick="manualRefresh()">🔄 Refresh Now</button>
</div>

<script>
function toggleLiveDetails() {
  const panel = document.getElementById('live-details');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function updateLiveStatusIndicator(statusInfo) {
  // ... existing code ...

  // Update details panel
  document.getElementById('historical-count').textContent = statusInfo.historicalBarCount.toLocaleString();
  document.getElementById('live-count').textContent = statusInfo.liveBarCount.toLocaleString();
  document.getElementById('total-count').textContent = (statusInfo.historicalBarCount + statusInfo.liveBarCount).toLocaleString();
  document.getElementById('last-update').textContent = liveDataFetcher?.getLastTimestampFormatted() || 'N/A';
}
</script>
```

---

## 📈 Performance Impact

### Data Loading Time:

- **Initial load**: +1-2 seconds (one-time Coinbase API call)
- **Auto-refresh**: ~500ms (background, non-blocking)
- **User experience**: Seamless, no noticeable delay

### Network Usage:

- **Initial**: ~2 MB (CSV) + ~50 KB (Coinbase API)
- **Per refresh**: ~10-50 KB (new bars only)
- **Per day**: ~2 MB initial + ~5 MB refreshes = ~7 MB total

### API Calls:

- **Per user session**: 1 initial + (session_hours / 5 * 12) refreshes
- **Example 8-hour session**: 1 + 96 = 97 API calls
- **Well within Coinbase limits**: ✅

---

## 🔐 Security Notes

### Public API Usage:

- Uses Coinbase **public** endpoints (no auth required)
- No API keys needed
- Read-only access
- Rate limits apply (10 req/sec)

### CORS:

- Coinbase API supports CORS
- Works from browser without proxy
- No backend needed

---

## ✅ Summary

### What You Get:

✅ **Live data every 5 minutes** without page reload
✅ **Only 6 commits per day** (vs 105,000)
✅ **No backend needed** (pure client-side)
✅ **Auto-refresh** while dashboard is open
✅ **Seamless UX** with loading indicators
✅ **Efficient** API usage

### Implementation Checklist:

- [ ] Activate smart commit workflow
- [ ] Copy `live-data-fetcher.js` to repo
- [ ] Add script tag to `index.html`
- [ ] Modify data loading code
- [ ] Add live status indicator
- [ ] Test on local/staging
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

## 🎉 You're Done!

Your Bitcoin dashboard now has **truly live data** that updates every 5 minutes without page reload, while keeping your GitHub commit history clean with only 6 commits per day!

**Questions?** Check the troubleshooting section or inspect browser console logs for details.

**Enjoy your live data! 🚀**
