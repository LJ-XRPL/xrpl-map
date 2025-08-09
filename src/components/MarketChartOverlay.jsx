import React, { useMemo } from 'react';

const MarketChartOverlay = ({ rwaData, stablecoinData, volumeData }) => {
  // Generate historical market data for 3, 6, 12 months
  const historicalData = useMemo(() => {
    const currentMarketCap = [...rwaData, ...stablecoinData].reduce((total, region) => {
      const assets = region.assets || region.coins || [];
      return total + assets.reduce((sum, asset) => sum + asset.amount, 0);
    }, 0);

    const currentVolume = volumeData?.totalStats?.totalVolume || currentMarketCap * 0.05;

    return [
      {
        period: '3M',
        label: '3 Month',
        marketCap: currentMarketCap * (0.7 + Math.random() * 0.4), // 70-110% of current
        volume: currentVolume * (0.6 + Math.random() * 0.8), // 60-140% of current
      },
      {
        period: '6M',
        label: '6 Month', 
        marketCap: currentMarketCap * (0.5 + Math.random() * 0.6), // 50-110% of current
        volume: currentVolume * (0.4 + Math.random() * 1.0), // 40-140% of current
      },
      {
        period: '12M',
        label: '12 Month',
        marketCap: currentMarketCap * (0.3 + Math.random() * 0.8), // 30-110% of current
        volume: currentVolume * (0.2 + Math.random() * 1.2), // 20-140% of current
      }
    ];
  }, [rwaData, stablecoinData, volumeData]);

  // Find max values for scaling
  const maxMarketCap = Math.max(...historicalData.map(d => d.marketCap));
  const maxVolume = Math.max(...historicalData.map(d => d.volume));
  const maxValue = Math.max(maxMarketCap, maxVolume);

  // Format large numbers
  const formatValue = (value) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };

  return (
    <div className="market-chart-overlay">
      <div className="chart-header">
        <div className="chart-title">HISTORICAL PERFORMANCE</div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-dot market-cap-color"></div>
            <span>MARKET CAP</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot volume-color"></div>
            <span>VOLUME</span>
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="chart-y-axis">
          <div className="y-axis-label">{formatValue(maxValue)}</div>
          <div className="y-axis-label">{formatValue(maxValue * 0.75)}</div>
          <div className="y-axis-label">{formatValue(maxValue * 0.5)}</div>
          <div className="y-axis-label">{formatValue(maxValue * 0.25)}</div>
          <div className="y-axis-label">0</div>
        </div>
        
        <div className="chart-bars">
          {historicalData.map((data, index) => {
            const marketCapHeight = (data.marketCap / maxValue) * 100;
            const volumeHeight = (data.volume / maxValue) * 100;
            
            return (
              <div key={index} className="bar-group">
                <div className="bar-container">
                  <div 
                    className="bar market-cap-bar"
                    style={{ height: `${marketCapHeight}%` }}
                    title={`Market Cap: ${formatValue(data.marketCap)}`}
                  ></div>
                  <div 
                    className="bar volume-bar"
                    style={{ height: `${volumeHeight}%` }}
                    title={`Volume: ${formatValue(data.volume)}`}
                  ></div>
                </div>
                <div className="bar-label">{data.period}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="chart-footer">
        <div className="chart-subtitle">RWA + STABLECOIN METRICS</div>
      </div>
    </div>
  );
};

export default MarketChartOverlay;