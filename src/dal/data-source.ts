import * as dotenv from "dotenv";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import * as entities from "./entity";

dotenv.config();

export const SuperHedgeDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: true,
  logging: false,
  entities: [...Object.values(entities)],
  migrations: ["src/dal/migration/*.ts"],
  subscribers: [],
  migrationsTableName: "_migrations",
  namingStrategy: new SnakeNamingStrategy(),
});
