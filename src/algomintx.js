import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import eventBus from "./event-bus.js";
import { Validator } from "./validation.js";
import { UIManager } from "./ui.js";
import {
  sha256Hash,
  getImageIntegrityBase64,
  uploadFileToIPFS,
  uploadJSONToIPFS,
  deleteFromIPFS,
  getBoxNameB64,
  algosToMicroAlgos,
  microAlgosToAlgos,
  convertIpfsToHttp,
  getListingBoxReference,
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

  // ==========================================
  // SDK-SPECIFIC PRIVATE FIELDS (ALGOMINTX)
  // ==========================================
  #contractApplicationId;
  #contractWalletAddress;
  #namespace;
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
    pinata_ipfs_gateway_url = null,
    listingFee = 0,
    buyingFee = 0,
    unListingFee = 0,
    mintFee = 0,
    supportedMediaFormats = ["IMAGE"],
  }) {
    try {
      // Validate all parameters
      this.#pinata_ipfs_server_key = Validator.validatePinataServerKey(
        pinata_ipfs_server_key
      );
      this.#pinata_ipfs_gateway_url = Validator.validatePinataGatewayUrl(
        pinata_ipfs_gateway_url
      );
      this.network = Validator.validateEnvironment(env);
      this.#namespace = Validator.validateNamespace(namespace);
      this.#revenueWalletAddress =
        Validator.validateRevenueWalletAddress(revenueWalletAddress);
      this.#listingFee = Validator.validateFee(listingFee, "Listing fee");
      this.#buyingFee = Validator.validateFee(buyingFee, "Buying fee");
      this.#unListingFee = Validator.validateFee(
        unListingFee,
        "unListingFee fee"
      );
      this.#mintFee = Validator.validateFee(mintFee, "Mint fee");
      this.#disableToast = Validator.validateDisableToast(disableToast);
      this.#disableUi = Validator.validateDisableUi(disableUi);
      this.#minimizeUILocation =
        Validator.validateMinimizeUILocation(minimizeUILocation);
      this.#logo = Validator.validateLogo(logo);
      this.#toastLocation = Validator.validateToastLocation(toastLocation);
      this.#supportedMediaFormats = Validator.validateSupportedMediaFormats(
        supportedMediaFormats
      );

      // Initialize other properties
      this.#supportedNetworks = ["mainnet", "testnet"];
      this.#walletConnectors = {
        pera: new PeraWalletConnect(),
        defly: new DeflyWalletConnect(),
      };
      this.#walletConnected = false;
      this.account = null;
      this.#connectionInfo = null;
      this.#connectionInProgress = false;
      this.#supportedWallets = ["pera", "defly"];
      this.#selectedWalletType = null;

      // Initialize algosdk client
      this.#algodClient = new algosdk.Algodv2(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        this.network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      // Initialize contract details
      this.#contractApplicationId =
        this.network === "mainnet" ? 3127816536 : 741003115;
      this.#contractWalletAddress =
        this.network === "mainnet"
          ? "57U43PN2WYSYFQZAJ2WBGSHT2RG3GJF2B4JJZYBOGUZ5ZDR6K7WCFLQNHU"
          : "G6FBCN7OZTTHBSPU6RGYEFW6I7F5UAEUD7DLS7J66JU2FJEAKPZDWBUHNQ";

      // Initialize SDK variables
      this.#indexerUrl =
        this.network === "mainnet"
          ? "https://mainnet-idx.algonode.cloud"
          : "https://testnet-idx.algonode.cloud";
      this.#unitName = `AMX${this.#namespace}`;
      this.#metadataMark = "AlgoMintX";
      this.events = eventBus;

      // Initialize UI state
      this.processing = false;

      // Initialize UI Manager
      this.#uiManager = new UIManager(this, {
        disableUi: this.#disableUi,
        disableToast: this.#disableToast,
        logo: this.#logo,
        minimizeUILocation: this.#minimizeUILocation,
        toastLocation: this.#toastLocation,
      });

      // Load saved UI state (only if UI is not disabled)
      if (!this.#disableUi) {
        const savedState = localStorage.getItem("axs");
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
    localStorage.removeItem("walletconnect");
    localStorage.removeItem("DeflyWallet.Wallet");
    localStorage.removeItem("PeraWallet.Wallet");

    // If UI is disabled, don't show alert or reload
    if (this.#disableUi) {
      console.error("SDK validation failed:", message);
      return;
    }

    alert(message);
    window.location.reload();
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
    });

    // Setup NFT input validation
    this.#uiManager.setupNFTInputValidation({
      getSupportedMediaFormats: () => this.#supportedMediaFormats,
      sanitizeInput: (input) => Validator.sanitizeInput(input),
      validateFileType: (file) =>
        Validator.validateFileType(file, this.#supportedMediaFormats),
    });

    // Try restore wallet connection
    await this.#loadConnectionFromStorage();
  }

  async #loadConnectionFromStorage() {
    try {
      // Check for wallet connection data in localStorage
      const walletconnect = localStorage.getItem("walletconnect");
      const peraWallet = localStorage.getItem("PeraWallet.Wallet");
      const deflyWallet = localStorage.getItem("DeflyWallet.Wallet");

      let walletType = null;
      let accounts = null;

      // Try to reconnect to existing sessions
      if (peraWallet) {
        try {
          const peraAccounts =
            await this.#walletConnectors.pera.reconnectSession();
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
          const deflyAccounts =
            await this.#walletConnectors.defly.reconnectSession();
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
          "success"
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
        "warning"
      );
      return;
    }

    if (!this.#supportedWallets.includes(walletType)) {
      this.#uiManager.showToast("Unsupported wallet selected.", "error");
      return;
    }

    this.#uiManager.clearMessage(); // SDK-Specific
    this.#selectedWalletType = walletType;

    // If UI is disabled, we need to temporarily show wallet connection UI
    if (this.#disableUi) {
      console.log("UI is disabled, skipping wallet connection UI");
    } else {
      // Only manipulate DOM if UI is not disabled
      document.getElementById("algox-sdk-container").style.display = "none";
    }

    const walletConnector = this.#walletConnectors[walletType];

    this.#connectionInProgress = true;

    try {
      const connectPromise = walletConnector.connect();

      // Set a timeout fallback (e.g., 60s) to detect "hanging" connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Wallet connection timed out.")),
          60 * 1000
        )
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
                "success"
              );
              eventBus.emit("wallet:connection:connected", {
                address: this.account,
              });
              return; // Exit successfully
            }
          } catch (reconnectError) {
            console.error(
              "Failed to reconnect to existing session:",
              reconnectError
            );
          }
        }

        this.#uiManager.showToast("Failed to connect wallet!", "error");
        eventBus.emit("wallet:connection:failed", {
          error: "Failed to connect wallet!",
        });
        if (this.#disableUi) {
          console.error("UI is disabled, skipping wallet connection UI");
        } else {
          this.#resetToLoginUI();
        }
      }
    }
  }

  async #handleLogout() {
    if (this.processing) {
      return;
    }
    if (confirm("Are you sure you want to logout?")) {
      try {
        if (
          this.#selectedWalletType &&
          this.#walletConnectors[this.#selectedWalletType]
        ) {
          const connector = this.#walletConnectors[this.#selectedWalletType];
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
      this.#uiManager.showToast("Logged out successfully.", "success");
      if (!this.#disableUi) {
        this.#resetToLoginUI();
      } else {
        // Reset internal state when UI is disabled
        this.#walletConnected = false;
        this.account = null;
        this.#connectionInfo = null;
        this.#selectedWalletType = null;
      }
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
      document.getElementById("algox-mintx-nft-name").value
    );
    const description = Validator.sanitizeInput(
      document.getElementById("algox-mintx-nft-description").value
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
          "pointer"
        );
      }

      this.processing = false;
      this.#uiManager.hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      this.#uiManager.showToast(
        `NFT Minted Successfully! TxID: ${transactionId}`,
        "success"
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
        "Processing... Step 1: Uploading file to IPFS"
      );
      ipfsHash = await uploadFileToIPFS(file, this.#pinata_ipfs_server_key);

      // 2. Create metadata JSON with IPFS link, name, description
      currentStep = 2;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 2: Creating metadata"
      );
      const integrity = await getImageIntegrityBase64(file);

      const metadata = {
        name,
        description,
        image: `ipfs://${ipfsHash}`,
        image_integrity: integrity,
        image_mimetype: file.type,
        decimals: 0, // must be 0 for NFTs ARC-3 compliant
        standard: "arc3",
        minted_by: this.#metadataMark,
        marketplace: this.#unitName,
      };

      // 3. Hash metadata JSON to get 32 byte assetMetadataHash
      currentStep = 3;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 3: Hashing metadata"
      );
      const metadataStr = JSON.stringify(metadata);
      const metadataHash = await sha256Hash(metadataStr);

      // 4. Upload metadata JSON to IPFS to get the CID for assetURL
      currentStep = 4;
      this.#uiManager.updateLoadingMessage(
        "Processing... Step 4: Uploading metadata to IPFS"
      );
      metadataIpfsHash = await uploadJSONToIPFS(
        metadata,
        this.#pinata_ipfs_server_key
      );

      // 5. Create Algorand asset (NFT) pointing to metadata URL
      currentStep = 5;
      this.#uiManager.updateLoadingMessage(
        "Processing... Open your wallet to continue"
      );
      const { txid, assetId } = await this.#createAlgorandAsset(
        metadataIpfsHash,
        name,
        metadataHash
      );

      return { transactionId: txid, assetId };
    } catch (error) {
      // Cleanup IPFS files if minting fails
      try {
        if (currentStep >= 4) {
          // If we got to step 4 or beyond, delete both the metadata JSON and the file
          if (metadataIpfsHash) {
            await deleteFromIPFS(
              metadataIpfsHash,
              this.#pinata_ipfs_server_key
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

  async #createAlgorandAsset(metadataIpfsHash, assetName, metadataHashBuffer) {
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
        total: 1,
        decimals: 0,
        defaultFrozen: false,
        unitName: this.#unitName,
        assetName: safeAssetName,
        assetURL: metadataURL,
        assetMetadataHash: metadataHashBuffer,
        suggestedParams,
        clawback: this.#contractWalletAddress,
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

    const walletConnector = this.#walletConnectors[this.#selectedWalletType];
    const signedMinting = await walletConnector.signTransaction([
      mintingGroup.map((txn) => ({ txn, signers: [this.account] })),
    ]);
    const { txid } = await this.#algodClient
      .sendRawTransaction(signedMinting)
      .do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(
      this.#algodClient,
      txid,
      10
    );

    // Extract asset ID
    const assetId = Number(confirmedTxn.assetIndex);

    return { txid, assetId };
  }

  async #decodeListingBoxFromAlgod(boxNameB64) {
    const boxNameBytes = Uint8Array.from(atob(boxNameB64), (c) =>
      c.charCodeAt(0)
    );
    const assetIdBytes = boxNameBytes.slice(8); // skip 'listing_' prefix
    const assetId = algosdk.decodeUint64(assetIdBytes, "safe");

    // Get the box value
    const boxValueResponse = await this.#algodClient
      .getApplicationBoxByName(this.#contractApplicationId, boxNameBytes)
      .do();

    // The value is already a Uint8Array in the browser environment
    const raw = boxValueResponse.value;

    // Use DataView to decode the values
    const view = new DataView(raw.buffer);

    // skip the following bytes
    // (bytes 0-1) struct type ID (2 bytes)
    // (bytes 2-3) seller length (2 bytes)
    // (bytes 4-5) price length (2 bytes)
    // (bytes 6-7) marketplace length (2 bytes)

    // Read seller string (bytes 8-65)
    const sellerStart = 8; // Skip struct type ID (2) + seller length (2) + price length (2) + marketplace length (2)
    const sellerEnd = sellerStart + 58; // Algorand addresses are always 58 bytes
    const sellerBytes = raw.slice(sellerStart, sellerEnd);

    // Decode seller string
    const seller = new TextDecoder().decode(sellerBytes);
    // console.log("seller:", seller);

    // Read price length (uint16 BE) (bytes 66-73)
    const priceLen = view.getUint16(sellerEnd, false); // Read price length at position 66

    // Read price string (bytes 66-67): price length (2 bytes) (bytes 68-73): price value
    const priceStart = sellerEnd + 2; // Start after seller (66) + 2 bytes for price length
    const priceEnd = priceStart + priceLen; // End after reading price length bytes
    const priceBytes = raw.slice(priceStart, priceEnd);

    // Decode price as a UTF-8 string (not number)
    const nftPrice = microAlgosToAlgos(
      Number(new TextDecoder().decode(priceBytes))
    );
    // console.log("nftPrice:", nftPrice);

    // Read marketplace length (uint16 BE) (bytes 74-84)
    const marketplaceLen = view.getUint16(priceEnd, false); // Read marketplace length at position 74

    // Read marketplace string (bytes 74-75): marketplace length (2 bytes) (bytes 76-84): marketplace value
    const marketplaceStart = priceEnd + 2; // Start after price (74) + 2 bytes for marketplace length
    const marketplaceEnd = marketplaceStart + marketplaceLen; // End after reading marketplace length bytes
    const marketplaceBytes = raw.slice(marketplaceStart, marketplaceEnd);

    // Decode marketplace string
    const marketplace = new TextDecoder().decode(marketplaceBytes);
    // console.log("marketplace:", marketplace);

    // Return result
    return {
      key: `listing_${assetId}`,
      value: {
        seller,
        nftPrice,
        marketplace,
      },
    };
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
      try {
        const account = algosdk.mnemonicToSecretKey(mnemonic);
        const derivedAddr =
          typeof account.addr === "string"
            ? account.addr
            : account.addr?.publicKey
            ? algosdk.encodeAddress(account.addr.publicKey)
            : String(account.addr || "");
        if (derivedAddr !== walletAddress) {
          // throw new Error(
          //   "Mnemonic does not match the provided wallet address"
          // );
        }
      } catch (error) {
        throw new Error("Invalid mnemonic");
      }

      this.#mnemonicAccount = account;
      this.account = walletAddress;
      this.#walletConnected = true;
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

    // Handle logout process
    await this.#handleLogout();
  }

  // ==========================================
  // SDK-SPECIFIC PUBLIC METHODS (ALGOMINTX)
  // ==========================================

  /**
   * NFT Operations
   */

  async getListedNFTs() {
    const nfts = [];

    try {
      const boxUrl = `${this.#indexerUrl}/v2/applications/${
        this.#contractApplicationId
      }/boxes`;
      const boxRes = await fetch(boxUrl);

      if (boxRes.ok) {
        const boxData = await boxRes.json();
        if (boxData.boxes && boxData.boxes.length > 0) {
          for (const box of boxData.boxes) {
            let nft = {};
            let decodedBox;
            try {
              decodedBox = await this.#decodeListingBoxFromAlgod(box.name);

              nft.listing = {
                seller: decodedBox.value.seller,
                price: decodedBox.value.nftPrice,
                marketplace: decodedBox.value.marketplace,
              };
            } catch (error) {
              console.warn(`Failed to decode box for NFT ${assetId}:`, error);
            }

            if (
              nft.listing.marketplace !== this.#unitName // only show current marketplce nfts
            )
              continue;

            const assetId = decodedBox.key.replace("listing_", "");
            const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
            const assetRes = await fetch(assetUrl);
            if (!assetRes.ok) continue;

            const assetData = await assetRes.json();
            const params = assetData.asset.params;

            nft = {
              ...nft,
              ...params,
              assetId,
            };

            if (
              params.total !== 1 ||
              params.decimals !== 0 ||
              !params.clawback ||
              (params.clawback &&
                params.clawback !== this.#contractWalletAddress) // filter out NFTs that are not owned by the contract or not set to clawback
            )
              continue;

            // Handle IPFS metadata
            const metadataUrl = params.url;
            if (metadataUrl?.startsWith("ipfs://")) {
              const ipfsUrl = convertIpfsToHttp(
                metadataUrl,
                this.#pinata_ipfs_gateway_url
              );
              try {
                const metadataRes = await fetch(ipfsUrl);
                if (metadataRes.ok) {
                  const metadata = await metadataRes.json();
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
                      this.#pinata_ipfs_gateway_url
                    );
                    nft.metadata = metadata;
                  }
                }
              } catch (error) {
                console.warn(
                  `IPFS metadata fetch failed for asset ${assetId}`,
                  error
                );
              }
            }

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
                  (balance) => balance.amount > 0
                );
                if (currentHolder) {
                  nft.currentHolder = currentHolder.address;
                }
              }
            }

            nfts.push(nft);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching listed NFTS`, error.message);
      throw error;
    }

    return nfts;
  }

  async getWalletNFTs({ accountId }) {
    const nfts = [];

    try {
      if (!accountId) {
        if (!this.#walletConnected || !this.account) {
          // Maximize SDK if minimized to show login screen
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
      const assets = accountData.account.assets || [];

      for (const holding of assets) {
        // Check if the wallet actually holds this NFT (amount > 0)
        if (holding.amount === 0) continue;

        const assetId = holding["asset-id"];
        const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
        const assetRes = await fetch(assetUrl);
        if (!assetRes.ok) continue;

        const assetData = await assetRes.json();
        const params = assetData.asset.params;

        const nft = {
          ...params,
          assetId,
        };

        if (
          params.total !== 1 ||
          params.decimals !== 0 ||
          !params.clawback ||
          (params.clawback && params.clawback !== this.#contractWalletAddress) // filter out NFTs that are not owned by the contract or not set to clawback
        )
          continue;

        // Handle IPFS metadata
        const metadataUrl = params.url;
        if (metadataUrl?.startsWith("ipfs://")) {
          const ipfsUrl = convertIpfsToHttp(
            metadataUrl,
            this.#pinata_ipfs_gateway_url
          );
          try {
            const metadataRes = await fetch(ipfsUrl);
            if (metadataRes.ok) {
              const metadata = await metadataRes.json();
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
                  this.#pinata_ipfs_gateway_url
                );
                nft.metadata = metadata;
              }
            }
          } catch (error) {
            console.warn(
              `IPFS metadata fetch failed for asset ${assetId}`,
              error
            );
          }
        }

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
              (balance) => balance.amount > 0
            );
            if (currentHolder) {
              nft.currentHolder = currentHolder.address;
            }
          }
        }

        nfts.push(nft);
      }
    } catch (error) {
      console.error("Error fetching NFTs by wallet:", error.message);
      throw error;
    }

    return nfts;
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

      // Fetch box data for this NFT
      const boxUrl = `${this.#indexerUrl}/v2/applications/${
        this.#contractApplicationId
      }/boxes`;
      const boxRes = await fetch(boxUrl);

      if (boxRes.ok) {
        const boxData = await boxRes.json();
        if (boxData.boxes && boxData.boxes.length > 0) {
          // Find the box that matches our asset ID
          for (const box of boxData.boxes) {
            try {
              const decodedBox = await this.#decodeListingBoxFromAlgod(
                box.name
              );
              if (decodedBox.key === `listing_${assetId}`) {
                nft.listing = {
                  seller: decodedBox.value.seller,
                  price: decodedBox.value.nftPrice,
                  marketplace: decodedBox.value.marketplace,
                };
                break;
              }
            } catch (error) {
              console.warn(`Failed to decode box for NFT ${assetId}:`, error);
            }
          }
        }
      }

      // Handle IPFS metadata
      const metadataUrl = params.url;
      if (metadataUrl?.startsWith("ipfs://")) {
        const ipfsUrl = convertIpfsToHttp(
          metadataUrl,
          this.#pinata_ipfs_gateway_url
        );
        try {
          const metadataRes = await fetch(ipfsUrl);
          if (!metadataRes.ok) {
            throw new Error(
              `Failed to fetch IPFS metadata: ${metadataRes.status}`
            );
          }
          const metadata = await metadataRes.json();
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
              this.#pinata_ipfs_gateway_url
            );
            nft.metadata = metadata;
          }
        } catch (error) {
          console.warn(
            `IPFS metadata fetch failed for asset ${assetId}`,
            error
          );
        }
      }

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
            (balance) => balance.amount > 0
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
          `Failed to fetch asset config transaction: ${txRes.status}`
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

  async listNFT({ assetId, nftPrice }) {
    try {
      this.processing = true;
      this.#uiManager.showLoadingOverlay("Processing...");
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      if (!this.#walletConnected || !this.account) {
        // Maximize SDK if minimized to show login screen
        if (this.isMinimized) {
          this.maximizeSDK(true);
        }
        throw new Error("Wallet is not connected");
      }
      if (!assetId || !nftPrice) {
        throw new Error("Asset ID and price are required");
      }

      if (isNaN(assetId) || isNaN(nftPrice)) {
        throw new Error("Asset ID and price must be a number.");
      }

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const oneMicroAlgo = { ...suggestedParams, flatFee: true, fee: 1000 }; // 0.001 Algo
      const twoMicroAlgo = { ...suggestedParams, flatFee: true, fee: 2000 }; // 0.002 Algo
      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo
      const fourMicroAlgo = { ...suggestedParams, flatFee: true, fee: 4000 }; // 0.004 Algo
      const fiveMicroAlgo = { ...suggestedParams, flatFee: true, fee: 5000 }; // 0.005 Algo

      // Get the wallet connector
      const walletConnector = this.#walletConnectors[this.#selectedWalletType];

      // Get the listing box reference
      const boxRef = getListingBoxReference(
        this.#contractApplicationId,
        assetId
      );

      const fundContractTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#contractWalletAddress,
          amount: 100_000,
          suggestedParams,
        });

      const transferNFTToContractAndAddListingMethod = encoder.methods.find(
        (m) => m.name === "transferNFTToContractAndAddListing"
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
              algosToMicroAlgos(nftPrice).toString()
            ),
            algosdk.ABIType.from("string").encode(this.#unitName),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: fourMicroAlgo,
        });

      // opt-in, asset transfer is done inside contract
      const listingGroup = [
        fundContractTxn,
        transferNFTToContractAndAddListingTxn,
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

      const signedListing = await walletConnector.signTransaction([
        listingGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: listingTxId } = await this.#algodClient
        .sendRawTransaction(signedListing)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, listingTxId, 10);

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

      if (!this.#walletConnected || !this.account) {
        // Maximize SDK if minimized to show login screen
        if (this.isMinimized) {
          this.maximizeSDK(true);
        }
        throw new Error("Wallet is not connected.");
      }

      if (!assetId) {
        throw new Error("Asset ID is required.");
      }

      if (isNaN(assetId)) {
        throw new Error("Asset ID must be a number.");
      }

      const nftData = await this.getNFTMetadata({ assetId });

      if (nftData.listing.marketplace !== this.#unitName) {
        throw new Error("Cannot un-list nft from other marketplace.");
      }

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const oneMicroAlgo = { ...suggestedParams, flatFee: true, fee: 1000 }; // 0.001 Algo
      const twoMicroAlgo = { ...suggestedParams, flatFee: true, fee: 2000 }; // 0.002 Algo
      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo
      const fourMicroAlgo = { ...suggestedParams, flatFee: true, fee: 4000 }; // 0.004 Algo
      const fiveMicroAlgo = { ...suggestedParams, flatFee: true, fee: 5000 }; // 0.005 Algo

      // Get the wallet connector
      const walletConnector = this.#walletConnectors[this.#selectedWalletType];

      // Get the listing box reference
      const boxRef = getListingBoxReference(
        this.#contractApplicationId,
        assetId
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
        (m) => m.name === "transferNFTToSellerAndRemoveListing"
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

      const signedUnlisting = await walletConnector.signTransaction([
        unlistingGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: unlistingTxId } = await this.#algodClient
        .sendRawTransaction(signedUnlisting)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, unlistingTxId, 10);

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

      if (!this.#walletConnected || !this.account) {
        // Maximize SDK if minimized to show login screen
        if (this.isMinimized) {
          this.maximizeSDK(true);
        }
        throw new Error("Wallet is not connected.");
      }

      if (!assetId) {
        throw new Error("Asset ID is required.");
      }

      if (isNaN(assetId)) {
        throw new Error("Asset ID must be a number.");
      }

      // Get the listing box reference
      const nftData = await this.getNFTMetadata({ assetId });

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

      const oneMicroAlgo = { ...suggestedParams, flatFee: true, fee: 1000 }; // 0.001 Algo
      const twoMicroAlgo = { ...suggestedParams, flatFee: true, fee: 2000 }; // 0.002 Algo
      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo
      const fourMicroAlgo = { ...suggestedParams, flatFee: true, fee: 4000 }; // 0.004 Algo
      const fiveMicroAlgo = { ...suggestedParams, flatFee: true, fee: 5000 }; // 0.005 Algo

      // Get the wallet connector
      const walletConnector = this.#walletConnectors[this.#selectedWalletType];

      // Get the listing box reference
      const boxRef = getListingBoxReference(
        this.#contractApplicationId,
        assetId
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
        (m) => m.name === "transferNFTToReceiverAndRemoveListing"
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

      const signedBuying = await walletConnector.signTransaction([
        buyingGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: buyingTxId } = await this.#algodClient
        .sendRawTransaction(signedBuying)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, buyingTxId, 10);

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
