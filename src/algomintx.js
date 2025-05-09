import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import eventBus from "./event-bus.js";
import "./algomintx.css";
import { AlgoMintXClient } from "./AlgoMintXClient/AlgoMintXClient.ts";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

const appSpecJson = require("./AlgoMintXClient/AlgoMintX.arc32.json");
const encoder = new algosdk.ABIContract({
  name: appSpecJson.contract.name,
  methods: appSpecJson.contract.methods,
});

class AlgoMintX {
  constructor({
    pinata_ipfs_server_key,
    pinata_ipfs_gateway_url,
    env,
    namespace,
    revenueWalletAddress,
    listingFee,
    buyingFee,
  }) {
    /**
     * sdk validation
     */

    // pinata config
    this.pinata_ipfs_server_key = pinata_ipfs_server_key;
    this.pinata_ipfs_gateway_url = pinata_ipfs_gateway_url;

    if (!this.pinata_ipfs_server_key || !this.pinata_ipfs_gateway_url) {
      this.sdkValidationFailed("Missing pinata IPFS config!");
    }

    // networks supported
    const supportedNetworks = ["mainnet", "testnet"];
    const networkSupported = supportedNetworks.includes(env);
    if (!networkSupported) {
      this.sdkValidationFailed("Specify a valid blockchain network!");
    }
    this.network = env;

    // namespace
    this.namespace = namespace.toUpperCase();
    if (!this.namespace) {
      this.sdkValidationFailed("Specify a namespace!");
    } else if (typeof this.namespace !== "string") {
      this.sdkValidationFailed("namespace must be of type string!");
    } else if (this.namespace.length > 5 || this.namespace.length < 5) {
      this.sdkValidationFailed("namespace must be of length 5!");
    } else if (!/^[A-Z]+$/.test(this.namespace)) {
      this.sdkValidationFailed("namespace must only contain alphabets!");
    }

    // revenue config
    this.revenueWalletAddress = revenueWalletAddress;
    if (!this.revenueWalletAddress) {
      this.sdkValidationFailed("Specify a valid algorand wallet address!");
    } else if (typeof this.revenueWalletAddress !== "string") {
      this.sdkValidationFailed(
        "algorand wallet address must be of type string!"
      );
    }
    this.listingFee = listingFee;
    if (!this.listingFee) {
      this.sdkValidationFailed("Specify a NFT listing fee!");
    } else if (typeof this.listingFee !== "number") {
      this.sdkValidationFailed("NFT listing fee must be of type number!");
    }
    this.buyingFee = buyingFee;
    if (!this.buyingFee) {
      this.sdkValidationFailed("Specify a NFT buying fee!");
    } else if (typeof this.buyingFee !== "number") {
      this.sdkValidationFailed("NFT buying fee must be of type number!");
    }

    /**
     * wallet connection config
     */

    // wallet connectors for different wallets
    this.walletConnectors = {
      pera: new PeraWalletConnect(),
      defly: new DeflyWalletConnect(),
    };

    // Wallet connection state
    this.walletConnected = false;
    this.account = null;
    this.connectionInfo = null;
    this.connectionInProgress = false;

    // Wallet types supported
    this.supportedWallets = ["pera", "defly"];
    this.selectedWalletType = null;

    // algosdk config
    this.algodClient = new algosdk.Algodv2(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      this.network === "mainnet"
        ? "https://mainnet-api.algonode.cloud"
        : "https://testnet-api.algonode.cloud",
      443
    );
    this.algorandClient = AlgorandClient.fromClients({
      algod: this.algodClient,
    });

    /**
     * smart contract
     */
    this.contractApplicationId =
      this.network === "mainnet" ? 739257157 : 739257157;
    this.contractWalletAddress =
      this.network === "mainnet"
        ? "XIAYGNPJ7QOG7GZHVLWMOPSCHY2MQQ56IGHYGGWDQFVZD4FLY2R7HJNUVU"
        : "XIAYGNPJ7QOG7GZHVLWMOPSCHY2MQQ56IGHYGGWDQFVZD4FLY2R7HJNUVU";
    this.appClient = new AlgoMintXClient({
      appId: this.contractApplicationId,
      algorand: this.algorandClient,
    });

    /**
     * sdk variables
     */

    this.indexerUrl =
      this.network === "mainnet"
        ? "https://mainnet-idx.algonode.network"
        : "https://testnet-idx.algonode.network";
    this.unitName = `AMX${this.namespace}`;
    this.metadataMark = "AlgoMintX";
    this.events = eventBus;

    /**
     * ui config
     */

    this.messageElement = null;
    this.processing = false;
    this.isMinimized = JSON.parse(localStorage.getItem("amx")) || false;
    localStorage.setItem("amx", this.isMinimized);

    this.initUI();
  }

  sdkValidationFailed(message) {
    localStorage.removeItem("walletconnect");
    localStorage.removeItem("DeflyWallet.Wallet");
    localStorage.removeItem("PeraWallet.Wallet");

    alert(message);
    window.location.reload();
  }

  async initUI() {
    try {
      // Inject the entire SDK container directly into document.body with highest z-index
      const existingSdk = document.getElementById("algomintx-sdk-container");
      if (existingSdk) existingSdk.remove(); // remove if existing to avoid duplicates

      const container = document.createElement("div");
      container.id = "algomintx-sdk-container";

      container.innerHTML = `
      <div id="sdk-header">
        <h3>AlgoMintX</h3>
          <div>
            <button id="logoutBtn">Logout</button>
            <button id="sdkMinimizeBtn" title="Minimize SDK">&#x2013;</button>
          </div>
      </div>
    
      <div id="walletChoiceScreen">
        <button class="walletBtn" data-wallet="pera">Connect Pera Wallet</button>
        <button class="walletBtn" data-wallet="defly">Connect Defly Wallet</button>
      </div>
    
      <div id="sdkUI">
        <input type="text" id="nftName" placeholder="NFT Name" />
        <textarea id="nftDescription" placeholder="NFT Description"></textarea>
        <input type="file" id="nftFile" />
        <button id="mintNFTBtn">Mint NFT</button>
        <button id="resetNFTBtn">Mint another NFT</button>
        <br />
        <div id="sdkMessages" title="Click to copy"></div>
        </div>

      <div id="walletAddressBar" title="Click to copy wallet address"></div>
    `;

      document.body.appendChild(container);

      // Create minimized circle button but hide initially
      const minimizedBtn = document.createElement("button");
      minimizedBtn.id = "sdkMinimizedBtn";
      minimizedBtn.innerHTML = "AmX"; // Button Icon

      document.body.appendChild(minimizedBtn);

      // Choose wallet button
      document
        .getElementById("walletChoiceScreen")
        .addEventListener("click", async (event) => {
          if (event.target.classList.contains("walletBtn")) {
            const walletType = event.target.getAttribute("data-wallet");
            await this.startWalletConnection(walletType);
          }
        });

      // Mint NFT button
      document
        .getElementById("mintNFTBtn")
        .addEventListener("click", async () => {
          await this.validateNFTDetails();
        });

      // Reset NFT button
      document
        .getElementById("resetNFTBtn")
        .addEventListener("click", () => this.resetNFTDetails());

      // Minimize button
      document
        .getElementById("sdkMinimizeBtn")
        .addEventListener("click", () => this.minimizeSDK());

      // Logout button
      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => this.handleLogout());

      minimizedBtn.addEventListener("click", () => this.maximizeSDK());

      // Copy to clipboard for sdkMessages (tx id)
      this.messageElement = document.getElementById("sdkMessages");
      this.messageElement.addEventListener("click", () => {
        if (
          this.messageElement.innerText &&
          this.messageElement.innerText !== "Minting NFT... Please wait."
        ) {
          navigator.clipboard.writeText(
            this.messageElement.innerText.replace(
              "NFT Minted! Transaction ID: ",
              ""
            )
          );
          this.showToast("Transaction ID copied to clipboard", "success");
        }
      });

      // Copy to clipboard for wallet address bar
      walletAddressBar.addEventListener("click", () => {
        if (this.account) {
          navigator.clipboard.writeText(this.account.replace("Wallet: ", ""));
          this.showToast("Wallet address copied to clipboard", "success");
        }
      });

      // Check if already connected (from localStorage)
      await this.loadConnectionFromStorage();
    } catch (error) {
      console.error(error, "init");
    }
  }

  resetToLoginUI() {
    this.walletConnected = false;
    this.account = null;
    this.connectionInfo = null;
    this.selectedWalletType = null;

    this.clearMessage();
    this.updateWalletAddressBar();

    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdk-header").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("walletChoiceScreen").style.display = "flex";
    document.getElementById("sdkUI").style.display = "none";

    if (this.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  async loadConnectionFromStorage() {
    try {
      const saved = localStorage.getItem("walletconnect");
      if (saved) {
        this.connectionInfo = JSON.parse(saved);

        this.walletConnected = true;
        this.account = this.connectionInfo.accounts[0];

        this.selectedWalletType = this.connectionInfo.peerMeta.name
          .split(" ")[0]
          .toLowerCase();

        const walletConnector = this.walletConnectors[this.selectedWalletType];

        const accounts = await walletConnector.reconnectSession();

        if (!accounts || accounts.length === 0) {
          throw new Error("Reconnection failed");
        }

        this.showToast(
          `Restored connection to ${this.connectionInfo.peerMeta.name}: ${this.account}`,
          "success"
        );

        this.showSDKUI();
        eventBus.emit("wallet:connection:connected", { address: this.account });
      } else {
        this.resetToLoginUI();
      }
    } catch (error) {
      console.error("Failed to restore connection", error);
      this.showToast("Failed to restore connection!", "error");
      eventBus.emit("wallet:connection:failed", { error: error });
      this.resetToLoginUI();
    }
  }

  minimizeSDK(initialLoad) {
    if (!initialLoad && this.isMinimized) return;

    document.getElementById("algomintx-sdk-container").style.display = "none";
    document.getElementById("sdkMinimizedBtn").style.display = "block";

    this.isMinimized = true;
    localStorage.setItem("amx", this.isMinimized);
    eventBus.emit("window:size:minimized", { minimized: this.isMinimized });
  }

  maximizeSDK(initialLoad) {
    if (!initialLoad && !this.isMinimized) return;

    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdkMinimizedBtn").style.display = "none";

    this.isMinimized = false;
    localStorage.setItem("amx", this.isMinimized);
    eventBus.emit("window:size:minimized", { minimized: this.isMinimized });
  }

  async startWalletConnection(walletType) {
    if (this.connectionInProgress) {
      this.showToast("A wallet connection is already in progress.", "warning");
      return;
    }

    if (!this.supportedWallets.includes(walletType)) {
      this.showToast("Unsupported wallet selected.", "error");
      return;
    }

    this.clearMessage();
    this.selectedWalletType = walletType;

    document.getElementById("algomintx-sdk-container").style.display = "none";

    const walletConnector = this.walletConnectors[walletType];

    this.connectionInProgress = true;

    try {
      const connectPromise = walletConnector.connect();

      // Set a timeout fallback (e.g., 60s) to detect "hanging" connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Wallet connection timed out.")),
          30 * 1000
        )
      );

      const accounts = await Promise.race([connectPromise, timeoutPromise]);

      if (!accounts || accounts.length === 0) {
        throw new Error("Wallet connection declined or no account returned.");
      }

      this.walletConnected = true;
      this.account = accounts[0];
      this.connectionInfo = { address: this.account, walletType };

      this.showSDKUI();
      this.showToast(
        `Connected to ${walletType} wallet: ${this.account}`,
        "success"
      );
      this.updateWalletAddressBar();
      eventBus.emit("wallet:connection:connected", { address: this.account });
      this.connectionInProgress = false;
    } catch (error) {
      if (error.message === "Wallet connection timed out.") {
        await walletConnector.disconnect();
        if (walletConnector.killSession) {
          await walletConnector.killSession(); // Extra hard-kill if supported
        }
        window.location.reload();
      } else {
        console.error("Failed to connect wallet!", error);
        this.connectionInProgress = false;
        this.showToast("Failed to connect wallet!", "error");
        eventBus.emit("wallet:connection:failed", { error: error });
        this.resetToLoginUI();
      }
    }
  }

  showSDKUI() {
    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdk-header").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "contents";
    document.getElementById("walletChoiceScreen").style.display = "none";
    document.getElementById("sdkUI").style.display = "flex";
    this.updateWalletAddressBar();

    if (this.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  updateWalletAddressBar() {
    const bar = document.getElementById("walletAddressBar");
    if (!bar) return;

    if (this.walletConnected && this.account) {
      bar.innerText = `Wallet: ${this.account}`;
      bar.style.display = "block";
    } else {
      bar.innerText = "";
      bar.style.display = "none";
    }
  }

  async handleLogout() {
    if (this.processing) {
      return;
    }
    if (confirm("Are you sure you want to logout?")) {
      try {
        if (
          this.selectedWalletType &&
          this.walletConnectors[this.selectedWalletType]
        ) {
          const connector = this.walletConnectors[this.selectedWalletType];
          await connector.disconnect();
          if (connector.killSession) {
            await connector.killSession(); // Extra hard-kill if supported
          }
        }

        localStorage.removeItem("walletconnect");
        localStorage.removeItem("DeflyWallet.Wallet");
        localStorage.removeItem("PeraWallet.Wallet");
      } catch (error) {
        console.error("Failed to disconnect wallet session:", error);
      }

      eventBus.emit("wallet:connection:disconnected", {
        address: this.account,
      });
      this.showToast("Logged out successfully.", "success");
      this.resetToLoginUI();
    }
  }

  showToast(message, type = "info") {
    // Remove existing toast if any
    const existingToast = document.getElementById("algomintx-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.id = "algomintx-toast";
    toast.innerText = message;

    // Assign toast type class dynamically (e.g. 'error', 'success', 'info')
    if (type === "error") {
      toast.classList.add("error");
    } else if (type === "success") {
      toast.classList.add("success");
    } else {
      toast.classList.add("info");
    }

    document.body.appendChild(toast);

    // Show fade-in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    // Auto fade out after 3.5 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.addEventListener(
        "transitionend",
        () => {
          if (toast.parentElement) toast.parentElement.removeChild(toast);
        },
        { once: true }
      );
    }, 3500);
  }

  clearMessage() {
    if (this.messageElement) this.messageElement.innerText = "";
  }

  resetNFTDetails() {
    if (this.processing) {
      return;
    }
    document.getElementById("nftName").value = "";
    document.getElementById("nftDescription").value = "";
    document.getElementById("nftFile").value = "";
    document.getElementById("mintNFTBtn").style.display = "block";
    document.getElementById("resetNFTBtn").style.display = "none";
    this.messageElement.innerText = "";
  }

  async validateNFTDetails() {
    if (this.processing) {
      return;
    }

    const name = document.getElementById("nftName").value.trim();
    const description = document.getElementById("nftDescription").value.trim();
    const fileInput = document.getElementById("nftFile");

    if (!name) {
      this.showToast("Please enter NFT name.", "error");
      return;
    }

    if (!description) {
      this.showToast("Please enter NFT description.", "error");
      return;
    }

    if (!fileInput.files.length) {
      this.showToast("Please upload a file.", "error");
      return;
    }

    this.processing = true;

    this.messageElement.style.cursor = "default";
    this.messageElement.innerText = "Minting NFT... Please wait.";
    document.getElementById("mintNFTBtn").disabled = true;
    document.getElementById("logoutBtn").disabled = true;

    try {
      const { transactionId, assetId } = await this.mintNFT({
        name,
        description,
        file: fileInput.files[0],
      });

      this.messageElement.style.cursor = "pointer";
      this.messageElement.innerText = `NFT Minted! Transaction ID: ${transactionId}`;

      this.processing = false;

      this.showToast(
        `NFT Minted Successfully! TxID: ${transactionId}`,
        "success"
      );

      document.getElementById("mintNFTBtn").style.display = "none";
      document.getElementById("resetNFTBtn").style.display = "block";

      document.getElementById("mintNFTBtn").disabled = false;
      document.getElementById("logoutBtn").disabled = false;

      eventBus.emit("nft:mint:success", {
        transactionId,
        assetId,
        address: this.account,
      });
    } catch (error) {
      console.error(error);

      this.processing = false;

      document.getElementById("nftName").value = "";
      document.getElementById("nftDescription").value = "";
      document.getElementById("nftFile").value = "";

      document.getElementById("mintNFTBtn").disabled = false;
      document.getElementById("logoutBtn").disabled = false;

      this.messageElement.style.cursor = "pointer";
      this.messageElement.innerText = "";

      this.showToast("Failed to mint NFT!", "error");

      eventBus.emit("nft:mint:failed", { error: error.message });
    }
  }

  async sha256Hash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    return new Uint8Array(hashBuffer);
  }

  async getImageIntegrityBase64(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64Hash = btoa(String.fromCharCode(...hashArray));
    return `sha256-${base64Hash}`;
  }

  async mintNFT({ name, description, file }) {
    if (!this.walletConnected || !this.account) {
      throw new Error("Wallet is not connected.");
    }

    // 1. Upload file to IPFS (Pinata) using your API key
    const ipfsHash = await this.uploadFileToIPFS(file);

    // 2. Create metadata JSON with IPFS link, name, description
    const integrity = await this.getImageIntegrityBase64(file);

    const metadata = {
      name,
      description,
      image: `ipfs://${ipfsHash}`,
      image_integrity: integrity,
      image_mimetype: file.type,
      decimals: 0, // must be 0 for NFTs ARC-3 compliant
      standard: "arc3",
      minted_by: this.metadataMark,
      marketplace: this.revenueWalletAddress,
    };

    // 3. Hash metadata JSON to get 32 byte assetMetadataHash
    const metadataStr = JSON.stringify(metadata);
    const metadataHash = await this.sha256Hash(metadataStr);

    // 4. Upload metadata JSON to IPFS to get the CID for assetURL
    const metadataIpfsHash = await this.uploadJSONToIPFS(metadata);

    // 4. Create Algorand asset (NFT) pointing to metadata URL
    const { txid, assetId } = await this.createAlgorandAsset(
      metadataIpfsHash,
      name,
      metadataHash
    );

    return { transactionId: txid, assetId };
  }

  async uploadFileToIPFS(file) {
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

    const data = new FormData();
    data.append("file", file);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.pinata_ipfs_server_key}`,
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

  async uploadJSONToIPFS(jsonData) {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.pinata_ipfs_server_key}`,
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

  async createAlgorandAsset(metadataIpfsHash, assetName, metadataHashBuffer) {
    const params = await this.algodClient.getTransactionParams().do();

    /**
     * To access the ipfs files
     * https://purple-shrill-worm-294.mypinata.cloud/ipfs/QmY5FMJW43yxJ2hco1jQbD4rzByxviKTYWR5sY18sZ6k5n
     * https://gateway.pinata.cloud/ipfs/QmY5FMJW43yxJ2hco1jQbD4rzByxviKTYWR5sY18sZ6k5n
     * https://ipfs.io/ipfs/QmY5FMJW43yxJ2hco1jQbD4rzByxviKTYWR5sY18sZ6k5n
     */
    const metadataURL = `ipfs://${metadataIpfsHash}#arc3`;

    const safeAssetName =
      assetName && typeof assetName === "string" && assetName.length > 0
        ? assetName.substring(0, 32).replace(/[^a-zA-Z0-9 _-]/g, "") // Allow spaces, hyphens, underscores
        : "Unnamed Asset";

    const accountAddr = this.account;

    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      sender: accountAddr,
      total: 1,
      decimals: 0,
      defaultFrozen: false,
      unitName: this.unitName,
      assetName: safeAssetName,
      assetURL: metadataURL,
      assetMetadataHash: metadataHashBuffer,
      manager: accountAddr,
      reserve: accountAddr,
      freeze: accountAddr,
      clawback: accountAddr,
      suggestedParams: params,
    });

    const walletConnector = this.walletConnectors[this.selectedWalletType];

    // Ask user to sign the transaction

    // If you are NOT setting custom signers, you can pass a flat array:
    // const signedTxn = await walletConnector.signTransaction([{ txn: txnToSign }]);

    // but if you use signers field, you MUST group it like:
    const signedTxn = await walletConnector.signTransaction([
      [
        {
          txn: txn,
          signers: [accountAddr],
        },
      ],
    ]);

    // Submit the signed transaction
    const { txid } = await this.algodClient
      .sendRawTransaction(signedTxn[0])
      .do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(
      this.algodClient,
      txid,
      10
    );

    // Extract asset ID
    const assetId = Number(confirmedTxn.assetIndex);

    return { txid, assetId };
  }

  async getListedNFTsFromNetwork() {
    const nfts = [];

    // Recursive fetch by creator
    const fetchAssetsByCreator = async (nextToken = null) => {
      try {
        let fetchUrl = `${this.indexerUrl}/v2/assets?limit=1000`;

        if (creatorAddress) {
          fetchUrl += `&creator=${this.contractWalletAddress}`;
        }

        if (nextToken) {
          fetchUrl += `&next=${nextToken}`;
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Indexer fetch error: ${res.status}`);

        const data = await res.json();
        const assetsList = data.assets || [];

        await this.processAssets(assetsList, nfts, true);

        if (data["next-token"]) {
          await fetchAssetsByCreator(data["next-token"]);
        }
      } catch (error) {
        console.error("Error fetching NFTs:", error.message);
      }
    };

    await fetchAssetsByCreator();

    return nfts;
  }

  async getListedNFTs(assets) {
    const nfts = [];

    // Initialize the AlgoMintX client
    const client = new AlgoMintXClient({
      appId: this.contractApplicationId,
      algod: this.algodClient,
    });

    // Get all listings from the smart contract's box storage
    const listingsMap = new Map();
    for (const assetId of assets) {
      try {
        const boxKey = `listing_${assetId}`;
        const listing = await client.appClient.getBoxValue(boxKey);
        if (listing) {
          const decodedListing =
            algosdk.ABIType.from("(string,uint64)").decode(listing);
          listingsMap.set(Number(assetId), {
            seller: decodedListing[0],
            price: Number(decodedListing[1]),
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch listing for asset ${assetId}:`,
          error.message
        );
      }
    }

    // Fetch manually by asset IDs
    const fetchAssetsByIds = async (assets) => {
      for (const assetId of assets) {
        try {
          const res = await fetch(`${this.indexerUrl}/v2/assets/${assetId}`);
          if (!res.ok) continue;

          const data = await res.json();
          const asset = data.asset;
          const listing = listingsMap.get(Number(assetId));

          if (listing) {
            const nft = {
              assetId: asset.index,
              name: asset.params.name,
              unitName: asset.params["unit-name"],
              url: asset.params.url,
              listing: {
                seller: listing.seller,
                price: listing.price,
              },
            };

            if (asset.params.url && asset.params.url.startsWith("ipfs://")) {
              const ipfsHash = asset.params.url.replace("ipfs://", "");
              try {
                const metadataRes = await fetch(
                  `https://${this.pinata_ipfs_gateway_url}/ipfs/${ipfsHash}`
                );
                if (metadataRes.ok) {
                  const metadata = await metadataRes.json();
                  if (
                    metadata.decimals === 0 &&
                    metadata.image_integrity &&
                    metadata.image_mimetype &&
                    metadata.standard &&
                    metadata.image &&
                    metadata.image.startsWith("ipfs://") &&
                    metadata.minted_by &&
                    metadata.minted_by === this.metadataMark &&
                    metadata.marketplace &&
                    metadata.marketplace === this.revenueWalletAddress
                  ) {
                    nft.metadata = metadata;
                    nfts.push(nft);
                  }
                }
              } catch (error) {
                console.error(
                  `Error fetching metadata for asset ${nft.assetId}:`,
                  error.message
                );
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch asset ${assetId}:`, error.message);
        }
      }
    };

    await fetchAssetsByIds(assets);

    return nfts;
  }

  async getWalletNFTs(creatorAddress) {
    const nfts = [];

    // Recursive fetch by creator
    const fetchAssetsByCreator = async (nextToken = null) => {
      try {
        let fetchUrl = `${this.indexerUrl}/v2/assets?limit=1000`;

        if (creatorAddress) {
          fetchUrl += `&creator=${creatorAddress}`;
        }

        if (nextToken) {
          fetchUrl += `&next=${nextToken}`;
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Indexer fetch error: ${res.status}`);

        const data = await res.json();
        const assetsList = data.assets || [];

        await this.processAssets(assetsList, nfts);

        if (data["next-token"]) {
          await fetchAssetsByCreator(data["next-token"]);
        }
      } catch (error) {
        console.error("Error fetching NFTs:", error.message);
      }
    };

    await fetchAssetsByCreator();

    return nfts;
  }

  async processAssets(assets, nfts, listed = false) {
    for (const asset of assets) {
      const params = asset.params;

      if (params.total !== 1 || params.decimals !== 0) {
        continue;
      }

      const nft = {
        assetId: asset.index,
        name: params.name,
        unitName: params["unit-name"],
        url: params.url,
      };

      if (params.url && params.url.startsWith("ipfs://")) {
        const ipfsHash = params.url.replace("ipfs://", "");
        try {
          const metadataRes = await fetch(
            `https://${this.pinata_ipfs_gateway_url}/ipfs/${ipfsHash}`
          );
          if (metadataRes.ok) {
            const metadata = await metadataRes.json();
            if (!listed) {
              // get connected wallet nfts
              if (
                metadata.decimals === 0 &&
                metadata.image_integrity &&
                metadata.image_mimetype &&
                metadata.standard &&
                metadata.image &&
                metadata.image.startsWith("ipfs://")
              ) {
                nft.metadata = metadata;
                nfts.push(nft);
              }
            } else {
              // get marketplace listed nfts
              if (
                metadata.decimals === 0 &&
                metadata.image_integrity &&
                metadata.image_mimetype &&
                metadata.standard &&
                metadata.image &&
                metadata.image.startsWith("ipfs://") &&
                metadata.minted_by &&
                metadata.minted_by === this.metadataMark &&
                metadata.marketplace &&
                metadata.marketplace === this.revenueWalletAddress
              ) {
                nft.metadata = metadata;
                nfts.push(nft);
              }
            }
          } else {
            console.error(
              `Failed to fetch IPFS metadata for asset ${nft.assetId}`
            );
          }
        } catch (error) {
          console.error(
            `Error fetching metadata for asset ${nft.assetId}:`,
            error.message
          );
        }
      }
    }
  }

  async getNFTMetadata(assetId) {
    const baseUrl =
      this.network === "mainnet"
        ? "https://mainnet-idx.algonode.cloud"
        : "https://testnet-idx.algonode.cloud";

    try {
      let metadata = {};
      // Step 1: Get asset config transaction (mint)
      const txUrl = `${baseUrl}/v2/transactions?asset-id=${assetId}&tx-type=acfg`;
      const txRes = await fetch(txUrl);
      const txData = await txRes.json();
      const transactionId = txData.transactions?.[0]?.id;
      metadata = {
        ...metadata,
        transactionId,
      };

      // Step 2: Get asset metadata
      const indexerUrl = `${baseUrl}/v2/assets/${assetId}`;
      const response = await fetch(indexerUrl);
      const data = await response.json();

      const params = data.asset.params;
      metadata = {
        ...metadata,
        ...params,
        assetId: data.asset.index,
      };

      const metadataUrl = params.url; // e.g., ipfs://CID
      if (metadataUrl.startsWith("ipfs://")) {
        const ipfsUrl = this.convertIpfsToHttp(metadataUrl);
        const metaRes = await fetch(ipfsUrl);
        const ipfsMetadata = await metaRes.json();
        metadata = {
          ...metadata,
          ...ipfsMetadata,
        };
        return metadata;
      }

      return null;
    } catch (err) {
      console.error("Failed to fetch NFT metadata:", err);
      return null;
    }
  }

  convertIpfsToHttp(ipfsUrl, gateway = "https://ipfs.io/ipfs/") {
    return ipfsUrl.replace("ipfs://", gateway);
  }

  getListingBoxReference(appIndex, assetId) {
    const prefix = Buffer.from("listing_"); // Ensure Buffer
    const assetIdBytes = Buffer.from(algosdk.encodeUint64(BigInt(assetId))); // Convert to Buffer
    const boxName = new Uint8Array(Buffer.concat([prefix, assetIdBytes])); // Concatenate as Buffer, then Uint8Array
    return { appIndex, name: boxName };
  }

  async listNFT({ assetId, nftPrice }) {
    try {
      if (!this.walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }
      if (!assetId || !nftPrice) {
        throw new Error("Asset ID and price are required");
      }

      const params = await this.algodClient.getTransactionParams().do();

      const lowFeeParams = { ...params, flatFee: true, fee: 1000 };
      const mediumFeeParams = { ...params, flatFee: true, fee: 2000 };
      const highFeeParams = { ...params, flatFee: true, fee: 4000 };

      const walletConnector = this.walletConnectors[this.selectedWalletType];

      // ------------------------
      // PHASE 1: Opt-in group
      // ------------------------

      const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: this.account,
        receiver: this.contractWalletAddress,
        amount: 100_000,
        suggestedParams: lowFeeParams,
      });

      const boxRefGroup1 = this.getListingBoxReference(
        this.contractApplicationId,
        assetId
      );
      const optInMethod = encoder.methods.find(
        (m) => m.name === "contractOptInToNFT"
      );
      const optInAppCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.account,
        appIndex: this.contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          optInMethod.getSelector(),
          algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
        ],
        boxes: [boxRefGroup1],
        foreignAssets: [assetId],
        suggestedParams: mediumFeeParams,
      });

      const optInGroup = [fundTxn, optInAppCallTxn];
      algosdk.assignGroupID(optInGroup);

      const optInSigned = await walletConnector.signTransaction([
        optInGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: optInTxId } = await this.algodClient
        .sendRawTransaction(optInSigned)
        .do();

      await algosdk.waitForConfirmation(this.algodClient, optInTxId, 10);
      console.log("Opt-in transaction confirmed:", optInTxId);

      // ------------------------
      // PHASE 2: Transfer + Listing
      // ------------------------

      const transferTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.contractWalletAddress,
          amount: 1,
          assetIndex: assetId,
          suggestedParams: lowFeeParams,
        });

      const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: this.account,
        receiver: this.revenueWalletAddress,
        amount: Math.round(this.listingFee * 1_000_000),
        suggestedParams: lowFeeParams,
      });

      const boxRefGroup2 = this.getListingBoxReference(
        this.contractApplicationId,
        assetId
      );
      const listingMethod = encoder.methods.find(
        (m) => m.name === "addNFTListing"
      );
      const listingAppCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.account,
        appIndex: this.contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          listingMethod.getSelector(),
          algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
          algosdk.ABIType.from("string").encode(this.account),
          algosdk.ABIType.from("uint64").encode(BigInt(nftPrice)),
        ],
        boxes: [boxRefGroup2],
        suggestedParams: highFeeParams,
      });

      const listingGroup = [transferTxn, feeTxn, listingAppCallTxn];
      algosdk.assignGroupID(listingGroup);

      const signedListing = await walletConnector.signTransaction([
        listingGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: listingTxId } = await this.algodClient
        .sendRawTransaction(signedListing)
        .do();

      await algosdk.waitForConfirmation(this.algodClient, listingTxId, 10);

      eventBus.emit("nft:list:success", {
        assetId,
        seller: this.account,
        price: nftPrice,
        timestamp: Date.now(),
        transactionId: listingTxId,
      });

      return {
        assetId,
        price: nftPrice,
        transactionId: listingTxId,
      };
    } catch (error) {
      console.error("Error listing NFT:", error);
      eventBus.emit("nft:list:failed", { error: error.message });
      throw error;
    }
  }

  async buyNFT({ assetId, receiverWalletAddress }) {
    if (!this.walletConnected || !this.account) {
      throw new Error("Wallet is not connected.");
    }

    if (!assetId) {
      throw new Error("Asset ID is required.");
    }

    if (!receiverWalletAddress) {
      throw new Error("Receiver wallet address is required.");
    }

    try {
      // Get suggested parameters
      const suggestedParams = await this.algodClient
        .getTransactionParams()
        .do();

      // Initialize the AlgoMintX client
      const client = new AlgoMintXClient({
        appId: this.contractApplicationId,
        algod: this.algodClient,
      });

      // Create the atomic transaction group
      const txnGroup = await client.createTransaction.buyNft({
        args: {
          assetId: BigInt(assetId),
          receiverWalletAddress,
          revenueWalletAddress: this.revenueWalletAddress,
          buyingFee: BigInt(this.buyingFee),
        },
        suggestedParams,
      });

      // Get the wallet connector
      const walletConnector = this.walletConnectors[this.selectedWalletType];

      // Sign the transaction group
      const signedTxn = await walletConnector.signTransaction([
        txnGroup.map((txn) => ({
          txn,
          signers: [this.account],
        })),
      ]);

      // Submit the signed transaction
      const { txid } = await this.algodClient
        .sendRawTransaction(signedTxn[0])
        .do();

      // Wait for confirmation
      const result = await algosdk.waitForConfirmation(
        this.algodClient,
        txid,
        10
      );

      // Emit event for successful purchase
      eventBus.emit("nft:buy:success", {
        transactionId: txid,
        assetId,
        buyer: this.account,
        receiver: receiverWalletAddress,
      });

      return {
        transactionId: txid,
        assetId,
        buyer: this.account,
        receiver: receiverWalletAddress,
      };
    } catch (error) {
      console.error("Failed to buy NFT:", error);
      eventBus.emit("nft:buy:failed", { error: error.message });
      throw error;
    }
  }
}

export default AlgoMintX;
