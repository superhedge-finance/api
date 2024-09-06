import { Controller, Inject } from "@tsed/di";
import { ContractService } from "../../services/ContractService";
import { ProductService } from "../product/services/ProductService";
import { HistoryRepository, UserRepository, Product } from "../../dal";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../shared/enum";
import { DECIMAL, SUPPORT_CHAINS } from "../../shared/constants";
import { ethers, constants } from "ethers";
import * as cron from "node-cron";

@Controller("/events")
export class EventsController {
  @Inject()
  private readonly contractService: ContractService;

  @Inject()
  private readonly productService: ProductService;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

  @Inject(UserRepository)
  private readonly userRepository: UserRepository;

  $onInit() {
    // listen to get transaction from on chain event
    console.log(SUPPORT_CHAINS);
    for (const chainId of SUPPORT_CHAINS) {
      console.log(chainId)
      this.contractService.subscribeToEvents(chainId, "ProductCreated", () => {
        this.contractService.getLatestBlockNumber(chainId).then((blockNumber) => {
          console.log(blockNumber)
          this.contractService.getPastEvents(chainId, "ProductCreated", blockNumber - 50, blockNumber).then((pastEvents) => {
            console.log(pastEvents)
            this.productService.syncProducts(chainId, pastEvents).then((r) => console.log(r));
            console.log("running")
            // create wallet = public key/privatekey
          });
        });
      });

      this.contractService.subscribeToEvents(chainId, "ProductUpdated", (event) => {
        this.productService.updateProductName(chainId, event[0], event[1]).then(() => {
          console.log("Product name was updated")
        });
      });

      console.log("getProductsWithoutStatus")
      this.productService.getProductsWithoutStatus(chainId).then((products) => {
        // console.log(products)
        products.forEach((product) => {
          // console.log(this.contractService.subscribeToProductEvents)
          this.contractService.subscribeToProductEvents(
            chainId,
            product.address,
            [
              "Deposit",
              "WithdrawPrincipal",
              "WithdrawCoupon",
              "WithdrawOption",
              "FundAccept",
              "FundLock",
              "Issuance",
              "OptionPayout",
              "Mature",
              "Unpaused",
              "Paused",
            ],
            (eventName, event) => {
              console.log("1")
              if (eventName === "Paused" || eventName === "Unpaused") {
                this.productService.updateProductPauseStatus(
                  chainId, product.address, eventName === "Paused"
                ).then((r) => console.log(r)); //0x034b77de27a111ace710c531b518d6b9ffb570842efa5fad909fccfcd4b14257
              } else {
                this.contractService.getProductStats(chainId, product.address).then((stats) => {
                  this.productService.updateProduct(chainId, product.address, stats).then((r) => console.log(r));
                });
              }
              console.log("Check event")
              // if (["Deposit", "WithdrawPrincipal", "WithdrawCoupon", "WithdrawOption", "WeeklyCoupon", "OptionPayout"].includes(eventName)) {
              if (["Deposit", "WithdrawPrincipal", "WithdrawCoupon", "WithdrawOption", "OptionPayout"].includes(eventName)) {
                let withdrawType: WITHDRAW_TYPE = WITHDRAW_TYPE.NONE;
                let type: HISTORY_TYPE;

                if (eventName === "WithdrawPrincipal") {
                  withdrawType = WITHDRAW_TYPE.PRINCIPAL;
                  type = HISTORY_TYPE.WITHDRAW;
                } else if (eventName === "WithdrawCoupon") {
                  withdrawType = WITHDRAW_TYPE.COUPON;
                  type = HISTORY_TYPE.WITHDRAW;
                } else if (eventName === "WithdrawOption") {
                  withdrawType = WITHDRAW_TYPE.OPTION;
                  type = HISTORY_TYPE.WITHDRAW;
                } else if (eventName === "Deposit") {
                  type = HISTORY_TYPE.DEPOSIT;
                } else {
                  type = HISTORY_TYPE.OPTION_PAYOUT;
                }

                // else if (eventName === "WeeklyCoupon") {
                //   type = HISTORY_TYPE.WEEKLY_COUPON;
                // } 

                const address = event.args._user;
                
                this.historyRepository
                  .createHistory(
                    chainId,
                    address,
                    event.args._amount,
                    event.transactionHash,
                    event.logIndex,
                    type,
                    withdrawType,
                    product.id,
                    event.args._tokenId,
                    event.args._supply,
                  )
                  .then(() => console.log("History saved"));
                
                console.log("Paul Address")
                console.log(address)
                console.log(product.id)
                this.userRepository.saveProductId(address, product.id).then(() => console.log("Product ID saved to user entity"));
                console.log("getProductPrincipalBalance")
                this.contractService.getProductPrincipalBalance(chainId, address, product.address).then((_principal) => {
                  if (_principal) {
                    this.userRepository.removeProductId(address, product.id).then(() => console.log("Product ID removed from user entity"));
                  }
                });
              }

              // if (eventName === "Mature") {
              //   this.marketplaceRepository
              //     .find({
              //       where: {
              //         chainId: chainId,
              //         product_address: product.address,
              //       },
              //     })
              //     .then((marketplaceEntities) => {
              //       for (const marketplaceEntity of marketplaceEntities) {
              //         marketplaceEntity.isExpired = true;
              //         this.marketplaceRepository.save(marketplaceEntity).then(
              //           () => console.log("Marketplace entity updated")
              //         );
              //       }
              //     });
              // }
            },
          );
        });
      }).catch((e:any) => {console.log(e)});
      
      // this.contractService.subscribeToMarketplaceEvents(
      //   chainId,
      //   ["ItemListed", "ItemSold", "ItemCanceled", "ItemUpdated"],
      //   async (eventName, event) => {
      //     if (eventName === "ItemListed") {
      //       this.marketplaceRepository
      //         .syncItemListedEntity(
      //           chainId,
      //           event.args.owner,
      //           event.args.nft,
      //           event.args.product,
      //           event.args.tokenId,
      //           event.args.quantity,
      //           event.args.payToken,
      //           event.args.pricePerItem,
      //           event.args.startingTime,
      //           event.args.listingId,
      //           event.transactionHash,
      //         )
      //         .then((r) => console.log(r));
      //     } else if (eventName === "ItemSold") {
      //       const listingId = event.args.listingId;
      //       const buyer = event.args.buyer;
      //       const seller = event.args.seller;
      //       const marketplace = await this.marketplaceRepository
      //         .createQueryBuilder("marketplace")
      //         .where("marketplace.listing_id = :listingId", { listingId: listingId.toString() })
      //         .leftJoinAndMapOne("marketplace.product", Product, "product", "marketplace.product_address = product.address")
      //         .getOne();
      //       if (!marketplace) return null;

      //       this.marketplaceRepository
      //         .syncItemSoldEntity(
      //           chainId,
      //           event.args.seller,
      //           event.args.buyer,
      //           event.args.unitPrice,
      //           event.args.listingId,
      //           event.transactionHash,
      //         )
      //         .then(() => {
      //           this.userRepository
      //             .saveProductId(buyer, marketplace.product.id)
      //             .then(() => console.log("Item sold & Product saved to buyer's position"));

      //           this.contractService.getProductPrincipalBalance(chainId, seller, marketplace.product_address).then((_principal) => {
      //             if (_principal) {
      //               this.userRepository
      //                 .removeProductId(seller, marketplace.product.id)
      //                 .then(() => console.log("Product ID removed from seller entity"));
      //             }
      //           });
      //         });
      //     } else if (eventName === "ItemCanceled") {
      //       this.marketplaceRepository
      //         .syncItemCanceledEntity(chainId, event.args.owner, event.args.listingId, event.transactionHash)
      //         .then((r) => console.log(r));
      //     } else if (eventName === "ItemUpdated") {
      //       this.marketplaceRepository
      //         .syncItemUpdatedEntity(
      //           chainId,
      //           event.args.owner,
      //           event.args.payToken,
      //           event.args.newPrice,
      //           event.args.listingId,
      //           event.transactionHash,
      //         )
      //         .then((r) => console.log(r));
      //     }
      //   },
      // );
    }

    cron.schedule("*/1 * * * *", async () => {
      for (const chainId of SUPPORT_CHAINS) {
        const products = await this.productService.getProducts(chainId)
        const productList = products.map(products => products.address);
        // await this.productService.createWallet()
        for (const productAddress of productList){
          const {addressesList,amountsList} = await this.productService.getWithdrawList(productAddress)  
          if(addressesList && addressesList.length >0)
          {
            const txResult = await this.productService.storeOptionPosition(chainId,productAddress,addressesList,amountsList)
            await this.productService.updateWithdrawRequestStatus(productAddress,addressesList)
            // console.log(addressesList)
            // console.log(amountsList)
            // console.log(txResult)
          }

          
        }
      }
    });
  }
}
