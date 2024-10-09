import { Controller, Inject } from "@tsed/di";
import { ProductService } from "../product/services/ProductService";
import { DECIMAL, SUPPORT_CHAINS } from "../../shared/constants";
import * as cron from "node-cron";

@Controller("/events")
export class EventsController {

  @Inject()
  private readonly productService: ProductService;

  $onInit() {
    // listen to get transaction from on chain event
    console.log(SUPPORT_CHAINS);
    cron.schedule("*/1 * * * *", async () => {
      for (const chainId of SUPPORT_CHAINS) {
        await this.productService.removeTransactionOvertime()
        const products = await this.productService.getProducts(chainId)
        const productList = products.map(products => products.address);
        // await this.productService.createWallet()
        for (const productAddress of productList){
          const {addressesList,amountsList} = await this.productService.getWithdrawList(productAddress)  
          if(addressesList && addressesList.length >0)
          {
            // update smartcontract
            const txResult = await this.productService.storeOptionPosition(chainId,productAddress,addressesList,amountsList) 
            console.log(txResult)
          }
        }
      }
    });
  }
}
