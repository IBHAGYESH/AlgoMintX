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
  op,
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
  // BoxMap key: listing_{marketplace}_{assetId} (mirrors AlgoStakeX stake_{poolId}_{address})
  private listings = BoxMap<bytes, Listing>({ keyPrefix: "listing_" });

  private buildListingKey(marketplace: string, assetId: uint64): bytes {
    const marketplaceBytes = new arc4.Str(marketplace).bytes;
    const separator = new arc4.Str("_").bytes;
    const assetIdBytes = new arc4.Uint64(assetId).bytes;
    return op.concat(op.concat(marketplaceBytes, separator), assetIdBytes);
  }

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
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      !this.listings(listingKey).exists,
      "A listing already exists for this NFT"
    );

    const value = new Listing({
      seller: new arc4.Str(senderWalletAddress),
      nftPrice: new arc4.Str(nftPrice),
      marketplace: new arc4.Str(marketplace),
    });

    this.listings(listingKey).value = clone(value);

    return Txn.txId;
  }

  @abimethod({ readonly: true })
  public getNFTListing(marketplace: string, assetId: uint64): Listing {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      this.listings(listingKey).exists,
      "No active listing found for this NFT"
    );

    return clone(this.listings(listingKey).value);
  }

  @abimethod()
  public removeNFTListing(marketplace: string, assetId: uint64): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      this.listings(listingKey).exists,
      "No active listing found for this NFT"
    );

    this.listings(listingKey).delete();

    return Txn.txId;
  }

  /**
   *
   * NFT methods
   */

  @abimethod()
  public contractOptInToNFT(marketplace: string, assetId: uint64): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      !this.listings(listingKey).exists,
      "A listing already exists for this NFT"
    );

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

  /**
   * Records a listing and opt-ins the contract to the asset.
   * Escrow is completed by a user-signed asset transfer in the same atomic group
   * (mirrors AlgoStakeX stake: app call + outer asset transfer).
   */
  @abimethod()
  public transferNFTToContractAndAddListing(
    assetId: uint64,
    senderWalletAddress: string,
    nftPrice: string,
    marketplace: string
  ): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      !this.listings(listingKey).exists,
      "A listing already exists for this NFT"
    );

    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        xferAsset: assetId,
        assetAmount: 0,
        fee: 0,
      })
      .submit();

    const value = new Listing({
      seller: new arc4.Str(senderWalletAddress),
      nftPrice: new arc4.Str(nftPrice),
      marketplace: new arc4.Str(marketplace),
    });

    this.listings(listingKey).value = clone(value);

    return Txn.txId;
  }

  /**
   * Opt-in only. Pair with a user-signed asset transfer in the same atomic group.
   */
  @abimethod()
  public transferNFTToContract(marketplace: string, assetId: uint64): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      !this.listings(listingKey).exists,
      "A listing already exists for this NFT"
    );

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
  public transferNFTToReceiver(
    marketplace: string,
    assetId: uint64,
    sellerWalletAddress: string
  ): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      this.listings(listingKey).exists,
      "No active listing found for this NFT"
    );

    const listing = clone(this.listings(listingKey).value);

    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    return Txn.txId;
  }

  @abimethod()
  public transferNFTToSeller(
    marketplace: string,
    assetId: uint64,
    sellerWalletAddress: string
  ): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      this.listings(listingKey).exists,
      "No active listing found for this NFT"
    );

    const listing = clone(this.listings(listingKey).value);

    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
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
  public transferNFTToReceiverAndRemoveListing(
    assetId: uint64,
    sellerWalletAddress: string,
    marketplace: string
  ): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      this.listings(listingKey).exists,
      "No active listing found for this NFT"
    );

    const listing = clone(this.listings(listingKey).value);

    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    assert(
      listing.marketplace === new arc4.Str(marketplace),
      "Marketplace does not match"
    );

    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    this.listings(listingKey).delete();

    return Txn.txId;
  }

  @abimethod()
  public transferNFTToSellerAndRemoveListing(
    assetId: uint64,
    sellerWalletAddress: string,
    marketplace: string
  ): bytes {
    const listingKey = this.buildListingKey(marketplace, assetId);

    assert(
      this.listings(listingKey).exists,
      "No active listing found for this NFT"
    );

    const listing = clone(this.listings(listingKey).value);

    assert(
      listing.seller === new arc4.Str(sellerWalletAddress),
      "Seller wallet address does not match"
    );

    assert(
      listing.marketplace === new arc4.Str(marketplace),
      "Marketplace does not match"
    );

    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: assetId,
        assetAmount: 1,
        fee: 0,
      })
      .submit();

    this.listings(listingKey).delete();

    return Txn.txId;
  }

  /**
   *
   * Misc methods
   */

  @abimethod()
  public fundContract(amount: uint64): void {
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
    assert(
      Txn.sender === Global.creatorAddress,
      "Only contract creator can withdraw funds"
    );

    const amountToWithdraw = Uint64(
      Global.currentApplicationAddress.balance - MIN_BALANCE
    );

    assert(amountToWithdraw >= 0, "Cannot withdraw below minimum balance");

    itxn
      .payment({
        amount: amountToWithdraw,
        receiver: Txn.sender,
        fee: 0,
      })
      .submit();
  }
}
