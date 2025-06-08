import { useState, useEffect } from 'react';
import { useSDK } from '../hooks/useSDK';
import { toast } from 'react-toastify';
import NFTCard from '../components/NFTCard';

function Profile() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const {  account } = useSDK();

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.algoMintXClient || !account) return;
      
      try {
        setLoading(true);
        const data = await window.algoMintXClient.getWalletNFTs({});
        setNfts(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError('Failed to load NFTs. Please try again later.');
        toast.error('Failed to load NFTs');
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [window.algoMintXClient, account]);

  if (!account) {
    return (
      <div className="login-message">
        <h3>Connect Your Wallet</h3>
        <p>Please connect your wallet to view your NFTs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <div className="no-nfts-container">
        <p className="no-nfts-text">You don't have any NFTs yet</p>
      </div>
    );
  }

  return (
    <div className="nft-grid">
      {nfts.map((nft) => (
        <NFTCard key={nft.assetId} nft={nft} />
      ))}
    </div>
  );
}

export default Profile; 