import { useState, useEffect } from 'react';
import { useSDK } from '../hooks/useSDK';
import { toast } from 'react-toastify';
import NFTCard from '../components/NFTCard';

function Home() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { account } = useSDK();

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.algoMintXClient) return;
      
      try {
        setLoading(true);
        const data = await window.algoMintXClient.getListedNFTs();
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
  }, [window.algoMintXClient]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading NFTs...</p>
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
        <p className="no-nfts-text">No NFTs found</p>
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

export default Home; 