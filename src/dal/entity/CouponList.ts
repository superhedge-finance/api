import { Entity, PrimaryGeneratedColumn, Column , CreateDateColumn, UpdateDateColumn} from "typeorm";
import { Property } from "@tsed/schema";

@Entity("coupon_list")
export class CouponList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Property()
  productAddress: string;

  @Column()
  @Property()
  transactionStatus: boolean;

  @Column()
  @Property()
  couponAddressListId: string;


  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;

}
