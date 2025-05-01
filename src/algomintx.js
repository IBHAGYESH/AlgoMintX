import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import eventBus from "./event-bus.js";
import "./algomintx.css";

class AlgoMintX {
  constructor({
    pinata_ipfs_server_key,
    pinata_ipfs_gateway_url,
    env,
    namespace,
  }) {
    /**
     * sdk validation
     */

    // pinata config
    this.pinata_api_key = pinata_ipfs_server_key;
    this.ipfs_gateway = pinata_ipfs_gateway_url;

    if (!this.pinata_api_key || !this.ipfs_gateway) {
      this.sdkValidationFailed("Missing pinata ipfs config!");
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
      "",
      this.network === "mainnet"
        ? "https://mainnet-api.algonode.cloud"
        : "https://testnet-api.algonode.cloud",
      ""
    );

    /**
     * sdk variables
     */

    this.indexerUrl =
      this.network === "mainnet"
        ? "https://mainnet-idx.algonode.network"
        : "https://testnet-idx.algonode.network";
    this.unitName = `AMX${this.namespace}`;
    this.metadataMark = "algomintx";
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
      this.showToast(error.message, "error");
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
  clearMessage() {
    if (this.messageElement) this.messageElement.innerText = "";
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
}

export default AlgoMintX;
