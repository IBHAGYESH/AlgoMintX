/**
 * AlgoMintX Node.js Headless Demo
 *
 * This script demonstrates how to use the AlgoMintX SDK in a Node.js environment
 * without any UI. It includes functions for minting NFTs and FTs using hardcoded
 * wallet credentials.
 */

import AlgoMintX from "algomintx";

// ==========================================
// CONFIGURATION - REPLACE WITH YOUR VALUES
// ==========================================

const HARDCODED_WALLET_ADDRESS = "YOUR_WALLET_ADDRESS";
const HARDCODED_WALLET_MNEMONIC = "YOUR_WALLET_MNEMONIC";

const PINATA_API_KEY = "YOUR_PINATA_API_KEY";

const NAMESPACE = "550e8400-e29b-41d4-a716-446655440000"; // Your unique UUID v4
const REVENUE_WALLET_ADDRESS = "YOUR_REVENUE_WALLET_ADDRESS";

// ==========================================
// SDK INITIALIZATION
// ==========================================

const sdk = new AlgoMintX({
  // Required
  pinata_ipfs_server_key: PINATA_API_KEY,
  pinata_ipfs_gateway_url: PINATA_GATEWAY_URL,
  env: "testnet", // testnet | mainnet
  namespace: NAMESPACE,
  revenueWalletAddress: REVENUE_WALLET_ADDRESS,

  // Optional
  mintFee: 0.1,
  listingFee: 0.1,
  unListingFee: 0.1,
  buyingFee: 0.5,
  disableToast: true, // Disable toasts in Node.js
  disableUi: true, // Headless mode - no UI
  marketplaceType: "NFT", // "NFT" or "FT"
  supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"],
});

// ==========================================
// EVENT LISTENERS
// ==========================================

sdk.events.on("wallet:connection:connected", ({ address }) => {
  console.log("✓ Wallet connected:", address);
});

sdk.events.on("wallet:connection:failed", ({ error }) => {
  console.error("✗ Wallet connection failed:", error);
});

sdk.events.on("nft:mint:success", ({ transactionId, assetId }) => {
  console.log("✓ NFT minted successfully!");
  console.log("  Transaction ID:", transactionId);
  console.log("  Asset ID:", assetId);
  console.log(
    `  View on testnet: https://lora.algokit.io/testnet/transaction/${transactionId}`,
  );
});

sdk.events.on("nft:mint:failed", ({ error }) => {
  console.error("✗ NFT mint failed:", error);
});

sdk.events.on("ft:mint:success", ({ transactionId, assetId }) => {
  console.log("✓ FT minted successfully!");
  console.log("  Transaction ID:", transactionId);
  console.log("  Asset ID:", assetId);
  console.log(
    `  View on testnet: https://lora.algokit.io/testnet/transaction/${transactionId}`,
  );
});

sdk.events.on("ft:mint:failed", ({ error }) => {
  console.error("✗ FT mint failed:", error);
});

// ==========================================
// MINTING FUNCTIONS
// ==========================================

/**
 * Mint an NFT
 * @param {string} name - NFT name
 * @param {string} description - NFT description
 * @param {string} imagePath - Path to image file (optional)
 */
async function mintNFT(name, description, imagePath = null) {
  console.log("\n--- Minting NFT ---");
  console.log("Name:", name);
  console.log("Description:", description);
  console.log("Image:", imagePath || "No image provided");

  try {
    await sdk.mintNFT({
      name,
      description,
      file: imagePath || null,
    });
  } catch (error) {
    console.error("Error minting NFT:", error.message);
    throw error;
  }
}

/**
 * Mint a Fungible Token (FT)
 * @param {string} name - FT name
 * @param {string} description - FT description
 * @param {number} decimals - Number of decimals
 * @param {number} totalSupply - Total supply
 * @param {string} imagePath - Path to image file (optional)
 */
async function mintFT(
  name,
  description,
  decimals,
  totalSupply,
  imagePath = null,
) {
  console.log("\n--- Minting FT ---");
  console.log("Name:", name);
  console.log("Description:", description);
  console.log("Decimals:", decimals);
  console.log("Total Supply:", totalSupply);
  console.log("Image:", imagePath || "No image provided");

  try {
    await sdk.mintFT({
      name,
      description,
      decimals,
      totalSupply,
      file: imagePath || null,
    });
  } catch (error) {
    console.error("Error minting FT:", error.message);
    throw error;
  }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function main() {
  console.log("=== AlgoMintX Node.js Headless Demo ===\n");

  try {
    // Connect wallet with hardcoded credentials
    console.log("Connecting wallet...");
    await sdk.connectWallet(
      HARDCODED_WALLET_ADDRESS,
      HARDCODED_WALLET_MNEMONIC,
    );

    // Wait a moment for connection to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ========================================
    // UNCOMMENT THE FUNCTION YOU WANT TO RUN
    // ========================================

    // Option 1: Mint an NFT
    await mintNFT(
      "My Awesome NFT2",
      "This is a test NFT minted from Node.js",
      "./assets/image.jpg", // Optional: path to image file in the same directory
    );

    // Option 2: Mint an FT
    // await mintFT(
    //   "My Token",
    //   "This is a test fungible token minted from Node.js",
    //   6, // decimals
    //   1000000, // total supply (1,000,000 tokens with 6 decimals = 1 token)
    //   "./assets/image.jpg" // Optional: path to image file in the same directory
    // );

    console.log("\n=== Demo completed ===");
  } catch (error) {
    console.error("\n✗ Demo failed:", error.message);
    process.exit(1);
  }
}

// Run the demo
main();
