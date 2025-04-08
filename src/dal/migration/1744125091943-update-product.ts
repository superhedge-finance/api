import { MigrationInterface, QueryRunner } from "typeorm"

export class updateProduct1744125091943 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "strategy_content" TEXT`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "risk_content" TEXT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "strategy_content"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "risk_content"`);
    }

}
