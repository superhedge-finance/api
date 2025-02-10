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
import { GetPtAndOptionDto } from "../../user/dto/GetPtAndOptionDto";
// import { MoralisService } from "./MoralisService";
import PRODUCT_ABI from "../../../services/abis/SHProduct.json";
import ERC20_ABI from "../../../services/abis/ERC20.json";
import PT_ABI from "../../../services/abis/PTToken.json";
import STORE_COUPON_ABI from "../../../services/abis/StoreCoupon.json";
import Moralis from 'moralis';
import { Float } from "type-graphql";
import { CouponService } from "../../coupon/services/CouponService";
require('dotenv').config();

const WebSocketServer = require('ws');``

const streamId = process.env.MORALIS_STREAM_ID as string


@Injectable()
export class EarlyWithdrawService {

  @Inject(ProductRepository)
  private readonly productRepository: ProductRepository;

  @Inject(WithdrawRequestRepository)
  private readonly withdrawRequestRepository: WithdrawRequestRepository;

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

    async getDirectionInstrument(subAccountId: string): Promise<{instrumentArray: string[], directionArray: string[]}> {
        // const subAccountId = "355261"
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocketServer('wss://www.deribit.com/ws/api/v2');

                // Authentication message
                const authMsg = {
                    "jsonrpc": "2.0",
                    "id": 9929,
                    "method": "public/auth",
                    "params": {
                        "grant_type": "client_credentials",
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
                        "subaccount_id": subAccountId
                    }
                };

                // Set a timeout to reject the promise if no response is received
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 30000); // 30 second timeout

                // Handle incoming messages
                ws.onmessage = function (e: any) {
                    try {
                        const response = JSON.parse(e.data);
                        // console.log('Received from server:', response);

                        if (response.error) {
                            clearTimeout(timeout);
                            ws.close();
                            reject(new Error(`Server error: ${response.error.message}`));
                            return;
                        }

                        // Check if the response is for authentication
                        if (response.id === authMsg.id) {
                            if (response.result && response.result.access_token) {
                                console.log("Authentication successful, retrieving positions...");
                                ws.send(JSON.stringify(positionsMsg));
                            } else {
                                clearTimeout(timeout);
                                ws.close();
                                reject(new Error("Authentication failed"));
                            }
                        }

                        // Check if the response is for positions
                        if (response.id === positionsMsg.id) {
                            clearTimeout(timeout);
                            ws.close();

                            if (!response.result || !Array.isArray(response.result)) {
                                reject(new Error("Invalid positions response format"));
                                return;
                            }

                            const directionArray = response.result.map((i: any) => i.direction);
                            const instrumentArray = response.result.map((i: any) => i.instrument_name);
                            
                            resolve({ instrumentArray, directionArray });
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(`Error processing message: ${error.message}`));
                    }
                };

                // Handle WebSocket connection open
                ws.onopen = function () {
                    console.log("WebSocket connection opened. Sending authentication message...");
                    try {
                        ws.send(JSON.stringify(authMsg));
                    } catch (error) {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(`Failed to send auth message: ${error.message}`));
                    }
                };

                // Handle WebSocket errors
                ws.onerror = function (error: any) {
                    clearTimeout(timeout);
                    console.error("WebSocket error:", error);
                    reject(new Error(`WebSocket error: ${error.message}`));
                };

                // Handle WebSocket connection close
                ws.onclose = function () {
                    clearTimeout(timeout);
                    console.log("WebSocket connection closed.");
                };

            } catch (error) {
                reject(new Error(`Failed to initialize WebSocket: ${error.message}`));
            }
        });
    }

    async getTotalOptionPosition(instrumentArray: string[], directionArray: string[]): Promise<{ totalAmountPosition: number }> {
        return new Promise((resolve, reject) => {
            let totalAmountPosition = 0;
            let responsesReceived = 0; // Counter to track how many responses we've received
            const expectedResponses = instrumentArray.length; // Total number of expected responses
      
            const ws = new WebSocketServer('wss://www.deribit.com/ws/api/v2');
      
            ws.onmessage = function (e: any) {
                const response = JSON.parse(e.data);
                const index = instrumentArray.findIndex(instruments => instruments === response.result[0].instrument_name);
      
                if (index !== -1) { // Ensure the index is valid
                    let instrumentUnwindPrice = 0;
      
                    if (directionArray[index] === "buy") {
                        instrumentUnwindPrice = response.result[0].ask_price * response.result[0].estimated_delivery_price;
                    } else {
                        instrumentUnwindPrice = response.result[0].bid_price * response.result[0].estimated_delivery_price * -1;
                    }
                    // console.log(instrumentUnwindPrice);
                    totalAmountPosition += instrumentUnwindPrice;
                }
      
                responsesReceived++; // Increment the counter for each response received
      
                // Check if we've received all expected responses
                if (responsesReceived === expectedResponses) {
                    resolve({ totalAmountPosition });
                }
            };
      
            ws.onopen = function () {
                // Send a message for each instrument
                instrumentArray.forEach((instrument: string) => {
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

    async requestWithdraw(noOfBlock: number, productAddress: string, address: string, amountPtUnwindPrice: number, amountOptionUnwindPrice: number,status:string ): Promise<void> {
        const entity = new WithdrawRequest();
        entity.noOfBlocks = noOfBlock
        entity.product = productAddress
        entity.address = address
        entity.amountPtUnwindPrice = amountPtUnwindPrice
        entity.amountOptionUnwindPrice = amountOptionUnwindPrice
        entity.status = status
        await this.withdrawRequestRepository.save(entity)
      }

    async getPtAndOption(chainId: number, walletAddress: string, productAddress: string, noOfBlock: number): Promise<GetPtAndOptionDto> {
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
            // console.log(formattedTokenBalance)


            // Fetch PT address and balance
            // const ptAddress = await productContract.PT();
            const ptContract = new Contract(ptAddress, PT_ABI, provider);
            const ptBalance = await ptContract.balanceOf(productAddress);
            
            const formattedPtBalance = Number(utils.formatUnits(ptBalance, 0));
            // console.log(formattedPtBalance)
            // Fetch current capacity
            const currentCapacity = Number(utils.formatUnits(await productContract.currentCapacity(), 0));

            // Fetch product details
            const product = await this.productRepository.findOne({
                where: { address: productAddress, chainId: chainId, isPaused: false },
            });

            if (!product) {
                throw new Error("Product not found");
            }

            const unwindMargin = product.unwindMargin
            const issuance = product.issuanceCycle;
            // console.log(issuance)
            const underlyingSpotRef = issuance.underlyingSpotRef;
            const optionMinOrderSize = issuance.optionMinOrderSize / 10
            const withdrawBlockSize = underlyingSpotRef * optionMinOrderSize;

            const earlyWithdrawBalanceUser = (noOfBlock * withdrawBlockSize) * 10 ** tokenDecimals;

            const totalUserBlock = Math.round(formattedTokenBalance / withdrawBlockSize)

            console.log(`Total user block: ${totalUserBlock}`);

            if (totalUserBlock >= noOfBlock) {
                const allocation = earlyWithdrawBalanceUser / currentCapacity;
                const amountOutMin = BigInt(Math.round(formattedPtBalance * allocation)).toString();
                // console.log(amountOutMin)
                
                // const url = `https://api-v2.pendle.finance/sdk/api/v1/swapExactPtForToken?chainId=${chainId}&receiverAddr=${productAddress}&marketAddr=${marketAddress}&amountPtIn=${amountOutMin}&tokenOutAddr=${currencyAddress}&slippage=0.002`;
                
                const url = `https://api-v2.pendle.finance/core/v1/sdk/1/markets/${marketAddress}/swap?receiver=${productAddress}&slippage=0.002&enableAggregator=false&tokenIn=${ptAddress}&tokenOut=${currencyAddress}&amountIn=${amountOutMin}`
                // console.log(newUrl)
                // console.log(url)
                const response = await fetch(url);
                const params = await response.json();
                // console.log(params)
                amountToken = params.data.amountOut;    
                const { instrumentArray, directionArray } = await this.getDirectionInstrument(issuance.subAccountId);
                const responseOption = await this.getTotalOptionPosition(instrumentArray, directionArray);

                amountOption = Math.round((optionMinOrderSize * noOfBlock * issuance.participation * responseOption.totalAmountPosition * (1 - (unwindMargin/1000))) * 10 ** tokenDecimals);


                console.log("amountOption")
                console.log(responseOption.totalAmountPosition)
                // amountOption = amountOption * -1
                console.log(amountOption)
                // await this.requestWithdraw(noOfBlock,productAddress, walletAddress, amountToken, amountOption, "Pending");  

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

  


}