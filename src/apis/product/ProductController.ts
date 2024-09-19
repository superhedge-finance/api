import { Controller, Inject } from "@tsed/di";
import { Get, Post, Returns } from "@tsed/schema";
import { BodyParams, PathParams, QueryParams } from "@tsed/platform-params";
import { ContractService } from "../../services/ContractService";
import { ProductService } from "./services/ProductService";
import { CreatedProductDto } from "./dto/CreatedProductDto";
import { ProductDetailDto } from "./dto/ProductDetailDto";
import { Not, UpdateResult } from "typeorm";
// import { CronService } from "../../services/CronService";

@Controller("/products")
export class ProductController {
  @Inject()
  private readonly productService: ProductService;

  @Inject()
  // private readonly cronService: CronService;

  @Inject()
  private readonly contractService: ContractService;

  @Get("")
  @Returns(200, Array<CreatedProductDto>)
  async getProducts(@QueryParams("chainId") chainId: number): Promise<Array<CreatedProductDto>> {
    return await this.productService.getProducts(chainId);
  }

  @Get("/:address")
  @Returns(200, ProductDetailDto)
  async getProduct(@PathParams("address") address: string, @QueryParams("chainId") chainId: number): Promise<ProductDetailDto | null> {
    return await this.productService.getProduct(chainId, address);
  }

  @Get("/sync-products/:block")
  async syncProducts(@PathParams("block") block: number, @QueryParams("chainId") chainId: number): Promise<void> {
    const pastEvents = await this.contractService.getPastEvents(chainId, "ProductCreated", block - 10, block + 10);
    await this.productService.syncProducts(chainId, pastEvents);
  }

  @Post("/get-withdraw-list")
  async getWithdrawList(
    @QueryParams("productAddress") product:string
  ):Promise<{addressesList: string[], amountsList: number[]}>{
    return this.productService.getWithdrawList(product);
  }

  @Post("/update-withdraw-request")
  async updateWithdrawRequest(
    @BodyParams() body: {chainId: number, product: string, address: string, txid: string , amountPtUnwindPrice: number, amountOptionUnwindPrice: number }
  ): Promise<{result:string}> {
    const {chainId, product, address,txid,amountPtUnwindPrice,amountOptionUnwindPrice } = body;
    return this.productService.updateWithdrawRequest(chainId,product, address,txid,amountPtUnwindPrice,amountOptionUnwindPrice);
  }


  @Post("/get-admin-wallet")
  async getAdminWallet(
    @QueryParams("chainId") chainId: number,
    @QueryParams("productAddress") productAddress: string,
  ): Promise<{resultPublicKey:string}> {
    return this.productService.getAdminWallet(chainId,productAddress);
  }

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

  @Post("/get-holder-list")
  // @Returns(200, Array<{ balanceToken: number[], ownerAddress: string[] }>)
  async getHolderList(
    @QueryParams("tokenAddress") tokenAddress: string,
    @QueryParams("chainId") chainId: number
  ): Promise<{ balanceToken: number[]; ownerAddress: string[] }> {
    return this.productService.getHolderList(tokenAddress,chainId);
  }

  // @Post("/get-amount-out-min")
  // // @Returns(200,"Failed")
  // async getAmountOutMin(
  //   @QueryParams("chainId") chainId: number,
  //   @QueryParams("walletAddress") walletAddress: string,
  //   @QueryParams("productAddress") productAddress: string,
  //   @QueryParams("noOfBlock") noOfBlock: number
  // ): Promise<{amountTokenOut: number}>{
  //   return this.productService.getAmountOutMin(chainId,walletAddress,productAddress,noOfBlock);
  // }

  // @Post("/get-option-position")
  // // @Returns(200,"Failed")
  // async getTotalOptionPosition(
  //   // @QueryParams("chainId") chainId: number,
  //   // @QueryParams("walletAddress") walletAddress: string,
  //   // @QueryParams("productAddress") productAddress: string,
  //   // @QueryParams("noOfBlock") noOfBlock: number
  // ): Promise<{amountOptionPosition: number}>{
  //   return this.productService.getTotalOptionPosition();
  // }

  @Post("/get-option-position")
  async getTotalOptionPosition(
    @BodyParams() body: { instrumentArray: string[]; directionArray: string[] }
  ): Promise<{ totalAmountPosition: number }> {
    const { instrumentArray, directionArray } = body;

    // // Validate input arrays
    // if (!Array.isArray(instrumentArray) || !Array.isArray(directionArray)) {
    //   throw new Error("Invalid input: instruments and directions must be arrays.");
    // }

    // if (instrumentArray.length !== directionArray.length) {
    //   throw new Error("Invalid input: instruments and directions must have the same length.");
    // }

    // Call the service method with the input arrays
    return this.productService.getTotalOptionPosition(instrumentArray, directionArray);
  }


  @Post("/get-direction-instrument")
  // @Returns(200,"Failed")
  async getDirectionInstrument(
    @QueryParams("subAccountId") subAccountId: string,
  ): Promise<{instrumentArray: string[], directionArray: string[]}>{
    return this.productService.getDirectionInstrument(subAccountId);
  }

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

  @Post("/get-pt-and-position")
  // @Returns(200,"Failed")
  async getPtAndOption(
    @QueryParams("chainId") chainId: number,
    @QueryParams("walletAddress") walletAddress: string,
    @QueryParams("productAddress") productAddress: string,
    @QueryParams("noOfBlock") noOfBlock: number
  ): Promise<{amountToken: number, amountOption:number}>{
    return this.productService.getPtAndOption(chainId,walletAddress,productAddress,noOfBlock);
  }

  // @Post("/get-pt-position")
  // // @Returns(200,"Failed")
  // async getAmountPtOption(
  //   @QueryParams("chainId") chainId: number,
  //   @QueryParams("walletAddress") walletAddress: string,
  //   @QueryParams("productAddress") productAddress: string,
  //   @QueryParams("noOfBlock") noOfBlock: number
  // ): Promise<{amountToken: number, amountOption:number}>{
  //   return this.productService.getAmountPtOption(chainId,walletAddress,productAddress,noOfBlock);
  // }



}


