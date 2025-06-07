import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthTable1716360000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth" (
                "id" SERIAL NOT NULL,
                "userId" character varying NOT NULL,
                "password" character varying NOT NULL,
                "email" character varying NOT NULL,
                "nickname" character varying NOT NULL,
                "gender" integer NOT NULL,
                "age" integer NOT NULL,
                "price" character varying NOT NULL,
                "favorite_food" text[] NOT NULL,
                "likes" jsonb DEFAULT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_auth_userId" UNIQUE ("userId"),
                CONSTRAINT "PK_auth" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "auth"`);
    }
} 