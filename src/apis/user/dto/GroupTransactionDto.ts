import { Property } from "@tsed/schema";
import { TransactionHistoryDto } from "./TransactionHistoryDto";
export class GroupTransactionDto {
  @Property()
  transactionTime: string;

  @Property()
  transactionHistory: TransactionHistoryDto[];
}
