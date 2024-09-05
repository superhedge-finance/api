import { Property } from "@tsed/schema";
import { CycleDto } from "./CycleDto";

export class CreatedProductDto {
  @Property()
  id: number;

  @Property()
  address: string;

  @Property()
  name: string;

  @Property()
  underlying: string;

  @Property()
  maxCapacity: string;

  @Property()
  status: number;

  @Property()
  currentCapacity: string;

  @Property()
  issuanceCycle: CycleDto;

  @Property()
  publicKey: string;

  @Property()
  privateKey: string;

}
