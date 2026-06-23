import React, { useState, useEffect } from 'react';
import { Search, Image, Users, DollarSign, Tag, Activity, Wifi, WifiOff, Sun, Moon, Github } from 'lucide-react';
import AlgorandService from './services/algorandService';
import ListingsChart from './components/ListingsChart';
import PriceDistributionChart from './components/PriceDistributionChart';
import MarketplaceMetrics from './components/MarketplaceMetrics';
import TopSellersList from './components/TopSellersList';
import MarketplacesOverview from './components/MarketplacesOverview';
import './App.css';

function App() {
  const [network, setNetwork] = useState('testnet');
  const [algorandService, setAlgorandService] = useState(new AlgorandService('testnet'));
  const [marketplaceQuery, setMarketplaceQuery] = useState('');
  const [marketplaceData, setMarketplaceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkStatus, setNetworkStatus] = useState(null);
  const [theme, setTheme] = useState('light');
  const [totalMarketplaces, setTotalMarketplaces] = useState(0);
  const [marketplaces, setMarketplaces] = useState([]);
  const [timeRange, setTimeRange] = useState('30d'); // 30d | 6m | 1y | all
  const [timeline, setTimeline] = useState([]);
  const [priceDistribution, setPriceDistribution] = useState([]);
  const [topSellers, setTopSellers] = useState([]);

  // Normalize a user query into a full marketplace unit name (AMX + 5 letters)
  const normalizeMarketplace = (query) => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return '';
    if (trimmed.startsWith('AMX')) return trimmed;
    return `AMX${trimmed}`;
  };

  const handleNetworkChange = (newNetwork) => {
    setNetwork(newNetwork);
    const newService = new AlgorandService(newNetwork);
    setAlgorandService(newService);

    setMarketplaceData(null);
    setTimeline([]);
    setPriceDistribution([]);
    setTopSellers([]);
    setError('');

    fetchNetworkStatus(newService);
    fetchMarketplaces(newService);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const fetchNetworkStatus = async (service = algorandService) => {
    try {
      const status = await service.getNetworkStatus();
      setNetworkStatus(status);
    } catch (err) {
      console.error('Failed to fetch network status:', err);
      setNetworkStatus(null);
    }
  };

  const fetchMarketplaces = async (service = algorandService) => {
    try {
      const list = await service.getMarketplaces();
      setMarketplaces(list);
      setTotalMarketplaces(list.length);
    } catch (err) {
      console.error('Failed to fetch marketplaces:', err);
      setMarketplaces([]);
      setTotalMarketplaces(0);
    }
  };

  const searchMarketplace = async (queryOverride) => {
    const rawQuery = queryOverride !== undefined ? queryOverride : marketplaceQuery;
    const marketplace = normalizeMarketplace(rawQuery);

    if (!marketplace) {
      setError('Please enter a marketplace namespace');
      return;
    }

    setMarketplaceQuery(rawQuery);
    setLoading(true);
    setError('');
    setMarketplaceData(null);
    setTimeline([]);
    setPriceDistribution([]);
    setTopSellers([]);

    try {
      const data = await algorandService.getMarketplaceData(marketplace);
      setMarketplaceData(data);
    } catch (err) {
      console.error('Marketplace search error:', err);
      setError(err.message || 'Failed to fetch marketplace data');
      setMarketplaceData(null);
    } finally {
      setLoading(false);
    }
  };

  // Recompute analytics whenever the marketplace data or time range changes
  useEffect(() => {
    if (!marketplaceData) return;

    const listings = marketplaceData.listings || [];

    const daysMap = { '30d': 30, '6m': 180, '1y': 365 };
    let days;
    if (timeRange === 'all') {
      const times = listings.map((l) => l.createdAt).filter(Boolean);
      const nowSec = Math.floor(Date.now() / 1000);
      const earliest = times.length ? Math.min(...times) : nowSec;
      days = Math.max(1, Math.ceil((nowSec - earliest) / 86400) + 1);
    } else {
      days = daysMap[timeRange] || 30;
    }

    setTimeline(algorandService.buildListingsTimeline(listings, days));
    setPriceDistribution(algorandService.buildPriceDistribution(listings));
    setTopSellers(algorandService.buildTopSellers(listings));
  }, [marketplaceData, timeRange, algorandService]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchMarketplace();
    }
  };

  useEffect(() => {
    fetchNetworkStatus();
    fetchMarketplaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorandService]);

  // Periodically refresh the discovered marketplaces in background
  useEffect(() => {
    const id = setInterval(() => {
      fetchMarketplaces();
    }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorandService]);

  return (
    <div className={`app ${theme}`}>
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <Image size={24} />
                <h1>AlgoMintX Analytics</h1>
              </div>
            </div>

            <div className="header-center">
              <div className="network-switch">
                <div className="radio-group">
                  <label className={`radio-option ${network === 'testnet' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="network"
                      value="testnet"
                      checked={network === 'testnet'}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                    />
                    <span className="radio-label">TestNet</span>
                  </label>
                  <label className={`radio-option ${network === 'mainnet' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="network"
                      value="mainnet"
                      checked={network === 'mainnet'}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                    />
                    <span className="radio-label">MainNet</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="header-right">
              <div className="network-status">
                <div className={`status-indicator ${networkStatus ? 'online' : 'offline'}`}>
                  {networkStatus ? <Wifi size={16} /> : <WifiOff size={16} />}
                </div>
                <div className="status-text">
                  <div className="status-value">{network.toUpperCase()}</div>
                  <div className="status-label">
                    {networkStatus ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
              </div>

              <div className="pool-count">
                <Activity size={16} />
                <div className="count-text">
                  <div className="count-value">{totalMarketplaces}</div>
                  <div className="count-label">Marketplaces</div>
                </div>
              </div>

              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <h2>Marketplace Analytics Dashboard</h2>
              <p>Enter a marketplace namespace to view real-time analytics from {network === 'mainnet' ? 'Algorand MainNet' : 'Algorand TestNet'}</p>
            </div>

            <div className="search-box">
              <div className="search-input-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder={`Marketplace namespace (e.g. DEMOY) on ${network.toUpperCase()}`}
                  value={marketplaceQuery}
                  onChange={(e) => setMarketplaceQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="search-input"
                />
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="filter-select"
                aria-label="Select time range"
              >
                <option value="30d">Last 30d</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
              <button
                onClick={() => searchMarketplace()}
                disabled={loading}
                className="search-btn"
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <Search size={16} />
                    Search Marketplace
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
          </section>

          {/* Marketplace Data Section */}
          {marketplaceData && (
            <>
              {/* Overview */}
              <section className="pool-overview">
                <div className="pool-header">
                  <div className="pool-info">
                    <h3>Marketplace: {marketplaceData.marketplace}</h3>
                    <div className="pool-status">
                      <div className={`status-dot ${marketplaceData.status.toLowerCase()}`}></div>
                      <span>{marketplaceData.status}</span>
                    </div>
                  </div>
                  <div className="token-badge" title="Marketplace asset type">
                    <Tag size={14} />
                    <span className="token-symbol">{marketplaceData.assetType}</span>
                  </div>
                </div>
              </section>

              {/* Metrics Chips */}
              <section className="chips-section">
                <div className="chips-grid">
                  <div className="chip-card">
                    <Tag className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{(marketplaceData.listingCount || 0).toLocaleString()}</div>
                      <div className="chip-label">Total Listed</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <DollarSign className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{Number(marketplaceData.floorPrice || 0).toLocaleString()} ALGO</div>
                      <div className="chip-label">Floor Price</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <DollarSign className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{Number(marketplaceData.avgPrice || 0).toFixed(2)} ALGO</div>
                      <div className="chip-label">Avg Price</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <DollarSign className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{Number(marketplaceData.totalListedValue || 0).toLocaleString()} ALGO</div>
                      <div className="chip-label">Total Listed Value</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <Users className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{marketplaceData.uniqueSellers || 0}</div>
                      <div className="chip-label">Unique Sellers</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Charts Section */}
              <section className="charts-section">
                <div className="charts-grid">
                  <div className="chart-card">
                    <h4>Listings Over Time</h4>
                    <ListingsChart data={timeline} />
                  </div>
                  <div className="chart-card">
                    <h4>Price Distribution</h4>
                    <PriceDistributionChart data={priceDistribution} symbol="ALGO" />
                  </div>
                </div>
              </section>

              {/* Listings preview */}
              {marketplaceData.listings && marketplaceData.listings.length > 0 && (
                <section className="charts-section">
                  <div className="chart-card">
                    <h4>Current Listings</h4>
                    <div className="listings-grid">
                      {marketplaceData.listings.slice(0, 12).map((listing) => (
                        <div className="listing-card" key={listing.assetId}>
                          {listing.image ? (
                            <img
                              className="listing-thumb"
                              src={listing.image}
                              alt={listing.name}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="listing-thumb-placeholder">
                              <Image size={28} />
                            </div>
                          )}
                          <div className="listing-info">
                            <div className="listing-name" title={listing.name}>{listing.name}</div>
                            <div className="listing-price">{listing.price.toLocaleString()} ALGO</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Marketplace Metrics */}
              <section className="metrics-section">
                <MarketplaceMetrics marketplaceData={marketplaceData} />
              </section>

              {/* Top Sellers */}
              <section className="stakers-section">
                <TopSellersList sellers={topSellers} />
              </section>
            </>
          )}

          {/* Overview / Empty State */}
          {!marketplaceData && !loading && (
            <>
              {marketplaces.length > 0 && (
                <MarketplacesOverview
                  marketplaces={marketplaces}
                  onSelect={(mp) => searchMarketplace(mp)}
                />
              )}
              <section className="empty-state">
                <div className="empty-content">
                  <Image size={48} className="empty-icon" />
                  <h3>No Marketplace Selected</h3>
                  <p>Search for a marketplace namespace or pick one above to view detailed analytics and metrics.</p>
                </div>
              </section>
            </>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <>
              <section className="pool-overview">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-badge" />
              </section>
              <section className="chips-section">
                <div className="chips-grid">
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                </div>
              </section>
              <section className="charts-section">
                <div className="charts-grid">
                  <div className="chart-card skeleton-chart" />
                  <div className="chart-card skeleton-chart" />
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <div className="footer-brand">
                <Image size={20} />
                <span>AlgoMintX Marketplace Analytics Dashboard</span>
              </div>
              <p>Real-time NFT &amp; FT marketplace analytics for the AlgoMintX SDK</p>
            </div>
            <div className="footer-links">
              <a href="https://github.com/IBHAGYESH/AlgoMintX" target="_blank" rel="noopener noreferrer" className="footer-link">
                <Github size={16} />
                GitHub Repository
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>AlgoMintX crafted with ❤️ by <a href="https://ibhagyesh.com/" target="_blank" rel="noopener noreferrer">ibhagyesh</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
