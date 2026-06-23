import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PriceDistributionChart = ({ data, symbol = 'ALGO' }) => {
  const css = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const axisColor = css ? css.getPropertyValue('--text-muted').trim() || '#94a3b8' : '#94a3b8';
  const gridColor = css ? css.getPropertyValue('--border-color').trim() || 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.3)';
  const tooltipBg = css ? css.getPropertyValue('--bg-primary').trim() || 'white' : 'white';
  const tooltipBorder = css ? css.getPropertyValue('--border-color').trim() || '#e5e7eb' : '#e5e7eb';
  const tooltipText = css ? css.getPropertyValue('--text-primary').trim() || '#111827' : '#111827';

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="range"
            stroke={axisColor}
            fontSize={11}
          />
          <YAxis
            stroke={axisColor}
            fontSize={12}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              color: tooltipText
            }}
            formatter={(value) => [value, 'Listings']}
            labelFormatter={(label) => `Price (${symbol}): ${label}`}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceDistributionChart;
