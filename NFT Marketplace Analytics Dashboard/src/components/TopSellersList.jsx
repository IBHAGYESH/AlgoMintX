import React, { useState } from 'react';
import { Users, Search, Award } from 'lucide-react';

const TopSellersList = ({ sellers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatAddress = (address) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const filteredSellers = sellers
    .filter((seller) => seller.address.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.totalValue - a.totalValue);

  return (
    <section className="stakers-list">
      <div className="stakers-header">
        <div className="header-info">
          <h3 className="section-title">
            <Users className="section-icon" />
            Top Sellers
          </h3>
          <p className="section-subtitle">
            {filteredSellers.length} of {sellers.length} sellers shown
          </p>
        </div>

        <div className="stakers-controls">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search by address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      <div className="staker-cards">
        {filteredSellers.map((seller, index) => (
          <div className="staker-card" key={seller.id}>
            <div className="staker-card-header">
              <div className="rank-container">
                {index + 1 <= 3 && (
                  <Award size={16} className={`rank-icon rank-${index + 1}`} />
                )}
                <span className="rank-number">#{index + 1}</span>
              </div>
              <div className="address-container">
                <code className="address-text">{formatAddress(seller.address)}</code>
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(seller.address)}
                  title="Copy full address"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="staker-card-body">
              <div className="metric">
                <div className="metric-label">Listings</div>
                <div className="metric-value">{seller.listingCount.toLocaleString()}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Total Listed Value</div>
                <div className="metric-value">{seller.totalValue.toLocaleString()} ALGO</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TopSellersList;
