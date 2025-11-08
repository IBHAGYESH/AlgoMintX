/**
 * AlgoMintX SDK Utility Functions
 * Pure utility functions for hashing, encoding, and IPFS operations
 */

import algosdk from "algosdk";

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
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64Hash = btoa(String.fromCharCode(...hashArray));
  return `sha256-${base64Hash}`;
}

/**
 * IPFS Utilities
 */

export async function uploadFileToIPFS(file, apiKey) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

  const data = new FormData();
  data.append("file", file);

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
 * Box Name Encoding Utilities
 */

export function getBoxNameB64(assetId) {
  const prefix = "listing_";
  const encodedAssetId = algosdk.encodeUint64(BigInt(assetId)); // Uint64 to 8-byte Buffer
  const boxName = new Uint8Array([
    ...Buffer.from(prefix), // "listing_" as bytes
    ...encodedAssetId, // 8-byte encoded assetId
  ]);
  return Buffer.from(boxName).toString("base64");
}

export function getListingBoxReference(appIndex, assetId) {
  const prefix = "listing_";
  const encodedAssetId = algosdk.encodeUint64(BigInt(assetId)); // Uint64 to 8-byte Buffer
  const boxName = new Uint8Array([
    ...Buffer.from(prefix), // "listing_" as bytes
    ...encodedAssetId, // 8-byte encoded assetId
  ]);
  return { appIndex, name: boxName };
}
