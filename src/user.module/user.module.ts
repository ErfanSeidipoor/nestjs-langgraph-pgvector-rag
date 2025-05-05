import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PostgresDBModule } from '../postgres-db/postgres-db.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [PostgresDBModule],
})
export class UserModule {}
