import { Property } from "@tsed/schema";
import { CreatedProductDto } from "./CreatedProductDto";

export type DepositActivity = {
    date: Date;
    amount: number;
    lots: number;
    txhash: string;
};

export class ProductDetailDto extends CreatedProductDto {
    @Property()
    chainId: number;

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

    @Property()
    mtmPrice: number;

    @Property()
    deposits: DepositActivity[];

    @Property()
    strategyContent: string;

    @Property()
    riskContent: string;

    @Property()
    updatedAt: Date;
}

export class UpdateProductContentDto {
    @Property()
    chainId: number;

    @Property()
    productAddress: string;

    @Property()
    strategyContent: string;

    @Property()
    riskContent: string;
}

export class UpdateProductContentResponseDto {
    @Property()
    success: boolean;

    @Property()
    message: string;
}
