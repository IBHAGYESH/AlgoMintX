import React from 'react';

const NpmLogo = ({ size = 16, color = '#CB3837' }) => (
  <svg
    width={size}
    height={size * 0.35}
    viewBox="0 0 18 7"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
    aria-hidden="true"
  >
    <path d="M0 0h18v6H9v1H5V6H0V0zm1 5h2V2h1v3h1V1H1v4zm5-4v5h2V5h2V1H6zm2 1h1v2H8V2zm2-1v4h2V2h1v3h1V1h-4z" />
  </svg>
);

export default NpmLogo;