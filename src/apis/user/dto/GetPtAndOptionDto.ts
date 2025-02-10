import { Property, Required } from "@tsed/schema";

export class GetPtAndOptionDto {
  @Property()
  @Required()
  amountToken: number;

  @Property()
  @Required()
  amountOption: number;
}
