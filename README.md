# BTC Hourly Analysis Dashboard

A comprehensive Bitcoin price analysis dashboard that processes 5-minute OHLCV data and presents it in multiple analytical views.

## 🚀 Live Dashboard

**[Open Dashboard](https://omygodwin.github.io/btc-hour-analysis/)**

## ✨ Features

### Views
- **Overview** - Main analysis grid with configurable columns and filters
- **Day View** - Detailed hourly breakdown for a specific day with 5-minute bar analysis
- **Hour View** - Historical analysis of a specific hour across all days
- **Calendar** - Heat map visualization of daily performance

### Analysis Metrics
- Range & Level analysis (configurable level size, default $250)
- Cumulative day tracking (CDR, CURng, CDUp, CDDn)
- Max Drawdown & Reversal with reset indicators
- Ultimate RSI with configurable parameters
- Green bar counts and momentum indicators

### Visual Features
- Gradient coloring for quick pattern recognition
- Border indicators for new highs/lows
- Mobile-responsive design
- Dark theme optimized for trading

## 📊 Data Updates

Data is automatically updated every hour via GitHub Actions. The workflow:
1. Fetches new 5-minute candles from Coinbase
2. Merges with existing data (no duplicates)
3. Commits changes to the `data/` directory

### Manual Update
You can also trigger a manual update:
1. Go to **Actions** tab
2. Select **Update Bitcoin Data**
3. Click **Run workflow**

## 🛠️ Setup Your Own Instance

### 1. Fork this Repository
Click the **Fork** button at the top right of this page.

### 2. Enable GitHub Pages
1. Go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **root**
4. Save

### 3. Enable GitHub Actions
1. Go to **Actions** tab
2. Click **I understand my workflows, go ahead and enable them**

### 4. Update Repository Settings
The workflow needs write permissions:
1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select **Read and write permissions**
3. Save

### 5. Access Your Dashboard
After a few minutes, your dashboard will be available at:
```
https://YOUR_USERNAME.github.io/btc-hourly-analysis/
```

## 📁 Repository Structure

```
btc-hourly-analysis/
├── index.html              # Main dashboard (GitHub Pages entry)
├── fetch_bitcoin_data.py   # Data fetcher script
├── data/
│   ├── bitcoin_5m_coinbase.csv    # Coinbase data
│   └── bitcoin_5m_combined.csv    # Combined data file
└── .github/
    └── workflows/
        └── update-data.yml        # Hourly update workflow
```

## 📱 Mobile Support

The dashboard is mobile-responsive with:
- Touch-friendly controls
- Compact view options
- Floating action menu
- Optimized scrolling

## 🔧 Local Development

### Using the Dashboard Locally
1. Download `index.html`
2. Open in any modern browser
3. Load a CSV file with the format: `timestamp,open,high,low,close,volume`

### Running the Data Fetcher Locally
```bash
pip install pandas requests
python fetch_bitcoin_data.py
```

## 📝 CSV Format

The dashboard expects CSV files with these columns:
```
timestamp,open,high,low,close,volume[,source]
2025-01-01 00:00:00+00:00,94250.5,94300.0,94200.0,94275.0,125.5,coinbase
```

- `timestamp`: ISO format with timezone (UTC)
- `open`, `high`, `low`, `close`: Price values
- `volume`: Trading volume
- `source`: (optional) Data source identifier

## ⚙️ Configuration

### Dashboard Settings
- **Level Size**: Configurable price increment (default: $250)
- **Hour Range**: Filter specific trading hours
- **Day Filters**: Filter by day of week
- **Column Selection**: Show/hide specific metrics

### RSI Parameters
- RSI Length (default: 9)
- RSI Method: RMA, EMA, or SMA
- Signal Length (default: 5)
- OB/OS Levels (default: 88/12)

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ₿ and ☕
