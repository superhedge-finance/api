import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from "typeorm";
import { Property } from "@tsed/schema";
import { Product } from "./Product";
import { SUPPORT_CHAIN_IDS } from "../../shared/enum";

@Entity("marketplaces")
export class Marketplace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Property()
  seller: string;

  @Column({ nullable: true })
  @Property()
  buyer: string;

  @Column()
  @Property()
  listingId: string;

  @Column()
  @Property()
  nft: string;

  @Column()
  @Property()
  product_address: string;

  @Column()
  @Property()
  tokenId: string;

  @Column()
  @Property()
  tokenIdInDecimal: number;

  @Column()
  @Property()
  quantity: string;

  @Column()
  @Property()
  quantityInDecimal: number;

  @Column()
  @Property()
  payToken: string;

  @Column({ nullable: true })
  @Property()
  unitPrice: string;

  @Column()
  @Property()
  price: string;

  @Column()
  @Property()
  priceInDecimal: number;

  @Column()
  @Property()
  startingTime: number;

  @Column({ unique: true })
  @Property()
  transactionHash: string;

  @Column({ nullable: true })
  @Property()
  soldTransactionHash: string;

  @Column({ nullable: true })
  @Property()
  cancelTransactionHash: string;

  @Column({ default: false })
  @Property()
  isExpired: boolean;

  @Column({ default: false })
  @Property()
  isSold: boolean;

  @Column({ type: "enum", enum: SUPPORT_CHAIN_IDS, default: SUPPORT_CHAIN_IDS.GOERLI })
  @Property()
  chainId: number;

  @OneToOne(() => Product, (product) => product.address)
  product: Product;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;
}
