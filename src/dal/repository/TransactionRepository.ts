import { Repository } from "typeorm";
import { Transaction } from "../entity/Transaction";

export class TransactionRepository extends Repository<Transaction> {}
