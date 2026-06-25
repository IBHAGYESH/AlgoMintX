import { useState, useEffect, useCallback } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { toast } from "react-toastify";
import AssetCard from "../components/AssetCard";

function Home() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { algoMintXClient } = useSDK();

  const fetchAssets = useCallback(async () => {
    if (!algoMintXClient) return;

    try {
      setLoading(true);
      const data = await algoMintXClient.getListedNFTs();
      setAssets(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError("Failed to load assets. Please try again later.");
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [algoMintXClient]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useSDKEvents({
    onWalletConnect: fetchAssets,
    onWalletDisconnect: fetchAssets,
    onNFTBuy: fetchAssets,
    onNFTUnlist: fetchAssets,
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading assets...</p>
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

  if (!assets || assets.length === 0) {
    return (
      <div className="no-nfts-container">
        <p className="no-nfts-text">No assets found</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title">Featured Assets</h2>
      <div className="nft-grid">
        {assets.map((asset) => (
          <AssetCard key={asset.assetId} asset={asset} />
        ))}
      </div>
    </>
  );
}

export default Home;
