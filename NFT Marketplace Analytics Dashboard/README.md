# AlgoMintX Marketplace Analytics Dashboard

A real-time analytics dashboard for marketplaces created with the [AlgoMintX SDK](../README.md). It discovers every marketplace that currently has on-chain listings and visualizes listing activity, pricing, and seller distribution.

## Features

- Discovers all created marketplaces by scanning the shared AlgoMintX contract's listing boxes and grouping by the `marketplace` (`AMX{namespace}`) field — the same box-scanning approach the AlgoStakeX dashboard uses to discover pools.
- TestNet / MainNet toggle with live network status.
- Per-marketplace analytics:
  - Metric chips: Total Listed, Floor Price, Avg Price, Total Listed Value, Unique Sellers.
  - **Listings Over Time** (area chart, by mint date).
  - **Price Distribution** (bar histogram of listing prices).
  - **Top Sellers** ranked by total listed value.
  - Current listings preview with thumbnails.
  - Inferred marketplace asset type (NFT or FT).

## Data sources

All data is read directly from public Algorand infrastructure (no SDK import required):

- Algod REST (`/v2/applications/{appId}/boxes`, `/v2/applications/{appId}/box`) — listing discovery.
- Indexer (`/v2/assets/{id}`, `/v2/assets/{id}/balances`, `/v2/transactions?tx-type=acfg`) — asset metadata, holders, mint time.

Contract application IDs are hardcoded in `src/services/algorandService.js` (mainnet `3127816536`, testnet `741003115`).

## Getting Started

```bash
npm install
npm run dev
```

Then open the printed local URL and search for a marketplace namespace (e.g. `DEMOY`) or click a discovered marketplace card.

## Build

```bash
npm run build
npm run preview
```

---

Crafted with love by [ibhagyesh](https://ibhagyesh.com/).
