import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MarketplacesOverview = ({ marketplaces, onSelect }) => {
  if (!marketplaces || marketplaces.length === 0) return null;

  const css = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const axisColor = css ? css.getPropertyValue('--text-muted').trim() || '#94a3b8' : '#94a3b8';
  const gridColor = css ? css.getPropertyValue('--border-color').trim() || 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.3)';
  const tooltipBg = css ? css.getPropertyValue('--bg-primary').trim() || 'white' : 'white';
  const tooltipBorder = css ? css.getPropertyValue('--border-color').trim() || '#e5e7eb' : '#e5e7eb';
  const tooltipText = css ? css.getPropertyValue('--text-primary').trim() || '#111827' : '#111827';

  const chartData = marketplaces.slice(0, 10).map((m) => ({
    name: m.marketplace,
    listings: m.listingCount,
  }));

  return (
    <section className="charts-section">
      <div className="chart-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h4>Listings by Marketplace</h4>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} />
              <YAxis stroke={axisColor} fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  color: tooltipText
                }}
                formatter={(value) => [value, 'Listings']}
              />
              <Bar dataKey="listings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h4>Discovered Marketplaces</h4>
        <div className="marketplaces-grid">
          {marketplaces.map((m) => (
            <div
              key={m.marketplace}
              className="marketplace-card"
              onClick={() => onSelect && onSelect(m.marketplace)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onSelect) onSelect(m.marketplace);
              }}
            >
              <div className="marketplace-card-title">
                <span className="mp-name">{m.marketplace}</span>
              </div>
              <div className="marketplace-card-stats">
                <div className="row">
                  <span className="label">Listings</span>
                  <span className="value">{m.listingCount}</span>
                </div>
                <div className="row">
                  <span className="label">Floor</span>
                  <span className="value">{Number(m.floorPrice || 0).toLocaleString()} ALGO</span>
                </div>
                <div className="row">
                  <span className="label">Sellers</span>
                  <span className="value">{m.uniqueSellers}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MarketplacesOverview;
