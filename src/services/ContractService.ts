import { Injectable } from "@tsed/di";
import { BigNumber, Contract, ethers } from "ethers";
import { CreatedProductDto, StatsDto } from "../apis";
import FACTORY_ABI from "./abis/SHFactory.json";
import PRODUCT_ABI from "./abis/SHProduct.json";
import { RPC_PROVIDERS, SH_FACTORY_ADDRESS, SUPPORT_CHAINS } from "../shared/constants";

@Injectable()
export class ContractService {
  private readonly factoryContract: { [chainId: number]: Contract } = {};
  private readonly productContract: { [chainId: number]: Contract } = {};
  private readonly marketplaceContract: { [chainId: number]: Contract } = {};
  private readonly nftContract: { [chainId: number]: Contract} = {};
  private readonly provider: { [chainId: number]: ethers.providers.JsonRpcProvider } = {};
  
  constructor() {
    for (const chainId of SUPPORT_CHAINS) {
      this.provider[chainId] = new ethers.providers.StaticJsonRpcProvider(RPC_PROVIDERS[chainId]);
      // console.log("SH_FACTORY_ADDRESS[chainId]", SH_FACTORY_ADDRESS[chainId])
      this.factoryContract[chainId] = new ethers.Contract(SH_FACTORY_ADDRESS[chainId], FACTORY_ABI, this.provider[chainId]);
    }
  }

  subscribeToEvents(chainId: number, eventName: string, callback: (event: any) => void) {
    // console.log(this.factoryContract);
    this.factoryContract[chainId].on(eventName, (...event) => {
      callback(event);
    });
  }

  subscribeToProductEvents(
    chainId: number,
    productAddress: string,
    eventNames: string[],
    callback: (eventName: string, event: any) => void,
  ) {
    // console.log(productAddress)
    const productContract = new ethers.Contract(productAddress, PRODUCT_ABI, this.provider[chainId]);
    
    for (const eventName of eventNames) {
      // console.log(productContract)
      productContract.on(eventName, (...event) => {
        // console.log(eventName)
        callback(eventName, event[event.length - 1]);
      });
    }
  }

  async eventToArgs(chainId: number, event: any): Promise<CreatedProductDto> {
    const stats = await this.getProductStats(chainId, String(event.args?.product));

    return {
      ...event.args,
      address: event.args.product,
      maxCapacity: event.args.maxCapacity.toString(),
      issuanceCycle: stats.cycle,
      ...stats,
    };
  }

  async getProductStats(chainId: number, address: string): Promise<StatsDto> {
    const productInstance = new ethers.Contract(address, PRODUCT_ABI, this.provider[chainId]);
    const _status = await productInstance.status();
    const _currentCapacity = await productInstance.currentCapacity();
    const _issuanceCycle = await productInstance.issuanceCycle();
    const _paused = await productInstance.paused();

    return {
      status: _status,
      currentCapacity: _currentCapacity.toString(),
      paused: _paused,
      cycle: {
        coupon: _issuanceCycle.coupon,
        strikePrice1: _issuanceCycle.strikePrice1.toNumber(),
        strikePrice2: _issuanceCycle.strikePrice2.toNumber(),
        strikePrice3: _issuanceCycle.strikePrice3.toNumber(),
        strikePrice4: _issuanceCycle.strikePrice4.toNumber(),
        tr1: _issuanceCycle.tr1.toNumber(),
        tr2: _issuanceCycle.tr2.toNumber(),
        issuanceDate: _issuanceCycle.issuanceDate.toNumber(),
        maturityDate: _issuanceCycle.maturityDate.toNumber(),
        apy: _issuanceCycle.apy,
        underlyingSpotRef: _issuanceCycle.underlyingSpotRef,
        optionMinOrderSize: _issuanceCycle.optionMinOrderSize,
        subAccountId: _issuanceCycle.subAccountId,
        participation: _issuanceCycle.participation
      },
    };
  }

  async getProductPrincipalBalance(chainId: number, address: string, product: string): Promise<boolean> {
    const productInstance = new ethers.Contract(product, PRODUCT_ABI, this.provider[chainId]);
    const _principalBalance = await productInstance.principalBalance(address);
    return _principalBalance.eq(BigNumber.from("0"));
  }

  async getPastEvents(chainId: number, eventName: string, fromBlock: number, toBlock: number): Promise<Array<CreatedProductDto>> {
    const events = await this.factoryContract[chainId].queryFilter(this.factoryContract[chainId].filters[eventName](), fromBlock, toBlock);

    const parsedEvents: CreatedProductDto[] = [];
    console.log("getPastEvents")
    for (const event of events) {
      const parsed = await this.eventToArgs(chainId, event);
      parsedEvents.push(parsed);
    }

    return parsedEvents;
  }

  async getPastEventsProduct(chainId: number, productAddress: string,eventName: string, fromBlock: number, toBlock: number): Promise<void> {
    this.productContract[chainId] = new ethers.Contract(productAddress, PRODUCT_ABI, this.provider[chainId]);
    const events = await this.productContract[chainId].queryFilter(this.productContract[chainId].filters[eventName](), fromBlock, toBlock);
    console.log(events)
  }


  async getMarketplacePastEvents(chainId: number, eventName: string, fromBlock: number, toBlock: number) {
    return await this.marketplaceContract[chainId].queryFilter(this.marketplaceContract[chainId].filters[eventName](), fromBlock, toBlock);
  }

  async getProductPastEvents(chainId: number, address: string, eventName: string, fromBlock: number, toBlock: number): Promise<any> {
    const productInstance = new ethers.Contract(address, PRODUCT_ABI, this.provider[chainId]);
    return await productInstance.queryFilter(productInstance.filters[eventName](), fromBlock, toBlock);
  }

  async validateWithdrawRequest(chainId: number, address: string, product: string): Promise<string> {
    const productInstance = new ethers.Contract(product, PRODUCT_ABI, this.provider[chainId]);
    return await productInstance.currentTokenId().toString();
  }

  async getLatestBlockNumber(chainId: number): Promise<number> {
    return this.provider[chainId].getBlockNumber();
  }
}
