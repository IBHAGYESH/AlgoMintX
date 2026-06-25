# AlgoMintX Node.js Headless Demo

This is a simple Node.js demo that uses the AlgoMintX SDK to mint NFTs and FTs without any UI. It uses hardcoded wallet credentials for headless operation.

## Prerequisites

- Node.js (v18 or higher)
- npm

## Setup

1. Navigate to the node demo directory:
```bash
cd testing/node
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Open `index.js` and replace the placeholder values with your actual credentials:

```javascript
const HARDCODED_WALLET_ADDRESS = "YOUR_WALLET_ADDRESS_HERE";
const HARDCODED_WALLET_MNEMONIC = "YOUR_WALLET_MNEMONIC_HERE";

const PINATA_API_KEY = "YOUR_PINATA_API_KEY_HERE";
const PINATA_GATEWAY_URL = "xxx.mypinata.cloud"; // or your custom gateway

const NAMESPACE = "ABCDE"; // Your unique 5-letter namespace
const REVENUE_WALLET_ADDRESS = "YOUR_REVENUE_WALLET_ADDRESS_HERE";
```

### Marketplace Type

Set the `marketplaceType` in the SDK initialization to either `"NFT"` or `"FT"`:

```javascript
marketplaceType: "NFT", // "NFT" or "FT"
```

## Usage

### Mint an NFT

Uncomment the NFT minting section in the `main()` function:

```javascript
await mintNFT(
  "My Awesome NFT",
  "This is a test NFT minted from Node.js",
  "nft-image.png" // Optional: path to image file
);
```

### Mint an FT

Uncomment the FT minting section in the `main()` function:

```javascript
await mintFT(
  "My Token",
  "This is a test fungible token minted from Node.js",
  6, // decimals
  1000000, // total supply
  "ft-image.png" // Optional: path to image file
);
```

### Run the Demo

```bash
npm start
```

The script will:
1. Connect to the wallet using hardcoded credentials
2. Mint the NFT or FT (depending on which function is uncommented)
3. Print the transaction ID and asset ID to the console
4. Provide a link to view the transaction on the Algorand explorer

## Output Example

```
=== AlgoMintX Node.js Headless Demo ===

Connecting wallet...
✓ Wallet connected: YOUR_WALLET_ADDRESS

--- Minting NFT ---
Name: My Awesome NFT
Description: This is a test NFT minted from Node.js
Image: nft-image.png
✓ NFT minted successfully!
  Transaction ID: ABC123...
  Asset ID: 765015488
  View on testnet: https://lora.algokit.io/testnet/transaction/ABC123...

=== Demo completed ===
```

## Notes

- Make sure you have enough ALGO in your wallet to cover minting fees
- The image file should be placed in the same directory as `index.js`
- If no image is provided, the mint will still work but without visual metadata
- The demo uses testnet by default; change `env: "mainnet"` for mainnet operations
