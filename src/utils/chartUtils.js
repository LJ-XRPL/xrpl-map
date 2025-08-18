/**
 * Chart Utilities
 * Shared chart rendering functions for components
 */

/**
 * Render a line chart for growth data
 * @param {Array} data - Chart data points
 * @param {string} color - Line color
 * @param {string} metric - Metric type for styling
 * @returns {JSX.Element} SVG chart
 */
export const renderLineChart = (data, color = '#00ff88', metric = 'price') => {
  if (!data || data.length === 0) return null;

  const width = 200;
  const height = 60;
  const padding = 10;

  const maxAmount = Math.max(...data.map(d => d.amount));
  const minAmount = Math.min(...data.map(d => d.amount));
  const range = maxAmount - minAmount || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - padding - ((d.amount - minAmount) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="line-chart">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Add gradient effect */}
      <defs>
        <linearGradient id={`gradient-${metric}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill={`url(#gradient-${metric})`}
      />
    </svg>
  );
};

/**
 * Render a scatter plot for market cap vs growth
 * @param {Array} assets - Asset data array
 * @returns {JSX.Element} SVG scatter plot
 */
export const renderMarketCapGrowthScatter = (assets) => {
  if (!assets || assets.length === 0) return null;

  const width = 280;
  const height = 100;
  const padding = 20;

  const maxAmount = Math.max(...assets.map(a => a.amount || 0));

  return (
    <svg width={width} height={height} className="scatter-plot">
      <defs>
        <radialGradient id="pointGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      
      {assets.map((asset, i) => {
        const x = ((asset.amount || 0) / maxAmount) * (width - 2 * padding) + padding;
        const growthRate = getGrowthTrend(asset.amount || 0);
        const y = height - padding - ((growthRate + 15) / 30) * (height - 2 * padding);
        const size = Math.max(4, Math.min(10, Math.log10(asset.amount || 1) - 4));
        const color = growthRate >= 0 ? '#00ff88' : '#ff4444';
        
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={size}
              fill={color}
              opacity="0.7"
              className="scatter-point"
            />
            <circle
              cx={x}
              cy={y}
              r={size + 2}
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity="0.3"
            />
          </g>
        );
      })}
      
      {/* Grid lines */}
      <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#333" strokeWidth="1" opacity="0.3" />
      <line x1={width/2} y1={padding} x2={width/2} y2={height-padding} stroke="#333" strokeWidth="1" opacity="0.3" />
    </svg>
  );
};

/**
 * Render a scatter plot for stablecoin traction
 * @param {Array} coins - Coin data array
 * @returns {JSX.Element} SVG scatter plot
 */
export const renderStablecoinTractionScatter = (coins) => {
  if (!coins || coins.length === 0) return null;

  const width = 280;
  const height = 100;
  const padding = 20;

  const maxAmount = Math.max(...coins.map(c => c.amount || 0));

  return (
    <svg width={width} height={height} className="scatter-plot">
      <defs>
        <radialGradient id="stablecoinGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      
      {coins.map((coin, i) => {
        const x = ((coin.amount || 0) / maxAmount) * (width - 2 * padding) + padding;
        const utilization = 60 + (Math.random() * 30); 
        const y = height - padding - (utilization / 100) * (height - 2 * padding);
        const size = Math.max(5, Math.min(12, Math.log10(coin.amount || 1) - 2));
        const color = utilization > 75 ? '#00ff88' : utilization > 50 ? '#ffa500' : '#ff6b6b';
        
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={size}
              fill={color}
              opacity="0.7"
              className="scatter-point"
            />
            <circle
              cx={x}
              cy={y}
              r={size + 2}
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity="0.3"
            />
          </g>
        );
      })}
      
      {/* Grid lines */}
      <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#333" strokeWidth="1" opacity="0.3" />
      <line x1={width/2} y1={padding} x2={width/2} y2={height-padding} stroke="#333" strokeWidth="1" opacity="0.3" />
    </svg>
  );
};

/**
 * Get growth trend for an asset (simulated)
 * @param {number} amount - Current amount
 * @returns {number} Growth percentage
 */
export const getGrowthTrend = (amount) => {
  // More realistic growth simulation based on market conditions
  const marketCycle = Math.sin(Date.now() / 86400000) * 8; // Daily cycle
  const volatility = (amount / 10000000) * 5; // Larger assets more stable
  const growth = marketCycle + (Math.random() - 0.5) * volatility;
  return Math.max(-15, Math.min(15, growth)); // Cap between -15% and +15%
};
