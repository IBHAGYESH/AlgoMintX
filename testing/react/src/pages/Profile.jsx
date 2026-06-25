import { useState, useEffect, useCallback } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { toast } from "react-toastify";
import AssetCard from "../components/AssetCard";
import { useSearchParams } from "react-router-dom";

function Profile() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { algoMintXClient } = useSDK();
  const [searchParams] = useSearchParams();
  const walletAddressParam = searchParams.get("wallet");

  const fetchAssets = useCallback(async () => {
    if (!algoMintXClient) return;

    try {
      setLoading(true);
      setError(null);

      // If viewing another wallet's assets
      if (walletAddressParam) {
        const data = await algoMintXClient.getWalletAssets({
          accountId: walletAddressParam,
        });
        setAssets(data);
      }
      // If viewing own assets
      else if (algoMintXClient?.account) {
        const data = await algoMintXClient.getWalletAssets({
          marketplaceOnly: true,
        });
        setAssets(data);
      }
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError("Failed to load assets. Please try again later.");
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [algoMintXClient, algoMintXClient?.account, walletAddressParam]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useSDKEvents({
    onWalletConnect: fetchAssets,
    onWalletDisconnect: fetchAssets,
    onNFTMint: fetchAssets,
    onNFTList: fetchAssets,
  });

  const handleConnectWallet = () => {
    algoMintXClient.maximizeSDK();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">
          {walletAddressParam ? "Loading assets..." : "Loading Your Assets..."}
        </p>
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

  // Only show login message if viewing own NFTs and wallet is not connected
  if (!walletAddressParam && !algoMintXClient?.account) {
    return (
      <div className="login-message">
        <h3>Connect Your Wallet</h3>
        <p>Please connect your wallet to view your assets</p>
        <button className="btn btn-primary" onClick={handleConnectWallet}>
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="no-nfts-container">
        <p className="no-nfts-text">
          {walletAddressParam
            ? "This wallet has no assets"
            : "You don't have any assets yet"}
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title">
        {walletAddressParam ? "Wallet Assets" : "Your Assets"}
      </h2>
      <div className="nft-grid">
        {assets.map((asset) => (
          <AssetCard key={asset.assetId} asset={asset} />
        ))}
      </div>
    </>
  );
}

export default Profile;
