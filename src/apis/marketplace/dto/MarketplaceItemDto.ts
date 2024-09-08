import { Property } from "@tsed/schema";
import { CycleDto } from "../../product/dto/CycleDto";

export class MarketplaceItemDto {
  @Property()
  offerPrice: number;

  @Property()
  offerLots: number;

  @Property()
  totalLots: number;

  @Property()
  mtmPrice: number;

  @Property()
  underlying: string;

  @Property()
  productAddress: string;

  @Property()
  name: string;

  @Property()
  issuanceCycle: CycleDto;

  @Property()
  vaultStrategy: string;

  @Property()
  risk: string;

  @Property()
  fees: string;

  @Property()
  counterparties: string;

  @Property()
  estimatedApy: string;
}
