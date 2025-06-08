# AlgoMintX SDK

## **AlgoMintX** is a plug-and-play JavaScript SDK for building fully functional **NFT marketplaces** on the **Algorand blockchain**. Designed to integrate seamlessly into any frontend framework, it provides a clean UI, wallet connectivity (via Pera Wallet and Defly Wallet), and all core marketplace features—minting, listing, buying, and revenue generation.

## ✨ Features

- 🔐 **Wallet integration** (Pera Wallet & Defly Wallet)
- 🎨 **NFT minting** via IPFS (Pinata)
- 📦 **Listing NFTs** for sale
- 🛒 **Buying NFTs** from the marketplace
- 💰 **Revenue mechanism** for marketplace owners
- 📁 **IPFS metadata storage** and retrieval
- 🧭 **Minimal, user-friendly UI** with SDK minimization support
- ⚡ **Real-time event emitter** for frontend event handling
- ✅ Works on **Testnet** and **Mainnet**
- 🎥 **Multi-media support** for NFTs (Images, Videos, Audio)
- 🔔 **Customizable toast notifications**
- 🎨 **Customizable UI** with logo support

## 💡 UI Highlights

- ✅ Seamless wallet login with Pera and Defly
- 🎨 Minimalistic NFT minting interface
- 📌 Minimize SDK to a floating button while browsing
- 🔄 Real-time UI feedback and transaction status

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Build the SDK

```bash
npm run build
```

### 3. Run a local server

```bash
npx http-server .
```

### 4. Open the demo

```bash
http://127.0.0.1:8080/testing/index.html
```

---

## 🧩 Integration

```js
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
```

---

## 📦 SDK API

🔧 Exposed Variables
| Variable | Description |
| ------------- | ------------------------------------------------------------------------------ |
| `account` | Wallet address of the currently connected user |
| `events` | Event emitter for subscribing to SDK lifecycle events |
| `isMinimized` | Boolean indicating if the SDK UI is currently minimized |
| `network` | Current configured network (`"testnet"` or `"mainnet"`) |
| `processing` | Boolean indicating if an operation (e.g., minting, listing, buying) is ongoing |
| `theme` | Current theme of the SDK UI (`"light"` or `"dark"`) |

🧠 Exposed Methods
| Method | Description |
| -------------------------------- | --------------------------------------------------- |
| `listNFT({ assetId, nftPrice })` | List an existing NFT to the marketplace |
| `unlistNFT({ assetId })` | Remove an NFT from the marketplace listing |
| `buyNFT({ assetId })` | Buy a listed NFT from the marketplace |
| `getListedNFTs()` | Fetch all NFTs currently listed for sale |
| `getWalletNFTs({ accountId? })` | Retrieve NFTs owned by the specified account or connected wallet. Pass `{}` to get NFTs of connected wallet. |
| `getNFTMetadata({ assetId })` | Fetch metadata of a specific NFT using its asset ID |
| `minimizeSDK()` | Minimize the SDK UI to a floating button |
| `maximizeSDK()` | Restore the SDK UI to its full size |

---

## 📡 SDK Events

The SDK emits various events during wallet operations, UI transitions, and NFT transactions. You can use these events in your frontend to update the UI, show loaders, display messages, etc.

✅ Example Usage

```js
window.algoMintXClient.events.on(
  "wallet:connection:connected",
  ({ address }) => {
    console.log("Wallet connected:", address);
  }
);
```

📋 Full List of Events
| Event Name | Description |
| -------------------------------- | --------------------------------------------------- |
| `wallet:connection:connected` | Fired when wallet is successfully connected |
| `wallet:connection:disconnected` | Fired when wallet is disconnected |
| `wallet:connection:failed` | Fired when wallet connection fails |
| `window:size:minimized` | Fired when the SDK UI is minimized or restored |
| `sdk:processing:started` | Fired when a process (minting, buying, etc.) starts |
| `sdk:processing:stopped` | Fired when the process ends |
| `nft:mint:success` | Fired after successful NFT minting |
| `nft:mint:failed` | Fired if minting fails |
| `nft:list:success` | Fired after NFT is successfully listed |
| `nft:list:failed` | Fired if listing fails |
| `nft:unlist:success` | Fired after NFT is successfully unlisted |
| `nft:unlist:failed` | Fired if unlisting fails |
| `nft:buy:success` | Fired after successful NFT purchase |
| `nft:buy:failed` | Fired if buying fails |

🔧 Example Event Handlers

```js
window.algoMintXClient.events.on(
  "wallet:connection:connected",
  ({ address }) => {
    console.log("Wallet connected:", address);
  }
);

window.algoMintXClient.events.on(
  "wallet:connection:disconnected",
  ({ address }) => {
    console.log("Wallet disconnected:", address);
  }
);

window.algoMintXClient.events.on("wallet:connection:failed", ({ error }) => {
  console.log("Wallet connection failed:", error);
});

window.algoMintXClient.events.on("window:size:minimized", ({ minimized }) => {
  console.log("SDK window minimized:", minimized);
});

window.algoMintXClient.events.on("sdk:processing:started", ({ processing }) => {
  console.log("SDK processing started:", processing);
});

window.algoMintXClient.events.on("sdk:processing:stopped", ({ processing }) => {
  console.log("SDK processing stopped:", processing);
});

window.algoMintXClient.events.on(
  "nft:mint:success",
  ({ transactionId, nft }) => {
    console.log("NFT minted successfully:", transactionId, nft);
  }
);

window.algoMintXClient.events.on("nft:mint:failed", ({ error }) => {
  console.log("NFT mint failed:", error);
});

window.algoMintXClient.events.on(
  "nft:list:success",
  ({ transactionId, nft }) => {
    console.log("NFT listed successfully:", transactionId, nft);
  }
);

window.algoMintXClient.events.on("nft:list:failed", ({ error }) => {
  console.log("NFT listing failed:", error);
});

window.algoMintXClient.events.on(
  "nft:unlist:success",
  ({ transactionId, nft }) => {
    console.log("NFT unlisted successfully:", transactionId, nft);
  }
);

window.algoMintXClient.events.on("nft:unlist:failed", ({ error }) => {
  console.log("NFT unlisting failed:", error);
});

window.algoMintXClient.events.on(
  "nft:buy:success",
  ({ transactionId, nft }) => {
    console.log("NFT purchase successful:", transactionId, nft);
  }
);

window.algoMintXClient.events.on("nft:buy:failed", ({ error }) => {
  console.log("NFT purchase failed:", error);
});
```

---

## 🤝 Contributing

Pull requests and feature suggestions are welcome! For major changes, please open an issue first to discuss your idea.

## 🙏 Appreciation

Thank you for checking out AlgoMintX! This project was crafted with care to simplify NFT marketplace development on Algorand and help developers ship faster.

If you found this useful, feel free to ⭐️ star the repo and share it with others in the community.

## 👨‍💻 About the Author

Built and maintained by Bhagyesh Jahangirpuria.

- 🌐 Website: http://ibhagyesh.site
- 🔗 LinkedIn: https://in.linkedin.com/in/bhagyesh-jahangirpuria

Feel free to connect for collaborations, feedback, or consulting!
