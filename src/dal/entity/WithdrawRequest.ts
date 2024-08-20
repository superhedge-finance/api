import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { Property } from "@tsed/schema";

@Entity("withdraw_requests")
export class WithdrawRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Property()
  address: string;

  @Column()
  @Property()
  amountPtUnwindPrice: number;

  @Column()
  @Property()
  amountOptionUnwindPrice: number;

  @Column()
  @Property()
  isTransferred: boolean = false;
}
