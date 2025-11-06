import {
  Contract,
  abimethod,
  Global,
  Txn,
  itxn,
  Uint64,
  uint64,
  BoxMap,
  bytes,
  assert,
  arc4,
  clone,
} from "@algorandfoundation/algorand-typescript";

// Global constants
const MIN_BALANCE: uint64 = Uint64(100000); // 0.1 ALGO base minimum

// Define the listing type
class Listing extends arc4.Struct<{
  seller: arc4.Str;
  nftPrice: arc4.Str;
  marketplace: arc4.Str;
}> {}

export class AlgoMintX extends Contract {
  // BoxMap with key as assetId and value as Listing type
  private listings = BoxMap<uint64, Listing>({ keyPrefix: "listing_" });

  /**
   *
   * Box only methods
   */
  @abimethod()
  public addNFTListing(
    assetId: uint64,
    senderWalletAddress: string,
    nftPrice: string,
    marketplace: string
  ): bytes {
    // Check if the listing already exists
    assert(
      !this.listings(assetId).exists,
      "A listing already exists for this NFT"
    );

    // If it doesn't exist, create a new listing
    const value = new Listing({
      seller: new arc4.Str(senderWalletAddress),
      nftPrice: new arc4.Str(nftPrice),
      marketplace: new arc4.Str(marketplace),
    });

    // Store the listing in the box
    this.listings(assetId).value = clone(value);

    return Txn.txId;
  }

  @abimethod()
  public getNFTListing(assetId: uint64): Listing {
    // Check if the listing exists
    assert(
      this.listings(assetId).exists,
      "No active listing found for this NFT"
    );

    // Get the listing details from the box
    return clone(this.listings(assetId).value);
  }

  @abimethod()
  public removeNFTListing(assetId: uint64): bytes {
    // Check if the listing exists
    assert(
      this.listings(assetId).exists,
      "No active listing found for this NFT"
    );

    // Remove the listing
    this.listings(assetId).delete();

    return Txn.txId;
  }

  /**
   *
   * NFT methods
   */

  @abimethod()
  public contractOptInToNFT(assetId: uint64): bytes {
    // Check if the listing already exists
    assert(
      !this.listings(assetId).exists,
      "A listing already exists for this NFT"
    );

    // Opt-in the contract to the NFT asset
    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        xferAsset: assetId,
        assetAmount: 0,
        fee: 0,
      })
      .submit();

    return Txn.txId;
  }

  @abimethod()
  public transferNFTToContract(assetId: uint64): bytes {
    // Check if the listing already exists
    assert(
      !this.listings(assetId).exists,
      "A listing already exists for this NFT"
    );

    // Transfer NFT to the contract
    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        assetSender: Txn.sender,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    return Txn.txId;
  }

  @abimethod()
  public transferNFTToReceiver(
    assetId: uint64,
    sellerWalletAddress: string
  ): bytes {
    // Check if the listing exists
    assert(
      this.listings(assetId).exists,
      "No active listing found for this NFT"
    );

    // Get the listing details from the box
    const listing = clone(this.listings(assetId).value);

    // Verify the NFT seller data matches with the listing data
    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    // Transfer NFT to the receiver
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        assetSender: Global.currentApplicationAddress,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    return Txn.txId;
  }

  @abimethod()
  public transferNFTToSeller(
    assetId: uint64,
    sellerWalletAddress: string
  ): bytes {
    // Check if the listing exists
    assert(
      this.listings(assetId).exists,
      "No active listing found for this NFT"
    );

    // Get the listing details from the box
    const listing = clone(this.listings(assetId).value);

    // Verify the NFT seller data matches with the listing data
    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    // Transfer NFT to the seller
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        assetSender: Global.currentApplicationAddress,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    return Txn.txId;
  }

  /**
   *
   * NFT + Box methods
   */
  @abimethod()
  public transferNFTToContractAndAddListing(
    assetId: uint64,
    senderWalletAddress: string,
    nftPrice: string,
    marketplace: string
  ): bytes {
    // Check if the listing already exists
    assert(
      !this.listings(assetId).exists,
      "A listing already exists for this NFT"
    );

    // Opt-in the contract to the NFT asset
    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        xferAsset: assetId,
        assetAmount: 0,
        fee: 0,
      })
      .submit();

    // Transfer NFT to the contract
    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        assetSender: Txn.sender,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    // If it doesn't exist, create a new listing
    const value = new Listing({
      seller: new arc4.Str(senderWalletAddress),
      nftPrice: new arc4.Str(nftPrice),
      marketplace: new arc4.Str(marketplace),
    });

    // Store the listing in the box
    this.listings(assetId).value = clone(value);

    return Txn.txId;
  }

  @abimethod()
  public transferNFTToReceiverAndRemoveListing(
    assetId: uint64,
    sellerWalletAddress: string,
    marketplace: string
  ): bytes {
    // Check if the listing exists
    assert(
      this.listings(assetId).exists,
      "No active listing found for this NFT"
    );

    // Get the listing details from the box
    const listing = clone(this.listings(assetId).value);

    // Verify the NFT seller data matches with the listing data
    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    // Verify the marketplace matches with the listing data
    assert(
      listing.marketplace === new arc4.Str(marketplace),
      "Marketplace does not match"
    );

    // Transfer NFT to the receiver
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        assetSender: Global.currentApplicationAddress,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    // Remove the listing
    this.listings(assetId).delete();

    return Txn.txId;
  }

  @abimethod()
  public transferNFTToSellerAndRemoveListing(
    assetId: uint64,
    sellerWalletAddress: string,
    marketplace: string
  ): bytes {
    // Check if the listing exists
    assert(
      this.listings(assetId).exists,
      "No active listing found for this NFT"
    );

    // Get the listing details from the box
    const listing = clone(this.listings(assetId).value);

    // Verify the NFT seller data matches with the listing data
    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    // Verify the marketplace matches with the listing data
    assert(
      listing.marketplace === new arc4.Str(marketplace),
      "Marketplace does not match"
    );

    // Transfer NFT to the seller
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        assetSender: Global.currentApplicationAddress,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    // Remove the listing
    this.listings(assetId).delete();

    return Txn.txId;
  }

  /**
   *
   * Misc methods
   */

  @abimethod()
  public fundContract(amount: uint64): void {
    // Only allow the contract creator to fund the contract
    assert(
      Txn.sender === Global.creatorAddress,
      "Only contract creator can fund the contract"
    );

    itxn
      .payment({
        amount: amount,
        receiver: Global.currentApplicationAddress,
        fee: 0,
      })
      .submit();
  }

  @abimethod()
  public withdrawExcessFunds(): void {
    // Only allow the contract creator to withdraw funds
    assert(
      Txn.sender === Global.creatorAddress,
      "Only contract creator can withdraw funds"
    );

    // Calculate the amount to withdraw
    const amountToWithdraw = Uint64(
      Global.currentApplicationAddress.balance - MIN_BALANCE
    );

    // Ensure we're not withdrawing below minimum balance
    assert(amountToWithdraw >= 0, "Cannot withdraw below minimum balance");

    // Withdraw the funds
    itxn
      .payment({
        amount: amountToWithdraw,
        receiver: Txn.sender,
        fee: 0,
      })
      .submit();
  }
}
