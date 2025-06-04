import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import eventBus from "./event-bus.js";
import "./algomintx.css";

const appSpecJson = require("./AlgoMintXClient/AlgoMintX.arc32.json");
const encoder = new algosdk.ABIContract({
  name: appSpecJson.contract.name,
  methods: appSpecJson.contract.methods,
});

class AlgoMintX {
  #walletConnectors;
  #walletConnected;
  #connectionInfo;
  #connectionInProgress;
  #supportedWallets;
  #selectedWalletType;
  #algodClient;
  #contractApplicationId;
  #contractWalletAddress;
  #indexerUrl;
  #unitName;
  #metadataMark;
  #messageElement;
  #pinata_ipfs_server_key;
  #pinata_ipfs_gateway_url;
  #namespace;
  #revenueWalletAddress;
  #listingFee;
  #buyingFee;
  #unListingFee;
  #disableToast;
  #minimizeUILocation;
  #logo;
  #supportedNetworks;
  #theme;

  #validateRequired(value, paramName) {
    if (value === undefined || value === null) {
      throw new Error(`${paramName} is required`);
    }
    return value;
  }

  #validateString(value, paramName) {
    this.#validateRequired(value, paramName);
    if (typeof value !== "string") {
      throw new Error(`${paramName} must be a string`);
    }
    if (value.trim().length === 0) {
      throw new Error(`${paramName} cannot be empty`);
    }
    return value;
  }

  #validateEnum(value, paramName, validValues) {
    this.#validateString(value, paramName);
    if (!validValues.includes(value)) {
      throw new Error(`${paramName} must be one of: ${validValues.join(", ")}`);
    }
    return value;
  }

  #validateNumber(value, paramName, options = {}) {
    if (value === undefined || value === null) {
      return options.default ?? 0;
    }
    if (typeof value !== "number") {
      throw new Error(`${paramName} must be a number`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`${paramName} must be a finite number`);
    }
    if (options.min !== undefined && value < options.min) {
      throw new Error(
        `${paramName} must be greater than or equal to ${options.min}`
      );
    }
    if (options.max !== undefined && value > options.max) {
      throw new Error(
        `${paramName} must be less than or equal to ${options.max}`
      );
    }
    return value;
  }

  #validateBoolean(value, paramName, defaultValue = false) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== "boolean") {
      throw new Error(`${paramName} must be a boolean`);
    }
    return value;
  }

  #validateUrl(value, paramName) {
    this.#validateString(value, paramName);
    try {
      new URL(value);
      return value;
    } catch (e) {
      throw new Error(`${paramName} must be a valid URL`);
    }
  }

  #validatePinataServerKey(key) {
    return this.#validateString(key, "Pinata IPFS server key");
  }

  #validatePinataGatewayUrl(url) {
    const validatedUrl = this.#validateString(url, "Pinata IPFS gateway URL");
    try {
      new URL(`https://${validatedUrl}`);
      return validatedUrl;
    } catch (e) {
      throw new Error("Pinata IPFS gateway URL must be a valid URL");
    }
  }

  #validateEnvironment(env) {
    return this.#validateEnum(env, "Environment", ["testnet", "mainnet"]);
  }

  #validateNamespace(namespace) {
    const validatedNamespace = this.#validateString(namespace, "Namespace");
    if (validatedNamespace.length !== 5) {
      throw new Error("Namespace must be exactly 5 characters long");
    }
    if (!/^[A-Z]+$/.test(validatedNamespace)) {
      throw new Error("Namespace must contain only uppercase letters");
    }
    return validatedNamespace;
  }

  #validateRevenueWalletAddress(address) {
    const validatedAddress = this.#validateString(
      address,
      "Revenue wallet address"
    );
    if (validatedAddress.length !== 58) {
      throw new Error("Revenue wallet address must be 58 characters long");
    }
    if (!/^[A-Z2-7]{58}$/.test(validatedAddress)) {
      throw new Error("Invalid Algorand wallet address format");
    }
    return validatedAddress;
  }

  #validateFee(fee, paramName) {
    return this.#validateNumber(fee, paramName, { min: 0 });
  }

  #validateDisableToast(disableToast) {
    return this.#validateBoolean(disableToast, "disableToast", false);
  }

  #validateMinimizeUILocation(location) {
    return (
      this.#validateEnum(location, "minimizeUILocation", ["left", "right"]) ||
      "right"
    );
  }

  #validateLogo(logo) {
    if (logo === undefined || logo === null) {
      return null;
    }

    const validatedLogo = this.#validateString(logo, "Logo");

    // Check if it's a URL
    if (
      validatedLogo.startsWith("http://") ||
      validatedLogo.startsWith("https://")
    ) {
      return this.#validateUrl(validatedLogo, "Logo");
    }

    // Check if it's a local file path
    if (
      validatedLogo.startsWith("./") ||
      validatedLogo.startsWith("../") ||
      validatedLogo.startsWith("/")
    ) {
      if (
        !/^[./\\a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(
          validatedLogo
        )
      ) {
        throw new Error(
          "Invalid logo file path. Must be a valid image file path"
        );
      }
      return validatedLogo;
    }

    throw new Error(
      "Logo must be either a valid URL or a valid local file path"
    );
  }

  constructor({
    pinata_ipfs_server_key,
    pinata_ipfs_gateway_url,
    env,
    namespace,
    revenueWalletAddress,
    listingFee = 0,
    buyingFee = 0,
    unListingFee = 0,
    disableToast = false,
    minimizeUILocation = "right",
    logo = null,
  }) {
    try {
      // Validate all parameters
      this.#pinata_ipfs_server_key = this.#validatePinataServerKey(
        pinata_ipfs_server_key
      );
      this.#pinata_ipfs_gateway_url = this.#validatePinataGatewayUrl(
        pinata_ipfs_gateway_url
      );
      this.network = this.#validateEnvironment(env);
      this.#namespace = this.#validateNamespace(namespace);
      this.#revenueWalletAddress =
        this.#validateRevenueWalletAddress(revenueWalletAddress);
      this.#listingFee = this.#validateFee(listingFee, "Listing fee");
      this.#buyingFee = this.#validateFee(buyingFee, "Buying fee");
      this.#unListingFee = this.#validateFee(unListingFee, "unListingFee fee");
      this.#disableToast = this.#validateDisableToast(disableToast);
      this.#minimizeUILocation =
        this.#validateMinimizeUILocation(minimizeUILocation);
      this.#logo = this.#validateLogo(logo);

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
        this.network === "mainnet" ? 740618565 : 740618565;
      this.#contractWalletAddress =
        this.network === "mainnet"
          ? "WT4FYX3TGHMB65WUBQFZEXQPAIDQ4R7FILXN3UP62KKAIWXTJKW6XONOSI"
          : "WT4FYX3TGHMB65WUBQFZEXQPAIDQ4R7FILXN3UP62KKAIWXTJKW6XONOSI";

      // Initialize SDK variables
      this.#indexerUrl =
        this.network === "mainnet"
          ? "https://mainnet-idx.algonode.cloud"
          : "https://testnet-idx.algonode.cloud";
      this.#unitName = `AMX${this.#namespace}`;
      this.#metadataMark = "AlgoMintX";
      this.events = eventBus;

      // Initialize UI state
      this.#messageElement = null;
      this.processing = false;

      // Load saved UI state
      const savedState = localStorage.getItem("amx");
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          this.isMinimized = parsedState.minimized || false;
          this.theme = parsedState.theme || this.#getSystemTheme();
        } catch (e) {
          this.isMinimized = false;
          this.theme = this.#getSystemTheme();
        }
      } else {
        this.isMinimized = false;
        this.theme = this.#getSystemTheme();
      }

      // Save initial state and initialize UI
      this.#saveUIState();
      this.#initUI();
    } catch (error) {
      this.#sdkValidationFailed(error.message);
    }
  }

  #getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  #setupThemeListener() {
    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only update if user hasn't manually set a theme
        const savedState = localStorage.getItem("amx");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            if (!parsedState.theme) {
              // If theme wasn't manually set
              this.theme = e.matches ? "dark" : "light";
              this.#saveUIState();
              this.#applyTheme();
            }
          } catch (e) {
            console.error("Failed to parse saved state:", e);
          }
        }
      });
  }

  #applyTheme() {
    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (this.theme === "dark") {
      container.classList.add("dark-theme");
      minimizedBtn.classList.add("dark-theme");
    } else {
      container.classList.remove("dark-theme");
      minimizedBtn.classList.remove("dark-theme");
    }
  }

  #toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    this.#saveUIState();
    this.#applyTheme();
    eventBus.emit("theme:changed", { theme: this.theme });
  }

  #saveUIState() {
    localStorage.setItem(
      "amx",
      JSON.stringify({
        minimized: this.isMinimized,
        theme: this.theme,
      })
    );
  }

  #sdkValidationFailed(message) {
    localStorage.removeItem("walletconnect");
    localStorage.removeItem("DeflyWallet.Wallet");
    localStorage.removeItem("PeraWallet.Wallet");

    alert(message);
    window.location.reload();
  }

  async #initUI() {
    try {
      // Inject the entire SDK container directly into document.body with highest z-index
      const existingSdk = document.getElementById("algomintx-sdk-container");
      if (existingSdk) existingSdk.remove(); // remove if existing to avoid duplicates

      const container = document.createElement("div");
      container.id = "algomintx-sdk-container";

      container.innerHTML = `
      <div id="sdk-header">
        <div class="header-logo">
          ${
            this.#logo
              ? `<img src="${
                  this.#logo
                }" alt="AlgoMintX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />`
              : ""
          }
          <h3 style="${
            this.#logo ? "display: none;" : "display: block;"
          }">AlgoMintX</h3>
        </div>
        <div>
          <button id="themeToggleBtn" title="Toggle Theme">🌓</button>
          <button id="logoutBtn" title="Logout">⇥</button>
          <button id="sdkMinimizeBtn" title="Minimize">&#x2013;</button>
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
        <button id="#mintNFTBtn" title="Mint NFT">Mint NFT</button>
        <button id="resetNFTBtn">Mint another NFT</button>
        <div id="sdkMessages" title="Click to copy"></div>
      </div>

      <div id="walletAddressBar" title="Click to copy connected wallet address"></div>
      
      <div id="sdkFooter">
        <span>AlgoMintX crafted with ❤️ by <a href="https://ibhagyesh.site/" target="_blank" rel="noopener noreferrer">ibhagyesh</a></span>
      </div>

      <div id="algomintx-loading-overlay">
        <div id="algomintx-loader"></div>
        <div id="algomintx-processing-message"></div>
      </div>
    `;

      document.body.appendChild(container);

      // Create minimized circle button but hide initially
      const minimizedBtn = document.createElement("button");
      minimizedBtn.id = "sdkMinimizedBtn";
      minimizedBtn.innerHTML = this.#logo
        ? `<img src="${
            this.#logo
          }" alt="AMX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none;">AMX</span>`
        : "AMX";

      document.body.appendChild(minimizedBtn);

      // Apply initial theme
      this.#applyTheme();

      // Setup theme listener
      this.#setupThemeListener();

      // Choose wallet button
      document
        .getElementById("walletChoiceScreen")
        .addEventListener("click", async (event) => {
          if (event.target.classList.contains("walletBtn")) {
            const walletType = event.target.getAttribute("data-wallet");
            await this.#startWalletConnection(walletType);
          }
        });

      // Mint NFT button
      document
        .getElementById("#mintNFTBtn")
        .addEventListener("click", async () => {
          await this.#validateNFTDetails();
        });

      // Reset NFT button
      document
        .getElementById("resetNFTBtn")
        .addEventListener("click", () => this.#resetNFTDetails());

      // Minimize button
      document
        .getElementById("sdkMinimizeBtn")
        .addEventListener("click", () => this.minimizeSDK());

      // Logout button
      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => this.#handleLogout());

      minimizedBtn.addEventListener("click", () => this.maximizeSDK());

      // Copy to clipboard for sdkMessages (tx id)
      this.#messageElement = document.getElementById("sdkMessages");
      this.#messageElement.addEventListener("click", () => {
        if (
          this.#messageElement.innerText &&
          this.#messageElement.innerText !== "Minting NFT... Please wait."
        ) {
          const txId = this.#messageElement.innerText.replace(
            "NFT Minted! Transaction ID: ",
            ""
          );

          // Copy to clipboard
          navigator.clipboard.writeText(txId);
          this.#showToast("Transaction ID copied to clipboard", "success");

          // Open transaction in new tab
          const network = this.network === "mainnet" ? "mainnet" : "testnet";
          const txUrl = `https://lora.algokit.io/${network}/transaction/${txId}`;
          window.open(txUrl, "_blank");
        }
      });

      // Copy to clipboard for wallet address bar
      walletAddressBar.addEventListener("click", () => {
        if (this.account) {
          navigator.clipboard.writeText(this.account);
          this.#showToast("Wallet address copied to clipboard", "success");
        }
      });

      // Add theme toggle button listener
      document
        .getElementById("themeToggleBtn")
        .addEventListener("click", () => {
          this.#toggleTheme();
        });

      // Check if already connected (from localStorage)
      await this.#loadConnectionFromStorage();
    } catch (error) {
      console.error(error, "init");
    }
  }

  #resetToLoginUI() {
    this.#walletConnected = false;
    this.account = null;
    this.#connectionInfo = null;
    this.#selectedWalletType = null;

    this.#clearMessage();
    this.#updateWalletAddressBar();

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

  async #loadConnectionFromStorage() {
    try {
      const saved = localStorage.getItem("walletconnect");
      if (saved) {
        this.#connectionInfo = JSON.parse(saved);

        this.#walletConnected = true;
        this.account = this.#connectionInfo.accounts[0];

        this.#selectedWalletType = this.#connectionInfo.peerMeta.name
          .split(" ")[0]
          .toLowerCase();

        const walletConnector =
          this.#walletConnectors[this.#selectedWalletType];

        const accounts = await walletConnector.reconnectSession();

        if (!accounts || accounts.length === 0) {
          throw new Error("Reconnection failed");
        }

        this.#showToast(
          `Restored connection to ${this.#connectionInfo.peerMeta.name}: ${
            this.account
          }`,
          "success"
        );

        this.#showSDKUI();
        eventBus.emit("wallet:connection:connected", { address: this.account });
      } else {
        this.#resetToLoginUI();
      }
    } catch (error) {
      // console.error("Failed to restore connection", error);
      this.#showToast("Failed to restore connection!", "error");
      eventBus.emit("wallet:connection:failed", {
        error: "Failed to restore connection",
      });
      this.#resetToLoginUI();
    }
  }

  minimizeSDK(initialLoad) {
    if (!initialLoad && this.isMinimized) return;

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    // Set position based on minimizeUILocation
    minimizedBtn.style.right =
      this.#minimizeUILocation === "right" ? "20px" : "auto";
    minimizedBtn.style.left =
      this.#minimizeUILocation === "left" ? "20px" : "auto";

    // Start minimizing animation
    container.classList.add("minimizing");
    minimizedBtn.style.display = "block";

    // Wait for the minimizing animation to complete
    setTimeout(() => {
      container.style.display = "none";
      container.classList.remove("minimizing");

      // Start showing minimized button animation
      requestAnimationFrame(() => {
        minimizedBtn.classList.add("showing");
        // Add processing class if processing is active
        if (this.processing) {
          minimizedBtn.classList.add("processing");
        }
      });
    }, 300);

    this.isMinimized = true;
    this.#saveUIState();
    eventBus.emit("window:size:minimized", { minimized: this.isMinimized });
  }

  maximizeSDK(initialLoad) {
    if (!initialLoad && !this.isMinimized) return;

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    // Start hiding minimized button animation
    minimizedBtn.classList.remove("showing");
    minimizedBtn.classList.add("hiding");

    // Wait for the hiding animation to complete
    setTimeout(() => {
      minimizedBtn.style.display = "none";
      minimizedBtn.classList.remove("hiding");
      minimizedBtn.classList.remove("processing"); // Remove processing class

      // Show and animate the main container
      container.style.display = "flex";
      container.classList.add("maximizing");

      // Force a reflow
      container.offsetHeight;

      requestAnimationFrame(() => {
        container.classList.remove("maximizing");
        // Show loading overlay if processing
        if (this.processing) {
          this.#showLoadingOverlay();
        }
      });
    }, 300);

    this.isMinimized = false;
    this.#saveUIState();
    eventBus.emit("window:size:minimized", { minimized: this.isMinimized });
  }

  async #startWalletConnection(walletType) {
    if (this.#connectionInProgress) {
      this.#showToast("A wallet connection is already in progress.", "warning");
      return;
    }

    if (!this.#supportedWallets.includes(walletType)) {
      this.#showToast("Unsupported wallet selected.", "error");
      return;
    }

    this.#clearMessage();
    this.#selectedWalletType = walletType;

    document.getElementById("algomintx-sdk-container").style.display = "none";

    const walletConnector = this.#walletConnectors[walletType];

    this.#connectionInProgress = true;

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

      this.#walletConnected = true;
      this.account = accounts[0];
      this.#connectionInfo = { address: this.account, walletType };

      this.#showSDKUI();
      this.#showToast(
        `Connected to ${walletType} wallet: ${this.account}`,
        "success"
      );
      this.#updateWalletAddressBar();
      eventBus.emit("wallet:connection:connected", { address: this.account });
      this.#connectionInProgress = false;
    } catch (error) {
      if (error.message === "Wallet connection timed out.") {
        await walletConnector.disconnect();
        if (walletConnector.killSession) {
          await walletConnector.killSession(); // Extra hard-kill if supported
        }
        window.location.reload();
      } else {
        // console.error("Failed to connect wallet!", error);
        this.#connectionInProgress = false;
        this.#showToast("Failed to connect wallet!", "error");
        eventBus.emit("wallet:connection:failed", {
          error: "Failed to connect wallet!",
        });
        this.#resetToLoginUI();
      }
    }
  }

  #showSDKUI() {
    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdk-header").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "contents";
    document.getElementById("walletChoiceScreen").style.display = "none";
    document.getElementById("sdkUI").style.display = "flex";
    this.#updateWalletAddressBar();

    if (this.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  #updateWalletAddressBar() {
    const bar = document.getElementById("walletAddressBar");
    if (!bar) return;

    if (this.#walletConnected && this.account) {
      bar.innerText = this.account;
      bar.style.display = "block";
    } else {
      bar.innerText = "";
      bar.style.display = "none";
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
        // console.error("Failed to disconnect wallet session:", error);
      }

      eventBus.emit("wallet:connection:disconnected", {
        address: this.account,
      });
      this.#showToast("Logged out successfully.", "success");
      this.#resetToLoginUI();
    }
  }

  #showToast(message, type = "info") {
    // Emit toast event regardless of disableToast setting
    eventBus.emit("toast:show", { message, type });

    // Only show toast UI if not disabled
    if (this.#disableToast) return;

    // Remove existing toast if any
    const existingToast = document.getElementById("algomintx-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.id = "algomintx-toast";
    toast.innerText = message;

    // Assign toast type class dynamically
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

  #clearMessage() {
    if (this.#messageElement) {
      this.#messageElement.innerText = "";
      this.#messageElement.style.display = "none";
    }
  }

  #resetNFTDetails() {
    if (this.processing) {
      return;
    }
    document.getElementById("nftName").value = "";
    document.getElementById("nftDescription").value = "";
    document.getElementById("nftFile").value = "";
    document.getElementById("#mintNFTBtn").style.display = "block";
    document.getElementById("resetNFTBtn").style.display = "none";
    this.#clearMessage();
  }

  async #validateNFTDetails() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.#showLoadingOverlay();
    eventBus.emit("sdk:processing:started", { processing: this.processing });

    const name = document.getElementById("nftName").value.trim();
    const description = document.getElementById("nftDescription").value.trim();
    const fileInput = document.getElementById("nftFile");

    if (!name) {
      this.#showToast("Please enter NFT name.", "error");
      return;
    }

    if (!description) {
      this.#showToast("Please enter NFT description.", "error");
      return;
    }

    if (!fileInput.files.length) {
      this.#showToast("Please upload a file.", "error");
      return;
    }

    this.#messageElement.style.display = "block";
    this.#messageElement.style.cursor = "default";
    this.#messageElement.innerText = "Minting NFT... Please wait.";
    document.getElementById("#mintNFTBtn").disabled = true;
    document.getElementById("logoutBtn").disabled = true;

    try {
      const { transactionId, assetId } = await this.#mintNFT({
        name,
        description,
        file: fileInput.files[0],
      });

      this.#messageElement.style.cursor = "pointer";
      this.#messageElement.innerText = `NFT Minted! Transaction ID: ${transactionId}`;

      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      this.#showToast(
        `NFT Minted Successfully! TxID: ${transactionId}`,
        "success"
      );

      document.getElementById("#mintNFTBtn").style.display = "none";
      document.getElementById("resetNFTBtn").style.display = "block";

      document.getElementById("#mintNFTBtn").disabled = false;
      document.getElementById("logoutBtn").disabled = false;

      eventBus.emit("nft:mint:success", {
        transactionId,
        assetId,
        address: this.account,
      });
    } catch (error) {
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      document.getElementById("nftName").value = "";
      document.getElementById("nftDescription").value = "";
      document.getElementById("nftFile").value = "";

      document.getElementById("#mintNFTBtn").disabled = false;
      document.getElementById("logoutBtn").disabled = false;

      this.#clearMessage();

      this.#showToast("Failed to mint NFT!", "error");

      eventBus.emit("nft:mint:failed", { error: "Failed to mint NFT!" });
    }
  }

  async #sha256Hash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    return new Uint8Array(hashBuffer);
  }

  async #getImageIntegrityBase64(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64Hash = btoa(String.fromCharCode(...hashArray));
    return `sha256-${base64Hash}`;
  }

  async #mintNFT({ name, description, file }) {
    if (!this.#walletConnected || !this.account) {
      throw new Error("Wallet is not connected.");
    }

    // 1. Upload file to IPFS (Pinata) using your API key
    const ipfsHash = await this.#uploadFileToIPFS(file);

    // 2. Create metadata JSON with IPFS link, name, description
    const integrity = await this.#getImageIntegrityBase64(file);

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
    const metadataStr = JSON.stringify(metadata);
    const metadataHash = await this.#sha256Hash(metadataStr);

    // 4. Upload metadata JSON to IPFS to get the CID for assetURL
    const metadataIpfsHash = await this.#uploadJSONToIPFS(metadata);

    // 4. Create Algorand asset (NFT) pointing to metadata URL
    const { txid, assetId } = await this.#createAlgorandAsset(
      metadataIpfsHash,
      name,
      metadataHash
    );

    return { transactionId: txid, assetId };
  }

  async #uploadFileToIPFS(file) {
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

    const data = new FormData();
    data.append("file", file);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#pinata_ipfs_server_key}`,
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

  async #uploadJSONToIPFS(jsonData) {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#pinata_ipfs_server_key}`,
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

  async #createAlgorandAsset(metadataIpfsHash, assetName, metadataHashBuffer) {
    const params = await this.#algodClient.getTransactionParams().do();

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

    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      sender: this.account,
      total: 1,
      decimals: 0,
      defaultFrozen: false,
      unitName: this.#unitName,
      assetName: safeAssetName,
      assetURL: metadataURL,
      assetMetadataHash: metadataHashBuffer,
      suggestedParams: params,
      clawback: this.#contractWalletAddress,
    });

    const walletConnector = this.#walletConnectors[this.#selectedWalletType];

    // Ask user to sign the transaction

    // If you are NOT setting custom signers, you can pass a flat array:
    // const signedTxn = await walletConnector.signTransaction([{ txn: txnToSign }]);

    // but if you use signers field, you MUST group it like:
    const signedTxn = await walletConnector.signTransaction([
      [
        {
          txn: txn,
          signers: [this.account],
        },
      ],
    ]);

    // Submit the signed transaction
    const { txid } = await this.#algodClient
      .sendRawTransaction(signedTxn[0])
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

    const boxValueResponse = await this.#algodClient
      .getApplicationBoxByName(this.#contractApplicationId, boxNameBytes)
      .do();

    // The value is already a Uint8Array in the browser environment
    const raw = boxValueResponse.value;

    // Use DataView to decode the values
    const view = new DataView(raw.buffer);

    // Read struct type ID (uint16 BE)
    const structTypeId = view.getUint16(0, false);

    // Read seller length (uint16 BE)
    const sellerLen = view.getUint16(4, false); // Changed back to offset 4

    // Read seller string
    const sellerStart = 6; // Changed offset to 6
    const sellerEnd = sellerStart + sellerLen;
    const sellerBytes = raw.slice(sellerStart, sellerEnd);

    const seller = new TextDecoder().decode(sellerBytes);

    // --- Read price length (uint16 BE)
    const priceLen = view.getUint16(sellerEnd, false);

    // --- Read price bytes
    const priceStart = sellerEnd + 2;
    const priceEnd = priceStart + priceLen;

    if (raw.length < priceEnd) {
      throw new Error("Box value too short for price string");
    }

    const priceBytes = raw.slice(priceStart, priceEnd);

    // ✅ Decode price as a UTF-8 string (not number)
    const nftPrice = this.#microAlgosToAlgos(
      Number(new TextDecoder().decode(priceBytes))
    );

    // Return result
    return {
      key: `listing_${assetId}`,
      value: {
        seller,
        nftPrice, // Keep the price as a string
      },
    };
  }

  async getListedNFTs() {
    const nfts = [];

    try {
      const url = `${this.#indexerUrl}/v2/accounts/${
        this.#contractWalletAddress
      }`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Indexer fetch error: ${res.status}`);

      const accountData = await res.json();
      const assets = accountData.account.assets || [];

      for (const holding of assets) {
        // Check if the wallet actually holds this NFT (amount > 0)
        if (holding.amount === 0) continue;

        // You only care about NFTs: total supply = 1 and decimals = 0
        const assetId = holding["asset-id"];
        const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
        const assetRes = await fetch(assetUrl);
        if (!assetRes.ok) continue;

        const assetData = await assetRes.json();
        const params = assetData.asset.params;

        if (
          params.total !== 1 ||
          params.decimals !== 0 ||
          params["unit-name"] !== this.#unitName // only show current marketplce nfts
        )
          continue;

        const nft = {
          assetId,
          name: params.name,
          unitName: params["unit-name"],
          url: params.url,
        };

        // Handle IPFS metadata
        if (params.url?.startsWith("ipfs://")) {
          const ipfsHash = params.url.replace("ipfs://", "");
          try {
            const metadataRes = await fetch(
              `https://${this.#pinata_ipfs_gateway_url}/ipfs/${ipfsHash}`
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
                metadata.minted_by === this.#metadataMark
              ) {
                metadata.image = this.#convertIpfsToHttp(metadata.image);
                nft.metadata = metadata;

                // Fetch box data for this NFT
                try {
                  const boxRef = this.#getListingBoxReference(
                    this.#contractApplicationId,
                    assetId
                  );
                  const boxUrl = `${this.#indexerUrl}/v2/applications/${
                    this.#contractApplicationId
                  }/boxes?name=${Buffer.from(boxRef.name).toString("base64")}`;
                  const boxRes = await fetch(boxUrl);

                  if (boxRes.ok) {
                    const boxData = await boxRes.json();
                    if (boxData.boxes && boxData.boxes.length > 0) {
                      // Find the box that matches our asset ID
                      for (const box of boxData.boxes) {
                        try {
                          const decodedBox =
                            await this.#decodeListingBoxFromAlgod(box.name);
                          if (decodedBox.key === `listing_${assetId}`) {
                            nft.listing = {
                              seller: decodedBox.value.seller,
                              price: decodedBox.value.nftPrice,
                            };
                            break; // Found and processed the matching box
                          }
                        } catch (decodeError) {
                          console.warn(
                            `Failed to decode box for NFT ${assetId}:`,
                            decodeError
                          );
                        }
                      }
                    }
                  }
                } catch (boxError) {
                  console.warn(
                    `Failed to fetch box data for NFT ${assetId}:`,
                    boxError
                  );
                }

                nfts.push(nft);
              }
            }
          } catch (err) {
            console.warn(
              `IPFS metadata fetch failed for asset ${assetId}`,
              err
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching NFTs by wallet:", error.message);
      throw error;
    }

    return nfts;
  }

  async getWalletNFTs() {
    const nfts = [];

    try {
      if (!this.#walletConnected || !this.account) {
        // Maximize SDK if minimized to show login screen
        if (this.isMinimized) {
          this.maximizeSDK(true);
        }
        throw new Error("Wallet is not connected");
      }

      const url = `${this.#indexerUrl}/v2/accounts/${this.account}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Indexer fetch error: ${res.status}`);

      const accountData = await res.json();
      const assets = accountData.account.assets || [];

      for (const holding of assets) {
        // Check if the wallet actually holds this NFT (amount > 0)
        if (holding.amount === 0) continue;

        // You only care about NFTs: total supply = 1 and decimals = 0
        const assetId = holding["asset-id"];
        const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
        const assetRes = await fetch(assetUrl);
        if (!assetRes.ok) continue;

        const assetData = await assetRes.json();
        const params = assetData.asset.params;

        if (
          params.total !== 1 ||
          params.decimals !== 0 ||
          (params.clawback && params.clawback !== this.#contractWalletAddress) // filter out NFTs that are not owned by the contract or not set to clawback
        )
          continue;

        const nft = {
          assetId,
          name: params.name,
          unitName: params["unit-name"],
          url: params.url,
        };

        // Handle IPFS metadata
        if (params.url?.startsWith("ipfs://")) {
          const ipfsHash = params.url.replace("ipfs://", "");
          try {
            const metadataRes = await fetch(
              `https://${this.#pinata_ipfs_gateway_url}/ipfs/${ipfsHash}`
            );
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
                metadata.image = this.#convertIpfsToHttp(metadata.image);
                nft.metadata = metadata;
                nfts.push(nft);
              }
            }
          } catch (err) {
            console.warn(
              `IPFS metadata fetch failed for asset ${assetId}`,
              err
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching NFTs by wallet:", error.message);
      throw error;
    }

    return nfts;
  }

  async getNFTMetadata({ assetId }) {
    try {
      // Initialize metadata object
      const metadata = {
        assetId,
        transactionId: null,
        isListed: false,
        listing: null,
      };

      // Step 1: Get asset config transaction (mint)
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
      metadata.transactionId = txData.transactions?.[0]?.id;

      // Step 2: Get asset metadata from indexer
      const indexerUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
      const response = await fetch(indexerUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch asset data: ${response.status}`);
      }
      const data = await response.json();
      const params = data.asset.params;

      // Add asset parameters to metadata
      Object.assign(metadata, {
        ...params,
        assetId: data.asset.index,
      });

      // Step 3: Check if NFT is listed by fetching box data
      try {
        const boxRef = this.#getListingBoxReference(
          this.#contractApplicationId,
          assetId
        );
        const boxUrl = `${this.#indexerUrl}/v2/applications/${
          this.#contractApplicationId
        }/boxes?name=${Buffer.from(boxRef.name).toString("base64")}`;
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
                  metadata.listing = {
                    seller: decodedBox.value.seller,
                    price: decodedBox.value.nftPrice,
                  };
                  break;
                }
              } catch (decodeError) {
                console.warn(
                  `Failed to decode box for NFT ${assetId}:`,
                  decodeError
                );
              }
            }
          }
        }
      } catch (error) {
        // If error occurs, NFT is not listed
        console.error(`NFT ${assetId} is not listed: ${error.message}`);
      }

      // Step 4: Get IPFS metadata if available
      const metadataUrl = params.url;
      if (metadataUrl?.startsWith("ipfs://")) {
        const ipfsUrl = this.#convertIpfsToHttp(metadataUrl);
        const metaRes = await fetch(ipfsUrl);
        if (!metaRes.ok) {
          throw new Error(`Failed to fetch IPFS metadata: ${metaRes.status}`);
        }
        const ipfsMetadata = await metaRes.json();
        if (
          ipfsMetadata.decimals === 0 &&
          ipfsMetadata.image_integrity &&
          ipfsMetadata.image_mimetype &&
          ipfsMetadata.standard &&
          ipfsMetadata.image &&
          ipfsMetadata.image.startsWith("ipfs://")
        ) {
          ipfsMetadata.image = this.#convertIpfsToHttp(ipfsMetadata.image);
          Object.assign(metadata, ipfsMetadata);
        }
      }

      return metadata;
    } catch (error) {
      console.error("Failed to fetch NFT metadata:", err);
      throw error; // Re-throw to allow caller to handle the error
    }
  }

  #convertIpfsToHttp(ipfsUrl, gateway = "https://ipfs.io/ipfs/") {
    return ipfsUrl.replace("ipfs://", gateway);
  }

  #microAlgosToAlgos(microAlgos) {
    return Number(microAlgos / 1_000_000);
  }

  #algosToMicroAlgos(algos) {
    return Math.round(algos * 1_000_000);
  }

  #getListingBoxReference(appIndex, assetId) {
    const prefix = "listing_";
    const encodedAssetId = algosdk.encodeUint64(BigInt(assetId)); // Uint64 to 8-byte Buffer
    const boxName = new Uint8Array([
      ...Buffer.from(prefix), // "listing_" as bytes
      ...encodedAssetId, // 8-byte encoded assetId
    ]);

    return { appIndex, name: boxName };
  }

  #getBoxNameB64(assetId) {
    const prefix = "listing_";
    const encodedAssetId = algosdk.encodeUint64(BigInt(assetId)); // Uint64 to 8-byte Buffer
    const boxName = new Uint8Array([
      ...Buffer.from(prefix), // "listing_" as bytes
      ...encodedAssetId, // 8-byte encoded assetId
    ]);
    return Buffer.from(boxName).toString("base64");
  }

  async listNFT({ assetId, nftPrice }) {
    try {
      this.processing = true;
      this.#showLoadingOverlay();
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
      const boxRef = this.#getListingBoxReference(
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
              this.#algosToMicroAlgos(nftPrice).toString()
            ),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: fourMicroAlgo,
        });

      const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: this.account,
        receiver: this.#revenueWalletAddress,
        amount: this.#algosToMicroAlgos(this.#listingFee),
        suggestedParams,
      });

      const listingGroup = [
        fundContractTxn,
        transferNFTToContractAndAddListingTxn,
      ];

      // if listing fee is greater than 0, add revenue transaction to the listing group
      if (this.#listingFee > 0) {
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
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      // Emit event for successful listing
      eventBus.emit("nft:list:success", {
        assetId,
        price: nftPrice,
        transactionId: listingTxId,
      });

      return {
        assetId,
        price: nftPrice,
        transactionId: listingTxId,
      };
    } catch (error) {
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:list:failed", { error: "Could not list NFT!" });
      throw error;
    }
  }

  async buyNFT({ assetId }) {
    try {
      this.processing = true;
      this.#showLoadingOverlay();
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
      const boxRef = this.#getListingBoxReference(
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
            algosdk.ABIType.from("string").encode(nftData.listing.seller),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: threeMicroAlgo,
        });

      const transferNFTPriceToSellerTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: nftData.listing.seller,
          amount: this.#algosToMicroAlgos(nftData.listing.price),
          suggestedParams,
        });

      const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: this.account,
        receiver: this.#revenueWalletAddress,
        amount: this.#algosToMicroAlgos(this.#buyingFee),
        suggestedParams,
      });

      const buyingGroup = [
        receiverOptInToNFTTxn,
        transferNFTToReceiverAndRemoveListingTxn,
        transferNFTPriceToSellerTxn,
      ];

      // if buying fee is greater than 0, add revenue transaction to the buying group
      if (this.#buyingFee > 0) {
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
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      // Emit event for successful purchase
      eventBus.emit("nft:buy:success", {
        assetId,
        transactionId: buyingTxId,
      });

      return {
        assetId,
        price: nftData.listing.price,
        transactionId: buyingTxId,
      };
    } catch (error) {
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:buy:failed", { error: "Could not buy NFT!" });
      throw error;
    }
  }

  async unlistNFT({ assetId }) {
    try {
      this.processing = true;
      this.#showLoadingOverlay();
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
      const boxRef = this.#getListingBoxReference(
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
            algosdk.ABIType.from("string").encode(this.account),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: threeMicroAlgo,
        });

      const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: this.account,
        receiver: this.#revenueWalletAddress,
        amount: this.#algosToMicroAlgos(this.#unListingFee),
        suggestedParams,
      });

      const unlistingGroup = [
        receiverOptInToNFTTxn,
        transferNFTToSellerAndRemoveListingTxn,
      ];

      // if unlisting fee is greater than 0, add revenue transaction to the unlisting group
      if (this.#unListingFee > 0) {
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
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      // Emit event for successful purchase
      eventBus.emit("nft:unlist:success", {
        assetId,
        transactionId: unlistingTxId,
      });

      return {
        assetId,
        price: nftData.listing.price,
        transactionId: buyingTxId,
      };
    } catch (error) {
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:unlist:failed", { error: "Could not unlist NFT!" });
      throw error;
    }
  }

  #showLoadingOverlay() {
    if (this.isMinimized) {
      // Show processing spinner on minimized button
      const minimizedBtn = document.getElementById("sdkMinimizedBtn");
      if (minimizedBtn) {
        minimizedBtn.classList.add("processing");
      }
      return;
    }

    const overlay = document.getElementById("algomintx-loading-overlay");
    const processingMessage = document.getElementById(
      "algomintx-processing-message"
    );
    if (!overlay) return;

    // Apply theme to overlay
    if (this.theme === "dark") {
      overlay.classList.add("dark-theme");
    } else {
      overlay.classList.remove("dark-theme");
    }

    // Update processing message
    if (processingMessage && this.#selectedWalletType) {
      processingMessage.textContent = `Processing... Open ${
        this.#selectedWalletType
      } wallet on your mobile to continue`;
    }

    // Show overlay with animation
    requestAnimationFrame(() => {
      overlay.classList.add("visible");
    });

    // Disable logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.disabled = true;
    }
  }

  #hideLoadingOverlay() {
    // Remove processing spinner from minimized button
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");
    if (minimizedBtn) {
      minimizedBtn.classList.remove("processing");
    }

    const overlay = document.getElementById("algomintx-loading-overlay");
    if (!overlay) return;

    // Hide overlay with animation using requestAnimationFrame
    requestAnimationFrame(() => {
      overlay.classList.remove("visible");
    });

    // Enable logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.disabled = false;
    }
  }
}

export default AlgoMintX;
