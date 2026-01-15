# GitHub Deployment Guide

## Quick Setup (5 minutes)

### Step 1: Create a New GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon (top right) → **New repository**
3. Name it: `btc-hourly-analysis`
4. Description: `Bitcoin Hourly Analysis Dashboard`
5. Keep it **Public** (required for free GitHub Pages)
6. **Don't** initialize with README (we'll push our files)
7. Click **Create repository**

### Step 2: Upload Files

**Option A: Using GitHub Web Interface (Easiest)**

1. On your new repository page, click **uploading an existing file**
2. Drag and drop ALL these files:
   - `index.html`
   - `fetch_bitcoin_data.py`
   - `README.md`
   - `.gitignore`
3. Click **Commit changes**
4. Create the folders:
   - Click **Add file** → **Create new file**
   - Type: `.github/workflows/update-data.yml`
   - Paste the contents of the workflow file
   - Commit
5. Create data folder:
   - Click **Add file** → **Create new file**
   - Type: `data/.gitkeep`
   - Commit

**Option B: Using Git Command Line**

```bash
# Navigate to the folder containing the files
cd /path/to/github-deploy

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: BTC Hourly Analysis Dashboard"

# Add your GitHub repo as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/btc-hourly-analysis.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (gear icon)
3. In the left sidebar, click **Pages**
4. Under "Source", select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes for deployment

Your dashboard will be live at:
```
https://YOUR_USERNAME.github.io/btc-hourly-analysis/
```

### Step 4: Enable GitHub Actions for Auto-Updates

1. Go to your repository
2. Click the **Actions** tab
3. If prompted, click **I understand my workflows, go ahead and enable them**

### Step 5: Configure Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Scroll to "Workflow permissions"
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### Step 6: Run Initial Data Fetch

1. Go to **Actions** tab
2. Click **Update Bitcoin Data** (left sidebar)
3. Click **Run workflow** (right side)
4. Click the green **Run workflow** button

This will:
- Fetch initial Bitcoin data from Coinbase
- Create the CSV files in `data/` folder
- Commit the data to your repository

### Step 7: Verify Everything Works

1. After the workflow completes (2-3 minutes), check:
   - `data/bitcoin_5m_coinbase.csv` exists
   - `data/bitcoin_5m_combined.csv` exists
2. Visit your dashboard URL
3. Click **📁 Load CSV** and select the combined CSV file from the data folder

---

## How It Works

### Automatic Updates

The GitHub Action runs every hour at minute :05 (1:05, 2:05, etc.):
1. Checks for new data since last update
2. Fetches from Coinbase API
3. Merges with existing data
4. Commits changes to repository

### Data Flow

```
Coinbase API → fetch_bitcoin_data.py → data/bitcoin_5m_coinbase.csv
                                     → data/bitcoin_5m_combined.csv
                                               ↓
                                        index.html (Dashboard)
```

### Manual Updates

You can trigger updates anytime:
1. Go to **Actions** → **Update Bitcoin Data**
2. Click **Run workflow**

---

## Troubleshooting

### Dashboard Not Loading?
- Wait 2-3 minutes after enabling Pages
- Check Settings → Pages shows "Your site is live"
- Make sure `index.html` is in the root directory

### Actions Not Running?
- Check Settings → Actions → General
- Ensure workflows are enabled
- Verify write permissions are granted

### No Data Appearing?
- Run the workflow manually first
- Check the workflow logs for errors
- Ensure the data folder has CSV files

### Rate Limiting Issues?
- Coinbase has rate limits
- The script includes delays to avoid this
- If issues persist, wait an hour and retry

---

## Customization

### Change Update Frequency

Edit `.github/workflows/update-data.yml`:

```yaml
on:
  schedule:
    # Every hour
    - cron: '5 * * * *'
    
    # Every 4 hours
    # - cron: '5 */4 * * *'
    
    # Every day at midnight
    # - cron: '0 0 * * *'
```

### Change Data Source

Edit `fetch_bitcoin_data.py` to:
- Add Binance support
- Change trading pair
- Adjust date range

---

## File Reference

| File | Purpose |
|------|---------|
| `index.html` | Main dashboard application |
| `fetch_bitcoin_data.py` | Data fetching script |
| `.github/workflows/update-data.yml` | Automated update schedule |
| `data/bitcoin_5m_coinbase.csv` | Coinbase price data |
| `data/bitcoin_5m_combined.csv` | Combined data for dashboard |

---

## Need Help?

1. Check the Actions tab for workflow errors
2. Review the README.md for features
3. Open an issue on GitHub

Good luck! 🚀
