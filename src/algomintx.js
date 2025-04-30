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
        }
      });

      // Copy to clipboard for wallet address bar
      walletAddressBar.addEventListener("click", () => {
        if (this.account) {
          navigator.clipboard.writeText(this.account.replace("Wallet: ", ""));
        }
      });
    } catch (error) {}
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
}

export default AlgoMintX;
