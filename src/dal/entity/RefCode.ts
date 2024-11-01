import { Entity, PrimaryGeneratedColumn, Column , CreateDateColumn, UpdateDateColumn} from "typeorm";
import { Property } from "@tsed/schema";

@Entity("ref_codes")
export class RefCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Property()
  refCode: string;

  @Column("simple-array", { nullable: true })
  @Property()
  address: string[];

  @Column()
  @Property()
  quantity: number;

  @Column()
  @Property()
  usedCount: number;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;

}
