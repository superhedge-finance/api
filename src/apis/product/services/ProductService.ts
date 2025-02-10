import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract , Wallet, providers, utils} from "ethers";
import { History, Product, ProductRepository, WithdrawRequest, WithdrawRequestRepository,UserRepository} from "../../../dal";
import { CreatedProductDto } from "../dto/CreatedProductDto";
import { ProductDetailDto } from "../dto/ProductDetailDto";
import { AdminWalletDto } from "../dto/AdminWalletDto";
import { CycleDto } from "../dto/CycleDto";
import { StatsDto } from "../dto/StatsDto";
import { AddressDto } from "../dto/AddressDto";
import { HistoryRepository } from "../../../dal/repository/HistoryRepository";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../../shared/enum";
import { DECIMAL } from "../../../shared/constants";
import { RPC_PROVIDERS, SUPPORT_CHAINS } from "../../../shared/constants";
// import { MoralisService } from "./MoralisService";
import PRODUCT_ABI from "../../../services/abis/SHProduct.json";
import ERC20_ABI from "../../../services/abis/ERC20.json";
import PT_ABI from "../../../services/abis/PTToken.json";
import STORE_COUPON_ABI from "../../../services/abis/StoreCoupon.json";
import Moralis from 'moralis';
import { Float } from "type-graphql";
import { CouponService } from "../../coupon/services/CouponService";
import { GetHolderListDto } from "../dto/GetHolderListDto";
require('dotenv').config();

const WebSocketServer = require('ws');``

// // Import the EvmChain dataType
// const { EvmChain } = require("@moralisweb3/common-evm-utils")

// const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijc2ZDhlYTQ1LWJmNTctNDFkYS04YjkxLTg4NjcxNWMzNDM3MiIsIm9yZ0lkIjoiMzk5NjgwIiwidXNlcklkIjoiNDEwNjg3IiwidHlwZUlkIjoiNjk0NzRhOGYtM2Q1OC00ZGU3LTk2ZWItZWQ0NTAwYjJiM2IwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MjA2NjIyMzUsImV4cCI6NDg3NjQyMjIzNX0.ADggUZYihL3LZOzcg-VN9saKl-Y6gEUuZN4uU09rafQ"
// const address = "0x457E474891f8e8248f906cd24c3ddC2AD7fc689a"
// const chain = EvmChain.ETHEREUM


//MORALIS_API_KEY_SDK
//MORALIS_API_KEY
Moralis.start({
  apiKey: process.env.MORALIS_API_KEY_SDK
});
const streamId = process.env.MORALIS_STREAM_ID as string
// const ethers = require('ethers');

@Injectable()
export class ProductService {

  private readonly provider: { [chainId: number]: ethers.providers.JsonRpcProvider } = {};

  // @Inject()
  // private readonly moralisService: MoralisService;

  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

  @Inject(WithdrawRequestRepository)
  private readonly withdrawRequestRepository: WithdrawRequestRepository;

  @Inject(UserRepository)
  private readonly userRepository: UserRepository;

  @Inject(CouponService)
  private readonly couponService: CouponService;

  create(
    chainId: number,
    address: string,
    name: string,
    underlying: string,
    maxCapacity: BigNumber,
    status: number,
    currentCapacity: string,
    cycle: CycleDto,
    privateKey: string,
    publicKey: string,
    addressList: AddressDto,
    unwindMargin: number
  ): Promise<Product> {
    const entity = new Product();
    entity.chainId = chainId;
    entity.address = address;
    entity.name = name;
    entity.underlying = underlying;
    entity.maxCapacity = maxCapacity.toString();
    entity.status = status;
    entity.currentCapacity = currentCapacity;
    entity.issuanceCycle = cycle;
    entity.privateKey = privateKey;
    entity.publicKey = publicKey;
    entity.addressesList = addressList;
    entity.unwindMargin = unwindMargin;
    return this.productRepository.save(entity);
  }

  getProductsWithoutStatus(chainId: number): Promise<Array<Product>> {
    return this.productRepository.find({
      select: ["id", "name", "address","underlying","issuanceCycle", 
        "status", "chainId","currentCapacity","maxCapacity"],
      where: {
        chainId: chainId,
        isPaused: false,
      },
    });
  }

  // getProducts(chainId: number): Promise<Array<Product>> {
  //   return this.productRepository.find({
  //     select: ["id", "name", "address","underlying","issuanceCycle", 
  //             "status", "chainId","currentCapacity","maxCapacity","addressesList","currencyName","underlyingName","couponTooltip"],
  //     where: {
  //       status: Not(0),
  //       isPaused: false,
  //       chainId: chainId,
  //     },
  //     order: {
  //       created_at: "ASC",
  //     },
  //   });
  // }

  async getProducts(chainId: number): Promise<Array<Product>> {
    try {
      const products = await this.productRepository.find({
        select: [
          "id", 
          "name", 
          "address",
          "underlying",
          "issuanceCycle", 
          "status", 
          "chainId",
          "currentCapacity",
          "maxCapacity",
          "addressesList",
          "currencyName",
          "underlyingName",
          "couponTooltip"
        ],
        where: {
          status: Not(0),
          isPaused: false,
          chainId: chainId,
        },
        order: {
          created_at: "ASC",
        },
      });
  
      // Ensure the response can be serialized to JSON
      return products.map(product => ({
        ...product,
        issuanceCycle: product.issuanceCycle ? {
          ...product.issuanceCycle,
          strikePrice1: Number(product.issuanceCycle.strikePrice1),
          strikePrice2: Number(product.issuanceCycle.strikePrice2),
          strikePrice3: Number(product.issuanceCycle.strikePrice3),
          strikePrice4: Number(product.issuanceCycle.strikePrice4),
          tr1: Number(product.issuanceCycle.tr1),
          tr2: Number(product.issuanceCycle.tr2),
          issuanceDate: Number(product.issuanceCycle.issuanceDate),
          maturityDate: Number(product.issuanceCycle.maturityDate),
          underlyingSpotRef: Number(product.issuanceCycle.underlyingSpotRef),
          optionMinOrderSize: Number(product.issuanceCycle.optionMinOrderSize),
          participation: Number(product.issuanceCycle.participation),
          coupon: Number(product.issuanceCycle.coupon),
          apy: product.issuanceCycle.apy,
          subAccountId: product.issuanceCycle.subAccountId
        } : new CycleDto() // Provide a default CycleDto if null
      }));
    } catch (error) {
      console.error('Error in getProducts:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async getProduct(chainId: number, address: string): Promise<ProductDetailDto | null> {
    const product = await this.productRepository.findOne({
      where: {
        address: address,
        chainId: chainId,
        // status: Not(0),
        isPaused: false,
      },
    });

    if (!product) return null;

    const depositList = await this.historyRepository.find({
      where: {
        productId: product.id,
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

    const provider = new providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
    const productContract = new Contract(product.address, PRODUCT_ABI, provider);
    const onchainCurrentCapacity = Number(utils.formatUnits(await productContract.currentCapacity(), 0));

    // const onchainCurrentCapacity = product.currentCapacity
    try {
      await this.productRepository.update(
        { address: address },
        { currentCapacity: String(onchainCurrentCapacity) }
      );
    } catch (e) {
      console.error(e);
    }
    
    
    return {
      id: product.id,
      address: product.address,
      name: product.name,
      underlying: product.underlying,
      maxCapacity: product.maxCapacity,
      currentCapacity: String(onchainCurrentCapacity),
      status: product.status,
      issuanceCycle: product.issuanceCycle,
      chainId: product.chainId,
      vaultStrategy: product.vaultStrategy,
      risk: product.risk,
      fees: product.fees,
      counterparties: product.counterparties,
      estimatedApy: product.estimatedApy,
      mtmPrice: product.mtmPrice,
      deposits: depositActivity,
      privateKey: "Not Available",
      publicKey: product.publicKey,
      addressesList: product.addressesList,
      unwindMargin: product.unwindMargin,
      currencyName: product.currencyName,
      underlyingName: product.underlyingName,
      couponTooltip: product.couponTooltip
    }
  }

  async updateCurrentCapacity(chainId: number, productAddress: string): Promise<boolean> {
    const provider = new providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
    const productContract = new Contract(productAddress, PRODUCT_ABI, provider);
    const currentCapacity = await productContract.currentCapacity();
    try {
      await this.productRepository.update(
        { address: productAddress },
        { currentCapacity: currentCapacity.toString() }
      );
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async syncProducts(chainId: number, pastEvents: CreatedProductDto[]): Promise<void> {
    await Promise.all(
      pastEvents.map(async (product: CreatedProductDto) => {
        const existProduct = await this.getProduct(chainId, product.address);
        // Convert the cycle values before creating/updating
        const convertedCycle = await this.convertCycleValues(product.issuanceCycle);
        
        if (!existProduct) {
          console.log("syncProducts")
          const wallet = await this.createWallet()
          const addressesList = await this.getAddressesContract(chainId, product.address)
          console.log(addressesList)
          return this.create(
            chainId,
            product.address,
            product.name,
            product.underlying,
            BigNumber.from(product.maxCapacity),
            product.status,
            product.currentCapacity,
            convertedCycle, // Use converted cycle here
            wallet.privateKey,
            wallet.publicKey,
            addressesList,
            10
          );
        } else {
          const addressesList = await this.getAddressesContract(chainId, product.address)
          console.log(addressesList)
          return this.productRepository.update(
            { address: product.address },
            {
              name: product.name,
              underlying: product.underlying,
              maxCapacity: product.maxCapacity,
              status: product.status,
              currentCapacity: product.currentCapacity.toString(),
              issuanceCycle: convertedCycle, // Use converted cycle here
              addressesList,
            },
          );
        }
      }),
    );
  }

  // async syncProducts(chainId: number, pastEvents: CreatedProductDto[]): Promise<void> {
  //   console.log("syncProducts")
  //   console.log(pastEvents)
    
  //   // Validate chainId is a valid enum value
  //   if (!Object.values(SUPPORT_CHAINS).includes(chainId)) {
  //     throw new Error(`Invalid chainId: ${chainId}. Must be one of: ${Object.values(SUPPORT_CHAINS).join(', ')}`);
  //   }

  //   await Promise.all(
  //     pastEvents.map(async (product: CreatedProductDto) => {
  //       const convertedCycle = await this.convertCycleValues(product.issuanceCycle);
  //       const wallet = await this.createWallet()
  //       const addressesList = await this.getAddressesContract(chainId, product.address)
  //       console.log(addressesList)
        
  //       return this.create(
  //         chainId,
  //         product.address, 
  //         product.name,
  //         product.underlying,
  //         BigNumber.from(product.maxCapacity),
  //         product.status,
  //         product.currentCapacity,
  //         convertedCycle,
  //         wallet.privateKey,
  //         wallet.publicKey,
  //         addressesList,
  //         10
  //       );
  //     }),
  //   );
  // }

  async getAddressesContract(chainId: number, productAddress: string): Promise<{ tokenAddress: string, ptAddress: string, marketAddress: string, currencyAddress: string }> {
    const provider = new providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
    const productContract = new Contract(productAddress, PRODUCT_ABI, provider);
    console.log("Running getAddressesContract")
    try {
        // Fetch addresses from the contract
        const [tokenAddress, ptAddress, marketAddress, currencyAddress] = await Promise.all([
            productContract.tokenAddress(),
            productContract.PT(),
            productContract.market(),
            productContract.currencyAddress()
        ]);

        // Return the addresses as an object
        return {
            tokenAddress,
            ptAddress,
            marketAddress,
            currencyAddress
        };
    } catch (error) {
        console.error("Error fetching addresses from contract:", error);
        throw new Error("Failed to get addresses from contract");
    }
}

  async addProductAddressIntoStream(productAddress: string)
  {
    try {      
      // MORALIS_API_KEY_SDK
      const response = await Moralis.Streams.addAddress({
        "id": streamId,
        "address": [productAddress]
      });
      console.log(response.raw);
    } catch (e) {
      console.error(e);
    }
  }

  async syncHistories(
    chainId: number,
    productId: number,
    type: HISTORY_TYPE,
    pastEvents: any[],
    withdrawType: WITHDRAW_TYPE = WITHDRAW_TYPE.NONE,
  ): Promise<void> {
    for (const event of pastEvents) {
      try {
        const exist = await this.historyRepository.findOne(
          { where: { transactionHash: event.transactionHash, logIndex: event.logIndex } 
        });
        if (exist) continue;

        const lastEntity = await this.historyRepository.findOne(
          { where: { chainId: chainId, address: event.args._user }, order: { created_at: 'DESC' }}
        );
        let totalBalance = FixedNumber.from(0);
        if (lastEntity) totalBalance = FixedNumber.from(lastEntity.totalBalance);

        const entity = new History();
        if (type === HISTORY_TYPE.DEPOSIT || type === HISTORY_TYPE.WEEKLY_COUPON) {
          entity.tokenId = event.args._tokenId.toString();
          entity.supply = event.args._supply.toString();
          entity.supplyInDecimal = event.args._supply.toNumber();
        }
        entity.address = event.args._user;
        entity.type = type;
        entity.withdrawType = withdrawType;
        entity.productId = productId;
        entity.amount = event.args._amount.toString();
        entity.amountInDecimal = Number(ethers.utils.formatUnits(event.args._amount, DECIMAL[chainId]));

        if (type == HISTORY_TYPE.WITHDRAW) {
          entity.totalBalance = (totalBalance.subUnsafe(FixedNumber.from(entity.amountInDecimal))).toString();
        } else {
          entity.totalBalance = (totalBalance.addUnsafe(FixedNumber.from(entity.amountInDecimal))).toString();
        }
        entity.transactionHash = event.transactionHash;
        entity.logIndex = event.logIndex;
        await this.historyRepository.save(entity);
      } catch (e){
      }
    }
  }

  async updateProductName(chainId: number, address: string, name: string): Promise<UpdateResult> {
    return this.productRepository.update(
      { chainId, address },
      { name: name}
    );
  }

  async updateProduct(chainId: number, address: string, stats: StatsDto): Promise<UpdateResult> {
    return this.productRepository.update(
      { chainId, address: address },
      {
        status: stats.status,
        currentCapacity: stats.currentCapacity,
        issuanceCycle: stats.cycle,
      },
    );
  }
  
  async updateProductPauseStatus(chainId: number, address: string, isPaused: boolean): Promise<UpdateResult> {
    return this.productRepository.update(
      { chainId, address: address },
      {
        isPaused: isPaused,
      },
    );
  }

  async updateProductStatus(chainId: number,productAddress: string, statusNumber: number): Promise<UpdateResult>
  {
    console.log("updateProductStatus")
    console.log(chainId)
    console.log(statusNumber)
    console.log(productAddress)

    return this.productRepository.update(
      { chainId, address: productAddress },
      {
        status: statusNumber,
      },
    );
  }

  // async requestWithdraw(noOfBlock: number, productAddress: string, address: string, amountPtUnwindPrice: number, amountOptionUnwindPrice: number,status:string ): Promise<void> {
  //   const entity = new WithdrawRequest();
  //   entity.noOfBlocks = noOfBlock
  //   entity.product = productAddress
  //   entity.address = address
  //   entity.amountPtUnwindPrice = amountPtUnwindPrice.toString
  //   entity.amountOptionUnwindPrice = amountOptionUnwindPrice.toString
  //   entity.status = status
  //   await this.withdrawRequestRepository.save(entity)
  // }

//   async cancelWithdraw(chainId: number, address: string, isTransferred: boolean): Promise<void> {
//     const request = await this.withdrawRequestRepository.findOne({
//       where: {
//         address: address,
//         isTransferred: isTransferred,
//       },
//     });
//     if (request) {
//       await this.withdrawRequestRepository.remove(request);
//     }
//   }

// async deletelWithdraw(id: number): Promise<void> {
//   const request = await this.withdrawRequestRepository.findOne({
//     where: {
//       id: id,
//     },
//   });
//   if (request) {
//     // console.log(request)
//     await this.withdrawRequestRepository.remove(request);
//   }
// }

  async saveProductUser(chainId: number,productAddress: string,address: string,txid: string): Promise<void>
  {
    console.log("saveProductUser")
    try
    {
      const product = await this.productRepository.findOne({
        where: {
          address: productAddress,
          chainId: chainId,
          isPaused: false,
        },
      });
      const productId = Number(product?.id)
      this.userRepository.saveProductId(address, productId).then(() => console.log("Product ID saved to user entity"));
    }
    catch(e){
        console.log(e)
      }
    
  }

  async removeProductUser(chainId: number,productAddress: string,address: string,txid: string): Promise<void>
  {
    console.log("removeProductUser")
    try
    {
      const product = await this.productRepository.findOne({
        where: {
          address: productAddress,
          chainId: chainId,
          isPaused: false,
        },
      });
      const productId = Number(product?.id)
      this.userRepository.removeProductId(address, productId).then(() => console.log("Product ID deleted to user entity"));
    }
    catch(e){
        console.log(e)
      }
    
  }

  async updateWithdrawRequestStatus(product: string, addressesList: string[]): Promise<void> {
    for (const address of addressesList){
      try{
        this.withdrawRequestRepository.update(
          { product,address},
          { isTransferred : true}
        );
      }
      catch(e){
          console.log(e)
        }
    }
  }

  async updateOptionPaidStatus(product: string): Promise<void> {
    console.log("updateOptionPaidStatus")
    try{
      this.withdrawRequestRepository.update(
        { product},
        { optionPaid : true}
      );
    }
    catch(e){
        console.log(e)
      }
  }

  async getWithdrawList(product: string) : Promise<{addressesList: string[], amountsList: number[]}>{
    // console.log(product)
    const request = await this.withdrawRequestRepository.createQueryBuilder('withdraw')
      .select('withdraw.address, SUM(withdraw.amount_option_unwind_price) AS amount_option_unwind_price')
      .where('withdraw.product = :product', { product })
      .andWhere("withdraw.isTransferred = false")
      .andWhere('withdraw.status = :status', {status:"Success"})
      .groupBy('withdraw.address')
      .getRawMany();
    // console.log(request)
    const addressesList = request.map(request => request.address);
    const amountsList = request.map(request => parseFloat(request.amount_option_unwind_price));
    return {addressesList,amountsList}
  }

  async getTotalOptionBlocks(product: string): Promise<{ noOfBlocks: number }> {
    console.log(product);

    const request = await this.withdrawRequestRepository.createQueryBuilder('withdraw')
        .select('SUM(withdraw.no_of_blocks) AS no_of_blocks')
        .where('withdraw.product = :product', { product })
        .andWhere('withdraw.status = :status', { status: "Success" })
        .getRawMany();

    // Extract the total number of blocks
    const totalNoOfBlocks = request.length > 0 && request[0].no_of_blocks !== null 
        ? Number(request[0].no_of_blocks) 
        : 0
    return { noOfBlocks: totalNoOfBlocks };
  }

  async getUserOptionBlocks(product: string, address: string): Promise<{ noOfBlocks: number }> {
    console.log(product);
    const request = await this.withdrawRequestRepository.createQueryBuilder('withdraw')
        .select('SUM(withdraw.no_of_blocks) AS no_of_blocks')
        .where('withdraw.product = :product', { product })
        .andWhere('withdraw.address = :address', { address })
        .andWhere('withdraw.status = :status', { status: "Success" })
        .getRawMany();

    // Extract the total number of blocks
    const userNoOfBlocks = request.length > 0 && request[0].no_of_blocks !== null 
        ? Number(request[0].no_of_blocks) 
        : 0
    return { noOfBlocks: userNoOfBlocks };
  }


  async storeOptionPosition(chainId: number,productAddress: string, addressesList: string[], amountsList: number[]) : Promise<{txHash: string}>
  {
    console.log('storeOptionPosition')
    let txHash = '0x'
    const ethers = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
    try
      {
        const product = await this.productRepository.findOne({
        where: {
          address: productAddress,
          chainId: chainId,
          isPaused: false,
        },
      });
      // console.log(product)
      const privateKey = product?.privateKey
      // console.log(privateKey)
      const wallet = new ethers.Wallet(privateKey, provider);
      const _productContract = new ethers.Contract(productAddress, PRODUCT_ABI, wallet);
      const tx = await _productContract.storageOptionPosition(addressesList,amountsList)
      txHash = tx.hash
      console.log(txHash)
      const {status} = await this.verifyTransaction(chainId, txHash)
      if (status == 1) {
        console.log("Transaction Admin Wallet was successful");
        await this.updateWithdrawRequestStatus(productAddress,addressesList)
      }
      
    }catch(e)
    {
      console.error("StoreOptionPosition", e);
    }
    return {txHash}
  }

  async verifyTransaction(chainId: number, txid: string): Promise<{ status: number }> {
    const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
    let result = 0; // Default to 0 (failure)
    console.log("verifyTransaction");
    // Function to create a delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Wait for 20 seconds
    await delay(20000);
    try {
        const receipt = await provider.getTransactionReceipt(txid);
        // console.log(receipt);
        if (receipt.status === 1) {
            console.log("Transaction Admin Wallet was successful");
            result = 1; // Set result to 1 (success)
        }
    } catch (e) {
        console.error("Error verifying transaction:", e);
        // result remains 0 for failure
    }

    return { status: result };
}


  async getAdminWallet(chainId: number,productAddress: string) : Promise<{resultPublicKey:string}>
  {
    let resultPublicKey = 'Not Available'
    try
    {
      const product = await this.productRepository.findOne({
        where: {
          address: productAddress,
          chainId: chainId,
        },
      });
      console.log(product)
      if (product) {
        resultPublicKey = product.publicKey
      }
    }catch (e) {
      console.error("Error fetching product:", e);
    }
    return { resultPublicKey };
  }

  async getAdminWalletTest(chainId: number,productAddress: string) : Promise<AdminWalletDto | null>
  {
    console.log({chainId,productAddress})
    let resultPublicKey = 'Not Available'
    try
    {
      const product = await this.productRepository.findOne({
        where: {
          address: productAddress,
          chainId: chainId,
        },
      });
      console.log(product)
      if (product) {
        resultPublicKey = product.publicKey
      }
    }catch (e) {
      console.error("Error fetching product:", e);
    }
    return { resultPublicKey };
  }

  async createWallet():Promise<{privateKey: string,publicKey: string}>
  {
    // Generate a new random wallet
    const wallet = Wallet.createRandom();
    const walletKey = new ethers.Wallet(wallet.privateKey);
    const publicKey = walletKey.address;
    const privateKey= wallet.privateKey;
    return{privateKey,publicKey}
  }

  // async getHolderList(productAddress: string, chainId: number): Promise<GetHolderListDto>  {
    
  //   try {
  //     const {tokenAddress} = await this.getTokenAddress(chainId, productAddress)
  //     if (!tokenAddress) {
  //       return {ownerAddresses: [], balanceToken: [] };
  //     }
  //     const response = await Moralis.EvmApi.token.getTokenOwners({
  //       "chain": `0x${chainId.toString(16)}`,
  //       "order": "ASC",
  //       "tokenAddress": tokenAddress
  //     })
  //     const balanceTokenA = response.result?.map((item: any) => Number(item?.balance)) ?? [];
  //     const ownerAddress = response.result?.map((item: any) => item?.ownerAddress) ?? [];

  //     return { ownerAddresses: ownerAddress, balanceToken: balanceToken };
  //   } catch (e) {
  //     console.error("Error fetching product:", e);
  //     return { ownerAddresses: [], balanceToken: []};
  //   }
  // }

  async getTokenAddress(chainId: number, productAddress: string): Promise<{ tokenAddress: string, ptAddress: string, marketAddress: string, currencyAddress: string }> {
    console.log("productAddress",productAddress)
    try {
        const product = await this.productRepository.findOne({
            where: {
                address: productAddress,
                chainId: chainId,
            },
        });
        // Check if the product exists
        if (!product) {
            throw new Error("Product not found");
        }
        const { tokenAddress, ptAddress, marketAddress, currencyAddress } = product.addressesList;
        return {
            tokenAddress,
            ptAddress,
            marketAddress,
            currencyAddress,
        };
    } catch (e) {
        console.error("Error fetching product:", e);
        throw new Error("Failed to retrieve token addresses"); 
    }
}

async checkTokenBalance(chainId: number, tokenAddress: string, walletAddress: string): Promise<{ tokenBalance: number }> {
  const provider = new providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
  
  try {
      const tokenBalance = await tokenContract.balanceOf(walletAddress);
      return { tokenBalance: Number(tokenBalance) }; // Convert BigNumber to number
  } catch (error) {
      console.error("Error fetching token balance:", error);
      throw new Error("Unable to fetch token balance");
  }
}

//   async getPtAndOption(chainId: number, walletAddress: string, productAddress: string, noOfBlock: number): Promise<{ amountToken: number, amountOption: number }> {
//     console.log('Fetching PT and Option data...');
//     let amountToken = 0;
//     let amountOption = 0;
//     const start = new Date()
//     try {
//         const provider = new providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
//         const productContract = new Contract(productAddress, PRODUCT_ABI, provider);
//         const {tokenAddress,ptAddress,marketAddress,currencyAddress} = await this.getTokenAddress(chainId,productAddress)
        
//         // Fetch token decimals and balance in one go
//         const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
//         const [tokenDecimals, tokenBalance] = await Promise.all([
//             tokenContract.decimals(),
//             tokenContract.balanceOf(walletAddress)
//         ]);
//         const formattedTokenBalance = Number(utils.formatUnits(tokenBalance, tokenDecimals));
//         console.log(formattedTokenBalance)


//         // Fetch PT address and balance
//         // const ptAddress = await productContract.PT();
//         const ptContract = new Contract(ptAddress, PT_ABI, provider);
//         const ptBalance = await ptContract.balanceOf(productAddress);
//         const formattedPtBalance = Number(utils.formatUnits(ptBalance, 0));

//         // Fetch current capacity
//         const currentCapacity = Number(utils.formatUnits(await productContract.currentCapacity(), 0));

//         // Fetch product details
//         const product = await this.productRepository.findOne({
//             where: { address: productAddress, chainId: chainId, isPaused: false },
//         });

//         if (!product) {
//             throw new Error("Product not found");
//         }

//         const unwindMargin = product.unwindMargin
//         const issuance = product.issuanceCycle;
//         // console.log(issuance)
//         const underlyingSpotRef = issuance.underlyingSpotRef;
//         const optionMinOrderSize = issuance.optionMinOrderSize / 10
//         const withdrawBlockSize = underlyingSpotRef * optionMinOrderSize;

//         const earlyWithdrawBalanceUser = (noOfBlock * withdrawBlockSize) * 10 ** tokenDecimals;

//         const totalUserBlock = Math.round(formattedTokenBalance / withdrawBlockSize)

//         console.log(`Total user block: ${totalUserBlock}`);

//         if (totalUserBlock >= noOfBlock) {
//           const allocation = earlyWithdrawBalanceUser / currentCapacity;
//           console.log(allocation)
//           console.log(formattedPtBalance)
//           const amountOutMin = Math.round(formattedPtBalance * allocation);

//           const url = `https://api-v2.pendle.finance/sdk/api/v1/swapExactPtForToken?chainId=${chainId}&receiverAddr=${productAddress}&marketAddr=${marketAddress}&amountPtIn=${amountOutMin}&tokenOutAddr=${currencyAddress}&slippage=0.002`;
//           console.log(url)
//           const response = await fetch(url);
//           const params = await response.json();
//           console.log(params)
//           amountToken = Number(params.data.amountTokenOut);
          
//           const { instrumentArray, directionArray } = await this.getDirectionInstrument(issuance.subAccountId);
//           const responseOption = await this.getTotalOptionPosition(instrumentArray, directionArray);

//           amountOption = Math.round((optionMinOrderSize * noOfBlock * issuance.participation * responseOption.totalAmountPosition * (1 - (unwindMargin/1000))) * 10 ** tokenDecimals);
//           console.log("amountOption")
//           console.log(responseOption.totalAmountPosition)
//           // amountOption = amountOption * -1
//           console.log(amountOption)
//           await this.requestWithdraw(noOfBlock,productAddress, walletAddress, amountToken, amountOption, "Pending");  

//           const end = new Date()
//           const duration = end.getTime() - start.getTime(); // Calculate duration in milliseconds
//           console.log(`Execution time: ${duration} milliseconds`);  
//       }
//     } catch (error) {
//         console.error("Error in getPtAndOption:", error);
//         // Optionally, you can set default values or rethrow the error
//     }
//     return { amountToken, amountOption };
//   }

//   async getDirectionInstrument(subAccountId: string): Promise<{instrumentArray: string[], directionArray: string[]}> {
//     // const subAccountId = "355261"
//     return new Promise((resolve, reject) => {
//         try {
//             const ws = new WebSocketServer('wss://www.deribit.com/ws/api/v2');

//             // Authentication message
//             const authMsg = {
//                 "jsonrpc": "2.0",
//                 "id": 9929,
//                 "method": "public/auth",
//                 "params": {
//                     "grant_type": "client_credentials",
//                     "client_id": process.env.CLIENT_ID,
//                     "client_secret": process.env.CLIENT_SECRET
//                 }
//             };
//             // console.log("authMsg")
//             // console.log(authMsg)
//             // Positions message
//             const positionsMsg = {
//                 "jsonrpc": "2.0",
//                 "id": 2236,
//                 "method": "private/get_positions",
//                 "params": {
//                     "currency": "BTC",
//                     "subaccount_id": subAccountId
//                 }
//             };

//             // Set a timeout to reject the promise if no response is received
//             const timeout = setTimeout(() => {
//                 ws.close();
//                 reject(new Error('WebSocket connection timeout'));
//             }, 30000); // 30 second timeout

//             // Handle incoming messages
//             ws.onmessage = function (e: any) {
//                 try {
//                     const response = JSON.parse(e.data);
//                     console.log('Received from server:', response);

//                     if (response.error) {
//                         clearTimeout(timeout);
//                         ws.close();
//                         reject(new Error(`Server error: ${response.error.message}`));
//                         return;
//                     }

//                     // Check if the response is for authentication
//                     if (response.id === authMsg.id) {
//                         if (response.result && response.result.access_token) {
//                             console.log("Authentication successful, retrieving positions...");
//                             ws.send(JSON.stringify(positionsMsg));
//                         } else {
//                             clearTimeout(timeout);
//                             ws.close();
//                             reject(new Error("Authentication failed"));
//                         }
//                     }

//                     // Check if the response is for positions
//                     if (response.id === positionsMsg.id) {
//                         clearTimeout(timeout);
//                         ws.close();

//                         if (!response.result || !Array.isArray(response.result)) {
//                             reject(new Error("Invalid positions response format"));
//                             return;
//                         }

//                         const directionArray = response.result.map((i: any) => i.direction);
//                         const instrumentArray = response.result.map((i: any) => i.instrument_name);
                        
//                         resolve({ instrumentArray, directionArray });
//                     }
//                 } catch (error) {
//                     clearTimeout(timeout);
//                     ws.close();
//                     reject(new Error(`Error processing message: ${error.message}`));
//                 }
//             };

//             // Handle WebSocket connection open
//             ws.onopen = function () {
//                 console.log("WebSocket connection opened. Sending authentication message...");
//                 try {
//                     ws.send(JSON.stringify(authMsg));
//                 } catch (error) {
//                     clearTimeout(timeout);
//                     ws.close();
//                     reject(new Error(`Failed to send auth message: ${error.message}`));
//                 }
//             };

//             // Handle WebSocket errors
//             ws.onerror = function (error: any) {
//                 clearTimeout(timeout);
//                 console.error("WebSocket error:", error);
//                 reject(new Error(`WebSocket error: ${error.message}`));
//             };

//             // Handle WebSocket connection close
//             ws.onclose = function () {
//                 clearTimeout(timeout);
//                 console.log("WebSocket connection closed.");
//             };

//         } catch (error) {
//             reject(new Error(`Failed to initialize WebSocket: ${error.message}`));
//         }
//     });
// }

// async getTotalOptionPosition(instrumentArray: string[], directionArray: string[]): Promise<{ totalAmountPosition: number }> {
//   return new Promise((resolve, reject) => {
//       let totalAmountPosition = 0;
//       let responsesReceived = 0; // Counter to track how many responses we've received
//       const expectedResponses = instrumentArray.length; // Total number of expected responses

//       const ws = new WebSocketServer('wss://www.deribit.com/ws/api/v2');

//       ws.onmessage = function (e: any) {
//           const response = JSON.parse(e.data);
//           const index = instrumentArray.findIndex(instruments => instruments === response.result[0].instrument_name);

//           if (index !== -1) { // Ensure the index is valid
//               let instrumentUnwindPrice = 0;

//               if (directionArray[index] === "buy") {
//                   instrumentUnwindPrice = response.result[0].bid_price * response.result[0].estimated_delivery_price;
//               } else {
//                   instrumentUnwindPrice = response.result[0].ask_price * response.result[0].estimated_delivery_price * -1;
//               }
//               console.log(instrumentUnwindPrice);
//               totalAmountPosition += instrumentUnwindPrice;
//           }

//           responsesReceived++; // Increment the counter for each response received

//           // Check if we've received all expected responses
//           if (responsesReceived === expectedResponses) {
//               resolve({ totalAmountPosition });
//           }
//       };

//       ws.onopen = function () {
//           // Send a message for each instrument
//           instrumentArray.forEach((instrument: string) => {
//               const msg = {
//                   "jsonrpc": "2.0",
//                   "id": 3659,
//                   "method": "public/get_book_summary_by_instrument",
//                   "params": {
//                       "instrument_name": instrument
//                   }
//               };
//               ws.send(JSON.stringify(msg));
//           });
//       };

//       ws.onerror = function (error: any) {
//           console.error("WebSocket error:", error);
//           reject(error);
//       };

//       ws.onclose = function () {
//           console.log("WebSocket connection closed.");
//       };
//   });
// }


  async changeUnwindMargin(
    chainId: number,
    productAddress: string,
    unwindMarginValue: number,
    signatureAdmin: string
): Promise<UpdateResult | null> {
    // Create message to sign
    const message = ethers.utils.solidityKeccak256(
        ["uint256"],
        [unwindMarginValue]
    );

    try {
        // Fetch the product from the repository
        const product = await this.productRepository.findOne({
            where: {
                address: productAddress,
                chainId: chainId,
                isPaused: false,
            },
        });

        // Check if product exists
        if (!product) {
            console.warn(`Product not found for address: ${productAddress} on chain ID: ${chainId}`);
            return null; // Return null if no product is found
        }

        const privateKey = product.privateKey;

        // Check if private key is valid
        if (!privateKey) {
            throw new Error("Invalid private key");
        }

        const wallet = new ethers.Wallet(privateKey);
        const signatureSystem = await wallet.signMessage(ethers.utils.arrayify(message));
        // Compare signatures
        if (signatureAdmin === signatureSystem) {
            // Update the unwind margin in the repository
            return await this.productRepository.update(
                { chainId, address: productAddress },
                { unwindMargin: unwindMarginValue }
            );
        } else {
            console.error("Signature mismatch");
            throw new Error("Signature mismatch");
        }
    } catch (error) {
        console.error("Error changing unwind margin:", error);
        return null; // Return null or handle error as needed
    }
}

  async getUnwindMargin(chainId: number, productAddress: string): Promise<{ unwindMargin: number }> {
    try {
        const product = await this.productRepository.findOne({
            where: {
                address: productAddress,
                chainId: chainId,
            },
        });

        if (!product) {
            console.warn(`No product found for address: ${productAddress} on chain ID: ${chainId}`);
            return { unwindMargin: 0 }; // Return 0 if no product is found
        }
        return { unwindMargin: product.unwindMargin };
    } catch (error) {
        console.error("Error fetching product:", error);
        return { unwindMargin: 0 }; // Return 0 in case of an error
    }
  }

  async getProductExpired(chainId: number, productAddress: string): Promise<{expiredFlag:boolean}> {
    const product = await this.productRepository.findOne({
      where: { address: productAddress, chainId: chainId },
    });
    return { expiredFlag: product?.isExpired || false };
  }

  async changeExpiredFlag(
    chainId: number,
    productAddress: string,
    expiredFlag: boolean,
    signatureAdmin: string
): Promise<UpdateResult | null> {
    // Create message to sign
    const message = ethers.utils.solidityKeccak256(
        ["bool"],
        [expiredFlag]
    );

    try {
        // Fetch the product from the repository
        const product = await this.productRepository.findOne({
            where: {
                address: productAddress,
                chainId: chainId,
                isPaused: false,
            },
        });

        // Check if product exists
        if (!product) {
            console.warn(`Product not found for address: ${productAddress} on chain ID: ${chainId}`);
            return null; // Return null if no product is found
        }

        const privateKey = product.privateKey;

        // Check if private key is valid
        if (!privateKey) {
            throw new Error("Invalid private key");
        }

        const wallet = new ethers.Wallet(privateKey);
        const signatureSystem = await wallet.signMessage(ethers.utils.arrayify(message));
        // Compare signatures
        if (signatureAdmin === signatureSystem) {
            // Update the unwind margin in the repository
            return await this.productRepository.update(
                { chainId, address: productAddress },
                { isExpired: expiredFlag }
            );
        } else {
            console.error("Signature mismatch");
            throw new Error("Signature mismatch");
        }
    } catch (error) {
        console.error("Error changing expired flag:", error);
        return null; // Return null or handle error as needed
    }
}

async convertChainId(chainId: number): Promise<string> {
  return `0x${chainId.toString(16)}`;
}

async getTokenHolderListForCoupon(chainId: number, productAddress: string): Promise<{ ownerAddresses: string[], balanceToken: number[] }> {
  try {
    const chain = await this.convertChainId(chainId);
    const result = await this.getCouponAndTokenAddress(productAddress);
    if (!result.tokenAddress) {
      console.error("Token address is undefined");
      return { ownerAddresses: [], balanceToken: [] }; // Return an empty array if tokenAddress is undefined
    }

    const response = await Moralis.EvmApi.token.getTokenOwners({
      "chain": chain,
      "order": "DESC",
      "tokenAddress": result.tokenAddress
    });
    console.log("getTokenHolderList");
    console.log(response.result);

    const ownerAddresses = response.result.map((tokenOwner: any) => tokenOwner.ownerAddress);
    const balanceToken = response.result.map((tokenOwner: any) => {
        const balance = Number(tokenOwner.balance);
        const coupon = result.coupon ?? 0; // Default to 0 if undefined
        return balance * (coupon / 1000);
    });
    return { ownerAddresses, balanceToken }; 
  } catch (e) {
    console.error(e);
    return { ownerAddresses: [], balanceToken: [] }; // Return an empty array in case of an error
  }
}

async getHolderListTest(chainId: number, productAddress: string): Promise<string> {
  const chain = await this.convertChainId(chainId);
  let cursor = "";
  const {tokenAddress} = await this.getTokenAddress(chainId, productAddress);
  console.log("tokenAddress");
  // Initialize arrays to store all results
  let ownerAddresses: string[] = [];
  let balanceToken: number[] = [];

  // Temporary arrays to store batches of 1000
  let batchOwnerAddresses: string[] = [];
  let batchBalanceToken: number[] = [];

  let count = 0;
  // Generate coupon code
  const couponCode = await this.couponService.initCouponCode(productAddress);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  while (true) {
    try {
      const response = await Moralis.EvmApi.token.getTokenOwners({
        "chain": chain,
        "order": "DESC",
        "limit": 100, // 1-100 addresses per request
        "cursor": cursor,
        "tokenAddress": tokenAddress
      });
      // get coupon from product contract 
      // Append new addresses and balances to batch arrays
      const newOwnerAddresses = response.result.map((tokenOwner: any) => tokenOwner.ownerAddress);
      const newBalanceToken = response.result.map((tokenOwner: any) => tokenOwner.balance ); // 100 = 0.01

      batchOwnerAddresses = [...batchOwnerAddresses, ...newOwnerAddresses];
      batchBalanceToken = [...batchBalanceToken, ...newBalanceToken];

      // Check if batch size has reached 1000
      if (batchOwnerAddresses.length >= 1000) {
        count += 1;
        await this.couponService.saveCouponList(couponCode,batchOwnerAddresses, batchBalanceToken);
        batchOwnerAddresses = [];
        batchBalanceToken = [];
        console.log(`Completed ${count} times`);
      }

      // Append to the main arrays
      ownerAddresses = [...ownerAddresses, ...newOwnerAddresses];
      balanceToken = [...balanceToken, ...newBalanceToken];

      // Update cursor for next iteration
      cursor = response.response.cursor || "";

      // Break if less than 100 new addresses were fetched
      console.log(`Completed iteration, total addresses: ${ownerAddresses.length}`);
      await delay(1000);
      if (cursor === "") {
        console.log("No more results available");
        break;
      }
    } catch (error) {
      console.error("Error fetching token owners:", error);
      break;
    }
  }
  // Save any remaining addresses in the batch
  if (batchOwnerAddresses.length > 0) {
    await this.couponService.saveCouponList(couponCode,batchOwnerAddresses, batchBalanceToken);
  }

  return couponCode;
}


// async testpush(chainId: number, productAddress: string, tokenAddress: string): Promise<{ ownerAddresses: string[], balanceToken: Number[] }> {
//   console.log('storeOptionPosition')
//   let txHash = '0x'
//   const ethers = require('ethers');
//   const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
//   try {
//     const privateKey = "0xca35c8a4c9927f76bc24b0863620c05837696dbeafbcbc64e08ae11658c030ab"
//     const wallet = new ethers.Wallet(privateKey, provider);
//     const storeCouponAddress = "0x6b5daB93D0481FeB9597dc3e46Da3057A5350B01"
//     const storeCouponContract = new ethers.Contract(storeCouponAddress, STORE_COUPON_ABI, wallet);
//     const couponCode = await this.getHolderListTest(chainId, productAddress, tokenAddress);

    
//     const addressesLength = ownerAddresses.length;
//     const balanceLength = balanceToken.length;
    
//     console.log(`Number of addresses: ${addressesLength}`);
//     console.log(`Number of balances: ${balanceLength}`);
//     const gasPrice = await provider.getGasPrice();
//     const nonce = await provider.getTransactionCount(wallet.address);
        
//     // const tx = await storeCouponContract.coupon(ownerAddresses,balanceToken, {
//     //   from: wallet.address,
//     //   gasPrice: gasPrice,
//     //   nonce: nonce
//     // });
//     // txHash = tx.hash
//     // console.log(txHash)


//     return {ownerAddresses, balanceToken}
//   } catch (e) {
//     console.error(e);
//     return {ownerAddresses: [], balanceToken: []}
//   }
// }



async getCouponAndTokenAddress(productAddress: string): Promise<{ tokenAddress: string | undefined, coupon: number | undefined }> {
  try {
    const product = await this.productRepository.findOne({
      where: {
        address: productAddress,
      },
    });
    const tokenAddress = product?.addressesList.tokenAddress;
    const coupon = product?.issuanceCycle.coupon;
    return { tokenAddress, coupon };
  } catch (e) {
    console.error(e);
    return { tokenAddress: undefined, coupon: undefined }; // Return undefined values in case of an error
  }
}

async getTotalSupplyToken(chainId: string, productAddress: string): Promise<{totalSupply: number}> {
  try {
    const result = await this.getCouponAndTokenAddress(productAddress);

    if (!result.tokenAddress) {
      console.error("Token address is undefined");
      return { totalSupply: 0 }; // Return an empty array if tokenAddress is undefined
    }
    const response = await Moralis.EvmApi.token.getTokenMetadata({
      "chain": chainId,
      "addresses": [
        result.tokenAddress
      ]
    });
    // Extract the total_supply value using type assertion
    const totalSupplyString = (response.raw[0] as any)['total_supply'];
    const totalSupply = Number(totalSupplyString); // Convert string to number
    console.log("Total Supply:", totalSupply);

    return {totalSupply: totalSupply}; 
  } catch (e) {
    console.error(e);
    return { totalSupply: 0 }; // Return an empty array in case of an error
  }
}

async getOptionProfit(chainId: number, productAddress: string): Promise<{optionProfit: number}> {
  const provider = new providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
  const productContract = new Contract(productAddress, PRODUCT_ABI, provider);
  const optionProfit = await productContract.optionProfit();

  return {optionProfit: Number(optionProfit)};
}

async getTokenHolderListForProfit(chainId: number, productAddress: string): Promise<GetHolderListDto> {
  try {
    const {optionProfit} = await this.getOptionProfit(chainId, productAddress);
    console.log("optionProfit");
    console.log(optionProfit);
    const chain = await this.convertChainId(chainId);
    const {totalSupply} = await this.getTotalSupplyToken(chain, productAddress);

    const result = await this.getCouponAndTokenAddress(productAddress);
    if (!result.tokenAddress) {
      console.error("Token address is undefined");
      return { ownerAddresses: [], balanceToken: [] }; // Return an empty array if tokenAddress is undefined
    }

    const response = await Moralis.EvmApi.token.getTokenOwners({
      "chain": chain,
      "order": "DESC",
      "tokenAddress": result.tokenAddress
    });

    const ownerAddresses = response.result.map((tokenOwner: any) => tokenOwner.ownerAddress);
    const balanceToken = response.result.map((tokenOwner: any) => {
        const balance = Number(tokenOwner.balance); // Default to 0 if undefined
        return balance * optionProfit / totalSupply;
    });
    
    return { ownerAddresses, balanceToken }; 
  } catch (e) {
    console.error(e);
    return { ownerAddresses: [], balanceToken: [] }; // Return an empty array in case of an error
  }
}

async convertCycleValues(cycle: any): Promise<CycleDto> {
  const convertedCycle = new CycleDto();
  
  // Convert BigNumber values to numbers
  convertedCycle.coupon = cycle.coupon ? Number(ethers.utils.formatUnits(cycle.coupon, 0)) : 0;
  convertedCycle.underlyingSpotRef = cycle.underlyingSpotRef ? Number(ethers.utils.formatUnits(cycle.underlyingSpotRef, 0)) : 0;
  convertedCycle.optionMinOrderSize = cycle.optionMinOrderSize ? Number(ethers.utils.formatUnits(cycle.optionMinOrderSize, 0)) : 0;
  
  // Convert other values that are already numbers or strings
  convertedCycle.strikePrice1 = Number(cycle.strikePrice1);
  convertedCycle.strikePrice2 = Number(cycle.strikePrice2);
  convertedCycle.strikePrice3 = Number(cycle.strikePrice3);
  convertedCycle.strikePrice4 = Number(cycle.strikePrice4);
  convertedCycle.tr1 = Number(cycle.tr1);
  convertedCycle.tr2 = Number(cycle.tr2);
  convertedCycle.issuanceDate = Number(cycle.issuanceDate);
  convertedCycle.maturityDate = Number(cycle.maturityDate);
  convertedCycle.apy = cycle.apy;
  convertedCycle.subAccountId = cycle.subAccountId;
  convertedCycle.participation = Number(cycle.participation);

  return convertedCycle;
}
}