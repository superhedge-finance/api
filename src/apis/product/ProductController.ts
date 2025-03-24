import { Controller, Inject } from "@tsed/di";
// import { Res } from "@tsed/common";
import { Get, Post, Returns } from "@tsed/schema";
import { BodyParams, PathParams, QueryParams } from "@tsed/platform-params";
import { ContractService } from "../../services/ContractService";
import { ProductService } from "./services/ProductService";
import { EarlyWithdrawService } from "./services/EarlyWithdrawService";
import { CreatedProductDto } from "./dto/CreatedProductDto";
import { ProductDetailDto } from "./dto/ProductDetailDto";
import { AdminWalletDto } from "./dto/AdminWalletDto";
// import { Not, UpdateResult } from "typeorm";
// import { CronService } from "../../services/CronService";
// import { BigNumber} from "ethers";
import { GetPtAndOptionDto } from "../user/dto/GetPtAndOptionDto";
import { GetHolderListDto } from "./dto/GetHolderListDto";

@Controller("/products")
export class ProductController {
  @Inject()
  private readonly productService: ProductService;

  @Inject()
  private readonly earlyWithdrawService: EarlyWithdrawService;

  @Inject()
  private readonly contractService: ContractService;

  @Get("")
  @Returns(200, Array<CreatedProductDto>)
  async getProducts(@QueryParams("chainId") chainId: number): Promise<Array<CreatedProductDto>> {
    return await this.productService.getProducts(chainId);
  }

  @Get("/get-admin-wallet")
  @Returns(200, AdminWalletDto)
  async getAdminWallet(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string,
  ): Promise<AdminWalletDto | null> {
    console.log("getAdminWalletTest")
    return await this.productService.getAdminWalletTest(chainId,productAddress);
  }

  @Post("/get-withdraw-list")
  async getWithdrawList(
    @QueryParams("productAddress") product:string
  ):Promise<{addressesList: string[], amountsList: number[]}>{
    return this.productService.getWithdrawList(product);
  }

  @Post("/update-withdraw-request")
  async updateWithdrawRequest(
    @BodyParams() body: {chainId: number, product: string, address: string, txid: string , amountPtUnwindPrice: string, amountOptionUnwindPrice: string }
  ): Promise<{result:string}> {
    const {chainId, product, address,txid,amountPtUnwindPrice,amountOptionUnwindPrice } = body;
    return this.earlyWithdrawService.updateWithdrawRequest(chainId,product, address,txid,amountPtUnwindPrice,amountOptionUnwindPrice);
  }

  // @Post("/get-admin-wallet")
  // async getAdminWallet(
  //   @QueryParams("chainId") chainId: number,
  //   @QueryParams("productAddress") productAddress: string,
  // ): Promise<{resultPublicKey:string}> {
  //   return await this.productService.getAdminWallet(chainId,productAddress);
  // }

  @Post("/update-product-user")
  async saveProductUser(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string,
    @QueryParams("addressWallet") addressWallet: string,
    @QueryParams("txid") txid: string
  ): Promise<void>{
    return this.productService.saveProductUser(chainId,productAddress,addressWallet,txid);
  }

  // @Post("/request-withdraw")
  // async requestWithdraw(
  //   @BodyParams("address") address: string,
  //   @BodyParams("product") product: string,
  //   @QueryParams("chainId") chainId: number,
  // ): Promise<void> {
  //   // const currentTokenId = await this.contractService.validateWithdrawRequest(chainId, address, product);
  //   const currentTokenId = "56"
  //   return this.productService.requestWithdraw(address, product, currentTokenId);
  // }

  // @Post("/cancel-withdraw")
  // async cancelWithdraw(
  //   @BodyParams("address") address: string,
  //   @BodyParams("product") product: string,
  //   @QueryParams("chainId") chainId: number,
  // ): Promise<void> {
  //   return this.productService.cancelWithdraw(chainId, address, product);
  // }

  // @Get("/get-holder-list")
  // @Returns(200, holders)
  // async getHolderList(
  //   // @QueryParams("chainId") chainId: number,
  //   @QueryParams("tokenAdress") token: string,
  // ): Promise<{holders: { balance: number; ownerAddress: string }[]}> {
  //   return this.productService.getHolderList(token);
  // }

  // @Get("/get-holder-list")
  // // @Returns(200, Array<{ balanceToken: number[], ownerAddress: string[] }>)
  // async getHolderList(
  //   @QueryParams("tokenAddress") tokenAddress: string,
  //   @QueryParams("chainId") chainId: number
  // ): Promise<GetHolderListDto> {
  //   return this.productService.getHolderList(tokenAddress,chainId);
  // }


  // @Post("/get-option-position")
  // async getTotalOptionPosition(
  //   @BodyParams() body: { instrumentArray: string[]; directionArray: string[] }
  // ): Promise<{ totalAmountPosition: number }> {
  //   const { instrumentArray, directionArray } = body;
  //   return this.productService.getTotalOptionPosition(instrumentArray, directionArray);
  // }


  // @Post("/get-direction-instrument")
  // // @Returns(200,"Failed")
  // async getDirectionInstrument(
  //   @QueryParams("subAccountId") subAccountId: string,
  // ): Promise<{instrumentArray: string[], directionArray: string[]}>{
  //   return this.productService.getDirectionInstrument(subAccountId);
  // }

  // @Post("/get-user-option-position")
  // // @Returns(200,"Failed")
  // async getUserOptionPosition(
  //   @QueryParams("chainId") chainId: number,
  //   @QueryParams("walletAddress") walletAddress: string,
  //   @QueryParams("productAddress") productAddress: string,
  //   @QueryParams("noOfBlock") noOfBlock: number,
  //   @QueryParams("totalOptionPosition") totalOptionPosition: number
  // ): Promise<{userOptionPosition: number}>{
  //   return this.productService.getUserOptionPosition(chainId,walletAddress,productAddress,noOfBlock,totalOptionPosition);
  // }

  // @Post("/get-pt-and-position")
  // // @Returns(200,"Failed")
  // async getPtAndOption(
  //   @QueryParams("chainId") chainId: number,
  //   @QueryParams("walletAddress") walletAddress: string,
  //   @QueryParams("productAddress") productAddress: string,
  //   @QueryParams("noOfBlock") noOfBlock: number
  // ): Promise<{amountToken: number, amountOption:number}>{
  //   return this.productService.getPtAndOption(chainId,walletAddress,productAddress,noOfBlock);
  // }

  @Get("/get-pt-and-position")
  // @Returns(200,"Failed")
  async getPtAndOptionNew(
    @QueryParams("chainId") chainId: number,
    @QueryParams("walletAddress") walletAddress: string,
    @QueryParams("productAddress") productAddress: string,
    @QueryParams("noOfBlock") noOfBlock: number
  ): Promise<GetPtAndOptionDto>{
    return this.earlyWithdrawService.getPtAndOption(chainId,walletAddress,productAddress,noOfBlock);
  }

  @Post("/change-unwind-margin")
  async changeUnwindMargin(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string,
    @QueryParams("unwindMarginValue") unwindMarginValue: number,
    @QueryParams("signatureAdmin") signatureAdmin: string,
  ): Promise<void>{
    console.log("changeUnwindMargin")
    this.productService.changeUnwindMargin(chainId,productAddress,unwindMarginValue,signatureAdmin);
  }

  @Post("/get-unwind-margin")
  async getUnwindMargin(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string,
  ): Promise<{unwindMargin: number}>{
    console.log("getUnwindMargin")
    return this.productService.getUnwindMargin(chainId,productAddress);
  }

  @Post("/change-expired-flag")
  async changeExpiredFlag(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string,
    @QueryParams("expiredFlag") expiredFlag: boolean,
    @QueryParams("signatureAdmin") signatureAdmin: string,
  ): Promise<void>{
    this.productService.changeExpiredFlag(chainId,productAddress,expiredFlag,signatureAdmin);
  }

  @Get("/get-token-holder-list-coupon")
  async getTokenHolderListForCoupon(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string
  ): Promise<GetHolderListDto> {
    console.log("getTokenHolderListForCoupon");
    return await this.productService.getTokenHolderListForCoupon(chainId, productAddress);
  }

  // @Get("/get-token-holder-list-profit")
  // async getTokenHolderListForProfit(
  //   @QueryParams("chainId") chainId: number,
  //   @QueryParams("productAddress") productAddress: string
  // ): Promise<GetHolderListDto> {
  //   return await this.productService.getTokenHolderListForProfit(chainId, productAddress);
  // }

  @Post("/get-total-option-blocks")
  async getTotalOptionBlocks(
    @QueryParams("productAddress") productAddress: string,
  ): Promise<{noOfBlocks: number }> {
    return this.productService.getTotalOptionBlocks(productAddress);
  }

  @Post("/get-user-option-blocks")
  async getUserOptionBlocks(
    @QueryParams("productAddress") productAddress: string,
    @QueryParams("userAddress") userAddress: string,
  ): Promise<{noOfBlocks: number }> {
    return this.productService.getUserOptionBlocks(productAddress,userAddress);
  }
  // @PathParams should be on endline

  @Get("/:address")
  @Returns(200, ProductDetailDto)
  async getProduct(@PathParams("address") address: string, @QueryParams("chainId") chainId: number): Promise<ProductDetailDto | null> {
    return await this.productService.getProduct(chainId, address);
  }

  @Get("/sync-products/:block")
  async syncProducts(
    @PathParams("block") block: number,
    @QueryParams("chainId") chainId: number,
    @QueryParams("factoryAddress") factoryAddress: string
  ): Promise<void> {
    const pastEvents = await this.contractService.getPastEvents(
      chainId,
      factoryAddress,
      "ProductCreated",
      block - 10,
      block + 10
    );
    await this.productService.syncProducts(chainId, pastEvents);
  }

  @Post("/get-token-holder-list-final")
  async getTokenHolderListTest(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string
  ): Promise<string> {
    return await this.productService.getHolderListTest(chainId, productAddress);
  }

}


