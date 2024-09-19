import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract , Wallet} from "ethers";
import { History, Product, ProductRepository, WithdrawRequest,WithdrawRequestRepository,UserRepository } from "../../../dal";
// import { CreatedProductDto } from "../dto/CreatedProductDto";
// import { ProductDetailDto } from "../dto/ProductDetailDto";
// import { CycleDto } from "../dto/CycleDto";
// import { StatsDto } from "../dto/StatsDto";
import { HistoryRepository } from "../../../dal/repository/HistoryRepository";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../../shared/enum";
// import { DECIMAL } from "../../../shared/constants";
// import { RPC_PROVIDERS, SUPPORT_CHAINS } from "../../../shared/constants";
// import PRODUCT_ABI from "../../../services/abis/SHProduct.json";
// import ERC20_ABI from "../../../services/abis/ERC20.json";
// import PT_ABI from "../../../services/abis/PTToken.json";

@Injectable()
export class WebhookService {

  private readonly provider: { [chainId: number]: ethers.providers.JsonRpcProvider } = {};

  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

//   @Inject(HistoryRepository)
//   private readonly historyRepository: HistoryRepository;

  @Inject(WithdrawRequestRepository)
  private readonly withdrawRequestRepository: WithdrawRequestRepository;

  @Inject(UserRepository)
  private readonly userRepository: UserRepository;

  async handleWebhook(body: any) {
    let productAddress
    let userAddress
    let amountToken
    // console.log(body)
    // console.log(body.erc20Transfers)
    const chainId = parseInt(body.chainId, 16);
    console.log(chainId)
    const trans1 = body.erc20Transfers[0]
    const trans2 = body.erc20Transfers[1]

    const txHash = body.logs[0].transactionHash

    if(trans1.to === '0x000000000000000000000000000000000000dead')
    {
        // WithdrawPrincipal
        console.log('WithdrawPrincipal')
        productAddress = trans2.from
        userAddress = trans2.to
        amountToken = trans2.value

        const {productSumAddress,userSumAddress} = await this.checkSumAddress(productAddress,userAddress)
        const {productId} = await this.getProductId(productSumAddress, chainId)
        await this.saveTransactionHistory(chainId,userSumAddress,txHash, 'WithdrawPrincipal' , productId,amountToken)
        await this.removeroductIdUser(productId,userSumAddress)
    }
    else{
        // Deposit
        console.log('Deposit')
        productAddress = trans1.to
        userAddress = trans1.from
        amountToken = trans1.value
        const {productSumAddress,userSumAddress} = await this.checkSumAddress(productAddress,userAddress)
        const {productId} = await this.getProductId(productSumAddress, chainId)
        await this.saveTransactionHistory(chainId,userSumAddress,txHash, 'Deposit' , productId,amountToken)
        await this.saveProductIdUser(productId,userSumAddress)
    }
  }

  async checkSumAddress(productAddress: string,userAddress: string ):Promise<{productSumAddress:string, userSumAddress: string}>
  {
    const productSumAddress = ethers.utils.getAddress(productAddress)
    const userSumAddress = ethers.utils.getAddress(userAddress)
    return {productSumAddress,userSumAddress}
  }

  async saveProductIdUser(productId:number,userAddress: string)
  {
    try
    {
      this.userRepository.saveProductId(userAddress, productId).then(() => console.log("Product ID saved to user entity"));
    }
    catch(e){
        console.log(e)
      }
  }

  async removeroductIdUser(productId: number, userAddress: string)
  {
    try
    {
      this.userRepository.removeProductId(userAddress,productId).then(() => console.log("Product ID removed from user entity"));
    }
    catch(e){
        console.log(e)
      }
  }

  async getProductId(productSumAddress: string, chainId: number):Promise<{productId: number}>
  {
    const product = await this.productRepository.findOne({
      where: {
        address: productSumAddress,
        chainId: chainId,
        isPaused: false,
      },
    });
    const productId = Number(product?.id)
    return {productId}
  }

  async saveTransactionHistory(chainId: number,userAddress: string,txHash: string, eventName: string , productId: number, amountToken: BigNumber)
  {
    let withdrawType: WITHDRAW_TYPE = WITHDRAW_TYPE.NONE;
    let type: HISTORY_TYPE;
    if (eventName === "WithdrawPrincipal") {
      withdrawType = WITHDRAW_TYPE.PRINCIPAL;
      type = HISTORY_TYPE.WITHDRAW;
    } else {
      type = HISTORY_TYPE.DEPOSIT;
    }
    console.log("amountToken")
    console.log(amountToken)
    console.log(typeof amountToken)
    this.historyRepository
                  .createHistory(
                    chainId,
                    userAddress,
                    ethers.BigNumber.from(amountToken),
                    txHash,
                    0,
                    type,
                    withdrawType,
                    productId,
                    ethers.BigNumber.from(0),
                    ethers.BigNumber.from(0),
                  )
                  .then(() => console.log("History saved"));
  }

}
