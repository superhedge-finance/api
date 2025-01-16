import { Property } from "@tsed/schema";

export class AddressDto {
  @Property()
  tokenAddress: string;

  @Property()
  ptAddress: string;

  @Property()
  marketAddress: string;

  @Property()
  currencyAddress: string;
  
}
