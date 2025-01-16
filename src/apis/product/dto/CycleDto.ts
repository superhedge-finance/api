import { Property } from "@tsed/schema";

export class CycleDto {
  @Property()
  coupon: number;

  @Property()
  strikePrice1: number;

  @Property()
  strikePrice2: number;

  @Property()
  strikePrice3: number;

  @Property()
  strikePrice4: number;

  @Property()
  tr1: number;

  @Property()
  tr2: number;

  @Property()
  issuanceDate: number;

  @Property()
  maturityDate: number;

  @Property()
  apy: string;

  @Property()
  underlyingSpotRef: number;

  @Property()
  optionMinOrderSize: number;

  @Property()
  subAccountId: string;

  @Property()
  participation: number;
  
}
