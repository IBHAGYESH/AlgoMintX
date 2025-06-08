import { Outlet, Link } from 'react-router-dom';
import { useSDK } from '../hooks/useSDK';
import logo from '../assets/logo.png';

function MainLayout() {
  const { account } = useSDK();

  return (
    <>
      <header>
        <div className="container header-content">
          <div className="logo">
            <img src={logo} alt="AlgoMintX Logo" />
            <h1>AlgoMintX NFT Marketplace</h1>
          </div>
          {account && (
            <div className="profile-section">
              <div className="wallet-info">
                <span>{account}</span>
              </div>
              <div className="profile-avatar">
                <img
                  src="https://img.icons8.com/ios-filled/50/ffffff/user-male-circle.png"
                  alt="Profile"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <nav>
        <div className="container">
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/about">About</Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer>
        <div className="container footer-content">
          <p>&copy; {new Date().getFullYear()} AlgoMintX NFT Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default MainLayout; 