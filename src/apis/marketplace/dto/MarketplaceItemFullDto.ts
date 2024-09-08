import { Property } from "@tsed/schema";
import { MarketplaceItemDto } from "./MarketplaceItemDto";

export class MarketplaceItemFullDto extends MarketplaceItemDto {
  @Property()
  id: number;

  @Property()
  tokenId: string;

  @Property()
  listingId: string;

  @Property()
  quantity: number;
  
  @Property()
  startingTime: number;

  @Property()
  seller: string;
}
