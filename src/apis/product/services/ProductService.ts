import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract , Wallet, providers, utils} from "ethers";
import { History, Product, ProductRepository, WithdrawRequest, WithdrawRequestRepository,UserRepository } from "../../../dal";
import { CreatedProductDto } from "../dto/CreatedProductDto";
import { ProductDetailDto } from "../dto/ProductDetailDto";
import { CycleDto } from "../dto/CycleDto";
import { StatsDto } from "../dto/StatsDto";
import { AddressDto } from "../dto/AddressDto";
import { HistoryRepository } from "../../../dal/repository/HistoryRepository";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../../shared/enum";
import { DECIMAL } from "../../../shared/constants";
import { RPC_PROVIDERS, SUPPORT_CHAINS } from "../../../shared/constants";
import PRODUCT_ABI from "../../../services/abis/SHProduct.json";
import ERC20_ABI from "../../../services/abis/ERC20.json";
import PT_ABI from "../../../services/abis/PTToken.json";
import Moralis from 'moralis';

const WebSocketServer = require('ws');``

const unwindMargin = 0.1 //10%

// // Import the EvmChain dataType
// const { EvmChain } = require("@moralisweb3/common-evm-utils")

// const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijc2ZDhlYTQ1LWJmNTctNDFkYS04YjkxLTg4NjcxNWMzNDM3MiIsIm9yZ0lkIjoiMzk5NjgwIiwidXNlcklkIjoiNDEwNjg3IiwidHlwZUlkIjoiNjk0NzRhOGYtM2Q1OC00ZGU3LTk2ZWItZWQ0NTAwYjJiM2IwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MjA2NjIyMzUsImV4cCI6NDg3NjQyMjIzNX0.ADggUZYihL3LZOzcg-VN9saKl-Y6gEUuZN4uU09rafQ"
// const address = "0x457E474891f8e8248f906cd24c3ddC2AD7fc689a"
// const chain = EvmChain.ETHEREUM

Moralis.start({
  apiKey: process.env.MORALIS_API_KEY
});
const streamId = process.env.MORALIS_STREAM_ID
// const ethers = require('ethers');

@Injectable()
export class ProductService {

  private readonly provider: { [chainId: number]: ethers.providers.JsonRpcProvider } = {};

  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

  @Inject(WithdrawRequestRepository)
  private readonly withdrawRequestRepository: WithdrawRequestRepository;

  @Inject(UserRepository)
  private readonly userRepository: UserRepository;

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

  getProducts(chainId: number): Promise<Array<Product>> {
    return this.productRepository.find({
      select: ["id", "name", "address","underlying","issuanceCycle", 
              "status", "chainId","currentCapacity","maxCapacity","addressesList"],
      where: {
        status: Not(0),
        isPaused: false,
        chainId: chainId,
      },
      order: {
        created_at: "ASC",
      },
    });
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

    return {
      id: product.id,
      address: product.address,
      name: product.name,
      underlying: product.underlying,
      maxCapacity: product.maxCapacity,
      currentCapacity: product.currentCapacity,
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
      addressesList: product.addressesList
    }
  }

  async syncProducts(chainId: number, pastEvents: CreatedProductDto[]): Promise<void> {
    await Promise.all(
      pastEvents.map(async (product: CreatedProductDto) => {
        const existProduct = await this.getProduct(chainId, product.address);
        if (!existProduct) {
          const wallet = await this.createWallet()
          this.addProductAddressIntoStream(product.address)
          const addressesList = await this.getAddressesContract(chainId,product.address)
          console.log(addressesList)
          return this.create(
            chainId,
            product.address,
            product.name,
            product.underlying,
            BigNumber.from(product.maxCapacity),
            product.status,
            product.currentCapacity,
            product.issuanceCycle,
            wallet.privateKey,
            wallet.publicKey,
            addressesList,
          );
        } else {
          const addressesList = await this.getAddressesContract(chainId,product.address)
          console.log(addressesList)
          return this.productRepository.update(
            { address: product.address },
            {
              name: product.name,
              underlying: product.underlying,
              maxCapacity: product.maxCapacity,
              status: product.status,
              currentCapacity: product.currentCapacity.toString(),
              issuanceCycle: product.issuanceCycle,
              addressesList,
            },
          );
        }
      }),
    );
  }

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
      // const response = await Moralis.Streams.getAddresses({
      //   "limit": 100,
      //   // "id": streamId
      //   "id": "903563f7-82b9-43ef-90f7-95b8ff7866d6"
      // });
      const response = await Moralis.Streams.addAddress({
        "id": "903563f7-82b9-43ef-90f7-95b8ff7866d6",
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

  async requestWithdraw(productAddress: string, address: string, amountPtUnwindPrice: number, amountOptionUnwindPrice: number,status:string ): Promise<void> {
    const entity = new WithdrawRequest();
    entity.product = productAddress;;
    entity.address = address;
    entity.amountPtUnwindPrice = amountPtUnwindPrice;
    entity.amountOptionUnwindPrice = amountOptionUnwindPrice;
    entity.status = status;
    await this.withdrawRequestRepository.save(entity);
  }

  async cancelWithdraw(chainId: number, address: string, isTransferred: boolean): Promise<void> {
    const request = await this.withdrawRequestRepository.findOne({
      where: {
        address: address,
        isTransferred: isTransferred,
      },
    });
    if (request) {
      await this.withdrawRequestRepository.remove(request);
    }
  }

  async removeTransactionOvertime(): Promise<void> {
    const currentTime = new Date(); // Get the current time
    const twentyFourHoursAgo = new Date(currentTime.getTime() - 60 * 1000); // Calculate the timestamp for 24 hours ago 24 * 60 * 60 * 1000
    try {
        const request = await this.withdrawRequestRepository.createQueryBuilder('withdraw')
            .select('withdraw.id')
            .where("withdraw.isTransferred = false")
            .andWhere('withdraw.status = :status', { status: "Pending" })
            .andWhere('withdraw.created_at < :twentyFourHoursAgo', { twentyFourHoursAgo }) // Add condition for created_at
            .getRawMany();
        const idList = request.map(request => request.withdraw_id)
        if (idList.length > 0) {
          idList.forEach((withdrawId) => {
            this.deletelWithdraw(withdrawId)
          });
          console.log('removeTransactionOvertime')
        }
    } catch (error) {
      console.error("Error removing overtime transactions:", error);
    }
}

async deletelWithdraw(id: number): Promise<void> {
  const request = await this.withdrawRequestRepository.findOne({
    where: {
      id: id,
    },
  });
  if (request) {
    // console.log(request)
    await this.withdrawRequestRepository.remove(request);
  }
}

  async updateWithdrawRequest(chainId: number, product: string, address: string, txid: string , amountPtUnwindPrice: number, amountOptionUnwindPrice: number): Promise<{result:string}> {
    let result = "failed"
    try{
      const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId])
      const receipt = await provider.getTransactionReceipt(txid);
      if (receipt && receipt.status === 1) {
        console.log("Transaction was successful");
        this.withdrawRequestRepository.update(
          { product,address,amountPtUnwindPrice, amountOptionUnwindPrice},
          { txid: txid, status: "Success"}
        );
        result = "Success"
      }
    }
    catch(e){
        result = "Failed"
      }
    return {result}
  }

  async saveProductUser(chainId: number,productAddress: string,address: string,txid: string): Promise<void>
  {
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

  async storeOptionPosition(chainId: number,productAddress: string, addressesList: string[], amountsList: number[]) : Promise<{txHash: string}>
  {
    let txHash = '0x'
    const ethers = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
    try
      {const product = await this.productRepository.findOne({
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
    }catch(e)
    {
      console.error("StoreOptionPosition", e);
    }
    return {txHash}
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

  async createWallet():Promise<{privateKey: string,publicKey: string}>
  {
    // Generate a new random wallet
    const wallet = Wallet.createRandom();
    const walletKey = new ethers.Wallet(wallet.privateKey);
    const publicKey = walletKey.address;
    const privateKey= wallet.privateKey;
    return{privateKey,publicKey}
  }

  async getHolderList(productAddress: string, chainId: number): Promise<{balanceToken: number[], ownerAddress: string[]}>  {
    
    try {
      const {tokenAddress} = await this.getTokenAddress(chainId, productAddress)
      if (!tokenAddress) {
        return { balanceToken: [], ownerAddress: [] };
      }
      const response = await Moralis.EvmApi.token.getTokenOwners({
        "chain": `0x${chainId.toString(16)}`,
        "order": "ASC",
        "tokenAddress": tokenAddress
      })
      const balanceToken = response.result?.map((item: any) => item?.balance) ?? [];
      const ownerAddress = response.result?.map((item: any) => item?.ownerAddress) ?? [];

      return { balanceToken, ownerAddress };
    } catch (e) {
      console.error("Error fetching product:", e);
      return { balanceToken: [], ownerAddress: [] };
    }
  }

  async getTokenAddress(chainId: number, productAddress: string): Promise<{ tokenAddress: string, ptAddress: string, marketAddress: string, currencyAddress: string }> {
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

  async getPtAndOption(chainId: number, walletAddress: string, productAddress: string, noOfBlock: number): Promise<{ amountToken: number, amountOption: number }> {
    console.log('Fetching PT and Option data...');
    let amountToken = 0;
    let amountOption = 0;
    const start = new Date()
    try {
        const provider = new providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
        const productContract = new Contract(productAddress, PRODUCT_ABI, provider);
        const {tokenAddress,ptAddress,marketAddress,currencyAddress} = await this.getTokenAddress(chainId,productAddress)
        
        // Fetch token decimals and balance in one go
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
        const [tokenDecimals, tokenBalance] = await Promise.all([
            tokenContract.decimals(),
            tokenContract.balanceOf(walletAddress)
        ]);
        const formattedTokenBalance = Number(utils.formatUnits(tokenBalance, tokenDecimals));
        console.log(formattedTokenBalance)


        // Fetch PT address and balance
        // const ptAddress = await productContract.PT();
        const ptContract = new Contract(ptAddress, PT_ABI, provider);
        const ptBalance = await ptContract.balanceOf(productAddress);
        const formattedPtBalance = Number(utils.formatUnits(ptBalance, 0));

        // Fetch current capacity
        const currentCapacity = Number(utils.formatUnits(await productContract.currentCapacity(), 0));

        // Fetch product details
        const product = await this.productRepository.findOne({
            where: { address: productAddress, chainId: chainId, isPaused: false },
        });

        if (!product) {
            throw new Error("Product not found");
        }

        const issuance = product.issuanceCycle;
        console.log(issuance)
        const underlyingSpotRef = issuance.underlyingSpotRef;
        const optionMinOrderSize = issuance.optionMinOrderSize / 10;
        const withdrawBlockSize = underlyingSpotRef * optionMinOrderSize;

        const earlyWithdrawBalanceUser = (noOfBlock * withdrawBlockSize) * 10 ** tokenDecimals;
        const totalUserBlock = formattedTokenBalance / withdrawBlockSize;

        console.log(`Total user block: ${totalUserBlock}`);

        if (totalUserBlock >= noOfBlock) {
            const allocation = earlyWithdrawBalanceUser / currentCapacity;
            const amountOutMin = Math.round(formattedPtBalance * allocation);

            const url = `https://api-v2.pendle.finance/sdk/api/v1/swapExactPtForToken?chainId=${chainId}&receiverAddr=${productAddress}&marketAddr=${marketAddress}&amountPtIn=${amountOutMin}&tokenOutAddr=${currencyAddress}&slippage=0.002`;

            const response = await fetch(url);
            const params = await response.json();
            amountToken = Number(params.data.amountTokenOut);

            const { instrumentArray, directionArray } = await this.getDirectionInstrument(issuance.subAccountId);
            const responseOption = await this.getTotalOptionPosition(instrumentArray, directionArray);

            amountOption = Math.round((allocation * responseOption.totalAmountPosition * (1 - unwindMargin)) * 10 ** tokenDecimals);
            await this.requestWithdraw(productAddress, walletAddress, amountToken, amountOption, "Pending");  
            const end = new Date()
            const duration = end.getTime() - start.getTime(); // Calculate duration in milliseconds
            console.log(`Execution time: ${duration} milliseconds`);  
        }
    } catch (error) {
        console.error("Error in getPtAndOption:", error);
        // Optionally, you can set default values or rethrow the error
    }
    return { amountToken, amountOption };
  }

  async getDirectionInstrument(subAccountId: string): Promise<{instrumentArray: string[], directionArray: string[] }> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocketServer('wss://test.deribit.com/ws/api/v2');

        // Authentication message
        const authMsg = {
            "jsonrpc": "2.0",
            "id": 9929,
            "method": "public/auth",
            "params": {
                "grant_type": "client_credentials",
                // "client_id": "DbdFI31E",
                // "client_secret": "O8zPh_f-S65wmT5lKhh_934nUwPmGY1TDl83AgNt58A"
                "client_id": process.env.CLIENT_ID,
                "client_secret": process.env.CLIENT_SECRET
            }
        };

        // Positions message
        const positionsMsg = {
            "jsonrpc": "2.0",
            "id": 2236,
            "method": "private/get_positions",
            "params": {
                "currency": "BTC",
                "subaccount_id": subAccountId //59358
            }
        };

        // Handle incoming messages
        ws.onmessage = function (e: any) {
            const response = JSON.parse(e.data);
            // console.log('Received from server:', response);

            // Check if the response is for authentication
            if (response.id === authMsg.id) {
                // Check if authentication was successful
                if (response.result && response.result.access_token) {
                    // console.log("Authentication successful, retrieving positions...");
                    // Send the positions request
                    ws.send(JSON.stringify(positionsMsg));
                } else {
                    // console.error("Authentication failed:", response);
                    reject(new Error("Authentication failed"));
                }
            }

            // Check if the response is for positions
            if (response.id === positionsMsg.id) {
                // Handle the positions response
                // console.log("Positions Response:", response.result);
                const directionArray = response.result.map((i: any) => i.direction);
                const instrumentArray = response.result.map((i: any) => i.instrument_name);
                // console.log("Instrument Array:", instrumentArray);

                // Resolve the promise with the direction and instrument arrays
                resolve({ instrumentArray,directionArray });
            }
        };

        // Handle WebSocket connection open
        ws.onopen = function () {
            console.log("WebSocket connection opened. Sending authentication message...");
            ws.send(JSON.stringify(authMsg));
        };

        // Handle WebSocket errors
        ws.onerror = function (error: any) {
            console.error("WebSocket error:", error);
            reject(error); // Reject the promise on error
        };

        // Handle WebSocket connection close
        ws.onclose = function () {
            console.log("WebSocket connection closed.");
        };
    });
}

async getTotalOptionPosition(instrumentArray: string[], directionArray: string[]): Promise<{ totalAmountPosition: number }> {
  return new Promise((resolve, reject) => {
      let totalAmountPosition = 0
      const ws = new WebSocketServer('wss://test.deribit.com/ws/api/v2')
      ws.onmessage = function (e: any) {
          let instrumentUnwindPrice = 0
          const response = JSON.parse(e.data);
          // console.log(response.result[0])
          const index = instrumentArray.findIndex(instruments => instruments === response.result[0].instrument_name)
          if(directionArray[index] == "buy")
          {
            instrumentUnwindPrice = response.result[0].bid_price * response.result[0].underlying_price
          }
          else{
            instrumentUnwindPrice = response.result[0].ask_price * response.result[0].underlying_price
          }
          totalAmountPosition+=instrumentUnwindPrice
          resolve({totalAmountPosition});
      };

      ws.onopen = function () {
          // Send a message for each instrument
          instrumentArray.forEach((instrument:string) => {
            const msg = {
                "jsonrpc": "2.0",
                "id": 3659,
                "method": "public/get_book_summary_by_instrument",
                "params": {
                    "instrument_name": instrument
                }
            };
            ws.send(JSON.stringify(msg));
          });
      };

      ws.onerror = function (error: any) {
          console.error("WebSocket error:", error);
          reject(error);
      };

      ws.onclose = function () {
          console.log("WebSocket connection closed.");
      };
    });
  }


}
