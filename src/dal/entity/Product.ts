import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne } from "typeorm";
import { CycleDto,AddressDto } from "../../apis";
import { User } from "./User";
import { History } from "./History";
import { Property } from "@tsed/schema";
import { SUPPORT_CHAIN_IDS } from "../../shared/enum";

@Entity("products")
export class 
Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Property()
  address: string;

  @Column()
  @Property()
  name: string;

  @Column()
  @Property()
  underlying: string;

  @Column()
  @Property()
  maxCapacity: string;

  @Column()
  @Property()
  currentCapacity: string;

  @Column()
  @Property()
  status: number;

  @Column()
  @Property()
  isPaused: boolean = false;

  @Column({ nullable: true })
  @Property()
  publicKey: string;

  @Column({ nullable: true })
  @Property()
  privateKey: string;

  @Column({type: "json",nullable: true })
  @Property()
  addressesList: AddressDto;

  @Column({ nullable: true })
  @Property()
  unwindMargin: number;

  @Column({ type: 'boolean', default: false })
  @Property()
  isExpired: boolean = false;

  @Column("json")
  @Property()
  issuanceCycle: CycleDto;

  @Column({ type: "enum", enum: SUPPORT_CHAIN_IDS, default: SUPPORT_CHAIN_IDS.GOERLI })
  @Property()
  chainId: number;

  @Column({ nullable: true })
  @Property()
  vaultStrategy: string;

  @Column({ nullable: true })
  @Property()
  risk: string;

  @Column({ nullable: true })
  @Property()
  fees: string;

  @Column({ nullable: true })
  @Property()
  counterparties: string;

  @Column({ nullable: true })
  @Property()
  estimatedApy: string;

  @Column({ nullable: true })
  @Property()
  mtmPrice: number;

  @ManyToOne(() => User, (user) => user.products)
  user: User;

  @OneToOne(() => History, (history) => history.product)
  history: History;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;
}
