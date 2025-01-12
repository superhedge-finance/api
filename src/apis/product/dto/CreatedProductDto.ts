import { Property } from "@tsed/schema";
import { CycleDto } from "./CycleDto";
import { AddressDto } from "./AddressDto";


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

  @Property()
  addressesList: AddressDto;

  @Property()
  unwindMargin: number;

  @Property()
  currencyName: string;

}
