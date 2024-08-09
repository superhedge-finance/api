import { Inject, Injectable } from "@tsed/di";
import { Not, UpdateResult } from "typeorm";
import { BigNumber, ethers, FixedNumber, Contract } from "ethers";
import { History, Product, ProductRepository, WithdrawRequest, WithdrawRequestRepository } from "../../../dal";
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

const WebSocketServer = require('ws');


// Import the EvmChain dataType
const { EvmChain } = require("@moralisweb3/common-evm-utils")

const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijc2ZDhlYTQ1LWJmNTctNDFkYS04YjkxLTg4NjcxNWMzNDM3MiIsIm9yZ0lkIjoiMzk5NjgwIiwidXNlcklkIjoiNDEwNjg3IiwidHlwZUlkIjoiNjk0NzRhOGYtM2Q1OC00ZGU3LTk2ZWItZWQ0NTAwYjJiM2IwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MjA2NjIyMzUsImV4cCI6NDg3NjQyMjIzNX0.ADggUZYihL3LZOzcg-VN9saKl-Y6gEUuZN4uU09rafQ"
const address = "0x457E474891f8e8248f906cd24c3ddC2AD7fc689a"
const chain = EvmChain.ETHEREUM

Moralis.start({
  apiKey: MORALIS_API_KEY,
})

@Injectable()
export class ProductService {

  private readonly provider: { [chainId: number]: ethers.providers.JsonRpcProvider } = {};


  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject(HistoryRepository)
  private readonly historyRepository: HistoryRepository;

  @Inject(WithdrawRequestRepository)
  private readonly withdrawRequestRepository: WithdrawRequestRepository;

  create(
    chainId: number,
    address: string,
    name: string,
    underlying: string,
    maxCapacity: BigNumber,
    status: number,
    currentCapacity: string,
    cycle: CycleDto,
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
      deposits: depositActivity
    }
  }

  async syncProducts(chainId: number, pastEvents: CreatedProductDto[]): Promise<void> {
    await Promise.all(
      pastEvents.map(async (product: CreatedProductDto) => {
        const existProduct = await this.getProduct(chainId, product.address);
        if (!existProduct) {
          return this.create(
            chainId,
            product.address,
            product.name,
            product.underlying,
            BigNumber.from(product.maxCapacity),
            product.status,
            product.currentCapacity,
            product.issuanceCycle,
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

  async requestWithdraw(address: string, productAddress: string, currentTokenId: string): Promise<void> {
    const entity = new WithdrawRequest();
    entity.address = address;
    entity.product = productAddress;
    entity.current_token_id = currentTokenId;
    await this.withdrawRequestRepository.save(entity);
  }

  async cancelWithdraw(chainId: number, address: string, productAddress: string): Promise<void> {
    const request = await this.withdrawRequestRepository.findOne({
      where: {
        address: address,
        product: productAddress,
      },
    });
    if (request) {
      await this.withdrawRequestRepository.remove(request);
    }
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

  // async getHolderList(tokenAddress: string): Promise<{ holders: { balance: number; ownerAddress: string }[] }> {
  //   const response = await Moralis.EvmApi.token.getTokenOwners({
  //     "chain": "0xa4b1",
  //     "order": "ASC",
  //     "tokenAddress": tokenAddress
  //   });
  
  //   const holders = response.result?.map((item: any) => ({
  //     balance: item?.balance,
  //     ownerAddress: item?.ownerAddress
  //   })) ?? [];
  
  //   return { holders };
  // }

  async getAmountOutMin(chainId: number,walletAddress: string, productAddress: string,noOfBlock: number): Promise<{amountTokenOut: number}>
  {
    let amountTokenOut = 0
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

    const _totalCurrentSupply = await _productContract.totalCurrentSupply()
    const totalCurrentSupply = await Number(ethers.utils.formatUnits(_totalCurrentSupply,0))

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

    if(total_user_block>=noOfBlock)
    {
      const alocation  = early_withdraw_balance_user / totalCurrentSupply
      const _amountOutMin = Math.round(_ptTotal * alocation)
      const _marketAddrress = await _productContract.market()
      const _currency = await _productContract.currencyAddress()
      const url = `https://api-v2.pendle.finance/sdk/api/v1/swapExactPtForToken?chainId=42161&receiverAddr=${address}&marketAddr=${_marketAddrress}&amountPtIn=${_amountOutMin}&tokenOutAddr=${_currency}&slippage=0.002`;
      const response = await fetch(url);
      const params = await response.json();
      console.log('amountTokenOut')
      console.log(params.data.amountTokenOut)
      console.log(typeof params.data.amountTokenOut)
      amountTokenOut = params.data.amountTokenOut
    }
    
    return {amountTokenOut}
    
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
            console.log('Received from server:', response);

            // Check if the response is for authentication
            if (response.id === authMsg.id) {
                // Check if authentication was successful
                if (response.result && response.result.access_token) {
                    console.log("Authentication successful, retrieving positions...");
                    // Send the positions request
                    ws.send(JSON.stringify(positionsMsg));
                } else {
                    console.error("Authentication failed:", response);
                    reject(new Error("Authentication failed"));
                }
            }

            // Check if the response is for positions
            if (response.id === positionsMsg.id) {
                // Handle the positions response
                console.log("Positions Response:", response.result);
                const directionArray = response.result.map((i: any) => i.direction);
                const instrumentArray = response.result.map((i: any) => i.instrument_name);
                console.log("Instrument Array:", instrumentArray);

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

async getUserOptionPosition(chainId: number,walletAddress: string, productAddress: string,
  noOfBlock: number,totalOptionPosition: number): Promise<{userOptionPosition: number}>
{
  let userOptionPosition = 0
  const ethers = require('ethers');
  const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDERS[chainId]);
  const _productContract = new ethers.Contract(productAddress, PRODUCT_ABI, provider);
  const _tokenAddress = await _productContract.tokenAddress()

  const _tokenAddressInstance = new ethers.Contract(_tokenAddress, ERC20_ABI, provider)
  const _tokenDecimals = await _tokenAddressInstance.decimals()
  const _tokenBalance = await _tokenAddressInstance.balanceOf(walletAddress)
  const tokenBalance = Number(ethers.utils.formatUnits(_tokenBalance,0))/(10**_tokenDecimals)

  const _issuanceCycle = await _productContract.issuanceCycle();
  const underlyingSpotRef = _issuanceCycle.underlyingSpotRef.toNumber()
  const optionMinOrderSize = (_issuanceCycle.optionMinOrderSize.toNumber()) / 10
  const withdrawBlockSize = underlyingSpotRef * optionMinOrderSize
  const early_withdraw_balance_user = (noOfBlock * withdrawBlockSize) * 10**(_tokenDecimals)
  const total_user_block = tokenBalance/withdrawBlockSize

  const _totalCurrentSupply = await _productContract.totalCurrentSupply()
  const totalCurrentSupply = await Number(ethers.utils.formatUnits(_totalCurrentSupply,0))

  if(total_user_block>=noOfBlock)
  {
    const alocation  = early_withdraw_balance_user / totalCurrentSupply
    userOptionPosition = (alocation * totalOptionPosition)
  }
  
  return {userOptionPosition}
}




}
