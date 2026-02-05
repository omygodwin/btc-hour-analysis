# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bitcoin Hourly Analysis Dashboard - a browser-based trading analysis platform that processes 5-minute Bitcoin OHLCV data from Coinbase API. Deployed as a static GitHub Pages site with automated hourly data updates via GitHub Actions.

**Live Dashboard**: https://omygodwin.github.io/btc-hour-analysis/

## Architecture

```
GitHub Actions (every 5 min) → fetch_bitcoin_data.py → Coinbase API
                                      ↓
                              data/*.csv files
                                      ↓
                    index.html (GitHub Pages) ← live-data-fetcher.js
```

**Key files:**
- `index.html` - Single-file SPA (~12k lines) containing all HTML/CSS/JavaScript for the dashboard
- `fetch_bitcoin_data.py` - Python script for GitHub Actions data fetching
- `live-data-fetcher.js` - Client-side live data updates from Coinbase API
- `data/bitcoin_5m_combined.csv` - Main data file loaded by dashboard

## Development

### Dashboard (No Build Required)
Open `index.html` directly in a browser. The entire application is client-side JavaScript with no build step.

### Data Fetcher (Local Testing)
```bash
pip install pandas requests
python fetch_bitcoin_data.py
```

### Testing Workflows
Trigger manually via GitHub Actions tab → "Update Bitcoin Data" → "Run workflow"

## Data Format

CSV columns: `timestamp,open,high,low,close,volume,source`
- Timestamps are ISO format with UTC timezone
- Source is optional (e.g., "coinbase", "coinbase-live")

## GitHub Actions Workflows

Active workflow: `.github/workflows/update-data.yml` (smart commits)
- Fetches every 5 minutes
- Commits every 4 hours
- Alternative strategies available in other workflow files

## Code Conventions

- **Python**: snake_case functions (`fetch_coinbase_data`, `update_dataset`)
- **JavaScript**: camelCase functions (`calculateRSI`, `renderTable`, `applyColumnFilters`)
- **Data**: UTC timezone, deduplication by timestamp (keep first occurrence)

## Key JavaScript Function Categories (in index.html)

- **Data Loading**: `autoLoadData()`, `loadData()`, `processDataET()`
- **Metrics**: `calculateRSI()`, `calculateBarMetrics()`, `calcMaxToHour()`
- **UI Rendering**: `renderTable()`, `buildRealHours()`, `enhanceInfoPopups()`
- **Filtering**: `applyColumnFilters()`, `executeQuery()`, `addQueryFilter()`

## Coinbase API Details

- Endpoint: `https://api.exchange.coinbase.com/products/BTC-USD/candles`
- Granularity: 300 seconds (5 minutes)
- Public API - no authentication required
- Rate limit: 10 requests/second (script uses 0.4s delay between requests)
