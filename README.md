# AlgoMintX SDK

**Launch a beautiful, full-featured NFT / FT marketplace on Algorand in minutes.**
Plug-and-play JavaScript SDK: just drop it in, connect wallets, mint, list, unlist, buy, and earn revenue—no backend required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Algorand](https://img.shields.io/badge/Algorand-000000?style=flat&logo=algorand&logoColor=white)](https://algorand.com)

## ✨ Features

- 🔐 **Wallet integration** (Pera Wallet & Defly Wallet)
- 🎨 **NFT minting** via IPFS (Pinata)
- 🪙 **Fungible Token (FT / Algorand ASA) minting** with a dedicated "Mint FT" tab
- 🏷️ **Configurable `marketplaceType`** (`"NFT"` or `"FT"`) that gates what can be listed, discovered, and purchased
- 🧭 **Marketplace discovery** (`getMarketplaces()`) to power dashboards and explorers
- 📊 **NFT / FT Marketplace Analytics Dashboard** (standalone Vite/React app, see `NFT Marketplace Analytics Dashboard/`)
- 📦 **Listing NFTs / FTs** for sale
- 🗑️ **Unlisting NFTs / FTs** from the marketplace
- 🛒 **Buying NFTs / FTs** from the marketplace
- 💰 **Revenue mechanism** for marketplace owners
- 💸 **Customizable marketplace fees** (minting, listing, buying, unlisting)
- 📁 **IPFS metadata storage** and retrieval
- 🎥 **Multi-media support** for NFTs (Images, Videos, Audio)
- 🧪 **No smart contract writing required** — pre-audited smart contract ready to use
- 🎓 **No blockchain expertise required**
- ✅ Works on **Testnet** and **Mainnet**
- 🧭 **Minimal, user-friendly UI** with SDK minimization support
- ⚡ **Real-time event emitter** for frontend event handling
- 🔔 **Customizable toast notifications**
- 🎨 **Customizable UI** with logo support
- 🌗 **Light/Dark theme support**
- 📱 **Mobile-friendly, responsive UI**
- 🆓 **No backend required**—all logic runs in the browser
- ⏳ **UI feedbacks with loaders and toast messages**
- 🛡️ **Robust input validation** for all user and config parameters
- 👐 **Open source & actively maintained**

---

## 🚀 Quick Start (For SDK Users)

### 1. Import the SDK in your HTML

Add the following `<script>` tag to your HTML `<head>` (see demo HTML for reference):

```html
<!-- Import AlgoMintX SDK -->
<script
  defer
  src="https://cdn.jsdelivr.net/gh/IBHAGYESH/AlgoMintX@latest/dist/algomintx.js"
></script>
<!-- Or use your local build during development -->
<!-- <script defer src="./dist/algomintx.js"></script> -->
```

### 2. Initialize the SDK in your frontend

Add this to your main JS file or a `<script>` tag after the SDK import:

```js
window.algoMintXClient = new window.AlgoMintX({
  pinata_ipfs_server_key: "<YOUR_PINATA_API_KEY>",
  pinata_ipfs_gateway_url: "YOUR_PINATA_GATEWAY.mypinata.cloud",
  env: "testnet", // "testnet" or "mainnet"
  namespace: "ABCDE", // Unique 5-character uppercase string
  revenueWalletAddress: "<YOUR_ALGORAND_WALLET_ADDRESS>",
  // Optional:
  marketplaceType: "NFT", // "NFT" (default) or "FT" — only this asset type can be listed/discovered/bought
  mintFee: 0.1, // in Algos
  listingFee: 0.1, // in Algos
  buyingFee: 0.5, // in Algos
  unListingFee: 0.1, // in Algos
  disableToast: false,
  toastLocation: "TOP_RIGHT", // "TOP_LEFT" or "TOP_RIGHT"
  minimizeUILocation: "right", // "left" or "right"
  logo: "./logo.png", // URL or path to your logo
  supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"],
});
```

### 3. See the SDK UI

After initialization, the AlgoMintX UI will automatically appear on your frontend. Users can connect their wallet, mint, list, buy, and manage NFTs / FTs with no further setup.

---

## 🔧 Advanced Configuration

### UI Customization

```javascript
// UI customization (relevant options only)
disableToast: false;
toastLocation: "TOP_RIGHT";
minimizeUILocation: "right";
logo: "https://myapp.com/logo.png";
```

### Marketplace Type (`marketplaceType`)

`marketplaceType` controls which kind of Algorand asset your marketplace deals in:

| Value             | Behavior                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `"NFT"` (default) | Only non-fungible assets (`total === 1`, `decimals === 0`) can be listed, discovered, and bought. |
| `"FT"`            | Only fungible assets (`total > 1` or `decimals > 0`) can be listed, discovered, and bought.       |

The UI always shows **both** the "Mint NFT" and "Mint FT" tabs (you can mint either asset type), but the listing, discovery (`getListedNFTs`), and purchase flows are restricted to the configured `marketplaceType`. Attempting to list or buy a mismatched asset type throws a clear error.

### Fungible Token (FT) Minting

The "Mint FT" tab creates an Algorand ASA with a configurable supply and divisibility, following the same ARC-3 + IPFS flow as NFT minting. The form fields are:

- **Token Name** (required)
- **Token Description** (required)
- **Decimals** (required, `0`–`19`) — how divisible the token is
- **Total Supply** (required, `>= 1`)
- **Token Icon** (optional image, reuses the existing IPFS pipeline)

---

## 🧪 How to Run the Demos

### HTML/CSS/JS Demo

- **Location:** `testing/html-css-js/`
- **Config file:** `testing/html-css-js/index.js`

#### Run with Live Deployed SDK (Recommended for most users)

1. Configure the SDK in `index.js` as shown above.
2. Start a local server:
   ```bash
   npx http-server .
   ```
3. Open the demo in your browser:
   ```
   http://127.0.0.1:8080/testing/html-css-js/index.html
   ```

#### Run with Local Development Build of SDK (For SDK Developers)

1. Configure the SDK in `index.js` as above.
2. Install dependencies and build the SDK:
   ```bash
   npm install
   npm run build
   ```
3. Change the `<script src=...>` in your HTML files to point to your local build (e.g., `../../dist/algomintx.js`).
4. Start a local server:
   ```bash
   npx http-server .
   ```
5. Open the demo:
   ```
   http://127.0.0.1:8080/testing/html-css-js/index.html
   ```

### React Demo

- **Location:** `testing/react/`
- **Config file:** `testing/react/src/hooks/useSDK.js`

1. Configure the SDK in `hooks/useSDK.js` as shown above.
2. In the terminal:
   ```bash
   cd testing/react
   npm install
   npm run build
   npm run preview
   ```
3. Open the demo:
   ```
   http://localhost:4173
   ```

---

## 📦 SDK API

### NFT Type Schema

The SDK returns NFT objects with the following structure:

```ts
type NFT = {
  assetId: number; // Algorand asset ID
  name: string; // NFT name
  unitName?: string; // Asset unit name (e.g., AMXDEMO)
  creator?: string; // Wallet address of the creator
  url?: string; // IPFS metadata URL (ipfs://...)
  clawback?: string; // On-chain clawback address if set (not required for listing)
  decimals: number; // Always 0 for NFTs
  total: number; // Always 1 for NFTs
  metadata?: {
    name: string; // NFT name (from metadata)
    description: string; // NFT description
    image: string; // IPFS gateway URL to image/media
    image_integrity: string; // SHA-256 hash of the image/media
    image_mimetype: string; // MIME type (e.g., image/png, video/mp4)
    decimals: number; // Always 0
    standard: string; // e.g., "arc3"
    minted_by: string; // SDK identifier
    marketplace: string; // Marketplace namespace
  };
  currentHolder?: string; // Wallet address of current holder
  listing?: {
    seller: string; // Wallet address of seller
    price: number; // Price in ALGOs
    marketplace: string; // Marketplace namespace
  };
  transactionId?: string; // Asset creation or last relevant transaction ID
};
```

### FT Type Schema

In an `"FT"` marketplace the same object shape is returned, but `total` reflects the chosen supply and `decimals` the chosen divisibility. The IPFS `metadata` follows ARC-3 with `decimals` set to the divisibility and `image`/integrity fields optional (an icon is optional for FTs):

```ts
type FT = {
  assetId: number; // Algorand asset ID
  name: string; // Token name
  unitName?: string; // Asset unit name (e.g., AMXDEMO)
  decimals: number; // Chosen divisibility (0-19)
  total: number; // Chosen total supply (>= 1)
  metadata?: {
    name: string;
    description: string;
    decimals: number; // Chosen divisibility
    standard: string; // e.g., "arc3"
    minted_by: string; // SDK identifier
    marketplace: string; // Marketplace namespace
    image?: string; // Optional icon (IPFS gateway URL)
    image_integrity?: string;
    image_mimetype?: string;
  };
  listing?: {
    seller: string;
    price: number; // Price in ALGOs
    marketplace: string;
  };
};
```

### Marketplace Discovery Type Schema

```ts
type Marketplace = {
  marketplace: string; // e.g., "AMXDEMO" (= AMX + namespace)
  namespace: string; // e.g., "DEMO"
  listingCount: number;
  uniqueSellers: number;
  totalListedValue: number; // total of listed prices (ALGO)
  floorPrice: number; // lowest listed price (ALGO)
  avgPrice: number; // average listed price (ALGO)
  assetIds: string[];
  isCurrentMarketplace: boolean; // true if it matches this SDK instance's namespace
};
```

#### Exposed Variables

| Variable      | Type    | Description                                              |
| ------------- | ------- | -------------------------------------------------------- |
| `account`     | string  | Wallet address of the currently connected user           |
| `events`      | object  | Event emitter for subscribing to SDK lifecycle events    |
| `isMinimized` | boolean | If the SDK UI is currently minimized                     |
| `network`     | string  | Current configured network (`"testnet"` or `"mainnet"`)  |
| `processing`  | boolean | If an operation (e.g., minting, buying, etc.) is ongoing |
| `theme`       | string  | Current theme of the SDK UI (`"light"` or `"dark"`)      |

#### Exposed Methods

| Method & Signature                                                         | Description                                                                                                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mintNFT({ name, description, file })`                                     | Mint an NFT programmatically (headless or custom UI). `file` accepts browser `File`/`Blob` or Node `{ data, name, type }`.                                                                 |
| `mintFT({ name, description, decimals, totalSupply, file? })`              | Mint a fungible token programmatically (headless or custom UI)                                                                                                                             |
| `connectWallet(address, mnemonic)`                                         | Connect programmatically with a 25-word mnemonic (Node.js / headless)                                                                                                                      |
| `disconnectWallet()`                                                       | Disconnect the active wallet session                                                                                                                                                       |
| `getAssetMetadata({ assetId })`                                            | Alias for `getNFTMetadata` — works for both NFT and FT assets                                                                                                                              |
| `listNFT({ assetId: number, nftPrice: number })`                           | List an existing NFT to the marketplace                                                                                                                                                    |
| `unlistNFT({ assetId: number })`                                           | Remove an NFT from the marketplace listing                                                                                                                                                 |
| `buyNFT({ assetId: number })`                                              | Buy a listed NFT from the marketplace                                                                                                                                                      |
| `getListedNFTs(): Promise<Array<NFT>>`                                     | Fetch all NFTs currently listed for sale                                                                                                                                                   |
| `getWalletAssets({ accountId?, marketplaceOnly? }): Promise<Array<Asset>>` | Retrieve assets owned by a wallet. Default returns **all NFTs and FTs**. Pass `marketplaceOnly: true` to return only assets matching the configured `marketplaceType` (`"NFT"` or `"FT"`). |
| `getWalletNFTs(...)`                                                       | Alias for `getWalletAssets()`                                                                                                                                                              |
| `getNFTMetadata({ assetId: number }): Promise<NFT>`                        | Fetch metadata of a specific NFT using its asset ID                                                                                                                                        |
| `getFTMetadata({ assetId: number }): Promise<FT>`                          | Fetch metadata of a specific FT using its asset ID (type-aware metadata resolution)                                                                                                        |
| `getMarketplaces(): Promise<Array<Marketplace>>`                           | Discover all marketplaces (unique `AMX{namespace}` values) that currently have on-chain listings, with aggregates                                                                          |
| `getMarketplaceCount(): Promise<number>`                                   | Return how many distinct marketplaces currently have at least one active listing                                                                                                           |
| `listingStatus(assetId, marketplace?: string): Promise<object>`            | O(1) listing lookup for a marketplace + asset                                                                                                                                              |
| `getMarketplaceStats(marketplace?: string): Promise<object>`               | Lightweight listings + metrics for one marketplace (defaults to this instance's marketplace)                                                                                               |
| `getMarketplaceData(marketplace?: string): Promise<object>`                | Rich analytics for one marketplace: enriched listings (metadata, holder, images) + aggregate metrics                                                                                       |
| `minimizeSDK(): void`                                                      | Minimize the SDK UI to a floating button                                                                                                                                                   |
| `maximizeSDK(): void`                                                      | Restore the SDK UI to its full size                                                                                                                                                        |

---

## 📡 SDK Events

The SDK emits various events during wallet operations, UI transitions, and NFT transactions. You can use these events in your frontend to update the UI, show loaders, display messages, etc.

✅ Example Usage

```js
window.algoMintXClient.events.on(
  "wallet:connection:connected",
  ({ address }) => {
    console.log("Wallet connected:", address);
  },
);
```

| Event Name                       | Description                                         | Emitted Data (Type)                   |
| -------------------------------- | --------------------------------------------------- | ------------------------------------- |
| `wallet:connection:connected`    | Fired when wallet is successfully connected         | `{ address: string }`                 |
| `wallet:connection:disconnected` | Fired when wallet is disconnected                   | `{ address: string }`                 |
| `wallet:connection:failed`       | Fired when wallet connection fails                  | `{ error: string }`                   |
| `window:size:minimized`          | Fired when the SDK UI is minimized or restored      | `{ minimized: boolean }`              |
| `sdk:processing:started`         | Fired when a process (minting, buying, etc.) starts | `{ processing: boolean }`             |
| `sdk:processing:stopped`         | Fired when the process ends                         | `{ processing: boolean }`             |
| `nft:mint:success`               | Fired after successful NFT minting                  | `{ transactionId: string, nft: NFT }` |
| `nft:mint:failed`                | Fired if minting fails                              | `{ error: string }`                   |
| `ft:mint:success`                | Fired after successful FT (ASA) minting             | `{ transactionId: string, ft: FT }`   |
| `ft:mint:failed`                 | Fired if FT minting fails                           | `{ error: string }`                   |
| `nft:list:success`               | Fired after NFT is successfully listed              | `{ transactionId: string, nft: NFT }` |
| `nft:list:failed`                | Fired if listing fails                              | `{ error: string }`                   |
| `nft:unlist:success`             | Fired after NFT is successfully unlisted            | `{ transactionId: string, nft: NFT }` |
| `nft:unlist:failed`              | Fired if unlisting fails                            | `{ error: string }`                   |
| `nft:buy:success`                | Fired after successful NFT purchase                 | `{ transactionId: string, nft: NFT }` |
| `nft:buy:failed`                 | Fired if buying fails                               | `{ error: string }`                   |

---

## 📊 NFT Marketplace Analytics Dashboard

A standalone Vite + React analytics dashboard lives in [`NFT Marketplace Analytics Dashboard/`](NFT%20Marketplace%20Analytics%20Dashboard/). It uses the same box-scanning discovery as `getMarketplaces()` to find every marketplace with active listings and visualizes:

- Metric chips: Total Listed, Floor Price, Avg Price, Total Listed Value, Unique Sellers
- **Listings Over Time** (area chart)
- **Price Distribution** (bar histogram)
- **Top Sellers** (ranked by total listed value)
- Current listings preview and inferred marketplace asset type (NFT / FT)

```bash
cd "NFT Marketplace Analytics Dashboard"
npm install
npm run dev
```

---

## 🤝 Contributing

Pull requests and feature suggestions are welcome! For major changes, please open an issue first to discuss your idea.

## 🙏 Appreciation

Thank you for checking out AlgoMintX! This project was crafted with care to simplify NFT marketplace development on Algorand and help developers ship faster.

If you found this useful, feel free to ⭐️ star the repo and share it with others in the community.

## 👨‍💻 About the Author

Built and maintained by Bhagyesh Jahangirpuria.

- 🌐 Website: https://ibhagyesh.com
- 🔗 LinkedIn: https://in.linkedin.com/in/ibhagyesh

**Feel free to connect for collaborations, feedback, or consulting!**

---

<div align="center">

**Made with ❤️ for the Algorand Community**

If AlgoMintX helped you build something awesome, I'd love to hear about it!

</div>
