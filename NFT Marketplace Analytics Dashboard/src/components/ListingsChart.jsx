import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ListingsChart = ({ data }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const css = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const axisColor = css ? css.getPropertyValue('--text-muted').trim() || '#94a3b8' : '#94a3b8';
  const gridColor = css ? css.getPropertyValue('--border-color').trim() || 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.3)';
  const tooltipBg = css ? css.getPropertyValue('--bg-primary').trim() || 'white' : 'white';
  const tooltipBorder = css ? css.getPropertyValue('--border-color').trim() || '#e5e7eb' : '#e5e7eb';
  const tooltipText = css ? css.getPropertyValue('--text-primary').trim() || '#111827' : '#111827';

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            stroke={axisColor}
            fontSize={12}
            tickFormatter={formatDate}
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
            formatter={(value) => [value, 'Total Listings']}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ListingsChart;
