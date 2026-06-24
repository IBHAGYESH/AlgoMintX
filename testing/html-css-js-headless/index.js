/**
 * Initialize AlgoMintX in Headless Mode
 */

// Hardcoded wallet credentials (REPLACE WITH YOUR OWN)
const HARDCODED_WALLET_ADDRESS = "YOUR_WALLET_ADDRESS_HERE";
const HARDCODED_WALLET_MNEMONIC = "YOUR_WALLET_MNEMONIC_HERE";

// Initialize SDK with disableUi: true
window.algoMintXClient = new window.AlgoMintX({
  // Required
  pinata_ipfs_server_key: "",
  pinata_ipfs_gateway_url: "xxx.mypinata.cloud",
  env: "testnet",
  namespace: "ABCDE",
  revenueWalletAddress: "YOUR_REVENUE_WALLET_ADDRESS_HERE",
  // Optional
  mintFee: 0.1,
  listingFee: 0.1,
  unListingFee: 0.1,
  buyingFee: 0.5,
  disableToast: false,
  toastLocation: "TOP_RIGHT",
  minimizeUILocation: "right",
  logo: null,
  supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"],
  marketplaceType: "NFT",
  disableUi: true, // Headless mode - no UI
});

/**
 * SDK Events
 */
algoMintXClient.events.on(
  "wallet:connection:connected",
  async ({ address }) => {
    console.log("Wallet connected:", address);
    updateWalletStatus(true, address);
  },
);

algoMintXClient.events.on("wallet:connection:disconnected", async () => {
  console.log("Wallet disconnected");
  updateWalletStatus(false, null);
});

algoMintXClient.events.on("wallet:connection:failed", async ({ error }) => {
  console.log("Wallet connection failed:", error);
  updateWalletStatus(false, null);
});

algoMintXClient.events.on("nft:mint:success", async ({ transactionId }) => {
  console.log("NFT mint success:", transactionId);
  showNFTResult(transactionId);
});

algoMintXClient.events.on("nft:mint:failed", async ({ error }) => {
  console.log("NFT mint failed:", error);
  alert("Failed to mint NFT: " + error);
  resetNFTForm();
});

algoMintXClient.events.on("ft:mint:success", async ({ transactionId }) => {
  console.log("FT mint success:", transactionId);
  showFTResult(transactionId);
});

algoMintXClient.events.on("ft:mint:failed", async ({ error }) => {
  console.log("FT mint failed:", error);
  alert("Failed to mint FT: " + error);
  resetFTForm();
});

/**
 * UI Functions
 */
function updateWalletStatus(connected, address) {
  const statusBadge = document.getElementById("wallet-status");
  const walletAddress = document.getElementById("wallet-address");

  if (connected && address) {
    statusBadge.textContent = "Connected";
    statusBadge.className = "status-badge status-connected";
    walletAddress.textContent = address;
  } else {
    statusBadge.textContent = "Disconnected";
    statusBadge.className = "status-badge status-disconnected";
    walletAddress.textContent = "Not connected";
  }
}

function showNFTResult(transactionId) {
  const resultDiv = document.getElementById("nft-result");
  const txidSpan = document.getElementById("nft-txid");
  const submitBtn = document.getElementById("nft-submit");

  txidSpan.textContent = transactionId;
  resultDiv.classList.add("show");
  submitBtn.textContent = "Reset Form";
  submitBtn.classList.remove("btn-primary");
  submitBtn.classList.add("btn-secondary");
  submitBtn.onclick = resetNFTForm;
}

function resetNFTForm() {
  const form = document.getElementById("nft-form");
  const resultDiv = document.getElementById("nft-result");
  const submitBtn = document.getElementById("nft-submit");

  form.reset();
  resultDiv.classList.remove("show");
  submitBtn.textContent = "Mint NFT";
  submitBtn.classList.remove("btn-secondary");
  submitBtn.classList.add("btn-primary");
  submitBtn.onclick = null;
}

function showFTResult(transactionId) {
  const resultDiv = document.getElementById("ft-result");
  const txidSpan = document.getElementById("ft-txid");
  const submitBtn = document.getElementById("ft-submit");

  txidSpan.textContent = transactionId;
  resultDiv.classList.add("show");
  submitBtn.textContent = "Reset Form";
  submitBtn.classList.remove("btn-primary");
  submitBtn.classList.add("btn-secondary");
  submitBtn.onclick = resetFTForm;
}

function resetFTForm() {
  const form = document.getElementById("ft-form");
  const resultDiv = document.getElementById("ft-result");
  const submitBtn = document.getElementById("ft-submit");

  form.reset();
  resultDiv.classList.remove("show");
  submitBtn.textContent = "Mint FT";
  submitBtn.classList.remove("btn-secondary");
  submitBtn.classList.add("btn-primary");
  submitBtn.onclick = null;
}

/**
 * Initialize and Connect Wallet
 */
async function initializeSDK() {
  try {
    // Connect wallet using hardcoded credentials
    await algoMintXClient.connectWallet(
      HARDCODED_WALLET_ADDRESS,
      HARDCODED_WALLET_MNEMONIC,
    );
    console.log("Wallet connected successfully");
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    alert("Failed to connect wallet: " + error.message);
  }
}

/**
 * NFT Minting Handler
 */
async function handleNFTMint(e) {
  e.preventDefault();

  const name = document.getElementById("nft-name").value;
  const description = document.getElementById("nft-description").value;
  const fileInput = document.getElementById("nft-file");

  if (!fileInput.files.length) {
    alert("Please select a file");
    return;
  }

  const submitBtn = document.getElementById("nft-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Minting...";

  try {
    await algoMintXClient.mintNFT({
      name,
      description,
      file: fileInput.files[0],
    });
  } catch (error) {
    console.error("Error minting NFT:", error);
    alert("Failed to mint NFT: " + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Mint NFT";
  }
}

/**
 * FT Minting Handler
 */
async function handleFTMint(e) {
  e.preventDefault();

  const name = document.getElementById("ft-name").value;
  const description = document.getElementById("ft-description").value;
  const decimals = parseInt(document.getElementById("ft-decimals").value);
  const totalSupply = parseInt(document.getElementById("ft-supply").value);
  const fileInput = document.getElementById("ft-file");

  const submitBtn = document.getElementById("ft-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Minting...";

  try {
    await algoMintXClient.mintFT({
      name,
      description,
      decimals,
      totalSupply,
      file: fileInput.files.length ? fileInput.files[0] : null,
    });
  } catch (error) {
    console.error("Error minting FT:", error);
    alert("Failed to mint FT: " + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Mint FT";
  }
}

/**
 * Initialize on DOM Load
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize SDK and connect wallet
  await initializeSDK();

  // Setup NFT form handler
  const nftForm = document.getElementById("nft-form");
  nftForm.addEventListener("submit", handleNFTMint);

  // Setup FT form handler
  const ftForm = document.getElementById("ft-form");
  ftForm.addEventListener("submit", handleFTMint);
});
