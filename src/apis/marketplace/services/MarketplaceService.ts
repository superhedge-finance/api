/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Inject, Injectable } from "@tsed/di";
import { MarketplaceRepository, ProductRepository, HistoryRepository, Product } from "../../../dal";
import { MarketplaceItemDto } from "../dto/MarketplaceItemDto";
import { ethers } from "ethers";
import { MarketplaceItemFullDto } from "../dto/MarketplaceItemFullDto";
import { MarketplaceItemDetailDto } from "../dto/MarketplaceItemDetailDto";
import { DECIMAL } from "../../../shared/constants";
import { HISTORY_TYPE } from "../../../shared/enum";

@Injectable()
export class MarketplaceService {
  @Inject(MarketplaceRepository)
  private readonly marketplaceRepository: MarketplaceRepository;

  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

  async getListedItems(chainId: number): Promise<MarketplaceItemDto[]> {
    const listedItems = await this.marketplaceRepository
      .createQueryBuilder("marketplace")
      .where("marketplace.isExpired = false")
      .andWhere("marketplace.isSold = false")
      .andWhere("marketplace.chainId = :chainId", { chainId })
      .leftJoinAndMapOne("marketplace.product", Product, "product", "marketplace.product_address = product.address")
      .select(["MIN(marketplace.priceInDecimal) as best_price", "SUM(marketplace.quantityInDecimal) as total_lots_offered", "product_address"])
      .groupBy("product_address")
      .getRawMany();

    return await Promise.all(listedItems.map(async (item) => {
      const bestOfferItem = await this.marketplaceRepository
        .createQueryBuilder("marketplace")
        .where("marketplace.isExpired = false")
        .andWhere("marketplace.isSold = false")
        .andWhere("marketplace.product_address = :productAddress", { productAddress: item.product_address })
        .andWhere("marketplace.priceInDecimal = :priceInDecimal", { priceInDecimal: item.best_price })
        .leftJoinAndMapOne("marketplace.product", Product, "product", "marketplace.product_address = product.address")
        .select("SUM(marketplace.quantityInDecimal) as lots_offered")
        .getRawOne();

      const product = await this.productRepository.findOne({
        where: {
          address: item.product_address
        }
      });

      return {
        offerPrice: item.best_price,
        offerLots: bestOfferItem!.lots_offered,
        totalLots: item.total_lots_offered,
        mtmPrice: product!.mtmPrice,
        underlying: product!.underlying,
        productAddress: product!.address,
        name: product!.name,
        issuanceCycle: product!.issuanceCycle,
        vaultStrategy: product!.vaultStrategy,
        risk: product!.risk,
        fees: product!.fees,
        counterparties: product!.counterparties,
        estimatedApy: product!.estimatedApy
      };
    }));
  }

  async getUserListedItems(address: string, chainId: number): Promise<MarketplaceItemFullDto[]> {
    const listedItems = await this.marketplaceRepository
      .createQueryBuilder("marketplace")
      .where("marketplace.seller = :address", { address })
      .andWhere("marketplace.isExpired = false")
      .andWhere("marketplace.isSold = false")
      .andWhere("marketplace.chainId = :chainId", { chainId })
      .leftJoinAndMapOne("marketplace.product", Product, "product", "marketplace.product_address = product.address")
      .getMany();

    return listedItems.map((item) => {
      const currentCapacity = ethers.utils.formatUnits(item.product.currentCapacity, DECIMAL[chainId]);
      return {
        offerPrice: item.priceInDecimal,
        offerLots: item.quantityInDecimal,
        totalLots: Math.floor(Number(currentCapacity) / 1000),
        mtmPrice: item.product.mtmPrice,
        underlying: item.product.underlying,
        productAddress: item.product.address,
        name: item.product.name,
        issuanceCycle: item.product.issuanceCycle,
        vaultStrategy: item.product.vaultStrategy,
        risk: item.product.risk,
        fees: item.product.fees,
        counterparties: item.product.counterparties,
        estimatedApy: item.product.estimatedApy,
        id: item.id,
        tokenId: item.tokenId,
        listingId: item.listingId,
        quantity: item.quantityInDecimal,
        startingTime: item.startingTime,
        seller: item.seller,
      };
    });
  }

  async getItem(listing_id: number, chainId: number): Promise<MarketplaceItemFullDto | null> {
    const item = await this.marketplaceRepository
      .createQueryBuilder("marketplace")
      .where("marketplace.listing_id = :listing_id", { listing_id })
      .andWhere("marketplace.chainId = :chainId", { chainId })
      .leftJoinAndMapOne("marketplace.product", Product, "product", "marketplace.product_address = product.address")
      .getOne();

    if (!item) return null;

    const currentCapacity = ethers.utils.formatUnits(item.product.currentCapacity, DECIMAL[chainId]);
    return {
      offerPrice: item.priceInDecimal,
      offerLots: item.quantityInDecimal,
      totalLots: Math.floor(Number(currentCapacity) / 1000),
      mtmPrice: item.product.mtmPrice,
      underlying: item.product.underlying,
      productAddress: item.product.address,
      name: item.product.name,
      issuanceCycle: item.product.issuanceCycle,
      vaultStrategy: item.product.vaultStrategy,
      risk: item.product.risk,
      fees: item.product.fees,
      counterparties: item.product.counterparties,
      estimatedApy: item.product.estimatedApy,
      id: item.id,
      tokenId: item.tokenId,
      listingId: item.listingId,
      quantity: item.quantityInDecimal,
      startingTime: item.startingTime,
      seller: item.seller
    };
  }

  async getTokenItem(product_address: string, chainId: number): Promise<MarketplaceItemDetailDto | null> {
    const item = await this.marketplaceRepository
      .createQueryBuilder("marketplace")
      .where("marketplace.product_address = :product_address", { product_address })
      .andWhere("marketplace.chainId = :chainId", { chainId })
      .andWhere("marketplace.isExpired = false")
      .andWhere("marketplace.isSold = false")
      .leftJoinAndMapOne("marketplace.product", Product, "product", "marketplace.product_address = product.address")
      .orderBy("marketplace.priceInDecimal")
      .getOne();

    if (!item) return null;

    const offerList = await this.marketplaceRepository.find({
      where: {
        product_address: item.product_address,
        chainId: chainId,
        isExpired: false,
        isSold: false
      },
    });

    let totalOfferLots = 0;
    const offers = offerList.map((offer) => {
      totalOfferLots += offer.quantityInDecimal;
      return {
        id: offer.id,
        tokenId: offer.tokenId,
        listingId: offer.listingId,
        price: offer.priceInDecimal,
        quantity: offer.quantityInDecimal,
        startingTime: offer.startingTime,
        seller: offer.seller,
      };
    })

    const product = await this.productRepository.findOne({
      where: {
        address: item.product_address,
      },
    });

    const depositList = await this.historyRepository.find({
      where: {
        productId: product!.id,
        type: HISTORY_TYPE.DEPOSIT
      },
      order: {
        created_at: 'DESC'
      }
    });

    const depositActivity = depositList.map((history) => {
      return {
        date: history.created_at,
        amount: history.amountInDecimal,
        lots: history.amountInDecimal / 1000,
        txhash: history.transactionHash
      }
    });

    return {
      offerPrice: item.priceInDecimal,
      offerLots: item.quantityInDecimal,
      totalLots: totalOfferLots,
      mtmPrice: item.product.mtmPrice,
      underlying: item.product.underlying,
      productAddress: item.product.address,
      name: item.product.name,
      issuanceCycle: item.product.issuanceCycle,
      vaultStrategy: item.product.vaultStrategy,
      risk: item.product.risk,
      fees: item.product.fees,
      counterparties: item.product.counterparties,
      estimatedApy: item.product.estimatedApy,
      offers: offers,
      deposits: depositActivity
    };
  }
}
