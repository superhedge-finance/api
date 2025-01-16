import { Property, Required, MaxLength, MinLength } from "@tsed/schema";

export class CouponListDto {
    @Property()
    address!: string[];
    @Property()
    balance!: number[];
}