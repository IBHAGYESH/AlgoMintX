/**
 * AlgoMintX SDK UI Manager
 * Handles all UI rendering, interactions, and visual feedback
 */

import eventBus from "./event-bus.js";
import "./ui.css";

export class UIManager {
  #sdk;
  #disableUi;
  #disableToast;
  #logo;
  #minimizeUILocation;
  #toastLocation;
  #currentLoadingMessage;
  #messageElement;

  constructor(sdk, config) {
    this.#sdk = sdk;
    this.#disableUi = config.disableUi;
    this.#disableToast = config.disableToast;
    this.#logo = config.logo;
    this.#minimizeUILocation = config.minimizeUILocation;
    this.#toastLocation = config.toastLocation;
    this.#currentLoadingMessage = null;
    this.#messageElement = null;
  }

  /**
   * Initialize the UI
   */
  initUI(callbacks) {
    if (this.#disableUi) {
      return;
    }

    // Remove any existing SDK container
    const existingSdk = document.getElementById("algomintx-sdk-container");
    if (existingSdk) existingSdk.remove();

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
          <button id="logoutBtn" title="Logout">⏻</button>
          <button id="sdkMinimizeBtn" title="Minimize">&#x2013;</button>
        </div>
      </div>
    
      <div id="walletChoiceScreen">
        <button class="walletBtn" data-wallet="pera">
          <img src="https://perawallet.s3.amazonaws.com/images/media-kit/logomark-white.svg" alt="Pera Wallet" />
          Connect Pera Wallet
        </button>
        <button class="walletBtn" data-wallet="defly">
          <img src="https://docs.defly.app/~gitbook/image?url=https%3A%2F%2F2700986753-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fcollections%252FWDbwYIFtoiPa3JoJufCw%252Ficon%252FbQUUOW6VhH6vKR0XH7UB%252Flogo-notext-whiteonblack.png%3Falt%3Dmedia%26token%3D7d62c65b-fd29-47b6-a83b-162caac2fc8f&width=32&dpr=2&quality=100&sign=952138fe&sv=2" alt="Defly Wallet" />
          Connect Defly Wallet
        </button>
      </div>
    
      <div id="sdkUI">
        <input type="text" id="nftName" placeholder="NFT Name" />
        <textarea id="nftDescription" placeholder="NFT Description"></textarea>
        <input type="file" id="nftFile" accept="image/*,video/*" />
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

    // Create minimized circle button
    const existingSdkMinimizeBtn = document.getElementById("sdkMinimizedBtn");
    if (existingSdkMinimizeBtn) existingSdkMinimizeBtn.remove();

    const minimizedBtn = document.createElement("button");
    minimizedBtn.id = "sdkMinimizedBtn";
    minimizedBtn.innerHTML = this.#logo
      ? `<img src="${
          this.#logo
        }" alt="AMX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none;">AMX</span>`
      : "AMX";

    document.body.appendChild(minimizedBtn);

    // Apply initial theme
    this.applyTheme();

    // Setup theme listener
    this.setupThemeListener();

    // Setup event listeners
    this.#setupEventListeners(callbacks);

    // Setup toast container
    this.setupToastContainer();
  }

  /**
   * Setup all event listeners
   */
  #setupEventListeners(callbacks) {
    // Choose wallet button
    document
      .getElementById("walletChoiceScreen")
      .addEventListener("click", async (event) => {
        if (event.target.classList.contains("walletBtn")) {
          const walletType = event.target.getAttribute("data-wallet");
          await callbacks.onWalletConnect(walletType);
        }
      });

    // Mint NFT button
    document
      .getElementById("#mintNFTBtn")
      .addEventListener("click", async () => {
        await callbacks.onMintNFT();
      });

    // Reset NFT button
    document
      .getElementById("resetNFTBtn")
      .addEventListener("click", () => callbacks.onResetNFT());

    // Minimize button
    document
      .getElementById("sdkMinimizeBtn")
      .addEventListener("click", () => callbacks.onMinimize());

    // Logout button
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => callbacks.onLogout());

    // Maximized button
    document.getElementById("sdkMinimizedBtn").addEventListener("click", () => callbacks.onMaximize());

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
        this.showToast("Transaction ID copied to clipboard", "success");

        // Open transaction in new tab
        const network = this.#sdk.network === "mainnet" ? "mainnet" : "testnet";
        const txUrl = `https://lora.algokit.io/${network}/transaction/${txId}`;
        window.open(txUrl, "_blank");
      }
    });

    // Copy to clipboard for wallet address bar
    const walletAddressBar = document.getElementById("walletAddressBar");
    walletAddressBar.addEventListener("click", () => {
      if (this.#sdk.account) {
        navigator.clipboard.writeText(this.#sdk.account);
        this.showToast("Wallet address copied to clipboard", "success");
      }
    });

    // Add theme toggle button listener
    document
      .getElementById("themeToggleBtn")
      .addEventListener("click", () => {
        callbacks.onThemeToggle();
      });
  }

  /**
   * Setup input validation and event listeners for NFT form
   */
  setupNFTInputValidation(callbacks) {
    if (this.#disableUi) {
      return;
    }

    const nftName = document.getElementById("nftName");
    const nftDescription = document.getElementById("nftDescription");
    const nftFile = document.getElementById("nftFile");

    // Set up file input accept attribute based on supported formats
    const mimeTypes = {
      IMAGE: "image/jpeg,image/png,image/gif,image/webp,image/svg+xml",
      VIDEO: "video/mp4,video/webm,video/ogg,video/quicktime",
      AUDIO: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm",
    };

    const acceptedTypes = callbacks.getSupportedMediaFormats()
      .map((format) => mimeTypes[format])
      .join(",");

    nftFile.setAttribute("accept", acceptedTypes);

    // Add input event listeners for real-time validation
    nftName.addEventListener("input", (e) => {
      // Stop input if length exceeds 50 characters
      if (e.target.value.length > 50) {
        e.target.value = e.target.value.slice(0, 50);
        this.showToast("NFT name cannot exceed 50 characters", "error");
        return;
      }

      // Only sanitize if there are HTML tags or scripts
      if (e.target.value.includes("<") || e.target.value.includes(">")) {
        const sanitized = callbacks.sanitizeInput(e.target.value);
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      }
      this.validateMintButton();
    });

    nftDescription.addEventListener("input", (e) => {
      // Stop input if length exceeds 500 characters
      if (e.target.value.length > 500) {
        e.target.value = e.target.value.slice(0, 500);
        this.showToast(
          "NFT description cannot exceed 500 characters",
          "error"
        );
        return;
      }

      // Only sanitize if there are HTML tags or scripts
      if (e.target.value.includes("<") || e.target.value.includes(">")) {
        const sanitized = callbacks.sanitizeInput(e.target.value);
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      }
      this.validateMintButton();
    });

    // Add file validation
    nftFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const validation = callbacks.validateFileType(file);
        if (!validation.valid) {
          this.showToast(validation.message, "error");
          e.target.value = ""; // Clear the file input
          this.validateMintButton();
        }
      }
    });

    // Add paste event listeners to sanitize pasted content
    nftName.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData(
        "text"
      );
      // Truncate pasted text if it exceeds 50 characters
      const truncatedText = pastedText.slice(0, 50);
      const sanitized = callbacks.sanitizeInput(truncatedText);
      e.target.value = sanitized;
      if (pastedText.length > 50) {
        this.showToast("NFT name cannot exceed 50 characters", "error");
      }
      this.validateMintButton();
    });

    nftDescription.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData(
        "text"
      );
      // Truncate pasted text if it exceeds 500 characters
      const truncatedText = pastedText.slice(0, 500);
      const sanitized = callbacks.sanitizeInput(truncatedText);
      e.target.value = sanitized;
      if (pastedText.length > 500) {
        this.showToast(
          "NFT description cannot exceed 500 characters",
          "error"
        );
      }
      this.validateMintButton();
    });

    // Initial validation
    this.validateMintButton();
  }

  /**
   * Validate mint button state
   */
  validateMintButton() {
    if (this.#disableUi) {
      return;
    }

    const mintBtn = document.getElementById("#mintNFTBtn");
    const nftName = document.getElementById("nftName");
    const nftDescription = document.getElementById("nftDescription");
    const nftFile = document.getElementById("nftFile");

    const isNameValid = nftName.value.trim().length > 0;
    const isDescriptionValid = nftDescription.value.trim().length > 0;
    const isFileValid = nftFile.files.length > 0;
    mintBtn.disabled = !(isNameValid && isDescriptionValid && isFileValid);
  }

  /**
   * Show SDK UI (after wallet connection)
   */
  showSDKUI() {
    if (this.#disableUi) {
      return;
    }

    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdk-header").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "contents";
    document.getElementById("walletChoiceScreen").style.display = "none";
    document.getElementById("sdkUI").style.display = "flex";
    this.updateWalletAddressBar();

    if (this.#sdk.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  /**
   * Reset to login UI
   */
  resetToLoginUI() {
    if (this.#disableUi) {
      return;
    }

    this.clearMessage();
    this.updateWalletAddressBar();

    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdk-header").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("walletChoiceScreen").style.display = "flex";
    document.getElementById("sdkUI").style.display = "none";

    if (this.#sdk.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  /**
   * Update wallet address bar
   */
  updateWalletAddressBar() {
    if (this.#disableUi) {
      return;
    }

    const walletAddressBar = document.getElementById("walletAddressBar");
    if (walletAddressBar) {
      if (this.#sdk.account) {
        walletAddressBar.innerText = this.#sdk.account;
        walletAddressBar.style.display = "block";
      } else {
        walletAddressBar.innerText = "";
        walletAddressBar.style.display = "none";
      }
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    // Emit toast event regardless of disableToast setting
    eventBus.emit("toast:show", { message, type });

    if (this.#disableToast || this.#disableUi) {
      return;
    }

    const toastId = "algomintx-toast";
    const existingToast = document.getElementById(toastId);
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = toastId;

    const toastContent = document.createElement("div");
    toastContent.className = "toast-content";
    toastContent.innerText = message;

    const toastClose = document.createElement("button");
    toastClose.className = "toast-close";
    toastClose.innerHTML = "×";
    toastClose.onclick = () => {
      toast.style.opacity = "0";
      toast.addEventListener("transitionend", () => toast.remove(), {
        once: true,
      });
    };

    toast.appendChild(toastContent);
    toast.appendChild(toastClose);
    toast.classList.add(
      type === "error" ? "error" : type === "success" ? "success" : type === "warning" ? "warning" : "info"
    );
    toast.classList.add(this.#toastLocation.toLowerCase().replace("_", "-"));
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    setTimeout(() => toastClose.onclick(), 3500);
  }

  /**
   * Setup toast container
   */
  setupToastContainer() {
    if (this.#disableToast || this.#disableUi) {
      return;
    }

    let toastContainer = document.getElementById("algomintx-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "algomintx-toast-container";
      toastContainer.className =
        this.#toastLocation === "TOP_LEFT" ? "top-left" : "top-right";
      document.body.appendChild(toastContainer);
    }
  }

  /**
   * Clear message element
   */
  clearMessage() {
    if (this.#disableUi) {
      return;
    }

    if (this.#messageElement) {
      this.#messageElement.innerText = "";
      this.#messageElement.style.display = "none";
      this.#messageElement.style.cursor = "pointer";
    }
  }

  /**
   * Reset NFT form details
   */
  resetNFTDetails() {
    if (this.#disableUi) {
      return;
    }

    const nftName = document.getElementById("nftName");
    const nftDescription = document.getElementById("nftDescription");
    const nftFile = document.getElementById("nftFile");
    const mintBtn = document.getElementById("#mintNFTBtn");
    const resetBtn = document.getElementById("resetNFTBtn");

    nftName.value = "";
    nftDescription.value = "";
    nftFile.value = "";
    mintBtn.style.display = "block";
    resetBtn.style.display = "none";
    mintBtn.disabled = true;
    this.clearMessage();

    // Re-validate mint button
    this.validateMintButton();
  }

  /**
   * Show loading overlay
   */
  showLoadingOverlay(message = "Processing...") {
    if (this.#disableUi) {
      return;
    }

    const overlay = document.getElementById("algomintx-loading-overlay");
    const processingMessage = document.getElementById(
      "algomintx-processing-message"
    );

    if (!overlay || !processingMessage) {
      return;
    }

    processingMessage.textContent = message;
    this.#currentLoadingMessage = message;

    if (this.#sdk.theme === "dark") {
      overlay.classList.add("dark-theme");
    } else {
      overlay.classList.remove("dark-theme");
    }

    requestAnimationFrame(() => {
      overlay.classList.add("visible");
    });
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    if (this.#disableUi) {
      return;
    }

    const overlay = document.getElementById("algomintx-loading-overlay");
    if (!overlay) {
      return;
    }

    requestAnimationFrame(() => {
      overlay.classList.remove("visible");
    });
  }

  /**
   * Update loading message
   */
  updateLoadingMessage(message) {
    if (this.#disableUi) {
      return;
    }

    const processingMessage = document.getElementById(
      "algomintx-processing-message"
    );
    if (processingMessage) {
      processingMessage.textContent = message;
      this.#currentLoadingMessage = message;
    }
  }

  /**
   * Update message element (for mint success)
   */
  updateMessage(message, cursor = "pointer") {
    if (this.#disableUi) {
      return;
    }

    if (this.#messageElement) {
      this.#messageElement.innerText = message;
      this.#messageElement.style.display = "block";
      this.#messageElement.style.cursor = cursor;
    }
  }

  /**
   * Disable mint button
   */
  disableMintButton() {
    if (this.#disableUi) {
      return;
    }

    const mintBtn = document.getElementById("#mintNFTBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    if (mintBtn) mintBtn.disabled = true;
    if (logoutBtn) logoutBtn.disabled = true;
  }

  /**
   * Show reset button
   */
  showResetButton() {
    if (this.#disableUi) {
      return;
    }

    const mintBtn = document.getElementById("#mintNFTBtn");
    const resetBtn = document.getElementById("resetNFTBtn");
    if (mintBtn) mintBtn.style.display = "none";
    if (resetBtn) resetBtn.style.display = "block";
  }

  /**
   * Get system theme preference
   */
  getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  /**
   * Setup theme listener
   */
  setupThemeListener() {
    if (this.#disableUi) {
      return;
    }

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
              this.#sdk.theme = e.matches ? "dark" : "light";
              this.saveUIState();
              this.applyTheme();
            }
          } catch (error) {
            console.error("Failed to parse saved state:", error);
          }
        }
      });
  }

  /**
   * Apply theme to UI elements
   */
  applyTheme() {
    if (this.#disableUi) {
      return;
    }

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (this.#sdk.theme === "dark") {
      if (container) container.classList.add("dark-theme");
      if (minimizedBtn) minimizedBtn.classList.add("dark-theme");
    } else {
      if (container) container.classList.remove("dark-theme");
      if (minimizedBtn) minimizedBtn.classList.remove("dark-theme");
    }
  }

  /**
   * Save UI state to localStorage
   */
  saveUIState() {
    if (this.#disableUi) {
      return;
    }

    localStorage.setItem(
      "amx",
      JSON.stringify({
        minimized: this.#sdk.isMinimized,
        theme: this.#sdk.theme,
      })
    );
  }

  /**
   * Minimize SDK UI
   */
  minimizeSDK(initialLoad) {
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && this.#sdk.isMinimized) return;

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (!container || !minimizedBtn) return;

    minimizedBtn.style.right =
      this.#minimizeUILocation === "right" ? "20px" : "auto";
    minimizedBtn.style.left =
      this.#minimizeUILocation === "left" ? "20px" : "auto";

    container.classList.add("minimizing");
    minimizedBtn.style.display = "block";

    setTimeout(() => {
      container.style.display = "none";
      container.classList.remove("minimizing");
      minimizedBtn.classList.add("showing");
    }, 300);

    this.#sdk.isMinimized = true;
    this.saveUIState();
    eventBus.emit("window:size:minimized", {
      minimized: this.#sdk.isMinimized,
    });
  }

  /**
   * Maximize SDK UI
   */
  maximizeSDK(initialLoad) {
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && !this.#sdk.isMinimized) return;

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (!container || !minimizedBtn) return;

    minimizedBtn.classList.remove("showing");
    minimizedBtn.classList.add("hiding");

    setTimeout(() => {
      minimizedBtn.style.display = "none";
      minimizedBtn.classList.remove("hiding");
      container.style.display = "flex";
      container.classList.add("maximizing");

      setTimeout(() => {
        container.classList.remove("maximizing");
      }, 300);
    }, 200);

    this.#sdk.isMinimized = false;
    this.saveUIState();
    eventBus.emit("window:size:maximized", {
      minimized: this.#sdk.isMinimized,
    });
  }

  /**
   * Show temporary wallet connection UI (for headless mode)
   */
  async showTemporaryWalletConnectionUI(walletType, onCancel) {
    // Create a temporary overlay for wallet connection
    const overlay = document.createElement("div");
    overlay.id = "algomintx-temp-wallet-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      margin: 1rem;
    `;

    const title = document.createElement("h2");
    title.textContent = "Connect Wallet";
    title.style.cssText = `
      margin: 0 0 1rem 0;
      color: #1f2937;
      font-size: 1.5rem;
      font-weight: 600;
    `;

    const message = document.createElement("p");
    message.textContent = `Please open your ${walletType} wallet to complete the connection.`;
    message.style.cssText = `
      margin: 0 0 1.5rem 0;
      color: #6b7280;
      font-size: 1rem;
      line-height: 1.5;
    `;

    const spinner = document.createElement("div");
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem auto;
    `;

    // Add CSS animation
    const style = document.createElement("style");
    style.setAttribute("data-algomintx-temp", "true");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    cancelBtn.onmouseover = () => (cancelBtn.style.background = "#dc2626");
    cancelBtn.onmouseout = () => (cancelBtn.style.background = "#ef4444");

    cancelBtn.onclick = async () => {
      onCancel();
      this.hideTemporaryWalletConnectionUI();
    };

    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(spinner);
    container.appendChild(cancelBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Store reference to overlay for later removal
    this.tempWalletOverlay = overlay;

    // Add a safety timeout to auto-hide the UI after 5 minutes
    setTimeout(() => {
      if (this.tempWalletOverlay) {
        this.hideTemporaryWalletConnectionUI();
        eventBus.emit("wallet:connection:timeout", { walletType });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Hide temporary wallet connection UI
   */
  hideTemporaryWalletConnectionUI() {
    if (this.tempWalletOverlay) {
      this.tempWalletOverlay.remove();
      this.tempWalletOverlay = null;
    }

    // Also remove any temporary styles
    const tempStyles = document.querySelectorAll("style[data-algomintx-temp]");
    tempStyles.forEach((style) => style.remove());
  }
}
