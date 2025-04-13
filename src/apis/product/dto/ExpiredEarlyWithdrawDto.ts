import { Property } from "@tsed/schema";

export class ExpiredEarlyWithdrawDto {
    @Property()
    expiredFlag: boolean;
}
