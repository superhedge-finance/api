import { Property } from "@tsed/schema";
import { HISTORY_TYPE, WITHDRAW_TYPE } from "../../../shared/enum";

export class TransactionHistoryDto {
  @Property()
  address: string;

  @Property()
  type: HISTORY_TYPE;

  @Property()
  withdrawType: WITHDRAW_TYPE;

  @Property()
  eventName: string;

  @Property()
  txHash: string;

  @Property()
  amountInDecimal: number;

  @Property()
  transactionHash: string;

  @Property()
  createdAt: Date;

  @Property()
  eventTime: Date;
}
