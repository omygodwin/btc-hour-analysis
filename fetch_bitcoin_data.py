#!/usr/bin/env python3
"""
Bitcoin 5-Minute Data Fetcher for GitHub Actions
Fetches data from Coinbase and optionally Binance, stores in data/ directory
"""

import requests
import pandas as pd
from datetime import datetime, timezone, timedelta
import time
import os
import sys

# ==============================================================================
# CONFIGURATION
# ==============================================================================
DATA_DIR = 'data'
FILE_COINBASE = os.path.join(DATA_DIR, 'bitcoin_5m_coinbase.csv')
FILE_COMBINED = os.path.join(DATA_DIR, 'bitcoin_5m_combined.csv')

# How far back to go if no existing data (format: YYYY-MM-DD)
DEFAULT_START_DATE = '2025-01-01'

# Maximum days to fetch in one run (to avoid timeout in GitHub Actions)
MAX_DAYS_PER_RUN = 7

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def ensure_data_dir():
    """Create data directory if it doesn't exist"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"Created directory: {DATA_DIR}")

def get_last_timestamp(file_path):
    """Get the last timestamp from an existing CSV file"""
    if not os.path.exists(file_path):
        return None
    
    try:
        df = pd.read_csv(file_path)
        if df.empty or 'timestamp' not in df.columns:
            return None
        
        df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
        return df['timestamp'].max()
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")
        return None

def fetch_coinbase_data(start_dt, end_dt):
    """
    Fetch 5-minute candles from Coinbase Pro API
    
    Args:
        start_dt: datetime - Start time (UTC)
        end_dt: datetime - End time (UTC)
    
    Returns:
        pd.DataFrame with columns: timestamp, open, high, low, close, volume, source
    """
    print(f"\n{'='*60}")
    print("FETCHING COINBASE DATA")
    print(f"From: {start_dt}")
    print(f"To:   {end_dt}")
    print('='*60)
    
    all_data = []
    current = start_dt
    chunk_hours = 24  # Coinbase allows ~300 candles per request
    
    request_count = 0
    max_requests = 500  # Safety limit
    
    while current < end_dt and request_count < max_requests:
        chunk_end = min(current + timedelta(hours=chunk_hours), end_dt)
        
        # Don't fetch future data
        now = datetime.now(timezone.utc)
        if current > now:
            break
        if chunk_end > now:
            chunk_end = now
        
        try:
            url = 'https://api.exchange.coinbase.com/products/BTC-USD/candles'
            params = {
                'start': current.isoformat(),
                'end': chunk_end.isoformat(),
                'granularity': 300  # 5 minutes
            }
            
            response = requests.get(url, params=params, timeout=30)
            request_count += 1
            
            if response.status_code == 200:
                candles = response.json()
                if candles:
                    all_data.extend(candles)
                    print(f"  ✓ {current.strftime('%Y-%m-%d %H:%M')} - {len(candles)} candles")
                else:
                    print(f"  - {current.strftime('%Y-%m-%d %H:%M')} - Empty response")
            elif response.status_code == 429:
                print(f"  ! Rate limited, waiting 10s...")
                time.sleep(10)
                continue  # Retry same chunk
            else:
                print(f"  ! Error {response.status_code}: {response.text[:100]}")
        
        except requests.exceptions.Timeout:
            print(f"  ! Timeout at {current.strftime('%Y-%m-%d')}, retrying...")
            time.sleep(5)
            continue
        except Exception as e:
            print(f"  ! Exception: {e}")
        
        current = chunk_end
        time.sleep(0.4)  # Rate limiting
    
    if not all_data:
        print("No data fetched from Coinbase")
        return pd.DataFrame()
    
    # Convert to DataFrame
    # Coinbase returns: [timestamp, low, high, open, close, volume]
    df = pd.DataFrame(all_data, columns=['ts', 'low', 'high', 'open', 'close', 'volume'])
    df['timestamp'] = pd.to_datetime(df['ts'], unit='s', utc=True)
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].copy()
    df['source'] = 'coinbase'
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    print(f"\n✓ Total fetched: {len(df)} candles")
    return df

def update_dataset(filename, new_data):
    """
    Merge new data with existing file, removing duplicates
    
    Args:
        filename: Path to CSV file
        new_data: DataFrame with new candles
    
    Returns:
        Combined DataFrame
    """
    if new_data.empty:
        print(f"No new data to add to {filename}")
        if os.path.exists(filename):
            return pd.read_csv(filename, parse_dates=['timestamp'])
        return pd.DataFrame()
    
    if os.path.exists(filename):
        print(f"Merging with existing {filename}...")
        existing = pd.read_csv(filename)
        existing['timestamp'] = pd.to_datetime(existing['timestamp'], utc=True)
        
        combined = pd.concat([existing, new_data], ignore_index=True)
        
        # Remove duplicates, keeping first (existing data takes priority)
        before_len = len(combined)
        combined = combined.drop_duplicates(subset=['timestamp'], keep='first')
        after_len = len(combined)
        
        if before_len > after_len:
            print(f"  Removed {before_len - after_len} duplicate candles")
    else:
        combined = new_data
    
    # Sort and save
    combined = combined.sort_values('timestamp').reset_index(drop=True)
    combined.to_csv(filename, index=False)
    
    print(f"✓ Saved {filename} ({len(combined):,} total records)")
    return combined

def main():
    print("\n" + "="*60)
    print("BITCOIN DATA UPDATER")
    print(f"Started at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("="*60)
    
    # Ensure data directory exists
    ensure_data_dir()
    
    # Determine start date
    last_ts = get_last_timestamp(FILE_COINBASE)
    
    if last_ts:
        # Start from next candle after last one we have
        start_dt = last_ts + timedelta(minutes=5)
        print(f"\nResuming from: {start_dt}")
    else:
        # Start fresh
        start_dt = datetime.strptime(DEFAULT_START_DATE, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        print(f"\nStarting fresh from: {start_dt}")
    
    # End date is now, but limit to MAX_DAYS_PER_RUN
    end_dt = datetime.now(timezone.utc)
    max_end = start_dt + timedelta(days=MAX_DAYS_PER_RUN)
    
    if end_dt > max_end:
        end_dt = max_end
        print(f"Limiting to {MAX_DAYS_PER_RUN} days: {end_dt}")
    
    # Check if we're already up to date
    if start_dt >= end_dt:
        print("\n✓ Data is already up to date!")
        return 0
    
    # Fetch Coinbase data
    new_coinbase = fetch_coinbase_data(start_dt, end_dt)
    
    # Update dataset
    final_data = update_dataset(FILE_COINBASE, new_coinbase)
    
    # Also save as combined file (for compatibility)
    if not final_data.empty:
        final_data.to_csv(FILE_COMBINED, index=False)
        print(f"✓ Saved {FILE_COMBINED}")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if not final_data.empty:
        first_ts = final_data['timestamp'].min()
        last_ts = final_data['timestamp'].max()
        print(f"Date range: {first_ts.strftime('%Y-%m-%d')} to {last_ts.strftime('%Y-%m-%d')}")
        print(f"Total candles: {len(final_data):,}")
    
    print(f"\nCompleted at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
