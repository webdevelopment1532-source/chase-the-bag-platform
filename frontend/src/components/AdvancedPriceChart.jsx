import React, { useState, useEffect, useRef, useCallback } from 'react';

const AdvancedPriceChart = ({ tokens = ['BTC', 'ETH', 'USDT'], apiToken }) => {
  const [prices, setPrices] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [selectedToken, setSelectedToken] = useState(tokens[0]);
  const [timeframe, setTimeframe] = useState('1h');
  const [wsConnected, setWsConnected] = useState(false);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/trading/prices?tokens=${tokens.join(',')}`,
        { headers: { 'Authorization': `Bearer ${apiToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setPrices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  }, [apiToken, tokens]);

  const fetchPriceHistory = useCallback(async () => {
    try {
      const days = timeframe === '1h' ? 1 : timeframe === '24h' ? 7 : 30;
      const response = await fetch(
        `/api/trading/price-history/${selectedToken}?days=${days}`,
        { headers: { 'Authorization': `Bearer ${apiToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setPriceHistory(prev => ({
          ...prev,
          [selectedToken]: data.data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch price history:', error);
    }
  }, [apiToken, selectedToken, timeframe]);

  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsRef.current = new WebSocket(`${protocol}//${window.location.host}/ws/trading`);

      wsRef.current.onopen = () => {
        setWsConnected(true);
        // Subscribe to price updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          channels: ['prices']
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'price-update') {
            const updates = message.data;
            setPrices(prev => ({
              ...prev,
              ...Object.fromEntries(
                Object.entries(updates).map(([token, data]) => [
                  token,
                  typeof data === 'object' ? data.price : data
                ])
              )
            }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      wsRef.current.onclose = () => {
        setWsConnected(false);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, []);

  useEffect(() => {
    const kickoffId = setTimeout(() => {
      void fetchPrices();
    }, 0);

    // Connect to WebSocket for real-time updates
    connectWebSocket();

    // Refresh prices every 10 seconds
    const interval = setInterval(fetchPrices, 10000);

    return () => {
      clearTimeout(kickoffId);
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket, fetchPrices]);

  useEffect(() => {
    const kickoffId = setTimeout(() => {
      void fetchPriceHistory();
    }, 0);

    return () => {
      clearTimeout(kickoffId);
    };
  }, [fetchPriceHistory]);

  const drawChart = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const history = priceHistory[selectedToken] || [];

    if (history.length === 0) return;

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate bounds
    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Padding
    const padding = {top: 40, right: 40, bottom: 40, left: 60};
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(canvas.width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice - (priceRange / 5) * i;
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('$' + price.toFixed(2), padding.left - 10, y + 4);
    }

    // Draw price line
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < history.length; i++) {
      const x = padding.left + (chartWidth / (history.length - 1)) * i;
      const y = padding.top + chartHeight * (1 - (history[i].price - minPrice) / priceRange);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();

    // Draw area under curve
    ctx.strokeStyle = 'transparent';
    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.fill();

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, canvas.height - padding.bottom);
    ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${selectedToken} Price Chart (${timeframe})`, canvas.width / 2, 25);

    // Status indicator
    if (wsConnected) {
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(canvas.width - padding.right - 20, 10, 12, 12);
      ctx.fillStyle = '#666';
      ctx.font = '11px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('LIVE', canvas.width - padding.right - 25, 20);
    }
  }, [priceHistory, selectedToken, timeframe, wsConnected]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Real-Time Price Charts</h2>
        <div style={styles.wsIndicator}>
          <span style={{
            ...styles.wsLight,
            backgroundColor: wsConnected ? '#4CAF50' : '#ccc'
          }}></span>
          {wsConnected ? 'Live Feed' : 'Offline'}
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.tokenSelector}>
          <label>Select Token:</label>
          <select 
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            style={styles.select}
          >
            {tokens.map(token => (
              <option key={token} value={token}>{token}</option>
            ))}
          </select>
        </div>

        <div style={styles.timeframeSelector}>
          <label>Timeframe:</label>
          {['1h', '24h', '7d', '30d'].map(tf => (
            <button
              key={tf}
              style={{
                ...styles.timeframeButton,
                ...(timeframe === tf ? styles.timeframeButtonActive : {})
              }}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>

        {selectedToken && prices[selectedToken] && (
          <div style={styles.currentPrice}>
            <span>Current Price:</span>
            <span style={styles.priceValue}>
              ${prices[selectedToken].toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div style={styles.chartContainer}>
        <canvas 
          ref={canvasRef}
          width={800}
          height={400}
          style={styles.canvas}
        ></canvas>
      </div>

      <div style={styles.allPrices}>
        <h3>All Token Prices</h3>
        <div style={styles.priceGrid}>
          {Object.entries(prices).map(([token, price]) => (
            <div 
              key={token}
              style={{
                ...styles.priceItem,
                ...(selectedToken === token ? styles.priceItemActive : {})
              }}
              onClick={() => setSelectedToken(token)}
            >
              <div style={styles.priceToken}>{token}</div>
              <div style={styles.priceAmount}>${typeof price === 'number' ? price.toFixed(2) : price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #eee'
  },
  wsIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#666'
  },
  wsLight: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  controls: {
    display: 'grid',
    gridTemplateColumns: 'auto auto 1fr',
    gap: '20px',
    marginBottom: '20px',
    alignItems: 'center'
  },
  tokenSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  timeframeSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  select: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  timeframeButton: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s'
  },
  timeframeButtonActive: {
    backgroundColor: '#2196F3',
    color: '#fff',
    borderColor: '#2196F3'
  },
  currentPrice: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    justifySelf: 'end'
  },
  priceValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2196F3'
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
    overflow: 'auto'
  },
  canvas: {
    border: '1px solid #eee',
    borderRadius: '4px',
    maxWidth: '100%'
  },
  allPrices: {
    borderTop: '2px solid #eee',
    paddingTop: '20px'
  },
  priceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px'
  },
  priceItem: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  priceItemActive: {
    backgroundColor: '#2196F3',
    color: '#fff',
    borderColor: '#2196F3'
  },
  priceToken: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '6px',
    opacity: '0.8'
  },
  priceAmount: {
    fontSize: '16px',
    fontWeight: 'bold'
  }
};

export default AdvancedPriceChart;
