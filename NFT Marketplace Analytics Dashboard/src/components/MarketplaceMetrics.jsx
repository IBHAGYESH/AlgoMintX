import React from 'react';

const MarketplaceMetrics = ({ marketplaceData }) => {
  if (!marketplaceData) return null;

  return (
    <section className="pool-metrics">
      <h3 className="section-title">Key Statistics</h3>

      <div className="metric-stats-card" style={{ marginBottom: '1rem' }}>
        <h4>Marketplace Overview</h4>
        <div className="stats-list">
          <div className="stat-row">
            <span className="stat-label">Marketplace</span>
            <span className="stat-value">{marketplaceData.marketplace}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Asset Type</span>
            <span className="stat-value">{marketplaceData.assetType}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Network</span>
            <span className="stat-value">{marketplaceData.network?.toUpperCase() || 'N/A'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Status</span>
            <span className="stat-value">{marketplaceData.status || 'Unknown'}</span>
          </div>
        </div>
      </div>

      <div className="metric-stats-card">
        <h4>Listing Statistics</h4>
        <div className="stats-list">
          <div className="stat-row">
            <span className="stat-label">Total Listed</span>
            <span className="stat-value">{marketplaceData.listingCount?.toLocaleString() || '0'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Floor Price</span>
            <span className="stat-value">{Number(marketplaceData.floorPrice || 0).toLocaleString()} ALGO</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Average Price</span>
            <span className="stat-value">{Number(marketplaceData.avgPrice || 0).toFixed(2)} ALGO</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Total Listed Value</span>
            <span className="stat-value">{Number(marketplaceData.totalListedValue || 0).toLocaleString()} ALGO</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Unique Sellers</span>
            <span className="stat-value">{marketplaceData.uniqueSellers || 0}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Unique Holders</span>
            <span className="stat-value">{marketplaceData.uniqueHolders || 0}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceMetrics;
