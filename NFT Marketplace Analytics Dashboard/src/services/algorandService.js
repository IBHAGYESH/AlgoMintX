import algosdk from "algosdk";
import {
  decodeListingBoxName,
  decodeListingBoxValue,
} from "../../../src/utils.js";

// Network configurations (AlgoMintX shared marketplace contract)
const NETWORK_CONFIG = {
  mainnet: {
    contractApplicationId: 3127816536,
    contractWalletAddress:
      "57U43PN2WYSYFQZAJ2WBGSHT2RG3GJF2B4JJZYBOGUZ5ZDR6K7WCFLQNHU",
    indexerUrl: "https://mainnet-idx.algonode.cloud",
    algodUrl: "https://mainnet-api.algonode.cloud",
  },
  testnet: {
    contractApplicationId: 764970022,
    contractWalletAddress:
      "YUS4ATNZYFNBOSN4MYP5BYPJKQNYSYRGU6PFP65ZLWXPWWBLUZYSHWJGUA",
    indexerUrl: "https://testnet-idx.algonode.cloud",
    algodUrl: "https://testnet-api.algonode.cloud",
  },
};

const DEFAULT_IPFS_GATEWAY = "ipfs.io";

// Convert a base64 string into a byte array
function b64ToBytes(b64) {
  return new Uint8Array(
    atob(b64)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
}

function convertIpfsToHttp(ipfsUrl, gateway = DEFAULT_IPFS_GATEWAY) {
  if (!ipfsUrl) return ipfsUrl;
  return ipfsUrl.replace("ipfs://", `https://${gateway}/ipfs/`);
}

class AlgorandService {
  constructor(network = "testnet") {
    this.network = network;
    this.config = NETWORK_CONFIG[network];
    this.algodClient = new algosdk.Algodv2("", this.config.algodUrl, 443);
  }

  switchNetwork(network) {
    this.network = network;
    this.config = NETWORK_CONFIG[network];
    this.algodClient = new algosdk.Algodv2("", this.config.algodUrl, 443);
  }

  // List all listing boxes for the marketplace contract (names only)
  async getAllApplicationBoxes() {
    try {
      const url = `${this.config.algodUrl}/v2/applications/${this.config.contractApplicationId}/boxes`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.boxes || [];
    } catch (error) {
      console.error("Error fetching application boxes:", error);
      throw error;
    }
  }

  // Fetch a single box value (base64) for the marketplace contract
  async getBoxValueBytes(boxNameBase64) {
    try {
      const encodedName = `b64:${boxNameBase64}`;
      const url = `${this.config.algodUrl}/v2/applications/${
        this.config.contractApplicationId
      }/box?name=${encodeURIComponent(encodedName)}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data?.value ? b64ToBytes(data.value) : null;
    } catch (error) {
      console.error("Error fetching box value:", error);
      return null;
    }
  }

  // Scan every listing box and decode { assetId, seller, price, marketplace }
  async getAllListings() {
    const boxes = await this.getAllApplicationBoxes();
    const listings = [];

    for (const box of boxes) {
      try {
        const decodedName = decodeListingBoxName(box.name);
        if (!decodedName) continue;

        const { marketplace, assetId } = decodedName;
        const valueBytes = await this.getBoxValueBytes(box.name);
        if (!valueBytes) continue;

        const decoded = decodeListingBoxValue(valueBytes);

        listings.push({
          assetId: Number(assetId),
          seller: decoded.seller,
          price: decoded.price,
          marketplace,
        });
      } catch (e) {
        console.warn("Failed to decode listing box", e);
      }
    }

    return listings;
  }

  // Discover all marketplaces (unique `marketplace` values) with aggregates.
  // Parallels the AlgoStakeX dashboard's unique-poolId discovery from boxes.
  async getMarketplaces() {
    const listings = await this.getAllListings();
    const grouped = {};

    listings.forEach(({ assetId, seller, price, marketplace }) => {
      if (!grouped[marketplace]) {
        grouped[marketplace] = {
          marketplace,
          namespace: marketplace.startsWith("AMX")
            ? marketplace.slice(3)
            : marketplace,
          listingCount: 0,
          totalListedValue: 0,
          floorPrice: null,
          sellers: new Set(),
          assetIds: [],
        };
      }
      const entry = grouped[marketplace];
      entry.listingCount += 1;
      entry.totalListedValue += price;
      entry.floorPrice =
        entry.floorPrice === null ? price : Math.min(entry.floorPrice, price);
      entry.sellers.add(seller);
      entry.assetIds.push(assetId);
    });

    return Object.values(grouped)
      .map((entry) => ({
        marketplace: entry.marketplace,
        namespace: entry.namespace,
        listingCount: entry.listingCount,
        uniqueSellers: entry.sellers.size,
        totalListedValue: entry.totalListedValue,
        floorPrice: entry.floorPrice ?? 0,
        avgPrice: entry.listingCount
          ? entry.totalListedValue / entry.listingCount
          : 0,
        assetIds: entry.assetIds,
      }))
      .sort((a, b) => b.listingCount - a.listingCount);
  }

  // Fetch ASA params from the indexer
  async getAssetMetadata(assetId) {
    try {
      const url = `${this.config.indexerUrl}/v2/assets/${assetId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const params = data?.asset?.params || {};
      return {
        assetId: Number(assetId),
        name: params.name || String(assetId),
        unitName: params["unit-name"] || "",
        url: params.url || "",
        total: Number(params.total) || 0,
        decimals: Number(params.decimals) || 0,
        clawback: params.clawback || "",
      };
    } catch (e) {
      return {
        assetId: Number(assetId),
        name: String(assetId),
        unitName: "",
        url: "",
        total: 0,
        decimals: 0,
        clawback: "",
      };
    }
  }

  // Resolve an asset's image URL from its ARC-3 IPFS metadata (best effort)
  async getAssetImage(metadataUrl) {
    try {
      if (!metadataUrl || !metadataUrl.startsWith("ipfs://")) return null;
      const httpUrl = convertIpfsToHttp(metadataUrl.replace("#arc3", ""));
      const res = await fetch(httpUrl);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.image && json.image.startsWith("ipfs://")) {
        return convertIpfsToHttp(json.image);
      }
      return json.image || null;
    } catch (e) {
      return null;
    }
  }

  // Resolve the asset creation (mint) time via the indexer acfg transaction
  async getAssetCreationTime(assetId) {
    try {
      const url = `${this.config.indexerUrl}/v2/transactions?asset-id=${assetId}&tx-type=acfg&limit=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const tx = data?.transactions?.[0];
      const roundTime = tx?.["round-time"];
      return roundTime ? Number(roundTime) : null;
    } catch (e) {
      return null;
    }
  }

  // Current holder of an asset (first balance > 0)
  async getAssetHolder(assetId) {
    try {
      const url = `${this.config.indexerUrl}/v2/assets/${assetId}/balances?currency-greater-than=0`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const holder = (data?.balances || []).find((b) => b.amount > 0);
      return holder ? holder.address : null;
    } catch (e) {
      return null;
    }
  }

  // Full analytics for a single marketplace: listings (with metadata) + metrics
  async getMarketplaceData(marketplace) {
    const allListings = await this.getAllListings();
    const marketplaceListings = allListings.filter(
      (l) => l.marketplace === marketplace,
    );

    if (marketplaceListings.length === 0) {
      throw new Error(`Marketplace ${marketplace} not found`);
    }

    // Enrich each listing with asset metadata, image, mint time and holder
    const enriched = await Promise.all(
      marketplaceListings.map(async (listing) => {
        const meta = await this.getAssetMetadata(listing.assetId);
        const [createdAt, image, holder] = await Promise.all([
          this.getAssetCreationTime(listing.assetId),
          this.getAssetImage(meta.url),
          this.getAssetHolder(listing.assetId),
        ]);
        return {
          ...listing,
          name: meta.name,
          unitName: meta.unitName,
          total: meta.total,
          decimals: meta.decimals,
          image,
          createdAt,
          currentHolder: holder,
        };
      }),
    );

    // Aggregate metrics
    const sellers = new Set();
    const holders = new Set();
    let totalListedValue = 0;
    let floorPrice = null;

    enriched.forEach((l) => {
      sellers.add(l.seller);
      if (l.currentHolder) holders.add(l.currentHolder);
      totalListedValue += l.price;
      floorPrice =
        floorPrice === null ? l.price : Math.min(floorPrice, l.price);
    });

    // Infer marketplace asset type (mono-type: NFT or FT)
    const sample = enriched[0];
    const assetType =
      sample && sample.total === 1 && sample.decimals === 0 ? "NFT" : "FT";

    return {
      marketplace,
      namespace: marketplace.startsWith("AMX")
        ? marketplace.slice(3)
        : marketplace,
      network: this.network,
      status: "Active",
      assetType,
      listings: enriched,
      listingCount: enriched.length,
      uniqueSellers: sellers.size,
      uniqueHolders: holders.size,
      totalListedValue,
      floorPrice: floorPrice ?? 0,
      avgPrice: enriched.length ? totalListedValue / enriched.length : 0,
    };
  }

  // Build a daily "listings over time" series keyed by mint date
  buildListingsTimeline(listings, days = 30) {
    const dailyData = {};
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * oneDayMs);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = { date: dateStr, listings: 0, cumulative: 0 };
    }

    const sorted = listings
      .filter((l) => l.createdAt)
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt);

    sorted.forEach((l) => {
      const dateStr = new Date(l.createdAt * 1000).toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].listings += 1;
      }
    });

    let cumulative = 0;
    return Object.values(dailyData).map((d) => {
      cumulative += d.listings;
      return { ...d, cumulative };
    });
  }

  // Build a price distribution histogram (buckets)
  buildPriceDistribution(listings, bucketCount = 6) {
    const prices = listings.map((l) => l.price).filter((p) => p >= 0);
    if (prices.length === 0) return [];

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min === max) {
      return [{ range: `${min.toFixed(2)}`, count: prices.length }];
    }

    const step = (max - min) / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${(min + i * step).toFixed(1)}-${(min + (i + 1) * step).toFixed(1)}`,
      count: 0,
    }));

    prices.forEach((p) => {
      let idx = Math.floor((p - min) / step);
      if (idx >= bucketCount) idx = bucketCount - 1;
      buckets[idx].count += 1;
    });

    return buckets;
  }

  // Top sellers ranked by total listed value
  buildTopSellers(listings, limit = 50) {
    const agg = new Map();
    listings.forEach((l) => {
      const prev = agg.get(l.seller) || {
        address: l.seller,
        listingCount: 0,
        totalValue: 0,
      };
      prev.listingCount += 1;
      prev.totalValue += l.price;
      agg.set(l.seller, prev);
    });

    return Array.from(agg.values())
      .map((s, i) => ({ id: i + 1, ...s }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }

  async getNetworkStatus() {
    try {
      const status = await this.algodClient.status().do();
      return {
        network: this.network,
        lastRound: status["last-round"],
        timeSinceLastRound: status["time-since-last-round"],
        catchupTime: status["catchup-time"],
      };
    } catch (error) {
      console.error("Error fetching network status:", error);
      throw error;
    }
  }
}

export default AlgorandService;
