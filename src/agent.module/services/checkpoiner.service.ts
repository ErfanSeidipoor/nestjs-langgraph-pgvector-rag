import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class CheckpointerService implements OnModuleInit {
  pool: Pool = new Pool();
  checkpointer: PostgresSaver = new PostgresSaver(this.pool);

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      user: this.configService.get('POSTGRES_DB_USERNAME'),
      host: this.configService.get('POSTGRES_DB_HOST'),
      database: this.configService.get('POSTGRES_DB_DATABASE'),
      password: this.configService.get('POSTGRES_DB_PASSWORD'),
      port: Number(this.configService.get('POSTGRES_DB_PORT')),
    });
    this.checkpointer = new PostgresSaver(this.pool);
  }

  async onModuleInit() {
    await this.checkpointer.setup();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
