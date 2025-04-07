import { Property } from "@tsed/schema";

export class GetHolderListDto {
    @Property()
    ownerAddresses: string[];

    @Property()
    balanceToken: string[];
}
