/**
 * AlgoMintX SDK Utility Functions
 * Pure utility functions for hashing, encoding, and IPFS operations
 */

import algosdk from "algosdk";
import { bytesToBase64, isBrowser } from "./env.js";

/**
 * Normalize file input for browser File/Blob or Node { data, name, type }.
 */
export function normalizeUploadFile(file) {
  if (!file) {
    throw new Error("File is required.");
  }

  if (typeof Blob !== "undefined" && file instanceof Blob) {
    return file;
  }

  if (file.data != null && file.name) {
    const data = file.data instanceof Uint8Array ? file.data : Buffer.from(file.data);
    return new Blob([data], {
      type: file.type || file.mimetype || "application/octet-stream",
    });
  }

  throw new Error(
    "Invalid file input. Provide a File/Blob in the browser or { data, name, type } in Node.js.",
  );
}

export async function readFileBuffer(file) {
  const normalized = normalizeUploadFile(file);
  if (typeof normalized.arrayBuffer === "function") {
    return normalized.arrayBuffer();
  }
  throw new Error("Unable to read file buffer.");
}

/**
 * Hashing Utilities
 */

export async function sha256Hash(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return new Uint8Array(hashBuffer);
}

export async function getImageIntegrityBase64(file) {
  const buffer = await readFileBuffer(file);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `sha256-${bytesToBase64(hashArray)}`;
}

/**
 * IPFS Utilities
 */

export async function uploadFileToIPFS(file, apiKey) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const normalized = normalizeUploadFile(file);

  const data = new FormData();
  if (isBrowser() && typeof File !== "undefined" && file instanceof File) {
    data.append("file", file);
  } else {
    const fileName =
      file.name || (normalized.type ? `upload.${normalized.type.split("/")[1] || "bin"}` : "upload.bin");
    data.append("file", normalized, fileName);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: data,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to upload file to IPFS: ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json();
  if (!json.IpfsHash) {
    throw new Error("Pinata did not return an IPFS hash.");
  }

  return json.IpfsHash;
}

export async function uploadJSONToIPFS(jsonData, apiKey) {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(jsonData),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to upload JSON to IPFS: ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json();
  if (!json.IpfsHash) {
    throw new Error("Pinata did not return an IPFS hash for metadata.");
  }

  return json.IpfsHash;
}

export async function deleteFromIPFS(ipfsHash, apiKey) {
  try {
    const response = await fetch(
      `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete from IPFS: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error deleting from IPFS:", error);
    throw error;
  }
}

/**
 * Conversion Utilities
 */

export function algosToMicroAlgos(algos) {
  return Math.round(algos * 1_000_000);
}

export function microAlgosToAlgos(microAlgos) {
  return Number(microAlgos / 1_000_000);
}

/**
 * IPFS Conversion Utilities
 */

export function convertIpfsToHttp(ipfsUrl, gateway = null) {
  // Use default IPFS gateway if none provided
  const defaultGateway = "ipfs.io";
  const actualGateway = gateway || defaultGateway;
  return ipfsUrl.replace("ipfs://", `https://${actualGateway}/ipfs/`);
}

/**
 * Listing box encode/decode utilities (shared by SDK and dashboard)
 * Box key layout mirrors AlgoStakeX: listing_{marketplace}_{assetId}
 *   = "listing_" + arc4.Str(marketplace) + arc4.Str("_") + uint64(assetId)
 */

export function buildListingBoxName(marketplace, assetId) {
  const prefix = new TextEncoder().encode("listing_");
  const marketplaceBytes = new TextEncoder().encode(marketplace);
  const separatorBytes = new TextEncoder().encode("_");
  const assetIdBytes = algosdk.encodeUint64(BigInt(assetId));

  const totalSize =
    prefix.length +
    2 +
    marketplaceBytes.length +
    2 +
    separatorBytes.length +
    assetIdBytes.length;
  const name = new Uint8Array(totalSize);

  let offset = 0;
  const view = new DataView(name.buffer);

  name.set(prefix, offset);
  offset += prefix.length;

  view.setUint16(offset, marketplaceBytes.length, false);
  offset += 2;
  name.set(marketplaceBytes, offset);
  offset += marketplaceBytes.length;

  view.setUint16(offset, separatorBytes.length, false);
  offset += 2;
  name.set(separatorBytes, offset);
  offset += separatorBytes.length;

  name.set(assetIdBytes, offset);
  return name;
}

export function getBoxNameB64(marketplace, assetId) {
  return Buffer.from(buildListingBoxName(marketplace, assetId)).toString(
    "base64"
  );
}

export function getListingBoxReference(appIndex, marketplace, assetId) {
  return { appIndex, name: buildListingBoxName(marketplace, assetId) };
}

/**
 * Decode listing box name into { marketplace, assetId } (bytes or base64 string).
 */
export function decodeListingBoxName(boxName) {
  try {
    const bytes =
      typeof boxName === "string"
        ? Uint8Array.from(atob(boxName), (c) => c.charCodeAt(0))
        : boxName;

    let offset = 0;
    const prefix = new TextDecoder().decode(bytes.slice(0, 8));
    if (prefix !== "listing_") return null;
    offset += 8;

    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength
    );

    const marketplaceLen = view.getUint16(offset, false);
    offset += 2;
    const marketplace = new TextDecoder().decode(
      bytes.slice(offset, offset + marketplaceLen)
    );
    offset += marketplaceLen;

    const separatorLen = view.getUint16(offset, false);
    offset += 2;
    const separator = new TextDecoder().decode(
      bytes.slice(offset, offset + separatorLen)
    );
    offset += separatorLen;

    if (separator !== "_") return null;

    const assetId = Number(
      algosdk.decodeUint64(bytes.slice(offset, offset + 8), "safe")
    );

    return { marketplace, assetId: String(assetId) };
  } catch (e) {
    console.warn("Failed to decode listing box name", e);
    return null;
  }
}

/**
 * Decode ARC-4 Listing struct bytes into { seller, price (ALGO), marketplace }.
 */
export function decodeListingBoxValue(rawBytes) {
  const view = new DataView(
    rawBytes.buffer,
    rawBytes.byteOffset,
    rawBytes.byteLength
  );

  const sellerStart = 8;
  const sellerEnd = sellerStart + 58;
  const seller = new TextDecoder().decode(rawBytes.slice(sellerStart, sellerEnd));

  const priceLen = view.getUint16(sellerEnd, false);
  const priceStart = sellerEnd + 2;
  const priceEnd = priceStart + priceLen;
  const priceStr = new TextDecoder().decode(rawBytes.slice(priceStart, priceEnd));
  const price = microAlgosToAlgos(Number(priceStr));

  const marketplaceLen = view.getUint16(priceEnd, false);
  const marketplaceStart = priceEnd + 2;
  const marketplaceEnd = marketplaceStart + marketplaceLen;
  const marketplace = new TextDecoder().decode(
    rawBytes.slice(marketplaceStart, marketplaceEnd)
  );

  return { seller, price, marketplace };
}
