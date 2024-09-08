import { Controller, Inject } from "@tsed/di";
import { Get, Returns } from "@tsed/schema";
import { PathParams, QueryParams } from "@tsed/platform-params";
import { MarketplaceService } from "./services/MarketplaceService";
import { MarketplaceItemDto } from "./dto/MarketplaceItemDto";
import { MarketplaceItemFullDto } from "./dto/MarketplaceItemFullDto";
import { MarketplaceItemDetailDto } from "./dto/MarketplaceItemDetailDto";
import { SUPPORT_CHAIN_IDS } from "../../shared/enum";

@Controller("/marketplace")
export class MarketplaceController {
  @Inject()
  private readonly marketplaceService: MarketplaceService;

  @Get("/")
  @Returns(200, Array<MarketplaceItemDto>)
  async getListedItems(@QueryParams("chainId") chainId: number): Promise<MarketplaceItemDto[]> {
    return await this.marketplaceService.getListedItems(chainId || SUPPORT_CHAIN_IDS.GOERLI);
  }

  @Get("/:address")
  @Returns(200, Array<MarketplaceItemDto>)
  async getUserListedItems(@PathParams("address") address: string, @QueryParams("chainId") chainId: number): Promise<MarketplaceItemDto[]> {
    return await this.marketplaceService.getUserListedItems(address, chainId);
  }

  @Get("/item/:listing_id")
  @Returns(200, MarketplaceItemFullDto)
  async getItem(
    @PathParams("listing_id") listing_id: number,
    @QueryParams("chainId") chainId: number,
  ): Promise<MarketplaceItemFullDto | null> {
    return this.marketplaceService.getItem(listing_id, chainId);
  }

  /*@Get("/token/:listing_id")
  @Returns(200, MarketplaceItemDetailDto)
  async getTokenItem(
    @PathParams("listing_id") listing_id: string,
    @QueryParams("chainId") chainId: number,
  ): Promise<MarketplaceItemDetailDto | null> {
    return this.marketplaceService.getTokenItem(listing_id, chainId);
  }*/

  @Get("/token/:product_address")
  @Returns(200, MarketplaceItemDetailDto)
  async getTokenItem(
    @PathParams("product_address") product_address: string,
    @QueryParams("chainId") chainId: number,
  ): Promise<MarketplaceItemDetailDto | null> {
    return this.marketplaceService.getTokenItem(product_address, chainId);
  }
}
