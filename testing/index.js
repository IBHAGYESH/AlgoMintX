/**
 * Initialize AlgoMintX
 */
window.algoMintXClient = new window.AlgoMintX({
  pinata_ipfs_server_key: "", // your pinata api key
  pinata_ipfs_gateway_url: "", // your pinata gateway url
  env: "testnet", // testnet | mainnet
  namespace: "DEMOY", // unique 5 letter string
  revenueWalletAddress: "", // where fees go
  listingFee: 0.1, // in Algos
  unListingFee: 0.1, // in Algos
  buyingFee: 0.5, // in Algos
  supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"], // ["IMAGE", "VIDEO", "AUDIO"]
  disableToast: false, // disable toast notifications
  toastLocation: "TOP_RIGHT", // TOP_LEFT | TOP_RIGHT
  minimizeUILocation: "right", // left | right
  logo: "./logo.png", // your website logo (URL / path to image)
});

/**
 * sdk events
 */

algoMintXClient.events.on(
  "wallet:connection:connected",
  async ({ address }) => {
    console.log("Wallet connected:", address);
  }
);

algoMintXClient.events.on(
  "wallet:connection:disconnected",
  async ({ address }) => {
    console.log("wallet:connection:disconnected:", address);
  }
);

algoMintXClient.events.on("wallet:connection:failed", async ({ error }) => {
  console.log("wallet:connection:failed:", error);
});

algoMintXClient.events.on("window:size:minimized", async ({ minimized }) => {
  console.log("SDK window minimized:", minimized);
});

algoMintXClient.events.on("sdk:processing:started", async ({ processing }) => {
  console.log("SDK processing:", processing);
});

algoMintXClient.events.on("sdk:processing:stopped", async ({ processing }) => {
  console.log("SDK processing:", processing);
});

algoMintXClient.events.on(
  "nft:mint:success",
  async ({ transactionId, nft }) => {
    console.log("nft:mint:success:", transactionId, nft);
  }
);

algoMintXClient.events.on("nft:mint:failed", async ({ error }) => {
  console.log("nft:mint:failed:", error);
});

algoMintXClient.events.on(
  "nft:list:success",
  async ({ transactionId, nft }) => {
    console.log("nft:list:success:", transactionId, nft);
  }
);

algoMintXClient.events.on("nft:list:failed", async ({ error }) => {
  console.log("nft:list:failed:", error);
});

algoMintXClient.events.on(
  "nft:unlist:success",
  async ({ transactionId, nft }) => {
    console.log("nft:unlist:success:", transactionId, nft);
  }
);

algoMintXClient.events.on("nft:unlist:failed", async ({ error }) => {
  console.log("nft:unlist:failed:", error);
});

algoMintXClient.events.on("nft:buy:success", async ({ transactionId, nft }) => {
  console.log("nft:buy:success:", transactionId, nft);
});

algoMintXClient.events.on("nft:buy:failed", async ({ error }) => {
  console.log("nft:buy:failed:", error);
});

/**
 * ui code
 */

// Function to render NFT cards
window.renderNFTCards = function (nfts) {
  const nftGrid = document.getElementById("nft-grid");
  nftGrid.innerHTML = "";

  if (!nfts || nfts.length === 0) {
    nftGrid.innerHTML = '<p class="no-nfts">No NFTs found</p>';
    return;
  }

  nfts.forEach((nft) => {
    const card = document.createElement("div");
    card.className = "nft-card";

    let buttonHtml = "";
    if (nft.listing) {
      if (nft.listing.seller === window.algoMintXClient.account) {
        // Show unlist button if seller is the current user
        buttonHtml = `<button class="btn btn-warning unlist-nft-btn" onclick="window.algoMintXClient.unlistNFT({ assetId: ${nft.assetId} })">Unlist NFT</button>`;
      } else {
        // Show buy button if seller is not the current user
        buttonHtml = `<button class="btn btn-primary buy-nft-btn" onclick="window.algoMintXClient.buyNFT({ assetId: ${nft.assetId} })">Buy Now</button>`;
      }
    } else {
      buttonHtml = `<button class="btn btn-secondary list-nft-btn" onclick="openListNFTModal(${nft.assetId})">List NFT</button>`;
    }

    // Format wallet address to show first 6 and last 4 characters
    const formatWalletAddress = (address) => {
      if (!address) return "Unknown";
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Get the appropriate wallet address based on listing status
    const walletAddress = nft.listing ? nft.listing.seller : nft.currentHolder;
    const walletLabel = nft.listing ? "Seller" : "Owner";

    // Check if the NFT is a video or audio using image_mimetype
    const isVideo = nft.metadata.image_mimetype?.startsWith("video/");
    const isAudio = nft.metadata.image_mimetype?.startsWith("audio/");

    // Create media element based on type
    let mediaElement;
    if (isVideo) {
      mediaElement = `<video class="nft-image" loop playsinline>
        <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
        Your browser does not support the video tag.
      </video>`;
    } else if (isAudio) {
      mediaElement = `<div class="audio-preview">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/musical-notes.png" alt="Audio" class="audio-icon">
        <audio class="nft-image" preload="metadata">
          <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
          Your browser does not support the audio tag.
        </audio>
      </div>`;
    } else {
      mediaElement = `<img src="${nft.metadata.image}" alt="${nft.name}" class="nft-image">`;
    }

    card.innerHTML = `
      ${mediaElement}
      <div class="nft-content">
        <h3 class="nft-title">${nft.name || "Unnamed NFT"}</h3>
        <p class="nft-description">${
          nft.metadata.description || "No description available"
        }</p>
        ${
          nft.listing
            ? `<p class="nft-price">${nft.listing.price} ALGO</p>`
            : ""
        }
        <p class="nft-wallet"><strong>${walletLabel}:</strong> ${formatWalletAddress(
      walletAddress
    )}</p>
        ${buttonHtml}
      </div>
    `;

    // Add event listeners for media autoplay on hover
    if (isVideo) {
      const video = card.querySelector("video");
      card.addEventListener("mouseenter", () => {
        video.muted = false;
        video.volume = 0.5; // Set volume to 10%
        video.play();
      });
      card.addEventListener("mouseleave", () => {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      });
    } else if (isAudio) {
      const audio = card.querySelector("audio");
      card.addEventListener("mouseenter", () => {
        audio.volume = 0.5; // Set volume to 10%
        audio.play();
      });
      card.addEventListener("mouseleave", () => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    card.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("buy-nft-btn") ||
        e.target.classList.contains("list-nft-btn") ||
        e.target.classList.contains("unlist-nft-btn")
      ) {
        return;
      }
      window.location.href = `details.html?id=${nft.assetId}`;
    });

    nftGrid.appendChild(card);
  });
};

// Function to open list NFT modal
window.openListNFTModal = function (assetId) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h3>List NFT for Sale</h3>
      <form id="list-nft-form">
        <div class="form-group">
          <label for="price">Price (Algos)</label>
          <input type="number" id="price" class="form-control" required min="0" />
        </div>
        <button type="submit" class="btn btn-primary">List NFT</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "block";

  const closeBtn = modal.querySelector(".close");
  closeBtn.onclick = function () {
    modal.remove();
  };

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.remove();
    }
  };

  const form = modal.querySelector("#list-nft-form");
  form.onsubmit = async function (e) {
    e.preventDefault();
    const price = document.getElementById("price").value;
    try {
      await window.algoMintXClient.listNFT({
        assetId: assetId,
        nftPrice: parseInt(price),
      });
      modal.remove();
      // Refresh the NFT list
      const nfts = await window.algoMintXClient.getWalletNFTs();
      window.renderNFTCards(nfts);
    } catch (error) {
      console.error("Error listing NFT:", error);
      alert("Failed to list NFT: " + error.message);
    }
  };
};

// Function to render NFT details
window.renderNFTDetailsPage = async (assetId) => {
  const nft = await algoMintXClient.getNFTMetadata({ assetId });

  // Check if the NFT is a video or audio using image_mimetype
  const isVideo = nft.metadata.image_mimetype?.startsWith("video/");
  const isAudio = nft.metadata.image_mimetype?.startsWith("audio/");

  // Create media element based on type
  let mediaElement;
  if (isVideo) {
    mediaElement = `<video class="nft-details-media" controls autoplay loop>
      <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
      Your browser does not support the video tag.
    </video>`;
  } else if (isAudio) {
    mediaElement = `<div class="audio-player">
      <img src="https://img.icons8.com/ios-filled/50/ffffff/musical-notes.png" alt="Audio" class="audio-icon">
      <audio class="nft-details-media" controls autoplay>
        <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
        Your browser does not support the audio tag.
      </audio>
    </div>`;
  } else {
    mediaElement = `<img src="${nft.metadata.image}" alt="NFT" class="nft-details-media" />`;
  }

  const div = (document.getElementById("nft-details").innerHTML = `
    ${mediaElement}
    <p><strong>Transaction:</strong> ${nft.transactionId}</p>
    <p><strong>Creator:</strong> ${nft.creator}</p>
    <p><strong>${nft?.listing ? "Seller" : "Owner"}:</strong> ${
    nft?.listing ? nft.listing.seller : nft.currentHolder
  }</p>
    <p><strong>Name:</strong> ${nft.name}</p>
    <p><strong>Description:</strong> ${nft.metadata.description}</p>
  `);

  // Ensure media starts playing after the element is added to the DOM
  if (isVideo || isAudio) {
    const media = document.querySelector(".nft-details-media");
    media.play().catch((error) => {
      console.log("Autoplay failed:", error);
      // Some browsers require user interaction before autoplay
      // We'll keep the controls visible so users can play manually
    });
  }

  return nft;
};
