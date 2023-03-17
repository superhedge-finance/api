import { Repository } from "typeorm";
import { BigNumber, ethers } from "ethers";
import { Marketplace } from "../entity";

export class MarketplaceRepository extends Repository<Marketplace> {
  async syncItemListedEntity(
    owner: string,
    nft: string,
    product: string,
    tokenId: BigNumber,
    quantity: BigNumber,
    payToken: string,
    price: BigNumber,
    startingTime: BigNumber,
    listingId: BigNumber,
    transactionHash: string,
  ): Promise<Marketplace | null> {
    const exist = await this.findOne({
      where: { transactionHash },
    });
    if (!exist) {
      const marketplace = new Marketplace();
      marketplace.seller = owner;
      marketplace.nft = nft;
      marketplace.product_address = product;
      marketplace.tokenId = tokenId.toString();
      marketplace.tokenIdInDecimal = tokenId.toNumber();
      marketplace.quantity = quantity.toString();
      marketplace.quantityInDecimal = quantity.toNumber();
      marketplace.payToken = payToken;
      marketplace.price = price.toString();
      marketplace.priceInDecimal = Number(ethers.utils.formatUnits(price, 6));
      marketplace.startingTime = startingTime.toNumber();
      marketplace.listingId = listingId.toString();
      marketplace.transactionHash = transactionHash;
      return this.save(marketplace);
    }
    return null;
  }

  async syncItemSoldEntity(
    seller: string,
    buyer: string,
    unitPrice: BigNumber,
    listingId: BigNumber,
    transactionHash: string,
  ) {
    const item = await this.findOne({
      where: {
        listingId: listingId.toString()
      }
    })
    if (item) {
      item.unitPrice = unitPrice.toString();
      item.buyer = buyer;
      item.isSold = true;
      item.soldTransactionHash = transactionHash;
      return this.save(item);
    }
  }

  async syncItemCanceledEntity(owner: string, listingId: BigNumber, transactionHash: string) {
    const item = await this.findOne({
      where: {
        listingId: listingId.toString(),
      }
    })
    if (item) {
      item.isExpired = true;
      item.cancelTransactionHash = transactionHash;
      return this.save(item)
    }
  }

  async syncItemUpdatedEntity(
    owner: string,
    payToken: string,
    newPrice: BigNumber,
    listingId: BigNumber,
    transactionHash: string,
  ) {
    const item = await this.findOne({
      where: {
        listingId: listingId.toString()
      }
    })
    if (item) {
      item.price = newPrice.toString()
      item.priceInDecimal = Number(ethers.utils.formatUnits(newPrice, 6));
      item.payToken = payToken;
      return this.save(item)
    }
  }
}
