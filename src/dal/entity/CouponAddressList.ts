import { Entity, PrimaryGeneratedColumn, Column , CreateDateColumn, UpdateDateColumn} from "typeorm";
import { Property } from "@tsed/schema";

@Entity("coupon_address_list")
export class CouponAddressList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Property()
  couponAddressListId: string;

  @Column()
  @Property()
  transactionHash: string;

  @Column("simple-array", { nullable: true })
  @Property()
  address: string[];

  @Column("simple-array", { nullable: true })
  @Property()
  balance: number[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;

}
