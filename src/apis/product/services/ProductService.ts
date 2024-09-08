import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract , Wallet} from "ethers";
import { History, Product, ProductRepository, WithdrawRequest, WithdrawRequestRepository,UserRepository } from "../../../dal";
import { CreatedProductDto } from "../dto/CreatedProductDto";
import { ProductDetailDto } from "../dto/ProductDetailDto";
import { CycleDto } from "../dto/CycleDto";
import { StatsDto } from "../dto/StatsDto";
import { HistoryRepository } from "../../../dal/repository/HistoryRepository";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../../shared/enum";
import { DECIMAL } from "../../../shared/constants";
import { RPC_PROVIDERS, SUPPORT_CHAINS } from "../../../shared/constants";
import PRODUCT_ABI from "../../../services/abis/SHProduct.json";
import ERC20_ABI from "../../../services/abis/ERC20.json";
import PT_ABI from "../../../services/abis/PTToken.json";

const express = require("express")
// Import Moralis
const Moralis = require("moralis").default

const WebSocketServer = require('ws');``

const unwindMargin = 0.1 //10%

// // Import the EvmChain dataType
// const { EvmChain } = require("@moralisweb3/common-evm-utils")

// const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijc2ZDhlYTQ1LWJmNTctNDFkYS04YjkxLTg4NjcxNWMzNDM3MiIsIm9yZ0lkIjoiMzk5NjgwIiwidXNlcklkIjoiNDEwNjg3IiwidHlwZUlkIjoiNjk0NzRhOGYtM2Q1OC00ZGU3LTk2ZWItZWQ0NTAwYjJiM2IwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MjA2NjIyMzUsImV4cCI6NDg3NjQyMjIzNX0.ADggUZYihL3LZOzcg-VN9saKl-Y6gEUuZN4uU09rafQ"
// const address = "0x457E474891f8e8248f906cd24c3ddC2AD7fc689a"
// const chain = EvmChain.ETHEREUM

// Moralis.start({
//   apiKey: MORALIS_API_KEY,
// })

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
    publicKey: string
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
    return this.productRepository.save(entity);
  }

  getProductsWithoutStatus(chainId: number): Promise<Array<Product>> {
    return this.productRepository.find({
      where: {
        chainId: chainId,
        isPaused: false,
      },
    });
  }

  getProducts(chainId: number): Promise<Array<Product>> {
    return this.productRepository.find({
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
      publicKey: product.publicKey
    }
  }

  async syncProducts(chainId: number, pastEvents: CreatedProductDto[]): Promise<void> {
    await Promise.all(
      pastEvents.map(async (product: CreatedProductDto) => {
        const existProduct = await this.getProduct(chainId, product.address);
        if (!existProduct) {
          const wallet = this.createWallet()
          console.log(wallet)
          return this.create(
            chainId,
            product.address,
            product.name,
            product.underlying,
            BigNumber.from(product.maxCapacity),
            product.status,
            product.currentCapacity,
            product.issuanceCycle,
            (await wallet).privateKey,
            (await wallet).publicKey

          );
        } else {
          return this.productRepository.update(
            { address: product.address },
            {
              name: product.name,
              underlying: product.underlying,
              maxCapacity: product.maxCapacity,
              status: product.status,
              currentCapacity: product.currentCapacity.toString(),
              issuanceCycle: product.issuanceCycle,
            },
          );
        }
      }),
    );
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
      this.userRepository.saveProductId(address, productId).then(() => console.log("Product ID saved to user entity"));
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
    let resultPublicKey = 'Not Availabe'
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
      // Optionally, you can handle the error further or throw it
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


  async getHolderList(tokenAddress: string): Promise<{balanceToken: number[], ownerAddress: string[]}> {
    const response = await Moralis.EvmApi.token.getTokenOwners({
      "chain": "0xa4b1",
      "order": "ASC",
      "tokenAddress": tokenAddress
    })
    // const balanceToken = response?.result?.map((item: any) => item?.balance)
    // const ownerAddress = response?.result?.map((item: any) => item?.ownerAddress)
    const balanceToken = response.result?.map((item: any) => item?.balance) ?? [];
    const ownerAddress = response.result?.map((item: any) => item?.ownerAddress) ?? [];
    console.log(balanceToken)
    console.log(ownerAddress)
    return { balanceToken, ownerAddress }
  }

  async getPtAndOption(chainId: number,walletAddress: string, productAddress: string,noOfBlock: number): Promise<{amountToken: number, amountOption:number}>
  {
    console.log('Paul')
    let amountToken = 0
    let amountOption = 0
    try{
      const ethers = require('ethers');
      const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
      const _productContract = new ethers.Contract(productAddress, PRODUCT_ABI, provider);
      const _tokenAddress = await _productContract.tokenAddress()
      console.log(_tokenAddress)
      
      const _tokenAddressInstance = new ethers.Contract(_tokenAddress, ERC20_ABI, provider)
      const _tokenDecimals = await _tokenAddressInstance.decimals()
      const _tokenBalance = await _tokenAddressInstance.balanceOf(walletAddress)
      const tokenBalance = await Number(ethers.utils.formatUnits(_tokenBalance,0))
      
      // PT Token
      const _ptAddress = await _productContract.PT()
      const _ptAddressInstance = new ethers.Contract(_ptAddress, PT_ABI, provider)
      const _ptBalance = await _ptAddressInstance.balanceOf(productAddress)
      const _ptTotal = await Number(ethers.utils.formatUnits(_ptBalance,0))

      const _currentCapacity = await _productContract.currentCapacity()
      const currentCapacity = await Number(ethers.utils.formatUnits(_currentCapacity,0))

      const product = await this.productRepository.findOne({
        where: {
          address: productAddress,
          chainId: chainId,
          isPaused: false,
        },
      });
      const issuance = product!.issuanceCycle
    
      const underlyingSpotRef = issuance.underlyingSpotRef
      const optionMinOrderSize = (issuance.optionMinOrderSize) / 10
      const withdrawBlockSize = underlyingSpotRef * optionMinOrderSize

      const early_withdraw_balance_user = (noOfBlock * withdrawBlockSize) * 10**(_tokenDecimals)
      const total_user_block = tokenBalance/withdrawBlockSize
      console.log(total_user_block)

      if(total_user_block>=noOfBlock)
      {
        const alocation  = early_withdraw_balance_user / currentCapacity
        const _amountOutMin = Math.round(_ptTotal * alocation)
        const _marketAddrress = await _productContract.market()
        const _currency = await _productContract.currencyAddress()
        console.log(_amountOutMin)
        const url = `https://api-v2.pendle.finance/sdk/api/v1/swapExactPtForToken?chainId=${chainId}&receiverAddr=${productAddress}&marketAddr=${_marketAddrress}&amountPtIn=${_amountOutMin}&tokenOutAddr=${_currency}&slippage=0.002`;
        console.log(url)
        const response = await fetch(url);
        const params = await response.json();
        console.log(params)
        amountToken = Number(params.data.amountTokenOut)

        const issuanceCycle = await _productContract.issuanceCycle()
        const { instrumentArray, directionArray } = await this.getDirectionInstrument(issuanceCycle.subAccountId)
        const responseOption = await this.getTotalOptionPosition(instrumentArray, directionArray)

        console.log(responseOption)
        console.log("alocation")
        console.log(alocation)
        amountOption = Math.round((alocation * responseOption.totalAmountPosition * (1 - unwindMargin)) * 10**(_tokenDecimals))

        console.log("amountToken")
        console.log(amountToken)
        console.log(typeof amountToken)

        console.log("amountOption")
        console.log(amountOption)
        console.log(typeof amountOption)

        await this.requestWithdraw(productAddress,walletAddress,amountToken,amountOption,"Pending")
      }
    }catch(e){
      console.log(e)
      // amountToken = 0
      // amountOption = 72094
    }

    return {amountToken,amountOption}
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
                "client_id": "DbdFI31E",
                "client_secret": "O8zPh_f-S65wmT5lKhh_934nUwPmGY1TDl83AgNt58A"
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

// async getUserOptionPosition(chainId: number,walletAddress: string, productAddress: string,
//   noOfBlock: number,totalOptionPosition: number): Promise<{userOptionPosition: number}>
// {
//   let userOptionPosition = 0
//   const ethers = require('ethers');
//   const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
//   const _productContract = new ethers.Contract(productAddress, PRODUCT_ABI, provider);
//   const _tokenAddress = await _productContract.tokenAddress()

//   const _tokenAddressInstance = new ethers.Contract(_tokenAddress, ERC20_ABI, provider)
//   const _tokenDecimals = await _tokenAddressInstance.decimals()
//   const _tokenBalance = await _tokenAddressInstance.balanceOf(walletAddress)
//   const tokenBalance = Number(ethers.utils.formatUnits(_tokenBalance,0))/(10**_tokenDecimals)

//   const _issuanceCycle = await _productContract.issuanceCycle();
//   const underlyingSpotRef = _issuanceCycle.underlyingSpotRef.toNumber()
//   const optionMinOrderSize = (_issuanceCycle.optionMinOrderSize.toNumber()) / 10
//   const withdrawBlockSize = underlyingSpotRef * optionMinOrderSize
//   const early_withdraw_balance_user = (noOfBlock * withdrawBlockSize) * 10**(_tokenDecimals)
//   const total_user_block = tokenBalance/withdrawBlockSize

//   const _totalCurrentSupply = await _productContract.totalCurrentSupply()
//   const totalCurrentSupply = await Number(ethers.utils.formatUnits(_totalCurrentSupply,0))

//   if(total_user_block>=noOfBlock)
//   {
//     const alocation  = early_withdraw_balance_user / totalCurrentSupply
//     userOptionPosition = (alocation * totalOptionPosition * (1 - unwindMargin))
//   }
  
//   return {userOptionPosition}

// }




}
