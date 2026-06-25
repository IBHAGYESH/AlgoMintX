import { useState, useEffect, useCallback } from "react";
import AlgoMintX from "algomintx";

// Create a singleton instance outside the hook
let sdkInstance = null;

export function useSDK() {
  const [algoMintXClient, setAlgoMintXClient] = useState(null);

  const initializeSDK = useCallback(() => {
    if (!sdkInstance) {
      try {
        // Initialize SDK with required parameters
        sdkInstance = new AlgoMintX({
          // Required
          pinata_ipfs_server_key: "YOUR_PINATA_API_KEY", // your pinata api key
          env: "testnet", // testnet | mainnet
          namespace: "550e8400-e29b-41d4-a716-446655440000", // unique UUID v4
          revenueWalletAddress: "YOUR_REVENUE_WALLET_ADDRESS", // where fees go
          // Optional
          mintFee: 0.1, // in Algos
          listingFee: 0.1, // in Algos
          unListingFee: 0.1, // in Algos
          buyingFee: 0.5, // in Algos
          disableToast: false, // disable toast notifications
          toastLocation: "TOP_RIGHT", // TOP_LEFT | TOP_RIGHT
          minimizeUILocation: "right", // left | right
          logo: "./logo.png", // your website logo (URL / path to image)
          supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"], // ["IMAGE", "VIDEO", "AUDIO"]
          marketplaceType: "NFT", // NFT | FT
        });

        setAlgoMintXClient(sdkInstance);

        // Marketplace discovery smoke test (console)
        sdkInstance
          .getMarketplaces()
          .then((marketplaces) => console.log("getMarketplaces:", marketplaces))
          .catch((err) =>
            console.warn("getMarketplaces smoke test:", err.message),
          );
        sdkInstance
          .listingStatus(0)
          .then((status) => console.log("listingStatus:", status))
          .catch((err) =>
            console.warn("listingStatus smoke test:", err.message),
          );
      } catch (error) {
        console.error("SDK initialization error:", error);
      }
    } else {
      // If SDK is already initialized, use the existing instance
      setAlgoMintXClient(sdkInstance);
    }
  }, []);

  useEffect(() => {
    // Initialize SDK once on mount
    initializeSDK();
  }, [initializeSDK]);

  return { algoMintXClient };
}
