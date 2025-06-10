import { useState, useEffect, useCallback } from "react";

export function useSDK() {
  const [algoMintXClient, setAlgoMintXClient] = useState(null);

  const initializeSDK = useCallback(() => {
    if (window.AlgoMintX) {
      try {
        // Initialize SDK with required parameters
        const algoMintX = new window.AlgoMintX({
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

        setAlgoMintXClient(algoMintX);
      } catch (error) {
        console.error("SDK initialization error:", error);
      }
    }
  }, []);

  useEffect(() => {
    let intervalId;

    const checkAndInitializeSDK = () => {
      if (window.AlgoMintX) {
        initializeSDK();
        clearInterval(intervalId);
      }
    };

    // Start checking every 100ms
    intervalId = setInterval(checkAndInitializeSDK, 100);

    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [initializeSDK]);

  return { algoMintXClient };
}
