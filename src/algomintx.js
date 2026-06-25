import algosdk from "algosdk";
import eventBus from "./event-bus.js";
import { Validator } from "./validation.js";
import { UIManager } from "./ui.js";
import { isBrowser, getStorage } from "./env.js";
import {
  sha256Hash,
  getImageIntegrityBase64,
  uploadFileToIPFS,
  uploadJSONToIPFS,
  deleteFromIPFS,
  algosToMicroAlgos,
  microAlgosToAlgos,
  convertIpfsToHttp,
  getListingBoxReference,
  buildListingBoxName,
  decodeListingBoxName,
  decodeListingBoxValue,
} from "./utils.js";

const appSpecJson = require("../AlgoKit/smart_contracts/artifacts/AlgoMintX/AlgoMintX.arc32.json");
const encoder = new algosdk.ABIContract({
  name: appSpecJson.contract.name,
  methods: appSpecJson.contract.methods,
});

class AlgoMintX {
  // ==========================================
  // COMMON SDK PRIVATE FIELDS
  // ==========================================
  #walletConnectors;
  #walletConnected;
  #connectionInfo;
  #connectionInProgress;
  #supportedWallets;
  #selectedWalletType;
  #algodClient;
  #disableToast;
  #disableUi;
  #minimizeUILocation;
  #logo;
  #supportedNetworks;
  #theme;
  #toastLocation;
  #mnemonicAccount; // For programmatic wallet connection
  #uiManager; // UI Manager instance
  #indexerUrl;
  #algodUrl;
  #listingsCache;
  #listingsCacheAt;
  #marketplaceListingsCache;
  #marketplaceListingsCacheAt;
  #marketplaceListingsCacheKey;

  // ==========================================
  // SDK-SPECIFIC PRIVATE FIELDS (ALGOMINTX)
  // ==========================================
  #contractApplicationId;
  #contractWalletAddress;
  #namespace;
  #marketplaceType;
  #unitName;
  #metadataMark;
  #pinata_ipfs_server_key;
  #pinata_ipfs_gateway_url;
  #revenueWalletAddress;
  #listingFee;
  #buyingFee;
  #unListingFee;
  #mintFee;
  #supportedMediaFormats;

  constructor({
    // Common SDK parameters
    // Required
    env,
    // Optional
    disableUi = false,
    disableToast = false,
    toastLocation = "TOP_RIGHT",
    minimizeUILocation = "right",
    logo = null,
    // AlgoMintX-specific parameters
    // Required
    namespace,
    pinata_ipfs_server_key,
    revenueWalletAddress,
    // Optional
    marketplaceType = "NFT",
    pinata_ipfs_gateway_url = null,
    listingFee = 0,
    buyingFee = 0,
    unListingFee = 0,
    mintFee = 0,
    supportedMediaFormats = ["IMAGE"],
  }) {
    try {
      // Common SDK parameters
      // Required
      this.network = Validator.validateEnvironment(env);
      // Optional
      this.#disableUi = Validator.validateDisableUi(disableUi);
      this.#disableToast = Validator.validateDisableToast(disableToast);
      this.#toastLocation = Validator.validateToastLocation(toastLocation);
      this.#minimizeUILocation =
        Validator.validateMinimizeUILocation(minimizeUILocation);
      this.#logo = Validator.validateLogo(logo);

      // AlgoMintX-specific parameters
      // Required
      this.#namespace = Validator.validateNamespace(namespace);
      this.#pinata_ipfs_server_key = Validator.validatePinataServerKey(
        pinata_ipfs_server_key,
      );
      this.#revenueWalletAddress =
        Validator.validateRevenueWalletAddress(revenueWalletAddress);
      // Optional
      this.#marketplaceType =
        Validator.validateMarketplaceType(marketplaceType);
      this.#pinata_ipfs_gateway_url = Validator.validatePinataGatewayUrl(
        pinata_ipfs_gateway_url,
      );
      this.#listingFee = Validator.validateFee(listingFee, "Listing fee");
      this.#buyingFee = Validator.validateFee(buyingFee, "Buying fee");
      this.#unListingFee = Validator.validateFee(
        unListingFee,
        "unListingFee fee",
      );
      this.#mintFee = Validator.validateFee(mintFee, "Mint fee");
      this.#supportedMediaFormats = Validator.validateSupportedMediaFormats(
        supportedMediaFormats,
      );

      // Initialize other common SDK properties
      this.#uiManager = new UIManager(this, {
        disableUi: this.#disableUi,
        disableToast: this.#disableToast,
        logo: this.#logo,
        minimizeUILocation: this.#minimizeUILocation,
        toastLocation: this.#toastLocation,
        marketplaceType: this.#marketplaceType,
      });
      this.processing = false;
      this.events = eventBus;
      this.#supportedNetworks = ["mainnet", "testnet"];
      this.#walletConnectors = null;
      this.#walletConnected = false;
      this.account = null;
      this.#connectionInfo = null;
      this.#connectionInProgress = false;
      this.#supportedWallets = ["pera", "defly"];
      this.#selectedWalletType = null;
      this.#algodClient = new algosdk.Algodv2(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        this.network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443,
      );
      this.#indexerUrl =
        this.network === "mainnet"
          ? "https://mainnet-idx.algonode.cloud"
          : "https://testnet-idx.algonode.cloud";
      this.#algodUrl =
        this.network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud";
      this.#listingsCache = null;
      this.#listingsCacheAt = 0;
      this.#marketplaceListingsCache = null;
      this.#marketplaceListingsCacheAt = 0;
      this.#marketplaceListingsCacheKey = null;

      // Initialize SDK variables (SDK specific)
      this.#unitName = `AMX${this.#namespace}`;
      this.#metadataMark = "AlgoMintX";

      // Initialize SDK contract details (SDK specific)
      this.#contractApplicationId =
        this.network === "mainnet" ? 3616719545 : 765070434;
      this.#contractWalletAddress =
        this.network === "mainnet"
          ? "OUQOV3ACDGD7VH4XLL6WTLEZWQFYHY3WBGNGS3N3PY3ICZFNJLHH3CFQR4"
          : "SO62WJDOCN7Z6DYFTHBE4RSKS2TBTQFMBUQ6ONQASARTCLZISMGUIGXSK4";

      // Load saved UI state (browser + UI enabled only)
      if (!this.#disableUi && isBrowser()) {
        const savedState = getStorage().getItem("axs");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            this.isMinimized = parsedState.minimized || false;
            this.theme = parsedState.theme || this.#uiManager.getSystemTheme();
          } catch (e) {
            this.isMinimized = false;
            this.theme = this.#uiManager.getSystemTheme();
          }
        } else {
          this.isMinimized = false;
          this.theme = this.#uiManager.getSystemTheme();
        }

        // Save initial state and initialize UI
        this.#uiManager.saveUIState();
        this.#initUI();
      }
    } catch (error) {
      this.#sdkValidationFailed(error.message);
    }
  }

  /**
   *********** SDK private methods
   */
  #sdkValidationFailed(message) {
    const storage = getStorage();
    storage.removeItem("walletconnect");
    storage.removeItem("DeflyWallet.Wallet");
    storage.removeItem("PeraWallet.Wallet");

    // If UI is disabled or not in browser, don't show alert or reload
    if (this.#disableUi || !isBrowser()) {
      console.error("SDK validation failed:", message);
      return;
    }

    alert(message);
    window.location.reload();
  }

  async #ensureWalletConnectors() {
    if (!isBrowser()) {
      return null;
    }
    if (!this.#walletConnectors) {
      const [{ PeraWalletConnect }, { DeflyWalletConnect }] = await Promise.all(
        [import("@perawallet/connect"), import("@blockshake/defly-connect")],
      );
      this.#walletConnectors = {
        pera: new PeraWalletConnect(),
        defly: new DeflyWalletConnect(),
      };
    }
    return this.#walletConnectors;
  }

  async #signTransactionGroup(txns) {
    if (this.#mnemonicAccount) {
      return txns.map((txn) => txn.signTxn(this.#mnemonicAccount.sk));
    }

    if (!this.#selectedWalletType) {
      throw new Error(
        "No signing method available. Connect with connectWallet(address, mnemonic) or a browser wallet.",
      );
    }

    const walletConnectors = await this.#ensureWalletConnectors();
    if (!walletConnectors?.[this.#selectedWalletType]) {
      throw new Error(
        "Browser wallet signing is unavailable in this environment.",
      );
    }

    const signed = await walletConnectors[
      this.#selectedWalletType
    ].signTransaction([txns.map((txn) => ({ txn, signers: [this.account] }))]);
    return signed;
  }

  #assertWalletConnected(action = "perform this action") {
    if (!this.#walletConnected || !this.account) {
      if (!this.#disableUi && this.isMinimized) {
        this.maximizeSDK(true);
      }
      throw new Error(
        `Wallet is not connected. Connect a wallet to ${action}.`,
      );
    }
  }

  #getFileMimeType(file) {
    return file?.type || file?.mimetype || "application/octet-stream";
  }

  // ==========================================
  // COMMON SDK PRIVATE METHODS
  // ==========================================

  async #initUI() {
    // Initialize UI with callbacks
    this.#uiManager.initUI({
      onWalletConnect: (walletType) => this.#startWalletConnection(walletType),
      onMinimize: () => this.minimizeSDK(),
      onMaximize: () => this.maximizeSDK(),
      onLogout: () => this.#handleLogout(),
      onThemeToggle: () => {
        this.theme = this.theme === "light" ? "dark" : "light";
        this.#uiManager.saveUIState();
        this.#uiManager.applyTheme();
        eventBus.emit("theme:changed", { theme: this.theme });
      },
      onResetNFT: () => this.#uiManager.resetNFTDetails(),
      onMintNFT: () => this.#validateNFTDetails(),
      onResetFT: () => this.#uiManager.resetFTDetails(),
      onMintFT: () => this.#validateFTDetails(),
    });

    // Setup NFT input validation
    this.#uiManager.setupNFTInputValidation({
      getSupportedMediaFormats: () => this.#supportedMediaFormats,
      sanitizeInput: (input) => Validator.sanitizeInput(input),
      validateFileType: (file) =>
        Validator.validateFileType(file, this.#supportedMediaFormats),
    });

    // Setup FT input validation (icon is an optional image)
    this.#uiManager.setupFTInputValidation({
      sanitizeInput: (input) => Validator.sanitizeInput(input),
      validateFileType: (file) => Validator.validateFileType(file, ["IMAGE"]),
    });

    // Try restore wallet connection
    await this.#loadConnectionFromStorage();
  }

  async #loadConnectionFromStorage() {
    if (!isBrowser()) {
      return;
    }

    try {
      const storage = getStorage();
      const walletconnect = storage.getItem("walletconnect");
      const peraWallet = storage.getItem("PeraWallet.Wallet");
      const deflyWallet = storage.getItem("DeflyWallet.Wallet");

      let walletType = null;
      let accounts = null;

      const walletConnectors = await this.#ensureWalletConnectors();
      if (!walletConnectors) {
        return;
      }

      // Try to reconnect to existing sessions
      if (peraWallet) {
        try {
          const peraAccounts = await walletConnectors.pera.reconnectSession();
          if (peraAccounts && peraAccounts.length > 0) {
            walletType = "pera";
            accounts = peraAccounts;
          }
        } catch (error) {
          console.log("Failed to reconnect to Pera wallet:", error.message);
        }
      }

      if (!accounts && deflyWallet) {
        try {
          const deflyAccounts = await walletConnectors.defly.reconnectSession();
          if (deflyAccounts && deflyAccounts.length > 0) {
            walletType = "defly";
            accounts = deflyAccounts;
          }
        } catch (error) {
          console.log("Failed to reconnect to Defly wallet:", error.message);
        }
      }

      // If we found a valid session, restore the connection
      if (accounts && accounts.length > 0 && walletType) {
        this.#walletConnected = true;
        this.account = accounts[0];
        this.#selectedWalletType = walletType;
        this.#connectionInfo = { address: this.account, walletType };

        this.#uiManager.showToast(
          `Restored connection to ${walletType} wallet`,
          "success",
        );

        if (!this.#disableUi) {
          this.#uiManager.showSDKUI();
        }
        eventBus.emit("wallet:connection:connected", { address: this.account });
      } else {
        // No valid session found, reset to login UI
        if (!this.#disableUi) {
          this.#resetToLoginUI();
        }
      }
    } catch (error) {
      console.error("Failed to restore connection", error);
      this.#uiManager.showToast("Failed to restore connection!", "error");
      eventBus.emit("wallet:connection:failed", {
        error: "Failed to restore connection",
      });
      if (!this.#disableUi) {
        this.#resetToLoginUI();
      }
    }
  }

  async #startWalletConnection(walletType) {
    if (this.#connectionInProgress) {
      this.#uiManager.showToast(
        "A wallet connection is already in progress.",
        "warning",
      );
      return;
    }

    if (!this.#supportedWallets.includes(walletType)) {
      this.#uiManager.showToast("Unsupported wallet selected.", "error");
      return;
    }

    this.#uiManager.clearMessage(); // SDK-Specific
    this.#selectedWalletType = walletType;

    if (this.#disableUi || !isBrowser()) {
      throw new Error(
        "Browser wallet connection requires UI. Use connectWallet(address, mnemonic) in headless mode.",
      );
    }

    // Only manipulate DOM if UI is not disabled
    document.getElementById("algox-sdk-container").style.display = "none";

    const walletConnectors = await this.#ensureWalletConnectors();
    const walletConnector = walletConnectors[walletType];

    this.#connectionInProgress = true;

    try {
      const connectPromise = walletConnector.connect();

      // Set a timeout fallback (e.g., 60s) to detect "hanging" connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Wallet connection timed out.")),
          30 * 1000,
        ),
      );

      const accounts = await Promise.race([connectPromise, timeoutPromise]);

      if (!accounts || accounts.length === 0) {
        throw new Error("Wallet connection declined or no account returned.");
      }

      this.#walletConnected = true;
      this.account = accounts[0];
      this.#connectionInfo = { address: this.account, walletType };

      if (!this.#disableUi) {
        this.#uiManager.showSDKUI();
      }

      this.#uiManager.showToast(`Connected to ${walletType} wallet`, "success");
      eventBus.emit("wallet:connection:connected", { address: this.account });
      this.#connectionInProgress = false;
    } catch (error) {
      if (error.message === "Wallet connection timed out.") {
        await walletConnector.disconnect();
        if (walletConnector.killSession) {
          await walletConnector.killSession(); // Extra hard-kill if supported
        }
        if (this.#disableUi) {
          console.error("UI is disabled, skipping wallet connection UI");
        } else {
          window.location.reload();
        }
      } else {
        console.error("Failed to connect wallet!", error);
        this.#connectionInProgress = false;

        // Handle specific error cases
        if (
          error.message &&
          error.message.includes("Session currently connected")
        ) {
          // Wallet is already connected, try to get the current session
          try {
            const accounts = await walletConnector.reconnectSession();
            if (accounts && accounts.length > 0) {
              // Successfully got the current session
              this.#walletConnected = true;
              this.account = accounts[0];
              this.#selectedWalletType = walletType;
              this.#connectionInfo = { address: this.account, walletType };

              if (!this.#disableUi) {
                this.#uiManager.showSDKUI();
                this.#uiManager.updateWalletAddressBar();
              } else {
                console.error("UI is disabled, skipping wallet connection UI");
              }

              this.#uiManager.showToast(
                `Connected to existing ${walletType} session`,
                "success",
              );
              eventBus.emit("wallet:connection:connected", {
                address: this.account,
              });
              this.#connectionInProgress = false;
              return; // Exit successfully
            }
          } catch (reconnectError) {
            console.error(
              "Failed to reconnect to existing session:",
              reconnectError,
            );
          }
        }

        this.#uiManager.showToast("Failed to connect wallet!", "error");
        eventBus.emit("wallet:connection:failed", {
          error: "Failed to connect wallet!",
        });
        this.#connectionInProgress = false;
        if (this.#disableUi) {
          console.error("UI is disabled, skipping wallet connection UI");
        } else {
          // Ensure the hidden container is shown back before resetting UI
          document.getElementById("algox-sdk-container").style.display = "flex";
          this.#resetToLoginUI();
        }
      }
    }
  }

  async #handleLogout(skipConfirm = false) {
    if (this.processing) {
      return;
    }

    if (
      !skipConfirm &&
      !this.#disableUi &&
      isBrowser() &&
      typeof confirm !== "undefined"
    ) {
      if (!confirm("Are you sure you want to logout?")) {
        return;
      }
    }

    try {
      if (this.#selectedWalletType && this.#selectedWalletType !== "mnemonic") {
        const walletConnectors = await this.#ensureWalletConnectors();
        const connector = walletConnectors?.[this.#selectedWalletType];
        if (connector) {
          await connector.disconnect();
          if (connector.killSession) {
            await connector.killSession();
          }
        }
      }

      const storage = getStorage();
      storage.removeItem("walletconnect");
      storage.removeItem("DeflyWallet.Wallet");
      storage.removeItem("PeraWallet.Wallet");
    } catch (error) {
      console.error("Failed to disconnect wallet session:", error);
    }

    this.#mnemonicAccount = null;

    eventBus.emit("wallet:connection:disconnected", {
      address: this.account,
    });
    this.#uiManager.showToast("Logged out successfully.", "success");
    if (!this.#disableUi) {
      this.#resetToLoginUI();
    } else {
      this.#walletConnected = false;
      this.account = null;
      this.#connectionInfo = null;
      this.#selectedWalletType = null;
    }
  }

  #resetToLoginUI() {
    this.#walletConnected = false;
    this.account = null;
    this.#connectionInfo = null;
    this.#selectedWalletType = null;

    this.#uiManager.resetToLoginUI();
  }

  // ==========================================
  // SDK-SPECIFIC PRIVATE METHODS (ALGOMINTX)
  // ==========================================

  async #validateNFTDetails() {
    if (this.processing) {
      return;
    }

    const name = Validator.sanitizeInput(
      document.getElementById("algox-mintx-nft-name").value,
    );
    const description = Validator.sanitizeInput(
      document.getElementById("algox-mintx-nft-description").value,
    );
    const fileInput = document.getElementById("algox-mintx-nft-file");

    // Validate name
    const nameValidation = Validator.validateNFTName(name);
    if (!nameValidation.valid) {
      this.#uiManager.showToast(nameValidation.message, "error");
      return;
    }

    // Validate description
    const descriptionValidation = Validator.validateNFTDescription(description);
    if (!descriptionValidation.valid) {
      this.#uiManager.showToast(descriptionValidation.message, "error");
      return;
    }

    // Validate file
    if (!fileInput.files.length) {
      this.#uiManager.showToast("Please upload a file.", "error");
      return;
    }

    // Disable UI elements (only if UI is not disabled)
    if (!this.#disableUi) {
      this.#uiManager.updateMessage("Minting NFT... Please wait.", "default");
      this.#uiManager.disableMintButton();
    }

    // show loading overlay after validation
    this.processing = true;
    this.#uiManager.showLoadingOverlay("Processing...");
    eventBus.emit("sdk:processing:started", { processing: this.processing });

    try {
      const { transactionId, assetId } = await this.#mintNFT({
        name,
        description,
        file: fileInput.files[0],
      });

      if (!this.#disableUi) {
        this.#uiManager.updateMessage(
          `NFT Minted! Transaction ID: ${transactionId}`,
          "pointer",
        );
      }

      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      this.#uiManager.showToast(
        `NFT Minted Successfully! TxID: ${transactionId}`,
        "success",
      );

      // show resetNFTBtn and hide mintNFTBtn (only if UI is not disabled)
      if (!this.#disableUi) {
        this.#uiManager.showResetButton();
        this.#uiManager.enableMintButton();
      }

      const nftData = await this.getNFTMetadata({ assetId });

      eventBus.emit("nft:mint:success", {
        transactionId,
        nft: nftData,
      });
    } catch (error) {
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      // Reset form on error (only if UI is not disabled)
      if (!this.#disableUi) {
        this.#uiManager.resetNFTDetails();
      }

      this.#uiManager.showToast("Failed to mint NFT!", "error");
      eventBus.emit("nft:mint:failed", { error: "Failed to mint NFT!" });
    }
  }

  async #mintNFT({ name, description, file }) {
    if (!this.#walletConnected || !this.account) {
      throw new Error("Wallet is not connected.");
    }

    let ipfsHash = null;
    let metadataIpfsHash = null;
    let currentStep = 0;

    try {
      // 1. Upload file to IPFS (Pinata) using your API key
      currentStep = 1;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 1: Uploading file to IPFS",
      );
      ipfsHash = await uploadFileToIPFS(file, this.#pinata_ipfs_server_key);

      // 2. Create metadata JSON with IPFS link, name, description
      currentStep = 2;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 2: Creating metadata",
      );
      const integrity = await getImageIntegrityBase64(file);

      const metadata = {
        name,
        description,
        image: `ipfs://${ipfsHash}`,
        image_integrity: integrity,
        image_mimetype: this.#getFileMimeType(file),
        decimals: 0, // must be 0 for NFTs ARC-3 compliant
        standard: "arc3",
        minted_by: this.#metadataMark,
        marketplace: this.#unitName,
      };

      // 3. Hash metadata JSON to get 32 byte assetMetadataHash
      currentStep = 3;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 3: Hashing metadata",
      );
      const metadataStr = JSON.stringify(metadata);
      const metadataHash = await sha256Hash(metadataStr);

      // 4. Upload metadata JSON to IPFS to get the CID for assetURL
      currentStep = 4;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 4: Uploading metadata to IPFS",
      );
      metadataIpfsHash = await uploadJSONToIPFS(
        metadata,
        this.#pinata_ipfs_server_key,
      );

      // 5. Create Algorand asset (NFT) pointing to metadata URL
      currentStep = 5;
      this.#uiManager.updateLoadingMessage(
        "Processing... Open your wallet to continue",
      );
      const { txid, assetId } = await this.#createAlgorandAsset({
        metadataIpfsHash,
        assetName: name,
        metadataHashBuffer: metadataHash,
        total: 1,
        decimals: 0,
      });

      return { transactionId: txid, assetId };
    } catch (error) {
      // Cleanup IPFS files if minting fails
      try {
        if (currentStep >= 4) {
          // If we got to step 4 or beyond, delete both the metadata JSON and the file
          if (metadataIpfsHash) {
            await deleteFromIPFS(
              metadataIpfsHash,
              this.#pinata_ipfs_server_key,
            );
          }
          if (ipfsHash) {
            await deleteFromIPFS(ipfsHash, this.#pinata_ipfs_server_key);
          }
        } else if (currentStep >= 1) {
          // If we got to step 1 but failed before step 4, only delete the file
          if (ipfsHash) {
            await deleteFromIPFS(ipfsHash, this.#pinata_ipfs_server_key);
          }
        }
      } catch (cleanupError) {
        console.error("Failed to cleanup IPFS files:", cleanupError);
      }
      throw error;
    }
  }

  async #createAlgorandAsset({
    metadataIpfsHash,
    assetName,
    metadataHashBuffer,
    total = 1,
    decimals = 0,
  }) {
    const suggestedParams = await this.#algodClient.getTransactionParams().do();

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

    const assetCreateTxn =
      algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        sender: this.account,
        total: BigInt(total),
        decimals,
        defaultFrozen: false,
        unitName: this.#unitName,
        assetName: safeAssetName,
        assetURL: metadataURL,
        assetMetadataHash: metadataHashBuffer,
        suggestedParams,
      });

    // Prepare group transaction array
    const mintingGroup = [assetCreateTxn];

    // If mintFee > 0, add payment txn to revenueWalletAddress
    if (this.#mintFee > 0) {
      const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: this.account,
        receiver: this.#revenueWalletAddress,
        amount: algosToMicroAlgos(this.#mintFee),
        suggestedParams,
      });
      mintingGroup.push(revenueTxn);
    }

    // Assign group id if more than one txn
    if (mintingGroup.length > 1) {
      algosdk.assignGroupID(mintingGroup);
    }

    const signedMinting = await this.#signTransactionGroup(mintingGroup);
    const { txid } = await this.#algodClient
      .sendRawTransaction(signedMinting)
      .do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(
      this.#algodClient,
      txid,
      10,
    );

    // Extract asset ID
    const assetId = Number(confirmedTxn.assetIndex);

    return { txid, assetId };
  }

  async #validateFTDetails() {
    if (this.processing) {
      return;
    }

    const name = Validator.sanitizeInput(
      document.getElementById("algox-mintx-ft-name").value,
    );
    const description = Validator.sanitizeInput(
      document.getElementById("algox-mintx-ft-description").value,
    );
    const decimals = document.getElementById("algox-mintx-ft-decimals").value;
    const totalSupply = document.getElementById("algox-mintx-ft-supply").value;
    const fileInput = document.getElementById("algox-mintx-ft-file");

    // Validate name
    const nameValidation = Validator.validateFTName(name);
    if (!nameValidation.valid) {
      this.#uiManager.showToast(nameValidation.message, "error");
      return;
    }

    // Validate description
    const descriptionValidation = Validator.validateFTDescription(description);
    if (!descriptionValidation.valid) {
      this.#uiManager.showToast(descriptionValidation.message, "error");
      return;
    }

    // Validate decimals
    const decimalsValidation = Validator.validateFTDecimals(decimals);
    if (!decimalsValidation.valid) {
      this.#uiManager.showToast(decimalsValidation.message, "error");
      return;
    }

    // Validate total supply
    const supplyValidation = Validator.validateFTTotalSupply(totalSupply);
    if (!supplyValidation.valid) {
      this.#uiManager.showToast(supplyValidation.message, "error");
      return;
    }

    // Disable UI elements (only if UI is not disabled)
    if (!this.#disableUi) {
      this.#uiManager.updateFTMessage("Minting FT... Please wait.", "default");
      this.#uiManager.disableFTMintButton();
    }

    // show loading overlay after validation
    this.processing = true;
    this.#uiManager.showLoadingOverlay("Processing...");
    eventBus.emit("sdk:processing:started", { processing: this.processing });

    try {
      const { transactionId, assetId } = await this.#mintFT({
        name,
        description,
        decimals: Number(decimals),
        totalSupply: Number(totalSupply),
        file: fileInput.files.length ? fileInput.files[0] : null,
      });

      if (!this.#disableUi) {
        this.#uiManager.updateFTMessage(
          `FT Minted! Transaction ID: ${transactionId}`,
          "pointer",
        );
      }

      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      this.#uiManager.showToast(
        `FT Minted Successfully! TxID: ${transactionId}`,
        "success",
      );

      // show resetFTBtn and hide mintFTBtn (only if UI is not disabled)
      if (!this.#disableUi) {
        this.#uiManager.showFTResetButton();
        this.#uiManager.enableFTMintButton();
      }

      const ftData = await this.getFTMetadata({ assetId });

      eventBus.emit("ft:mint:success", {
        transactionId,
        ft: ftData,
      });
    } catch (error) {
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      // Reset form on error (only if UI is not disabled)
      if (!this.#disableUi) {
        this.#uiManager.resetFTDetails();
      }

      this.#uiManager.showToast("Failed to mint FT!", "error");
      eventBus.emit("ft:mint:failed", { error: "Failed to mint FT!" });
    }
  }

  async #mintFT({ name, description, decimals, totalSupply, file }) {
    if (!this.#walletConnected || !this.account) {
      throw new Error("Wallet is not connected.");
    }

    let ipfsHash = null;
    let metadataIpfsHash = null;
    let currentStep = 0;

    try {
      // 1. (Optional) Upload icon/image to IPFS (Pinata) when provided
      const metadata = {
        name,
        description,
        decimals, // reflects the chosen divisibility for the FT
        standard: "arc3",
        minted_by: this.#metadataMark,
        marketplace: this.#unitName,
      };

      if (file) {
        currentStep = 1;
        this.#uiManager.updateLoadingMessage(
          "Processing... Step 1: Uploading icon to IPFS",
        );
        ipfsHash = await uploadFileToIPFS(file, this.#pinata_ipfs_server_key);
        const integrity = await getImageIntegrityBase64(file);
        metadata.image = `ipfs://${ipfsHash}`;
        metadata.image_integrity = integrity;
        metadata.image_mimetype = file.type;
      }

      // 2. Create metadata JSON
      currentStep = 2;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 2: Creating metadata",
      );

      // 3. Hash metadata JSON to get 32 byte assetMetadataHash
      currentStep = 3;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 3: Hashing metadata",
      );
      const metadataStr = JSON.stringify(metadata);
      const metadataHash = await sha256Hash(metadataStr);

      // 4. Upload metadata JSON to IPFS to get the CID for assetURL
      currentStep = 4;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 4: Uploading metadata to IPFS",
      );
      metadataIpfsHash = await uploadJSONToIPFS(
        metadata,
        this.#pinata_ipfs_server_key,
      );

      // 5. Create Algorand asset (FT) pointing to metadata URL
      currentStep = 5;
      this.#uiManager.updateLoadingMessage(
        "Processing... Open your wallet to continue",
      );
      const { txid, assetId } = await this.#createAlgorandAsset({
        metadataIpfsHash,
        assetName: name,
        metadataHashBuffer: metadataHash,
        total: totalSupply,
        decimals,
      });

      return { transactionId: txid, assetId };
    } catch (error) {
      // Cleanup IPFS files if minting fails
      try {
        if (currentStep >= 4) {
          // If we got to step 4 or beyond, delete both the metadata JSON and the file
          if (metadataIpfsHash) {
            await deleteFromIPFS(
              metadataIpfsHash,
              this.#pinata_ipfs_server_key,
            );
          }
          if (ipfsHash) {
            await deleteFromIPFS(ipfsHash, this.#pinata_ipfs_server_key);
          }
        } else if (currentStep >= 1) {
          // If we uploaded the icon but failed before step 4, only delete the file
          if (ipfsHash) {
            await deleteFromIPFS(ipfsHash, this.#pinata_ipfs_server_key);
          }
        }
      } catch (cleanupError) {
        console.error("Failed to cleanup IPFS files:", cleanupError);
      }
      throw error;
    }
  }

  /**
   * Internal listing fetch layer (mirrors AlgoStakeX box read patterns)
   */

  async #fetchApplicationBoxes() {
    const boxUrl = `${this.#algodUrl}/v2/applications/${this.#contractApplicationId}/boxes`;
    const boxRes = await fetch(boxUrl);
    if (!boxRes.ok) {
      throw new Error(`Failed to fetch application boxes: ${boxRes.status}`);
    }
    const boxData = await boxRes.json();
    return boxData.boxes || [];
  }

  async #readListingBoxValue(marketplace, assetId) {
    const boxNameBytes = buildListingBoxName(marketplace, assetId);
    const boxValueResponse = await this.#algodClient
      .getApplicationBoxByName(this.#contractApplicationId, boxNameBytes)
      .do();
    return decodeListingBoxValue(boxValueResponse.value);
  }

  async #fetchAllListings(forceRefresh = false) {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.#listingsCache &&
      now - this.#listingsCacheAt < 30000
    ) {
      return this.#listingsCache;
    }

    const listings = [];

    try {
      const boxes = await this.#fetchApplicationBoxes();
      const decodedBoxes = boxes
        .map((box) => decodeListingBoxName(box.name))
        .filter(Boolean);

      const fetched = (
        await Promise.all(
          decodedBoxes.map(async ({ marketplace, assetId }) => {
            try {
              const decoded = await this.#readListingBoxValue(
                marketplace,
                assetId,
              );
              return {
                assetId,
                seller: decoded.seller,
                price: decoded.price,
                marketplace,
              };
            } catch (error) {
              console.warn("Failed to decode listing box:", error);
              return null;
            }
          }),
        )
      ).filter(Boolean);

      listings.push(...fetched);
    } catch (error) {
      console.error("Error fetching all listings:", error.message);
      throw error;
    }

    this.#listingsCache = listings;
    this.#listingsCacheAt = now;
    return listings;
  }

  async #fetchListingsForMarketplace(marketplace, forceRefresh = false) {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.#marketplaceListingsCache &&
      this.#marketplaceListingsCacheKey === marketplace &&
      now - this.#marketplaceListingsCacheAt < 30000
    ) {
      return this.#marketplaceListingsCache;
    }

    const boxes = await this.#fetchApplicationBoxes();
    const matched = boxes
      .map((box) => decodeListingBoxName(box.name))
      .filter((decoded) => decoded && decoded.marketplace === marketplace);

    const listings = (
      await Promise.all(
        matched.map(async ({ assetId }) => {
          try {
            const decoded = await this.#readListingBoxValue(
              marketplace,
              assetId,
            );
            return {
              assetId,
              seller: decoded.seller,
              price: decoded.price,
              marketplace,
            };
          } catch (error) {
            console.warn("Failed to decode listing box:", error);
            return null;
          }
        }),
      )
    ).filter(Boolean);

    this.#marketplaceListingsCache = listings;
    this.#marketplaceListingsCacheAt = now;
    this.#marketplaceListingsCacheKey = marketplace;
    return listings;
  }

  async #getListingByAssetId(assetId, marketplace = this.#unitName) {
    try {
      const decoded = await this.#readListingBoxValue(marketplace, assetId);
      return {
        assetId: String(assetId),
        seller: decoded.seller,
        price: decoded.price,
        marketplace,
      };
    } catch (error) {
      return null;
    }
  }

  async #findListingByAssetId(assetId) {
    const boxes = await this.#fetchApplicationBoxes();
    for (const box of boxes) {
      const decodedName = decodeListingBoxName(box.name);
      if (!decodedName || decodedName.assetId !== String(assetId)) continue;

      try {
        const decoded = await this.#readListingBoxValue(
          decodedName.marketplace,
          assetId,
        );
        return {
          assetId: String(assetId),
          seller: decoded.seller,
          price: decoded.price,
          marketplace: decodedName.marketplace,
        };
      } catch (error) {
        console.warn("Failed to read listing box value:", error);
      }
    }
    return null;
  }

  async #enrichListing(listing) {
    const { assetId, seller, price, marketplace } = listing;
    const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
    const assetRes = await fetch(assetUrl);
    if (!assetRes.ok) return null;

    const assetData = await assetRes.json();
    const params = assetData.asset.params;

    const nft = {
      ...params,
      assetId,
      listing: { seller, price, marketplace },
    };

    await this.#attachIpfsMetadata(nft, params);

    const holdersUrl = `${this.#indexerUrl}/v2/assets/${assetId}/balances?currency-greater-than=0`;
    const holdersRes = await fetch(holdersUrl);
    if (holdersRes.ok) {
      const holdersData = await holdersRes.json();
      const currentHolder = (holdersData.balances || []).find(
        (balance) => balance.amount > 0,
      );
      if (currentHolder) {
        nft.currentHolder = currentHolder.address;
      }
    }

    return nft;
  }

  /**
   * Asset type helpers (used to gate by marketplaceType)
   */
  #isNFTParams(params) {
    return Number(params.total) === 1 && Number(params.decimals) === 0;
  }

  // True when the asset's type (FT/NFT) matches this marketplace's configured type
  #assetMatchesMarketplaceType(params) {
    return this.#marketplaceType === "NFT"
      ? this.#isNFTParams(params)
      : !this.#isNFTParams(params);
  }

  // Attach IPFS metadata based on the asset's on-chain type (NFT vs FT)
  async #attachIpfsMetadataForAsset(asset, params) {
    const metadataUrl = params.url;
    if (!metadataUrl?.startsWith("ipfs://")) return;

    const ipfsUrl = convertIpfsToHttp(
      metadataUrl,
      this.#pinata_ipfs_gateway_url,
    );
    try {
      const metadataRes = await fetch(ipfsUrl);
      if (!metadataRes.ok) return;

      const metadata = await metadataRes.json();

      if (this.#isNFTParams(params)) {
        if (metadata.image && metadata.image.startsWith("ipfs://")) {
          metadata.image = convertIpfsToHttp(
            metadata.image,
            this.#pinata_ipfs_gateway_url,
          );
        }
        asset.metadata = metadata;
      } else if (metadata.standard) {
        if (metadata.image && metadata.image.startsWith("ipfs://")) {
          metadata.image = convertIpfsToHttp(
            metadata.image,
            this.#pinata_ipfs_gateway_url,
          );
        }
        asset.metadata = metadata;
      }
    } catch (error) {
      console.warn(
        `IPFS metadata fetch failed for asset ${asset.assetId}`,
        error,
      );
    }
  }

  // Fetch and attach IPFS metadata to an asset object, honoring marketplaceType.
  // For NFT marketplaces the strict ARC-3 image checks are kept; for FT
  // marketplaces an icon/image is optional.
  async #attachIpfsMetadata(asset, params) {
    const metadataUrl = params.url;
    if (!metadataUrl?.startsWith("ipfs://")) return;

    const ipfsUrl = convertIpfsToHttp(
      metadataUrl,
      this.#pinata_ipfs_gateway_url,
    );
    try {
      const metadataRes = await fetch(ipfsUrl);
      if (!metadataRes.ok) return;

      const metadata = await metadataRes.json();

      if (this.#marketplaceType === "NFT") {
        if (
          metadata.decimals === 0 &&
          metadata.image_integrity &&
          metadata.image_mimetype &&
          metadata.standard &&
          metadata.image &&
          metadata.image.startsWith("ipfs://")
        ) {
          metadata.image = convertIpfsToHttp(
            metadata.image,
            this.#pinata_ipfs_gateway_url,
          );
          asset.metadata = metadata;
        }
      } else {
        // FT marketplace: image/icon is optional
        if (metadata.standard) {
          if (metadata.image && metadata.image.startsWith("ipfs://")) {
            metadata.image = convertIpfsToHttp(
              metadata.image,
              this.#pinata_ipfs_gateway_url,
            );
          }
          asset.metadata = metadata;
        }
      }
    } catch (error) {
      console.warn(
        `IPFS metadata fetch failed for asset ${asset.assetId}`,
        error,
      );
    }
  }

  /**
   *********** SDK public methods
   */

  // ==========================================
  // COMMON SDK PUBLIC METHODS
  // ==========================================

  /**
   * SDK UI Management
   */
  minimizeSDK(initialLoad) {
    this.#uiManager.minimizeSDK(initialLoad);
  }

  maximizeSDK(initialLoad) {
    this.#uiManager.maximizeSDK(initialLoad);
  }

  /**
   * Wallet Connection Methods
   */

  async connectWallet(walletAddress, mnemonic) {
    try {
      if (!walletAddress || typeof walletAddress !== "string") {
        throw new Error("Wallet address is required");
      }

      if (walletAddress.length !== 58) {
        throw new Error("Wallet address must be 58 characters long");
      }

      if (!/^[A-Z2-7]{58}$/.test(walletAddress)) {
        throw new Error("Invalid Algorand wallet address format");
      }

      if (!mnemonic || typeof mnemonic !== "string") {
        throw new Error("Wallet mnemonic is required");
      }

      // Validate mnemonic format
      const mnemonicWords = mnemonic.trim().split(/\s+/);
      if (mnemonicWords.length !== 25) {
        throw new Error("Mnemonic must contain 25 words");
      }

      // Verify the mnemonic generates the correct address
      let account;
      try {
        account = algosdk.mnemonicToSecretKey(mnemonic);
        const derivedAddr =
          typeof account.addr === "string"
            ? account.addr
            : account.addr?.publicKey
              ? algosdk.encodeAddress(account.addr.publicKey)
              : String(account.addr || "");
        if (derivedAddr !== walletAddress) {
          throw new Error(
            "Mnemonic does not match the provided wallet address",
          );
        }
      } catch (error) {
        throw new Error(error.message || "Invalid mnemonic");
      }

      this.#mnemonicAccount = account;
      this.account = walletAddress;
      this.#walletConnected = true;
      this.#selectedWalletType = "mnemonic";
      this.#connectionInfo = {
        type: "mnemonic",
        address: walletAddress,
      };

      eventBus.emit("wallet:connected", {
        address: walletAddress,
        type: "mnemonic",
      });

      if (!this.#disableUi) {
        this.#uiManager.showSDKUI();
      }

      return {
        address: walletAddress,
        type: "mnemonic",
      };
    } catch (error) {
      console.error("Error connecting wallet:", error.message);
      eventBus.emit("wallet:connection:failed", { error: error.message });
      throw error;
    }
  }

  async disconnectWallet() {
    if (!this.#walletConnected) {
      throw new Error("No wallet is currently connected");
    }

    await this.#handleLogout(true);
  }

  /**
   * Mint an NFT programmatically (headless or custom UI).
   * @param {{ name: string, description: string, file: File|Blob|{ data: Buffer|Uint8Array, name: string, type?: string } }} params
   */
  async mintNFT({ name, description, file }) {
    this.#assertWalletConnected("mint an NFT");

    if (this.#marketplaceType !== "NFT") {
      throw new Error("This marketplace is configured for FT assets only.");
    }

    const sanitizedName = Validator.sanitizeInput(name);
    const sanitizedDescription = Validator.sanitizeInput(description);

    const nameValidation = Validator.validateNFTName(sanitizedName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.message);
    }

    const descriptionValidation =
      Validator.validateNFTDescription(sanitizedDescription);
    if (!descriptionValidation.valid) {
      throw new Error(descriptionValidation.message);
    }

    if (!file) {
      throw new Error("Media file is required.");
    }

    // Normalize file input (handles browser File/Blob, Node file path, or Node { data, name, type })
    const { normalizeUploadFile } = await import("./utils.js");
    const normalizedFile = normalizeUploadFile(file);

    const fileValidation = Validator.validateFileType(
      normalizedFile,
      this.#supportedMediaFormats,
    );
    if (!fileValidation.valid) {
      throw new Error(fileValidation.message);
    }

    this.processing = true;
    this.#uiManager.showLoadingOverlay("Processing...");
    eventBus.emit("sdk:processing:started", { processing: this.processing });

    try {
      const result = await this.#mintNFT({
        name: sanitizedName,
        description: sanitizedDescription,
        file: normalizedFile,
      });
      eventBus.emit("nft:mint:success", result);
      return result;
    } catch (error) {
      eventBus.emit("nft:mint:failed", { error: error.message });
      throw error;
    } finally {
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
    }
  }

  /**
   * Mint a fungible token programmatically (headless or custom UI).
   */
  async mintFT({ name, description, decimals, totalSupply, file = null }) {
    this.#assertWalletConnected("mint a fungible token");

    if (this.#marketplaceType !== "FT") {
      throw new Error("This marketplace is configured for NFT assets only.");
    }

    const sanitizedName = Validator.sanitizeInput(name);
    const sanitizedDescription = Validator.sanitizeInput(description);

    const nameValidation = Validator.validateFTName(sanitizedName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.message);
    }

    const descriptionValidation =
      Validator.validateFTDescription(sanitizedDescription);
    if (!descriptionValidation.valid) {
      throw new Error(descriptionValidation.message);
    }

    const decimalsValidation = Validator.validateFTDecimals(decimals);
    if (!decimalsValidation.valid) {
      throw new Error(decimalsValidation.message);
    }

    const supplyValidation = Validator.validateFTTotalSupply(totalSupply);
    if (!supplyValidation.valid) {
      throw new Error(supplyValidation.message);
    }

    let normalizedFile = null;
    if (file) {
      // Normalize file input (handles browser File/Blob, Node file path, or Node { data, name, type })
      const { normalizeUploadFile } = await import("./utils.js");
      normalizedFile = normalizeUploadFile(file);

      const fileValidation = Validator.validateFileType(normalizedFile, [
        "IMAGE",
      ]);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.message);
      }
    }

    this.processing = true;
    this.#uiManager.showLoadingOverlay("Processing...");
    eventBus.emit("sdk:processing:started", { processing: this.processing });

    try {
      const result = await this.#mintFT({
        name: sanitizedName,
        description: sanitizedDescription,
        decimals: Number(decimals),
        totalSupply: Number(totalSupply),
        file: normalizedFile,
      });
      eventBus.emit("ft:mint:success", result);
      return result;
    } catch (error) {
      eventBus.emit("ft:mint:failed", { error: error.message });
      throw error;
    } finally {
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
    }
  }

  // ==========================================
  // SDK-SPECIFIC PUBLIC METHODS (ALGOMINTX)
  // ==========================================

  /**
   * NFT Operations
   */

  async getListedNFTs() {
    try {
      const listings = await this.#fetchListingsForMarketplace(this.#unitName);
      if (listings.length === 0) return [];

      const enriched = (
        await Promise.all(
          listings.map((listing) => this.#enrichListing(listing)),
        )
      ).filter(Boolean);

      return enriched.filter((asset) =>
        this.#assetMatchesMarketplaceType(asset),
      );
    } catch (error) {
      console.error("Error fetching listed NFTS", error.message);
      throw error;
    }
  }

  /**
   * Marketplace discovery
   *
   * Scans the shared contract's listing boxes and groups them by the
   * `marketplace` field (= AMX{namespace}) to surface every marketplace that
   * currently has at least one active listing. This mirrors the way AlgoStakeX
   * discovers pools by collecting unique poolIds from `stake_` boxes.
   */
  async getMarketplaces() {
    try {
      const allListings = await this.#fetchAllListings();
      const marketplaces = {};

      for (const listing of allListings) {
        const { marketplace, assetId, price, seller } = listing;
        if (!marketplace) continue;

        if (!marketplaces[marketplace]) {
          marketplaces[marketplace] = {
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

        const entry = marketplaces[marketplace];
        entry.listingCount += 1;
        entry.totalListedValue += price;
        entry.floorPrice =
          entry.floorPrice === null ? price : Math.min(entry.floorPrice, price);
        if (seller) entry.sellers.add(seller);
        entry.assetIds.push(assetId);
      }

      return Object.values(marketplaces).map((entry) => ({
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
        isCurrentMarketplace: entry.marketplace === this.#unitName,
      }));
    } catch (error) {
      console.error("Error fetching marketplaces:", error.message);
      throw error;
    }
  }

  async getMarketplaceCount() {
    const marketplaces = await this.getMarketplaces();
    return marketplaces.length;
  }

  /**
   * O(1) listing lookup for a marketplace + asset (mirrors AlgoStakeX stackingStatus).
   */
  async listingStatus(assetId, marketplace = this.#unitName) {
    try {
      const listing = await this.#getListingByAssetId(assetId, marketplace);
      if (!listing) {
        return {
          marketplace,
          assetId: String(assetId),
          exists: false,
          listing: null,
        };
      }
      return {
        marketplace,
        assetId: String(assetId),
        exists: true,
        listing,
      };
    } catch (error) {
      console.error("Error fetching listing status:", error.message);
      if (
        error.message?.includes("not found") ||
        error.message?.includes("does not exist") ||
        error.status === 404
      ) {
        return {
          marketplace,
          assetId: String(assetId),
          exists: false,
          listing: null,
        };
      }
      throw error;
    }
  }

  /**
   * Returns the listings + aggregate metrics for a single marketplace.
   * Defaults to the marketplace this SDK instance is configured for.
   */
  async getMarketplaceStats(marketplace = this.#unitName) {
    try {
      const allListings = await this.#fetchListingsForMarketplace(marketplace);
      const listings = allListings.map(({ assetId, price, seller }) => ({
        assetId,
        price,
        seller,
      }));

      let totalListedValue = 0;
      let floorPrice = null;
      const sellers = new Set();

      for (const { price, seller } of listings) {
        totalListedValue += price;
        floorPrice = floorPrice === null ? price : Math.min(floorPrice, price);
        if (seller) sellers.add(seller);
      }

      return {
        marketplace,
        namespace: marketplace.startsWith("AMX")
          ? marketplace.slice(3)
          : marketplace,
        listingCount: listings.length,
        uniqueSellers: sellers.size,
        totalListedValue,
        floorPrice: floorPrice ?? 0,
        avgPrice: listings.length ? totalListedValue / listings.length : 0,
        listings,
      };
    } catch (error) {
      console.error("Error fetching marketplace stats:", error.message);
      throw error;
    }
  }

  /**
   * Rich marketplace analytics: enriched listings + aggregate metrics.
   * Mirrors the NFT Marketplace Analytics Dashboard getMarketplaceData().
   */
  async getMarketplaceData(marketplace = this.#unitName) {
    try {
      const marketplaceListings =
        await this.#fetchListingsForMarketplace(marketplace);

      if (marketplaceListings.length === 0) {
        throw new Error(`Marketplace ${marketplace} not found`);
      }

      const enriched = (
        await Promise.all(
          marketplaceListings.map((listing) => this.#enrichListing(listing)),
        )
      ).filter(Boolean);

      const sellers = new Set();
      const holders = new Set();
      let totalListedValue = 0;
      let floorPrice = null;

      enriched.forEach((l) => {
        sellers.add(l.listing.seller);
        if (l.currentHolder) holders.add(l.currentHolder);
        totalListedValue += l.listing.price;
        floorPrice =
          floorPrice === null
            ? l.listing.price
            : Math.min(floorPrice, l.listing.price);
      });

      const sample = enriched[0];
      const assetType =
        sample && Number(sample.total) === 1 && Number(sample.decimals) === 0
          ? "NFT"
          : "FT";

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
    } catch (error) {
      console.error("Error fetching marketplace data:", error.message);
      throw error;
    }
  }

  async getWalletAssets({ accountId, marketplaceOnly = false } = {}) {
    try {
      if (!accountId) {
        if (!this.#walletConnected || !this.account) {
          if (this.isMinimized) {
            this.maximizeSDK(true);
          }
          throw new Error("Wallet is not connected");
        }
      } else {
        Validator.validateRevenueWalletAddress(accountId);
      }

      const url = `${this.#indexerUrl}/v2/accounts/${
        accountId ? accountId : this.account
      }`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Indexer fetch error: ${res.status}`);

      const accountData = await res.json();
      const holdings = (accountData.account.assets || []).filter(
        (h) => h.amount > 0,
      );

      const walletAssets = (
        await Promise.all(
          holdings.map(async (holding) => {
            const assetId = holding["asset-id"];
            const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
            const assetRes = await fetch(assetUrl);
            if (!assetRes.ok) return null;

            const assetData = await assetRes.json();
            const params = assetData.asset.params;
            const isNFT = this.#isNFTParams(params);

            if (marketplaceOnly && !this.#assetMatchesMarketplaceType(params)) {
              return null;
            }

            const asset = {
              ...params,
              assetId,
              balance: holding.amount,
              assetType: isNFT ? "NFT" : "FT",
            };

            await this.#attachIpfsMetadataForAsset(asset, params);

            if (marketplaceOnly) {
              const listing = await this.#getListingByAssetId(
                assetId,
                this.#unitName,
              );
              if (listing) {
                asset.listing = {
                  seller: listing.seller,
                  price: listing.price,
                  marketplace: listing.marketplace,
                };
              }
            }

            const holdersUrl = `${this.#indexerUrl}/v2/assets/${assetId}/balances?currency-greater-than=0`;
            const holdersRes = await fetch(holdersUrl);
            if (holdersRes.ok) {
              const holdersData = await holdersRes.json();
              const currentHolder = (holdersData.balances || []).find(
                (balance) => balance.amount > 0,
              );
              if (currentHolder) {
                asset.currentHolder = currentHolder.address;
              }
            }

            return asset;
          }),
        )
      ).filter(Boolean);

      return walletAssets;
    } catch (error) {
      console.error("Error fetching wallet assets:", error.message);
      throw error;
    }
  }

  async getWalletNFTs(options = {}) {
    return this.getWalletAssets(options);
  }

  async getAssetMetadata({ assetId }) {
    return this.getNFTMetadata({ assetId });
  }

  async getNFTMetadata({ assetId }) {
    try {
      const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
      const assetRes = await fetch(assetUrl);
      if (!assetRes.ok) {
        throw new Error(`Failed to fetch asset data: ${assetRes.status}`);
      }
      const assetData = await assetRes.json();
      const params = assetData.asset.params;

      const nft = {
        ...params,
        assetId,
      };

      const listing =
        (await this.#getListingByAssetId(assetId, this.#unitName)) ||
        (await this.#findListingByAssetId(assetId));
      if (listing) {
        nft.listing = {
          seller: listing.seller,
          price: listing.price,
          marketplace: listing.marketplace,
        };
      }

      // Handle IPFS metadata (type-aware)
      await this.#attachIpfsMetadata(nft, params);

      // Get current holder's address
      const holdersUrl = `${
        this.#indexerUrl
      }/v2/assets/${assetId}/balances?currency-greater-than=0`;
      const holdersRes = await fetch(holdersUrl);
      if (holdersRes.ok) {
        const holdersData = await holdersRes.json();
        if (holdersData.balances && holdersData.balances.length > 0) {
          // The first balance entry with amount > 0 is the current holder
          const currentHolder = holdersData.balances.find(
            (balance) => balance.amount > 0,
          );
          if (currentHolder) {
            nft.currentHolder = currentHolder.address;
          }
        }
      }

      // Fetch transaction id for this NFT
      const txUrl = `${
        this.#indexerUrl
      }/v2/transactions?asset-id=${assetId}&tx-type=acfg`;
      const txRes = await fetch(txUrl);
      if (!txRes.ok) {
        throw new Error(
          `Failed to fetch asset config transaction: ${txRes.status}`,
        );
      }
      const txData = await txRes.json();
      nft.transactionId = txData.transactions?.[0]?.id;

      return nft;
    } catch (error) {
      console.error("Error fetching NFT metadata:", error.message);
      throw error; // Re-throw to allow caller to handle the error
    }
  }

  // Fetch metadata for a fungible token. Shares the same on-chain/IPFS
  // resolution as getNFTMetadata; metadata attachment is type-aware so an
  // FT marketplace resolves FT (decimals/supply) assets correctly.
  async getFTMetadata({ assetId }) {
    return this.getNFTMetadata({ assetId });
  }

  async listNFT({ assetId, nftPrice }) {
    try {
      this.processing = true;
      this.#uiManager.showLoadingOverlay("Processing...");
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      if (!this.#walletConnected || !this.account) {
        this.#assertWalletConnected("list an asset");
      }
      if (!assetId || !nftPrice) {
        throw new Error("Asset ID and price are required");
      }

      if (isNaN(assetId) || isNaN(nftPrice)) {
        throw new Error("Asset ID and price must be a number.");
      }

      // Enforce marketplace type (FT/NFT) before listing
      const assetInfo = await this.#algodClient.getAssetByID(assetId).do();
      if (!this.#assetMatchesMarketplaceType(assetInfo.params)) {
        throw new Error(
          `This marketplace only supports ${this.#marketplaceType} assets.`,
        );
      }

      const accountUrl = `${this.#indexerUrl}/v2/accounts/${this.account}`;
      const accountRes = await fetch(accountUrl);
      if (!accountRes.ok) {
        throw new Error(`Failed to fetch account assets: ${accountRes.status}`);
      }
      const accountData = await accountRes.json();
      const holding = (accountData.account.assets || []).find(
        (a) => a["asset-id"] === assetId && a.amount > 0,
      );
      if (!holding) {
        throw new Error("You do not hold this asset in your wallet.");
      }

      const transferAmount =
        this.#marketplaceType === "NFT" ? 1 : Number(holding.amount);

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const fourMicroAlgo = { ...suggestedParams, flatFee: true, fee: 4000 }; // 0.004 Algo

      // Get the listing box reference
      const boxRef = getListingBoxReference(
        this.#contractApplicationId,
        this.#unitName,
        assetId,
      );

      const fundContractTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#contractWalletAddress,
          amount: 100_000,
          suggestedParams,
        });

      const transferNFTToContractAndAddListingMethod = encoder.methods.find(
        (m) => m.name === "transferNFTToContractAndAddListing",
      );
      const transferNFTToContractAndAddListingTxn =
        algosdk.makeApplicationCallTxnFromObject({
          sender: this.account,
          appIndex: this.#contractApplicationId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs: [
            transferNFTToContractAndAddListingMethod.getSelector(),
            algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
            algosdk.ABIType.from("string").encode(this.account),
            algosdk.ABIType.from("string").encode(
              algosToMicroAlgos(nftPrice).toString(),
            ),
            algosdk.ABIType.from("string").encode(this.#unitName),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: fourMicroAlgo,
        });

      // User-signed escrow transfer (AlgoStakeX pattern — no clawback required)
      const assetTransferTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#contractWalletAddress,
          amount: BigInt(transferAmount),
          assetIndex: assetId,
          suggestedParams,
        });

      const listingGroup = [
        fundContractTxn,
        transferNFTToContractAndAddListingTxn,
        assetTransferTxn,
      ];

      // if listing fee is greater than 0, add revenue transaction to the listing group
      if (this.#listingFee > 0) {
        const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#revenueWalletAddress,
          amount: algosToMicroAlgos(this.#listingFee),
          suggestedParams,
        });
        listingGroup.push(revenueTxn);
      }

      algosdk.assignGroupID(listingGroup);

      const signedListing = await this.#signTransactionGroup(listingGroup);
      const { txid: listingTxId } = await this.#algodClient
        .sendRawTransaction(signedListing)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, listingTxId, 10);

      this.#listingsCache = null;
      this.#marketplaceListingsCache = null;
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      const nftData = await this.getNFTMetadata({ assetId });

      // Emit event for successful listing
      eventBus.emit("nft:list:success", {
        nft: nftData,
        transactionId: listingTxId,
      });

      return {
        nft: nftData,
        transactionId: listingTxId,
      };
    } catch (error) {
      console.error("Error listing NFT:", error.message);
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:list:failed", { error: "Could not list NFT!" });
      throw error;
    }
  }

  async unlistNFT({ assetId }) {
    try {
      this.processing = true;
      this.#uiManager.showLoadingOverlay("Processing...");
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      this.#assertWalletConnected("unlist an asset");

      if (!assetId) {
        throw new Error("Asset ID is required.");
      }

      if (isNaN(assetId)) {
        throw new Error("Asset ID must be a number.");
      }

      const nftData = await this.getNFTMetadata({ assetId });

      if (!this.#assetMatchesMarketplaceType(nftData)) {
        throw new Error(
          `This marketplace only supports ${this.#marketplaceType} assets.`,
        );
      }

      if (nftData.listing.marketplace !== this.#unitName) {
        throw new Error("Cannot un-list nft from other marketplace.");
      }

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo

      // Get the listing box reference
      const boxRef = getListingBoxReference(
        this.#contractApplicationId,
        this.#unitName,
        assetId,
      );

      const receiverOptInToNFTTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.account,
          amount: 0,
          assetIndex: assetId,
          suggestedParams,
        });

      const transferNFTToSellerAndRemoveListingMethod = encoder.methods.find(
        (m) => m.name === "transferNFTToSellerAndRemoveListing",
      );
      const transferNFTToSellerAndRemoveListingTxn =
        algosdk.makeApplicationCallTxnFromObject({
          sender: this.account,
          appIndex: this.#contractApplicationId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs: [
            transferNFTToSellerAndRemoveListingMethod.getSelector(),
            algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
            // for preventing false asset transfer to unauthorised seller
            algosdk.ABIType.from("string").encode(this.account),
            // for preventing un-listing from other marketplace [false revenue prevention]
            algosdk.ABIType.from("string").encode(this.#unitName),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: threeMicroAlgo,
        });

      // asset transfer is done inside contract
      const unlistingGroup = [
        receiverOptInToNFTTxn,
        transferNFTToSellerAndRemoveListingTxn,
      ];

      // if unlisting fee is greater than 0, add revenue transaction to the unlisting group
      if (this.#unListingFee > 0) {
        const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#revenueWalletAddress,
          amount: algosToMicroAlgos(this.#unListingFee),
          suggestedParams,
        });
        unlistingGroup.push(revenueTxn);
      }

      algosdk.assignGroupID(unlistingGroup);

      const signedUnlisting = await this.#signTransactionGroup(unlistingGroup);
      const { txid: unlistingTxId } = await this.#algodClient
        .sendRawTransaction(signedUnlisting)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, unlistingTxId, 10);

      this.#listingsCache = null;
      this.#marketplaceListingsCache = null;
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      const newNftData = await this.getNFTMetadata({ assetId });

      // Emit event for successful purchase
      eventBus.emit("nft:buy:success", {
        nft: newNftData,
        transactionId: unlistingTxId,
      });

      return {
        nft: newNftData,
        transactionId: unlistingTxId,
      };
    } catch (error) {
      console.error("Error un-listing NFT:", error.message);
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:unlist:failed", { error: "Could not unlist NFT!" });
      throw error;
    }
  }

  async buyNFT({ assetId }) {
    try {
      this.processing = true;
      this.#uiManager.showLoadingOverlay("Processing...");
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      this.#assertWalletConnected("buy an asset");

      if (!assetId) {
        throw new Error("Asset ID is required.");
      }

      if (isNaN(assetId)) {
        throw new Error("Asset ID must be a number.");
      }

      // Get the listing box reference
      const nftData = await this.getNFTMetadata({ assetId });

      if (!this.#assetMatchesMarketplaceType(nftData)) {
        throw new Error(
          `This marketplace only supports ${this.#marketplaceType} assets.`,
        );
      }

      if (nftData.listing.seller === this.account) {
        throw new Error("Seller cannot buy the listed nft.");
      }

      if (nftData.listing.marketplace !== this.#unitName) {
        throw new Error("Cannot buy nft from other marketplace.");
      }

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo

      // Get the listing box reference
      const boxRef = getListingBoxReference(
        this.#contractApplicationId,
        this.#unitName,
        assetId,
      );

      const receiverOptInToNFTTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.account,
          amount: 0,
          assetIndex: assetId,
          suggestedParams,
        });

      const transferNFTToReceiverAndRemoveListingMethod = encoder.methods.find(
        (m) => m.name === "transferNFTToReceiverAndRemoveListing",
      );
      const transferNFTToReceiverAndRemoveListingTxn =
        algosdk.makeApplicationCallTxnFromObject({
          sender: this.account,
          appIndex: this.#contractApplicationId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs: [
            transferNFTToReceiverAndRemoveListingMethod.getSelector(),
            algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
            // for preventing false payment to unauthorised seller [false revenue prevention]
            algosdk.ABIType.from("string").encode(nftData.listing.seller),
            // for preventing buying from other marketplace [false revenue prevention]
            algosdk.ABIType.from("string").encode(this.#unitName),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: threeMicroAlgo,
        });

      // tempering the following transaction will still be failed (asset wont be transferred)
      const transferNFTPriceToSellerTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: nftData.listing.seller,
          amount: algosToMicroAlgos(nftData.listing.price),
          suggestedParams,
        });

      // asset transfer is done inside contract
      const buyingGroup = [
        receiverOptInToNFTTxn,
        transferNFTToReceiverAndRemoveListingTxn,
        transferNFTPriceToSellerTxn,
      ];

      // if buying fee is greater than 0, add revenue transaction to the buying group
      if (this.#buyingFee > 0) {
        const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#revenueWalletAddress,
          amount: algosToMicroAlgos(this.#buyingFee),
          suggestedParams,
        });
        buyingGroup.push(revenueTxn);
      }

      algosdk.assignGroupID(buyingGroup);

      const signedBuying = await this.#signTransactionGroup(buyingGroup);
      const { txid: buyingTxId } = await this.#algodClient
        .sendRawTransaction(signedBuying)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, buyingTxId, 10);

      this.#listingsCache = null;
      this.#marketplaceListingsCache = null;
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      const newNftData = await this.getNFTMetadata({ assetId });

      // Emit event for successful purchase
      eventBus.emit("nft:buy:success", {
        nft: newNftData,
        transactionId: buyingTxId,
      });

      return {
        nft: newNftData,
        transactionId: buyingTxId,
      };
    } catch (error) {
      console.error("Error buying NFT:", error.message);
      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:buy:failed", { error: "Could not buy NFT!" });
      throw error;
    }
  }
}

export default AlgoMintX;
