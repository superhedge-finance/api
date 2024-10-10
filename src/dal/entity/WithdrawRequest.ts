import { Entity, PrimaryGeneratedColumn, Column , CreateDateColumn, UpdateDateColumn} from "typeorm";
import { Property } from "@tsed/schema";

@Entity("withdraw_requests")
export class WithdrawRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Property()
  product: string;

  @Column()
  @Property()
  address: string;

  @Column({ nullable: true })
  @Property()
  txid: string;

  @Column({ nullable: true })
  @Property()
  status: string;

  @Column()
  @Property()
  amountPtUnwindPrice: number;

  @Column()
  @Property()
  amountOptionUnwindPrice: number;

  @Column()
  @Property()
  isTransferred: boolean = false;

  @Column({ nullable: true })
  @Property()
  transferredTx: string;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;

  @Column({ default: 0 })
  @Property()
  noOfBlocks: number;

}
