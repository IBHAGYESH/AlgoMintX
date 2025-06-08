import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

export function useSDK() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);
  const [account, setAccount] = useState(null);

  // Define event handlers using useCallback to maintain reference stability
  const handleWalletConnected = useCallback(async ({ account }) => {
    setAccount(account);
    toast.success("Wallet connected successfully!");
  }, []);

  const handleWalletDisconnected = useCallback(async () => {
    setAccount(null);
    toast.info("Wallet disconnected");
  }, []);

  const initializeSDK = useCallback(() => {
    if (window.AlgoMintX) {
      try {
        // Set higher max listeners limit
        window.AlgoMintX.defaultMaxListeners = 50;

        // Initialize SDK with required parameters
        window.algoMintXClient = new window.AlgoMintX({
          // Required
          pinata_ipfs_server_key: "", // Your Pinata API key
          pinata_ipfs_gateway_url: "", // Your Pinata gateway URL
          env: "testnet", // "testnet" or "mainnet"
          namespace: "", // Unique 5-character uppercase string
          revenueWalletAddress: "", // Wallet to collect marketplace fees
          // Optional
          listingFee: 0.1, // NFT listing fee (in Algos)
          buyingFee: 0.5, // NFT buying fee (in Algos)
          unListingFee: 0.1, // NFT un-listing fee (in Algos)
          disableToast: false, // Disable toast notifications
          toastLocation: "TOP_RIGHT", // Toast notification location (TOP_LEFT | TOP_RIGHT)
          minimizeUILocation: "right", // SDK minimize button location (left | right)
          logo: "./logo.png", // Your website logo (URL / path to image)
          supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"], // Supported media formats for NFTs
        });

        // Check if wallet is already connected
        if (window.algoMintXClient?.account) {
          setAccount(window.algoMintXClient.account);
        }

        // Add event listeners
        window.algoMintXClient.events.on(
          "wallet:connection:connected",
          handleWalletConnected
        );
        window.algoMintXClient.events.on(
          "wallet:connection:disconnected",
          handleWalletDisconnected
        );

        setSdkReady(true);
        setSdkError(null);

        return true;
      } catch (error) {
        console.error("SDK initialization error:", error);
        setSdkError(error);
        setSdkReady(false);
        return false;
      }
    }
    return false;
  }, [handleWalletConnected, handleWalletDisconnected]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryInterval = 1000; // 1 second

    const tryInitialize = () => {
      const success = initializeSDK();
      if (!success && retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryInitialize, retryInterval);
      } else if (!success) {
        setSdkError(new Error("SDK not found after maximum retries"));
        setSdkReady(false);
      }
    };

    tryInitialize();

    // Cleanup function
    return () => {
      if (window.algoMintXClient?.events) {
        window.algoMintXClient.events.removeListener(
          "wallet:connection:connected",
          handleWalletConnected
        );
        window.algoMintXClient.events.removeListener(
          "wallet:connection:disconnected",
          handleWalletDisconnected
        );
      }
    };
  }, [initializeSDK, handleWalletConnected, handleWalletDisconnected]);

  return { sdkReady, sdkError, account };
}
