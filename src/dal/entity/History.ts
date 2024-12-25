import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, Index, Unique } from "typeorm";
import { Property } from "@tsed/schema";
import { Product } from "./Product";
import { HISTORY_TYPE, SUPPORT_CHAIN_IDS, WITHDRAW_TYPE } from "../../shared/enum";

@Entity("histories")
@Index(["transactionHash", "logIndex"], { unique: true })
@Unique("txLog", ["transactionHash", "logIndex"])
export class History {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Property()
  address: string;

  @Column({
    type: "enum",
    enum: HISTORY_TYPE,
    default: HISTORY_TYPE.DEPOSIT,
  })
  @Property()
  type: HISTORY_TYPE;

  @Column({
    type: "enum",
    enum: WITHDRAW_TYPE,
    default: WITHDRAW_TYPE.NONE,
  })
  @Property()
  withdrawType: WITHDRAW_TYPE;

  @Column({ nullable: true })
  @Property()
  productId: number;

  @Column()
  @Property()
  amount: string;

  @Column({ type: "decimal", precision: 32, scale: 18, nullable: true })
  @Property()
  amountInDecimal: number;

  @Column({ nullable: true })
  @Property()
  totalBalance: string;

  @Column()
  @Property()
  transactionHash: string;

  @Column()
  @Property()
  logIndex: number;

  @Column({ nullable: true })
  @Property()
  tokenId: string;

  @Column({ nullable: true })
  @Property()
  supply: string;

  @Column({ nullable: true })
  @Property()
  supplyInDecimal: number;

  @Column({ type: "enum", enum: SUPPORT_CHAIN_IDS, default: SUPPORT_CHAIN_IDS.GOERLI })
  @Property()
  chainId: number;

  @Column({ nullable: true })
  @Property()
  from: string;

  @OneToOne(() => Product, (product) => product.history)
  product: Product;

  @Column({ nullable: true })
  @Property()
  eventName: string;

  @Column({ nullable: true })
  @Property()
  eventTime: Date;

  @CreateDateColumn({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;
}
