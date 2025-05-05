import { Module } from '@nestjs/common';
import { ThreadController } from './controllers/thread.controller';
import { AssetController } from './controllers/asset.controller';
import { ThreadService } from './services/thread.service';
import { EmbeddingService } from './services/embedding.service';
import { UserService } from '../user.module/user.service';
import { CheckpointerService } from './services/checkpoiner.service';
import { ConfigService } from '@nestjs/config';
import { PostgresDBModule } from '../postgres-db/postgres-db.module';
import { AgentService } from './services/agent.service';
import { AssetService } from './services/asset.service';

@Module({
  imports: [PostgresDBModule],
  controllers: [ThreadController, AssetController],
  providers: [
    ConfigService,
    ThreadService,
    UserService,
    EmbeddingService,
    CheckpointerService,
    AgentService,
    AssetService,
  ],
})
export class AgentModule {}
