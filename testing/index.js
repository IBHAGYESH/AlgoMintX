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

    card.innerHTML = `
      <img src="${nft.metadata.image}" alt="${nft.name}" class="nft-image">
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
        ${buttonHtml}
      </div>
    `;

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

  document.getElementById("nft-details").innerHTML = `
    <img src="${nft.metadata.image}" alt="NFT" />
    <p><strong>Asset ID:</strong> ${assetId}</p>
    <p><strong>Transaction:</strong> ${nft.transactionId}</p>
    <p><strong>Creator:</strong> ${nft.creator}</p>
    <p><strong>Owner:</strong> ${nft.currentHolder}</p>
    <p><strong>Name:</strong> ${nft.name}</p>
    <p><strong>Description:</strong> ${nft.metadata.description}</p>
  `;
  return nft;
};
