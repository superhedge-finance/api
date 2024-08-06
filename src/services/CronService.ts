// import * as cron from "node-cron";
// import { Inject, Injectable } from "@tsed/di";
// // import { REDIS_CONNECTION } from "../dal/RedisConnection";
// import { ContractService } from "./ContractService";
// import { ProductService } from "../apis/product/services/ProductService";
// import { HISTORY_TYPE, WITHDRAW_TYPE } from "../shared/enum";
// import { MarketplaceRepository, UserRepository, Product } from "../dal";
// import { SUPPORT_CHAINS } from "../shared/constants";

// @Injectable()
// export class CronService {
//   // @Inject(REDIS_CONNECTION)
//   // protected connection: REDIS_CONNECTION; // ioredis instance

//   @Inject()
//   private readonly contractService: ContractService;

//   @Inject()
//   private readonly productService: ProductService;

//   @Inject(MarketplaceRepository)
//   private readonly marketplaceRepository: MarketplaceRepository;

//   @Inject(UserRepository)
//   private readonly userRepository: UserRepository;

//   $onInit() {
//     // https://crontab.guru/#*/3_*_*_*_* (At every 3th minute)
//     cron.schedule("*/3 * * * *", async () => {
//       for (const chainId of SUPPORT_CHAINS) {
//         const lastBlockNumber = await this.contractService.getLatestBlockNumber(chainId);
//         const pastEvents = await this.contractService.getPastEvents(chainId, "ProductCreated", lastBlockNumber - 50, lastBlockNumber);
//         await this.productService.syncProducts(chainId, pastEvents);
//         const products = await this.productService.getProductsWithoutStatus(chainId);
//         for (const product of products) {
//           const stats = await this.contractService.getProductStats(chainId, product.address);
//           await this.productService.updateProduct(chainId, product.address, stats);

//           const pastDepositEvents = await this.contractService.getProductPastEvents(
//             chainId,
//             product.address,
//             "Deposit",
//             lastBlockNumber - 50,
//             lastBlockNumber,
//           );
//           await this.productService.syncHistories(chainId, product.id, HISTORY_TYPE.DEPOSIT, pastDepositEvents);

//           const withdrawEvents = await this.contractService.getProductPastEvents(
//             chainId,
//             product.address,
//             "WithdrawPrincipal",
//             lastBlockNumber - 50,
//             lastBlockNumber,
//           );
//           await this.productService.syncHistories(chainId, product.id, HISTORY_TYPE.WITHDRAW, withdrawEvents, WITHDRAW_TYPE.PRINCIPAL);

//           const withdrawCouponEvents = await this.contractService.getProductPastEvents(
//             chainId,
//             product.address,
//             "WithdrawCoupon",
//             lastBlockNumber - 50,
//             lastBlockNumber,
//           );
//           await this.productService.syncHistories(chainId, product.id, HISTORY_TYPE.WITHDRAW, withdrawCouponEvents, WITHDRAW_TYPE.COUPON);

//           const withdrawOptionEvents = await this.contractService.getProductPastEvents(
//             chainId,
//             product.address,
//             "WithdrawOption",
//             lastBlockNumber - 50,
//             lastBlockNumber,
//           );
//           await this.productService.syncHistories(chainId, product.id, HISTORY_TYPE.WITHDRAW, withdrawOptionEvents, WITHDRAW_TYPE.OPTION);
          
//           // const weeklyCouponEvents = await this.contractService.getProductPastEvents(
//           //   chainId,
//           //   product.address,
//           //   "WeeklyCoupon",
//           //   lastBlockNumber - 50,
//           //   lastBlockNumber,
//           // );
//           // await this.productService.syncHistories(chainId, product.id, HISTORY_TYPE.WEEKLY_COUPON, weeklyCouponEvents);

//           const OptionPayoutEvents = await this.contractService.getProductPastEvents(
//             chainId,
//             product.address,
//             "OptionPayout",
//             lastBlockNumber - 50,
//             lastBlockNumber,
//           );
//           await this.productService.syncHistories(chainId, product.id, HISTORY_TYPE.OPTION_PAYOUT, OptionPayoutEvents);

//           const matureEvents = await this.contractService.getProductPastEvents(
//             chainId,
//             product.address,
//             "Mature",
//             lastBlockNumber - 50,
//             lastBlockNumber,
//           );
//           if (matureEvents.length > 0) {
//             const marketplaceEntities = await this.marketplaceRepository.find({
//               where: {
//                 product_address: product.address,
//               },
//             });
//             for (const marketplaceEntity of marketplaceEntities) {
//               marketplaceEntity.isExpired = true;
//               await this.marketplaceRepository.save(marketplaceEntity);
//             }
//           }
//         }
//       }
//     });

//     cron.schedule("*/3 * * * *", async () => {
//       for (const chainId of SUPPORT_CHAINS) {
//         const lastBlockNumber = await this.contractService.getLatestBlockNumber(chainId);

//         const pastItemListedEvents = await this.contractService.getMarketplacePastEvents(
//           chainId,
//           "ItemListed",
//           lastBlockNumber - 50,
//           lastBlockNumber,
//         );
//         for (const event of pastItemListedEvents) {
//           if (event.args) {
//             await this.marketplaceRepository.syncItemListedEntity(
//               chainId,
//               event.args.owner,
//               event.args.nft,
//               event.args.product,
//               event.args.tokenId,
//               event.args.quantity,
//               event.args.payToken,
//               event.args.pricePerItem,
//               event.args.startingTime,
//               event.args.listingId,
//               event.transactionHash,
//             );
//           }
//         }

//         const pastItemSoldEvents = await this.contractService.getMarketplacePastEvents(
//           chainId,
//           "ItemSold",
//           lastBlockNumber - 50,
//           lastBlockNumber,
//         );
//         for (const event of pastItemSoldEvents) {
//           if (event.args) {
//             const listingId = event.args.listingId;
//             const buyer = event.args.buyer;
//             const seller = event.args.seller;
//             const marketplace = await this.marketplaceRepository
//               .createQueryBuilder("marketplace")
//               .where("marketplace.listing_id = :listingId", { listingId: listingId.toString() })
//               .leftJoinAndMapOne("marketplace.product", Product, "product", "marketplace.product_address = product.address")
//               .getOne();

//             if (!marketplace) return null;

//             await this.marketplaceRepository
//               .syncItemSoldEntity(
//                 chainId,
//                 event.args.seller,
//                 event.args.buyer,
//                 event.args.unitPrice,
//                 event.args.listingId,
//                 event.transactionHash,
//               )
//               .then(async () => {
//                 await this.userRepository.saveProductId(buyer, marketplace.product.id);

//                 const _principal = await this.contractService.getProductPrincipalBalance(chainId, seller, marketplace.product_address);
//                 if (_principal) {
//                   await this.userRepository.removeProductId(seller, marketplace.product.id);
//                 }
//               });
//           }
//         }

//         const pastItemCancelledEvents = await this.contractService.getMarketplacePastEvents(
//           chainId,
//           "ItemCanceled",
//           lastBlockNumber - 50,
//           lastBlockNumber,
//         );
//         for (const event of pastItemCancelledEvents) {
//           if (event.args) {
//             await this.marketplaceRepository.syncItemCanceledEntity(chainId, event.args.owner, event.args.listingId, event.transactionHash);
//           }
//         }

//         const pastItemUpdatedEvents = await this.contractService.getMarketplacePastEvents(
//           chainId,
//           "ItemUpdated",
//           lastBlockNumber - 50,
//           lastBlockNumber,
//         );
//         for (const event of pastItemUpdatedEvents) {
//           if (event.args) {
//             await this.marketplaceRepository.syncItemUpdatedEntity(
//               chainId,
//               event.args.owner,
//               event.args.payToken,
//               event.args.newPrice,
//               event.args.listingId,
//               event.transactionHash,
//             );
//           }
//         }
//       }
//     });
//   }
// }
