import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool, QueryResultRow } from "pg";

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
    private pool!: Pool;

    onModuleInit() {
        console.log(process.env.DATABASE_URL);
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 10,
        });
    }

    async onModuleDestroy() {
        await this.pool?.end();
    }

    async query<T extends QueryResultRow = any>(text: string, params?: any[]) {
        return this.pool.query<T>(text, params);
    }
}
