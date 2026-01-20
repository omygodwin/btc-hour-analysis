# 5-Minute Update Implementation Guide

## Overview

This guide explains how to change your Bitcoin data updates from **hourly** to **every 5 minutes**.

## ✅ Safety Analysis

### GitHub Actions Limits
- **Public repos**: ✅ Unlimited minutes (your repo is public)
- **5-min frequency**: 288 runs/day = ~288 minutes/day
- **Cost**: $0

### Coinbase API Limits
- **Current usage**: ~576 API calls/day (288 runs × 2 calls)
- **API limit**: 10 requests/second = 864,000/day
- **Your usage**: 0.00067% of limit ✅

### Repository Size
- **Commits/day**: Varies by strategy (see options below)
- **Data growth**: ~20-50 KB per 5-minute update
- **Recommendations**: Use Option 2 or 3 to minimize commits

---

## 🎯 Three Implementation Options

### Option 1: Simple (Every 5 Minutes, All Commits)

**File**: Keep existing `.github/workflows/update-data.yml`

**Change**:
```yaml
schedule:
  - cron: '*/5 * * * *'  # Changed from '5 * * * *'
```

**Commits**: 288/day = 105,120/year

**Pros**:
- Simplest to implement (1 line change)
- Full commit history
- Every update tracked

**Cons**:
- Repository grows large (~2GB/year from commits)
- Many commits to scroll through

**Best for**: Short-term testing or if you want every update logged

---

### Option 2: Recommended (Every 5 Minutes, Hourly Commits)

**File**: Use `.github/workflows/update-data-5min.yml` (already created)

**How it works**:
- Fetches data every 5 minutes
- Only commits on the hour (minutes :00-:05)
- Data file still updates in workspace (just not committed)

**Commits**: 24/day = 8,760/year

**Pros**:
- Data updates every 5 minutes
- Reasonable commit history
- Clean repository
- GitHub Pages updates hourly (fast enough)

**Cons**:
- If action fails between commits, data might be lost
- Not every update is committed

**Best for**: Most users - balances freshness with cleanliness

---

### Option 3: Optimized (Every 5 Minutes, One Commit/Day)

**File**: Use `.github/workflows/update-data-5min-optimized.yml` (already created)

**How it works**:
- Fetches data every 5 minutes
- First update of day: creates new commit
- Subsequent updates: amends the day's commit
- Result: One commit per day, always up to date

**Commits**: 1/day = 365/year

**Pros**:
- Minimal commit history
- Data updates every 5 minutes
- Cleanest repository
- Uses `--force-with-lease` (safe force push)

**Cons**:
- Rewrites commit history (acceptable for data updates)
- Slightly more complex

**Best for**: Long-term production use

---

## 🚀 How to Implement

### Step 1: Choose Your Option

**Quick Decision Matrix**:
| Priority | Recommended Option |
|----------|-------------------|
| Simplest | Option 1 |
| Balanced | Option 2 ⭐ |
| Cleanest | Option 3 |

### Step 2: Update Workflow File

**For Option 1**:
```bash
# Edit existing file
nano .github/workflows/update-data.yml

# Change this line:
- cron: '5 * * * *'

# To this:
- cron: '*/5 * * * *'
```

**For Option 2** (Recommended):
```bash
# Rename the new file to replace the old one
mv .github/workflows/update-data-5min.yml .github/workflows/update-data.yml
```

**For Option 3**:
```bash
# Use the optimized version
mv .github/workflows/update-data-5min-optimized.yml .github/workflows/update-data.yml
```

### Step 3: Commit and Push

```bash
git add .github/workflows/
git commit -m "Update data fetching to run every 5 minutes"
git push
```

### Step 4: Verify It's Working

1. Go to your GitHub repo
2. Click **Actions** tab
3. Watch for the workflow to run (within 5 minutes)
4. Check that data is updating in the `data/` folder

---

## 📊 Expected Behavior

### All Options:

**Data Freshness**:
- New 5-minute candles appear within 5-10 minutes
- No gaps in data (script catches up if it misses a run)

**API Calls**:
- ~1-2 requests per run
- Well within Coinbase limits
- Auto-retry on rate limits

**Action Runtime**:
- ~30-60 seconds per run
- Mostly API wait time
- Very efficient

---

## 🔧 Advanced: Custom Schedule

If you want a different frequency, use cron syntax:

```yaml
# Every 10 minutes
- cron: '*/10 * * * *'

# Every 15 minutes
- cron: '*/15 * * * *'

# Every 1 minute (not recommended - too aggressive)
- cron: '* * * * *'

# Every 5 minutes during trading hours only (9 AM - 4 PM UTC)
- cron: '*/5 9-15 * * *'
```

---

## 🐛 Troubleshooting

### Action Fails with "Rate Limited"
- Script has auto-retry logic
- Should resolve automatically
- If persists, increase `time.sleep(0.4)` in fetch script

### Commits Not Appearing
- Check Actions tab for errors
- Verify workflow file syntax
- Ensure `permissions: contents: write` is set

### Data Gaps
- Script automatically fills gaps on next run
- Check if Coinbase API was down
- Manual trigger: Actions → Update Bitcoin Data → Run workflow

---

## 📈 Monitoring

Track your updates:
1. **Actions tab**: See all workflow runs
2. **Data file**: Check `data/bitcoin_5m_coinbase.csv` timestamp
3. **Commits**: Watch for auto-update commits

---

## 🔄 Reverting to Hourly

If you want to go back:

```yaml
schedule:
  - cron: '5 * * * *'  # Hourly at :05
```

---

## 💡 Tips

1. **Start with Option 2** (recommended) - test for a week
2. **Monitor Actions usage** in Settings → Actions → Usage this month
3. **Check data quality** after a few days
4. **Switch to Option 3** if you want cleaner history later

---

## ❓ FAQ

**Q: Will this use up my GitHub Actions minutes?**
A: No! Public repos have unlimited minutes.

**Q: Will I hit Coinbase API limits?**
A: No. You're using 0.00067% of the limit.

**Q: What if an action fails?**
A: Next run will catch up and fetch missing data automatically.

**Q: Can I run even more frequently?**
A: Yes, but every 5 minutes is GitHub's recommended minimum. Going faster may cause issues.

**Q: How do I manually trigger an update?**
A: Actions tab → Update Bitcoin Data → Run workflow button

**Q: Will this affect GitHub Pages deployment?**
A: Option 1: Deploys every 5 min. Options 2-3: Deploys hourly or daily (still fast enough).

---

## 📝 Summary

| Option | Runs | Commits | Repo Size/Year | Recommended For |
|--------|------|---------|----------------|-----------------|
| 1. Simple | Every 5m | 105K/year | ~2GB | Testing |
| 2. Balanced | Every 5m | 8,760/year | ~175MB | **Most users** ⭐ |
| 3. Optimized | Every 5m | 365/year | ~7MB | Production |

**My recommendation**: Start with **Option 2**, which gives you 5-minute data updates with hourly commits. It's the perfect balance of freshness and maintainability.

Good luck! 🚀
