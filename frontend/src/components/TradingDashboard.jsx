import React, { useState, useEffect, useCallback } from 'react';

const TradingDashboard = ({ userId, apiToken }) => {
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const withAuthHeaders = useCallback((headers = {}) => {
    if (!apiToken) return headers;
    return {
      ...headers,
      Authorization: `Bearer ${apiToken}`,
      'x-api-key': apiToken,
    };
  }, [apiToken]);

  const hasApiToken = Boolean(apiToken);

  const fetchTradingData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [accountRes, statsRes, priceRes, platformRes] = await Promise.all([
        fetch('/api/trading/account', {
          headers: withAuthHeaders({ 'x-user-id': userId })
        }),
        fetch('/api/trading/stats', {
          headers: withAuthHeaders({ 'x-user-id': userId })
        }),
        fetch('/api/trading/prices?tokens=BTC,ETH,USDT,BNB,SOL', {
          headers: withAuthHeaders()
        }),
        fetch('/api/trading/platform-stats', {
          headers: withAuthHeaders({
            'x-user-id': userId,
            'x-is-admin': 'true',
          })
        })
      ]);

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        setAccount(accountData.data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (priceRes.ok) {
        const priceData = await priceRes.json();
        setPrices(priceData.data);
      }

      if (platformRes.ok) {
        const platformData = await platformRes.json();
        setPlatformStats(platformData.data);
      }
    } catch (error) {
      console.error('Failed to fetch trading data:', error);
      setLoadError('Failed to load trading dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, withAuthHeaders]);

  useEffect(() => {
    fetchTradingData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTradingData, 30000);
    return () => clearInterval(interval);
  }, [fetchTradingData]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Loading trading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Trading Dashboard</h1>

      {!hasApiToken && (
        <div style={styles.warningBanner}>
          API token is missing in frontend env. Configure VITE_API_AUTH_TOKEN to enable trading actions.
        </div>
      )}

      {loadError && <div style={styles.feedbackError}>{loadError}</div>}

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {['overview', 'activity', 'analytics', 'scrapers', 'virtual-board', 'community'].map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.replace('-', ' ').slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={styles.content}>
          {/* Current Prices */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>💰 Current Prices</h2>
            <div style={styles.priceGrid}>
              {Object.entries(prices).map(([token, price]) => (
                <div key={token} style={styles.priceCard}>
                  <div style={styles.priceToken}>{token}</div>
                  <div style={styles.priceValue}>${typeof price === 'number' ? price.toFixed(2) : price}</div>
                </div>
              ))}
            </div>
          </div>

          {account && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🛡️ Exchange Access & Balances</h2>
              <div style={styles.statsGrid}>
                <StatCard label="Tier" value={account.profile?.tier || 'Bronze'} color="#7c4dff" />
                <StatCard label="Points" value={account.profile?.points || 0} />
                <StatCard label="Daily Limit" value={`$${Number(account.profile?.dailyVolumeLimit || 0).toFixed(0)}`} />
                <StatCard label="Max Trade" value={`$${Number(account.profile?.maxTradeSize || 0).toFixed(0)}`} />
                <StatCard label="Used Today" value={`$${Number(account.limits?.usedDailyVolume || 0).toFixed(2)}`} />
                <StatCard label="Remaining" value={`$${Number(account.limits?.remainingDailyVolume || 0).toFixed(2)}`} color="#2e7d32" />
              </div>
              <div style={styles.balanceGrid}>
                {(account.balances || []).map((balance) => (
                  <div key={balance.asset} style={styles.balanceCard}>
                    <div style={styles.priceToken}>{balance.asset}</div>
                    <div style={styles.balanceValue}>{Number(balance.balance || 0).toFixed(4)}</div>
                    <div style={styles.balanceHint}>Available</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Stats */}
          {stats && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>📊 Your Trading Stats</h2>
              <div style={styles.statsGrid}>
                <StatCard label="Total Trades" value={stats.totalTrades} />
                <StatCard label="Total Volume" value={`$${(stats.totalVolume || 0).toFixed(2)}`} />
                <StatCard label="Total Profit" value={`$${(stats.totalProfit || 0).toFixed(2)}`} color={stats.totalProfit >= 0 ? 'green' : 'red'} />
                <StatCard label="Win Rate" value={`${((stats.winRate || 0) * 100).toFixed(1)}%`} />
                <StatCard label="Average Trade Size" value={`$${(stats.averageTradeSize || 0).toFixed(2)}`} />
                <StatCard label="Profit %" value={`${(stats.profitPercent || 0).toFixed(2)}%`} color={stats.profitPercent >= 0 ? 'green' : 'red'} />
              </div>
            </div>
          )}

          {/* Platform Statistics */}
          {platformStats && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🌍 Platform Statistics</h2>
              <div style={styles.statsGrid}>
                <StatCard label="Platform Trades" value={platformStats.overall?.totalTrades || 0} />
                <StatCard label="Platform Volume" value={`$${(platformStats.overall?.totalVolume || 0).toFixed(2)}`} />
                <StatCard label="Platform Profit" value={`$${(platformStats.overall?.totalProfit || 0).toFixed(2)}`} color={'green'} />
                <StatCard label="Active Users" value={platformStats.topUsers?.length || 0} />
              </div>

              {/* Top Performers */}
              {platformStats.topUsers && platformStats.topUsers.length > 0 && (
                <div style={styles.topPerformers}>
                  <h3 style={styles.subsectionTitle}>🏆 Top Performers</h3>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Total Trades</th>
                        <th>Total Profit</th>
                        <th>Avg Profit %</th>
                        <th>Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformStats.topUsers.map((user, idx) => (
                        <tr key={idx}>
                          <td>{user.userId.substring(0, 16)}...</td>
                          <td>{user.totalTrades}</td>
                          <td style={{ color: user.totalProfit >= 0 ? 'green' : 'red' }}>
                            ${user.totalProfit.toFixed(2)}
                          </td>
                          <td>{(user.avgProfit || 0).toFixed(2)}%</td>
                          <td>${(user.totalVolume || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <TradeActivityTab userId={userId} apiToken={apiToken} withAuthHeaders={withAuthHeaders} />
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <AnalyticsTab userId={userId} apiToken={apiToken} withAuthHeaders={withAuthHeaders} />
      )}

      {/* Scrapers Tab */}
      {activeTab === 'scrapers' && (
        <ScraperManagementTab apiToken={apiToken} withAuthHeaders={withAuthHeaders} />
      )}

      {/* Virtual Trading Board */}
      {activeTab === 'virtual-board' && (
        <VirtualTradingBoardTab userId={userId} apiToken={apiToken} account={account} onTradeComplete={fetchTradingData} withAuthHeaders={withAuthHeaders} />
      )}

      {/* Community */}
      {activeTab === 'community' && (
        <CommunityHubTab userId={userId} apiToken={apiToken} withAuthHeaders={withAuthHeaders} />
      )}
    </div>
  );
};

// Trade Activity Tab Component
const TradeActivityTab = ({ userId, withAuthHeaders }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tradeType: '',
    exchange: '',
    status: '',
    limit: 50
  });

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.tradeType) params.append('tradeType', filters.tradeType);
      if (filters.exchange) params.append('exchange', filters.exchange);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', filters.limit);

      const response = await fetch(`/api/trading/user-trades?${params}`, {
        headers: withAuthHeaders({ 'x-user-id': userId })
      });

      if (response.ok) {
        const data = await response.json();
        setTrades(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, userId, withAuthHeaders]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return (
    <div style={styles.content}>
      <h2 style={styles.sectionTitle}>📈 Trade History</h2>

      <div style={styles.filterBar}>
        <select 
          value={filters.tradeType}
          onChange={(e) => setFilters({...filters, tradeType: e.target.value})}
          style={styles.filterInput}
        >
          <option value="">All Trade Types</option>
          <option value="crypto_to_usdt">Crypto → USDT</option>
          <option value="usdt_to_crypto">USDT → Crypto</option>
          <option value="crypto_swap">Crypto Swap</option>
          <option value="mixing">Mixing</option>
          <option value="staking">Staking</option>
        </select>

        <select 
          value={filters.exchange}
          onChange={(e) => setFilters({...filters, exchange: e.target.value})}
          style={styles.filterInput}
        >
          <option value="">All Exchanges</option>
          <option value="binance">Binance</option>
          <option value="uniswap">Uniswap</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
          <option value="internal">Internal</option>
        </select>

        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          style={styles.filterInput}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.spinner}>Loading trades...</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Profit/Loss</th>
              <th>Exchange</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, idx) => (
              <tr key={idx}>
                <td>{new Date(trade.createdAt).toLocaleDateString()}</td>
                <td>{trade.tradeType}</td>
                <td>{trade.fromToken}</td>
                <td>{trade.toToken}</td>
                <td>{trade.fromAmount.toFixed(4)}</td>
                <td style={{ color: trade.profit >= 0 ? 'green' : 'red' }}>
                  ${trade.profit.toFixed(2)} ({trade.profitPercent.toFixed(2)}%)
                </td>
                <td>{trade.exchange}</td>
                <td>{trade.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ userId, withAuthHeaders }) => {
  const [metrics, setMetrics] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trading/metrics/${period}`, {
        headers: withAuthHeaders({ 'x-user-id': userId })
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [period, userId, withAuthHeaders]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div style={styles.content}>
      <h2 style={styles.sectionTitle}>📊 Time-Series Analytics</h2>

      <div style={styles.periodButtons}>
        {['hourly', 'daily', 'weekly', 'monthly', 'yearly'].map(p => (
          <button
            key={p}
            style={{
              ...styles.periodButton,
              ...(period === p ? styles.periodButtonActive : {})
            }}
            onClick={() => setPeriod(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.spinner}>Loading analytics...</div>
      ) : (
        <div style={styles.metricsContainer}>
          {metrics.map((metric, idx) => (
            <div key={idx} style={styles.metricCard}>
              <div style={styles.metricDate}>
                {new Date(metric.timestamp).toLocaleDateString()}
              </div>
              <div style={styles.metricRow}>
                <span>Volume In:</span>
                <span>${metric.volumeIn.toFixed(2)}</span>
              </div>
              <div style={styles.metricRow}>
                <span>Volume Out:</span>
                <span>${metric.volumeOut.toFixed(2)}</span>
              </div>
              <div style={styles.metricRow}>
                <span>P&L:</span>
                <span style={{ color: metric.profitLoss >= 0 ? 'green' : 'red' }}>
                  ${metric.profitLoss.toFixed(2)}
                </span>
              </div>
              <div style={styles.metricRow}>
                <span>Trades:</span>
                <span>{metric.tradeCount}</span>
              </div>
              <div style={styles.metricRow}>
                <span>Avg Price:</span>
                <span>${metric.averagePrice.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Scraper Management Tab
const ScraperManagementTab = ({ withAuthHeaders }) => {
  const [scrapers, setScrapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchScrapers = useCallback(async () => {
    try {
      const response = await fetch('/api/scrapers', {
        headers: withAuthHeaders({ 'x-is-admin': 'true' })
      });

      if (response.ok) {
        const data = await response.json();
        setScrapers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch scrapers:', error);
    } finally {
      setLoading(false);
    }
  }, [withAuthHeaders]);

  useEffect(() => {
    fetchScrapers();
    const interval = setInterval(fetchScrapers, 5000);
    return () => clearInterval(interval);
  }, [fetchScrapers]);

  const handleScraperAction = async (scraperId, action) => {
    try {
      const response = await fetch(`/api/scrapers/${scraperId}/${action}`, {
        method: 'POST',
        headers: withAuthHeaders({ 'x-is-admin': 'true' })
      });

      if (response.ok) {
        fetchScrapers();
      }
    } catch (error) {
      console.error(`Failed to ${action} scraper:`, error);
    }
  };

  return (
    <div style={styles.content}>
      <h2 style={styles.sectionTitle}>🤖 Scraper & Crawler Management</h2>

      {loading ? (
        <div style={styles.spinner}>Loading scrapers...</div>
      ) : (
        <div>
          {scrapers.map(scraper => (
            <div key={scraper.id} style={styles.scraperCard}>
              <div style={styles.scraperHeader}>
                <h3>{scraper.name}</h3>
                <span style={{
                  ...styles.statusBadge,
                  ...{backgroundColor: 
                    scraper.status === 'active' ? '#4CAF50' :
                    scraper.status === 'paused' ? '#FFC107' :
                    scraper.status === 'error' ? '#F44336' : '#999'
                  }
                }}>
                  {scraper.status}
                </span>
              </div>
              <div style={styles.scraperStats}>
                <div>Total Runs: {scraper.totalRuns}</div>
                <div>Success Rate: {((scraper.successfulRuns / (scraper.totalRuns || 1)) * 100).toFixed(1)}%</div>
                <div>Consecutive Failures: {scraper.consecutiveFailures}</div>
                <div>Interval: {(scraper.interval / 1000).toFixed(0)}s</div>
              </div>
              <div style={styles.scraperActions}>
                {scraper.status === 'active' && (
                  <button 
                    style={styles.actionButton}
                    onClick={() => handleScraperAction(scraper.id, 'pause')}
                  >
                    ⏸ Pause
                  </button>
                )}
                {scraper.status === 'paused' && (
                  <button 
                    style={styles.actionButton}
                    onClick={() => handleScraperAction(scraper.id, 'resume')}
                  >
                    ▶ Resume
                  </button>
                )}
                <button 
                  style={styles.actionButton}
                  onClick={() => handleScraperAction(scraper.id, 'run')}
                >
                  ▶ Run Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Virtual Trading Board Tab
const VirtualTradingBoardTab = ({ userId, account, onTradeComplete, withAuthHeaders, apiToken }) => {
  const [fromToken, setFromToken] = useState('BTC');
  const [toToken, setToToken] = useState('USDT');
  const [amount, setAmount] = useState('1');
  const [topUpAsset, setTopUpAsset] = useState('USD');
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [mixAsset, setMixAsset] = useState('BTC');
  const [mixAmount, setMixAmount] = useState('0.05');
  const [stakeAsset, setStakeAsset] = useState('SOL');
  const [stakeAmount, setStakeAmount] = useState('25');
  const [stakeReward, setStakeReward] = useState('0.5');
  const [prices, setPrices] = useState({});
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/trading/prices', {
        headers: withAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPrices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  }, [withAuthHeaders]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handleSimulateTradeAPI = async () => {
    try {
      setLoading(true);
      setFeedback('');
      const response = await fetch('/api/trading/simulate-binance-trade', {
        method: 'POST',
        headers: withAuthHeaders({
          'Content-Type': 'application/json',
          'x-user-id': userId,
        }),
        body: JSON.stringify({
          fromToken,
          toToken,
          fromAmount: parseFloat(amount)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.data);
        setFeedback('Swap recorded successfully.');
        onTradeComplete?.();
      } else {
        const data = await response.json().catch(() => ({}));
        setFeedback(data.error || 'Trade simulation failed.');
      }
    } catch (error) {
      console.error('Trade simulation failed:', error);
      setFeedback('Trade simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (url, body, successMessage) => {
    try {
      setLoading(true);
      setFeedback('');
      const response = await fetch(url, {
        method: 'POST',
        headers: withAuthHeaders({
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-is-admin': 'true',
        }),
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(data.error || 'Action failed.');
        return;
      }

      if (data.data && !data.data.balances) {
        setResult(data.data);
      }
      setFeedback(successMessage);
      onTradeComplete?.();
    } catch (error) {
      console.error('Exchange action failed:', error);
      setFeedback('Exchange action failed.');
    } finally {
      setLoading(false);
    }
  };

  const tokens = Object.keys(prices);

  return (
    <div style={styles.content}>
      <h2 style={styles.sectionTitle}>📊 Virtual Trading Board</h2>

      {account && (
        <div style={styles.accountBanner}>
          <strong>{account.profile?.tier}</strong> tier account with <strong>${Number(account.limits?.remainingDailyVolume || 0).toFixed(2)}</strong> remaining today.
        </div>
      )}

      <div style={styles.tradingBoard}>
        <div style={styles.tradingForm}>
          <h3>Simulate Trade</h3>

          <div style={styles.formGroup}>
            <label>From Token:</label>
            <select 
              value={fromToken} 
              onChange={(e) => setFromToken(e.target.value)}
              style={styles.formInput}
            >
              {tokens.map(token => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label>Amount:</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={styles.formInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label>To Token:</label>
            <select 
              value={toToken} 
              onChange={(e) => setToToken(e.target.value)}
              style={styles.formInput}
            >
              {tokens.map(token => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>

          <button 
            style={styles.simulateButton}
            onClick={handleSimulateTradeAPI}
            disabled={loading || !apiToken}
          >
            {loading ? 'Simulating...' : 'Simulate Trade'}
          </button>

          <div style={styles.actionSection}>
            <h3>Top Up Balance</h3>
            <div style={styles.inlineFields}>
              <select value={topUpAsset} onChange={(e) => setTopUpAsset(e.target.value)} style={styles.formInput}>
                {['USD', 'BTC', 'ETH', 'SOL', 'BNB'].map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
              <input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} style={styles.formInput} />
            </div>
            <button
              style={styles.secondaryButton}
              onClick={() => runAction('/api/trading/account/top-up', { userId, asset: topUpAsset, amount: Number(topUpAmount) }, 'Balance topped up successfully.')}
              disabled={loading || !apiToken}
            >
              Admin Top Up
            </button>
          </div>

          <div style={styles.actionSection}>
            <h3>Mixer</h3>
            <div style={styles.inlineFields}>
              <select value={mixAsset} onChange={(e) => setMixAsset(e.target.value)} style={styles.formInput}>
                {['BTC', 'ETH', 'SOL'].map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
              <input type="number" value={mixAmount} onChange={(e) => setMixAmount(e.target.value)} style={styles.formInput} />
            </div>
            <button
              style={styles.secondaryButton}
              onClick={() => runAction('/api/trading/record-mixing', { cryptoType: mixAsset, amount: Number(mixAmount), mixingFeePercent: 0.5 }, 'Mixer transaction recorded.')}
              disabled={loading || !apiToken}
            >
              Record Mixer Trade
            </button>
          </div>

          <div style={styles.actionSection}>
            <h3>Staking Reward</h3>
            <div style={styles.inlineFieldsThree}>
              <select value={stakeAsset} onChange={(e) => setStakeAsset(e.target.value)} style={styles.formInput}>
                {['SOL', 'ETH', 'BNB'].map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
              <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} style={styles.formInput} />
              <input type="number" value={stakeReward} onChange={(e) => setStakeReward(e.target.value)} style={styles.formInput} />
            </div>
            <button
              style={styles.secondaryButton}
              onClick={() => runAction('/api/trading/record-staking', { cryptoType: stakeAsset, stakedAmount: Number(stakeAmount), rewardAmount: Number(stakeReward), apy: 12 }, 'Staking reward recorded.')}
              disabled={loading || !apiToken}
            >
              Record Staking Reward
            </button>
          </div>

          {feedback && <div style={styles.feedback}>{feedback}</div>}
        </div>

        {result && (
          <div style={styles.tradeResult}>
            <h3>Trade Result</h3>
            <div style={styles.resultRow}>
              <span>From Amount:</span>
              <span>{Number(result.fromAmount || 0).toFixed(4)} {result.fromToken}</span>
            </div>
            <div style={styles.resultRow}>
              <span>To Amount:</span>
              <span>{Number(result.toAmount || 0).toFixed(4)} {result.toToken}</span>
            </div>
            <div style={styles.resultRow}>
              <span>Entry Price:</span>
              <span>${Number(result.entryPrice || 0).toFixed(2)}</span>
            </div>
            <div style={styles.resultRow}>
              <span>Exit Price:</span>
              <span>${Number(result.exitPrice || 0).toFixed(2)}</span>
            </div>
            <div style={styles.resultRow}>
              <span>Exchange Fee:</span>
              <span>${Number(result.exchangeFee || 0).toFixed(2)}</span>
            </div>
            <div style={styles.resultRow}>
              <span>Platform Fee:</span>
              <span>${Number(result.platformFee || 0).toFixed(2)}</span>
            </div>
            <div style={{...styles.resultRow, fontSize: '16px', fontWeight: 'bold', color: Number(result.profit || 0) >= 0 ? 'green' : 'red'}}>
              <span>Profit/Loss:</span>
              <span>${Number(result.profit || 0).toFixed(2)} ({Number(result.profitPercent || 0).toFixed(2)}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CommunityHubTab = ({ userId, apiToken, withAuthHeaders }) => {
  const [leaderboardCategory, setLeaderboardCategory] = useState('points');
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState({ earned: [], total: 0 });
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [checkinMessage, setCheckinMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCommunityData = useCallback(async () => {
    try {
      setLoading(true);
      const [leaderboardRes, achievementsRes, checkinRes] = await Promise.all([
        fetch(`/api/community/leaderboard?category=${leaderboardCategory}&limit=10`, {
          headers: withAuthHeaders(),
        }),
        fetch('/api/achievements', {
          headers: withAuthHeaders({ 'x-user-id': userId }),
        }),
        fetch('/api/checkin/status', {
          headers: withAuthHeaders({ 'x-user-id': userId }),
        }),
      ]);

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.data || []);
      }

      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievements(data.data || { earned: [], total: 0 });
      }

      if (checkinRes.ok) {
        const data = await checkinRes.json();
        setCheckinStatus(data.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch community data:', error);
    } finally {
      setLoading(false);
    }
  }, [leaderboardCategory, userId, withAuthHeaders]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  const handleCheckin = async () => {
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          ...withAuthHeaders(),
        },
        body: JSON.stringify({ userId }),
      });

      const payload = await response.json();
      if (response.ok && payload?.success) {
        const msg = payload.data?.alreadyCheckedIn
          ? payload.data?.message
          : `+${payload.data?.pointsAwarded || 0} pts. ${payload.data?.message || 'Checked in.'}`;
        setCheckinMessage(msg);
        await fetchCommunityData();
      } else {
        setCheckinMessage(payload?.error || 'Check-in failed.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      setCheckinMessage(`Check-in failed: ${message}`);
    }
  };

  if (loading) {
    return (
      <div style={styles.content}>
        <h2 style={styles.sectionTitle}>🏆 Community Hub</h2>
        <div style={styles.spinner}>Loading community stats...</div>
      </div>
    );
  }

  return (
    <div style={styles.content}>
      <h2 style={styles.sectionTitle}>🏆 Community Hub</h2>

      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>✅ Daily Check-in</h3>
        <div style={styles.statsGrid}>
          <StatCard label="Checked In Today" value={checkinStatus?.checkedInToday ? 'Yes' : 'No'} color={checkinStatus?.checkedInToday ? '#2e7d32' : '#ef6c00'} />
          <StatCard label="Current Streak" value={`${checkinStatus?.currentStreak || 0} days`} />
          <StatCard label="Best Streak" value={`${checkinStatus?.longestStreak || 0} days`} />
          <StatCard label="Total Check-ins" value={checkinStatus?.totalCheckins || 0} />
        </div>
        <button
          style={{ ...styles.secondaryButton, marginTop: '12px', maxWidth: '280px' }}
          onClick={handleCheckin}
          disabled={checkinStatus?.checkedInToday || !apiToken}
        >
          {checkinStatus?.checkedInToday ? 'Checked In Today' : 'Claim Daily Check-in'}
        </button>
        {checkinMessage && <div style={styles.feedback}>{checkinMessage}</div>}
      </div>

      <div style={styles.section}>
        <div style={styles.communityHeader}>
          <h3 style={styles.subsectionTitle}>🥇 Leaderboard</h3>
          <select
            value={leaderboardCategory}
            onChange={(e) => setLeaderboardCategory(e.target.value)}
            style={styles.filterInput}
          >
            <option value="points">Points</option>
            <option value="volume">Volume</option>
            <option value="trades">Trades</option>
            <option value="profit">Profit</option>
          </select>
        </div>
        <div style={styles.leaderboardList}>
          {leaderboard.map((entry) => (
            <div key={`${entry.userId}-${entry.rank}`} style={styles.leaderboardRow}>
              <div style={styles.leaderboardRank}>#{entry.rank}</div>
              <div style={styles.leaderboardUser}>{entry.userId}</div>
              <div style={styles.leaderboardTier}>{entry.tier}</div>
              <div style={styles.leaderboardValue}>
                {leaderboardCategory === 'points' && `${entry.points} pts`}
                {leaderboardCategory === 'volume' && `$${Number(entry.totalVolume || 0).toFixed(2)}`}
                {leaderboardCategory === 'trades' && `${entry.totalTrades} trades`}
                {leaderboardCategory === 'profit' && `$${Number(entry.totalProfit || 0).toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>🏅 Achievements</h3>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Progress</div>
          <div style={styles.statValue}>{(achievements?.earned || []).length} / {achievements?.total || 0}</div>
        </div>
        <div style={styles.achievementGrid}>
          {(achievements?.earned || []).slice(0, 12).map((a) => (
            <div key={a.id} style={styles.achievementCard}>
              <div style={styles.achievementName}>{a.emoji} {a.name}</div>
              <div style={styles.achievementDesc}>{a.description}</div>
            </div>
          ))}
          {(achievements?.earned || []).length === 0 && (
            <div style={styles.feedback}>No achievements yet. Start trading, staking, and checking in daily.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatCard = ({ label, value, color = 'inherit' }) => (
  <div style={styles.statCard}>
    <div style={styles.statLabel}>{label}</div>
    <div style={{ ...styles.statValue, color }}>{value}</div>
  </div>
);

// Styles
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#333'
  },
  tabContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '2px solid #ddd'
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s'
  },
  tabActive: {
    color: '#2196F3',
    borderBottomColor: '#2196F3'
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333'
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#555'
  },
  priceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },
  priceCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'center'
  },
  priceToken: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '8px'
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2196F3'
  },
  balanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px',
    marginTop: '16px'
  },
  balanceCard: {
    backgroundColor: '#f2f7ff',
    border: '1px solid #d8e6ff',
    borderRadius: '8px',
    padding: '14px',
    textAlign: 'center'
  },
  balanceValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0d47a1'
  },
  balanceHint: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#607d8b'
  },
  accountBanner: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#e8f5e9',
    color: '#1b5e20'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px'
  },
  statCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '8px',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333'
  },
  filterBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  spinner: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  topPerformers: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px'
  },
  periodButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  periodButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
    color: '#fff',
    borderColor: '#2196F3'
  },
  metricsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px'
  },
  metricCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px'
  },
  metricDate: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee'
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '6px'
  },
  scraperCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px'
  },
  scraperHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600'
  },
  scraperStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '10px',
    fontSize: '13px',
    color: '#666'
  },
  scraperActions: {
    display: 'flex',
    gap: '10px'
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  tradingBoard: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  tradingForm: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  actionSection: {
    marginTop: '18px',
    paddingTop: '18px',
    borderTop: '1px solid #e0e0e0'
  },
  inlineFields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    marginBottom: '10px'
  },
  inlineFieldsThree: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    marginBottom: '10px'
  },
  formInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px'
  },
  simulateButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  secondaryButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0d47a1',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  feedback: {
    marginTop: '16px',
    padding: '10px 12px',
    borderRadius: '6px',
    backgroundColor: '#fff8e1',
    color: '#8d6e63',
    fontSize: '13px'
  },
  feedbackError: {
    marginBottom: '16px',
    padding: '10px 12px',
    borderRadius: '6px',
    backgroundColor: '#ffebee',
    color: '#b71c1c',
    fontSize: '13px'
  },
  warningBanner: {
    marginBottom: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#fff3e0',
    border: '1px solid #ffcc80',
    color: '#e65100',
    fontSize: '13px'
  },
  communityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    gap: '10px'
  },
  leaderboardList: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  leaderboardRow: {
    display: 'grid',
    gridTemplateColumns: '64px 1fr 100px 170px',
    gap: '10px',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '13px'
  },
  leaderboardRank: {
    fontWeight: '700',
    color: '#0d47a1'
  },
  leaderboardUser: {
    fontWeight: '600',
    color: '#374151'
  },
  leaderboardTier: {
    fontWeight: '600',
    color: '#6b7280'
  },
  leaderboardValue: {
    textAlign: 'right',
    fontWeight: '700',
    color: '#111827'
  },
  achievementGrid: {
    marginTop: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px'
  },
  achievementCard: {
    backgroundColor: '#faf5ff',
    border: '1px solid #ead7ff',
    borderRadius: '8px',
    padding: '10px 12px'
  },
  achievementName: {
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '6px',
    color: '#4a148c'
  },
  achievementDesc: {
    fontSize: '12px',
    color: '#6b7280'
  },
  tradeResult: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px'
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontSize: '13px'
  }
};

export default TradingDashboard;
