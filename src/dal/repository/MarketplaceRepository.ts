import { Repository } from "typeorm";
import { BigNumber, ethers } from "ethers";
import { Marketplace } from "../entity";
import { DECIMAL } from "../../shared/constants";

export class MarketplaceRepository extends Repository<Marketplace> {
  async syncItemListedEntity(
    chainId: number,
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
      try {
        const marketplace = new Marketplace();
        marketplace.chainId = chainId;
        marketplace.seller = owner;
        marketplace.nft = nft;
        marketplace.product_address = product;
        marketplace.tokenId = tokenId.toString();
        marketplace.tokenIdInDecimal = tokenId.toNumber();
        marketplace.quantity = quantity.toString();
        marketplace.quantityInDecimal = quantity.toNumber();
        marketplace.payToken = payToken;
        marketplace.price = price.toString();
        marketplace.priceInDecimal = Number(ethers.utils.formatUnits(price, DECIMAL[chainId]));
        marketplace.startingTime = startingTime.toNumber();
        marketplace.listingId = listingId.toString();
        marketplace.transactionHash = transactionHash;
        return this.save(marketplace);
      } catch (e){
        console.log(e);
      }
    }
    return null;
  }

  async syncItemSoldEntity(
    chainId: number,
    seller: string,
    buyer: string,
    unitPrice: BigNumber,
    listingId: BigNumber,
    transactionHash: string,
  ) {
    const item = await this.findOne({
      where: {
        chainId,
        listingId: listingId.toString(),
      },
    });
    if (item) {
      item.unitPrice = unitPrice.toString();
      item.buyer = buyer;
      item.isSold = true;
      item.soldTransactionHash = transactionHash;
      return this.save(item);
    }
  }

  async syncItemCanceledEntity(chainId: number, owner: string, listingId: BigNumber, transactionHash: string) {
    const item = await this.findOne({
      where: {
        chainId,
        listingId: listingId.toString(),
      },
    });
    if (item) {
      item.isExpired = true;
      item.cancelTransactionHash = transactionHash;
      return this.save(item);
    }
  }

  async syncItemUpdatedEntity(
    chainId: number,
    owner: string,
    payToken: string,
    newPrice: BigNumber,
    listingId: BigNumber,
    transactionHash: string,
  ) {
    const item = await this.findOne({
      where: {
        chainId,
        listingId: listingId.toString(),
      },
    });
    if (item) {
      item.price = newPrice.toString();
      item.priceInDecimal = Number(ethers.utils.formatUnits(newPrice, DECIMAL[chainId]));
      item.payToken = payToken;
      item.transactionHash = transactionHash;
      return this.save(item);
    }
  }
}
