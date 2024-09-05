import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract , Wallet} from "ethers";
import { History, Product, ProductRepository, WithdrawRequest,WithdrawRequestRepository,UserRepository } from "../../dal";
// import { CreatedProductDto } from "../dto/CreatedProductDto";
// import { ProductDetailDto } from "../dto/ProductDetailDto";
// import { CycleDto } from "../dto/CycleDto";
// import { StatsDto } from "../dto/StatsDto";
// import { HistoryRepository } from "../../../dal/repository/HistoryRepository";
// import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../../shared/enum";
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

//   @Inject(HistoryRepository)
//   private readonly historyRepository: HistoryRepository;

  @Inject(WithdrawRequestRepository)
  private readonly withdrawRequestRepository: WithdrawRequestRepository;

  @Inject(UserRepository)
  private readonly userRepository: UserRepository;

  async handleWebhook(body: any) {
    let productAddress
    let userAddress
    // console.log(body)
    // console.log(body.erc20Transfers)

    const trans1 = body.erc20Transfers[0]
    const trans2 = body.erc20Transfers[1]

    if(trans1.to === '0x000000000000000000000000000000000000dead')
    {
        // WithdrawPrincipal
        console.log('WithdrawPrincipal')
        productAddress = trans2.from
        userAddress = trans2.to
        await this.removeroductIdUser(productAddress,userAddress)
    }
    else{
        // Deposit
        console.log('Deposit')
        productAddress = trans1.to
        userAddress = trans1.from
        console.log(`Product Address: ${productAddress}`)
        console.log(`User Address: ${userAddress}`)
        await this.saveProductIdUser(productAddress,userAddress)
    }
  }

  async saveProductIdUser(productAddress: string,address: string)
  {
    const productSumAddress = ethers.utils.getAddress(productAddress)
    const userSumAddress = ethers.utils.getAddress(address)
    console.log("saveProductUser")
    try
    {
      const product = await this.productRepository.findOne({
        where: {
          address: productSumAddress,
          chainId: 42161,
          isPaused: false,
        },
      });
      const productId = Number(product?.id)
      this.userRepository.saveProductId(userSumAddress, productId).then(() => console.log("Product ID saved to user entity"));
    }
    catch(e){
        console.log(e)
      }
  }

  async removeroductIdUser(productAddress: string,address: string)
  {
    const productSumAddress = ethers.utils.getAddress(productAddress)
    const userSumAddress = ethers.utils.getAddress(address)
    console.log("saveProductUser")
    try
    {
      const product = await this.productRepository.findOne({
        where: {
          address: productSumAddress,
          chainId: 42161,
          isPaused: false,
        },
      });
      const productId = Number(product?.id)
      this.userRepository.removeProductId(userSumAddress, productId).then(() => console.log("Product ID removed from user entity"));
    }
    catch(e){
        console.log(e)
      }
  }


}

// console.log(body.txs)
        // console.log(body.txs[0].hash)
        // console.log(body.txs[0].fromAddress)