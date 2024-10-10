import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract, Wallet } from "ethers";
import { History, Product, ProductRepository, WithdrawRequest, WithdrawRequestRepository, UserRepository } from "../../../dal";
import { HistoryRepository } from "../../../dal/repository/HistoryRepository";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../../shared/enum";
import { ProductService } from "../../product/services/ProductService";
import { ContractService } from "../../../services/ContractService";
@Injectable()
export class WebhookService {

  private readonly provider: { [chainId: number]: ethers.providers.JsonRpcProvider } = {};

  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject()
  private readonly productService: ProductService;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

  @Inject(WithdrawRequestRepository)
  private readonly withdrawRequestRepository: WithdrawRequestRepository;

  @Inject(UserRepository)
  private readonly userRepository: UserRepository;

  @Inject()
  private readonly contractService: ContractService;

  // Define the functions corresponding to each method ID
  async fundAccept(chainId: number, productAddress: string) {
    console.log("Executing fundAccept")
    this.productService.updateProductStatus(chainId,productAddress,1)
  }

  async Lock(chainId: number, productAddress: string) {
    console.log("Executing FundLock")
    this.productService.updateProductStatus(chainId,productAddress,2)
  }

  async Issuance(chainId: number, productAddress: string) {
    console.log("Executing Issuance");
    this.productService.updateProductStatus(chainId,productAddress,3)
  }

  async Mature(chainId: number, productAddress: string) {
    console.log("Executing Mature");
    this.productService.updateProductStatus(chainId,productAddress,4)
  }

  async Deposit(body: any,chainId: number ,productAddress: string) {
    console.log("Executing Deposit");
    const txHash = body.logs[0].transactionHash;
    const userAddress = body.erc20Transfers[0].from;
    const amountToken = body.erc20Transfers[0].value;

    const {sumAddress} = await this.checkSumAddress(userAddress);
    const { productId } = await this.getProductId(productAddress, chainId);
    await this.saveTransactionHistory(chainId, sumAddress, txHash, 'Deposit', productId, amountToken);
    await this.saveProductIdUser(productId, sumAddress);
  }

  async WithdrawPrincipal(body: any,chainId: number ,productAddress: string) {
    console.log("Executing Withdraw");
    const txHash = body.logs[0].transactionHash;
    const userAddress =  body.txs[0].fromAddress;
    const amountToken =  body.erc20Transfers[1].value;

    const {sumAddress} = await this.checkSumAddress(userAddress);
    const { productId } = await this.getProductId(productAddress, chainId);
    await this.saveTransactionHistory(chainId, sumAddress, txHash, 'WithdrawPrincipal', productId, amountToken);
    await this.removeroductIdUser(productId, sumAddress);
  }

  async optionWithdrawalPaid(body: any,chainId: number ,productAddress: string){
    await this.productService.updateOptionPaidStatus(productAddress)
  }

  // Create a mapping between method IDs and functions
  methodMap: { [key: string]: (body: any, chainId: number, productAddress: string) => Promise<void> } = {
    '0xb3ea322d': (_, chainId, productAddress) => this.fundAccept(chainId, productAddress),
    '0x7389250b': (_, chainId, productAddress) => this.Lock(chainId, productAddress),
    '0x863623bb': (_, chainId, productAddress) => this.Issuance(chainId, productAddress),
    '0x87b65207': (_, chainId, productAddress) => this.Mature(chainId, productAddress),
    '0x9a408321': (body, chainId, productAddress) => this.Deposit(body, chainId, productAddress),
    '0xe1f06f54': (body, chainId, productAddress) => this.WithdrawPrincipal(body, chainId, productAddress),
    '0xa1ea1f71': (body, chainId, productAddress) => this.optionWithdrawalPaid(body, chainId, productAddress),
  };

  async handleWebhook(body: any) {
    const chainId = parseInt(body.chainId, 16);
    const productAddress = body.logs[0].address;
    console.log("Chain ID:", chainId);

    const { sumAddress } = await this.checkSumAddress(productAddress);
    console.log("Product Address:", sumAddress);

    const methodId = body.txs[0].input.slice(0, 10);
    await this.executeMethod(body, chainId, methodId, sumAddress);
  }


  async checkSumAddress(address: string): Promise<{sumAddress:string}> {
    const sumAddress = ethers.utils.getAddress(address);
    return { sumAddress };
  }

  async saveProductIdUser(productId: number,userAddress: string) {
    try {
      await this.userRepository.saveProductId(userAddress, productId);
      console.log("Product ID saved to user entity");
    } catch (e) {
      console.log(e);
    }
  }

  async removeroductIdUser(productId: number,userAddress: string) {
    try {
      await this.userRepository.removeProductId(userAddress, productId);
      console.log("Product ID removed from user entity");
    } catch (e) {
      console.log(e);
    }
  }

  async getProductId(productSumAddress: string, chainId: number): Promise<{productId: number}> {
    const product = await this.productRepository.findOne({
      where: {
        address: productSumAddress,
        chainId: chainId,
        isPaused: false,
      },
    });
    
    const productId = Number(product?.id);
    return { productId };
  }

  async saveTransactionHistory(chainId: number,userAddress: string,txHash: string,eventName: string ,productId: number,amountToken: BigNumber) {
    let withdrawType: WITHDRAW_TYPE = WITHDRAW_TYPE.NONE;
    let type: HISTORY_TYPE;

    if (eventName === "WithdrawPrincipal") {
      withdrawType = WITHDRAW_TYPE.PRINCIPAL;
      type = HISTORY_TYPE.WITHDRAW;
    } else {
      type = HISTORY_TYPE.DEPOSIT;
    }

    console.log("amountToken", amountToken.toString());
    
    await this.historyRepository.createHistory(
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
      );
    
    console.log("History saved");
  }

  // Function to execute the corresponding method based on input
  async executeMethod(body: any, chainId: number, methodId: string, productAddress: string): Promise<void> {
    const methodFunction = this.methodMap[methodId];
    
    if (methodFunction) {
      await methodFunction(body, chainId, productAddress);
    } else {
      console.error("Method ID not recognized:", methodId);
    }
  }

}