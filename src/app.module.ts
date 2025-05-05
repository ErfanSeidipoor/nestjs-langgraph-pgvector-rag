import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from './agent.module/agent.module';
import { PostgresDBModule } from './postgres-db/postgres-db.module';
import { UserModule } from './user.module/user.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    UserModule,
    AgentModule,
    PostgresDBModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
