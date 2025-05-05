import { OpenAIEmbeddings } from '@langchain/openai';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ConfigService } from '@nestjs/config';
import { Document, DocumentInterface } from '@langchain/core/documents';

import {
  DistanceStrategy,
  PGVectorStore,
} from '@langchain/community/vectorstores/pgvector';
import { PoolConfig } from 'pg';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  vectorStore: PGVectorStore;
  embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  });

  textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 50,
  });

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = {
      postgresConnectionOptions: {
        type: 'postgres',
        host: this.configService.get('POSTGRES_DB_HOST'),
        port: Number(this.configService.get('POSTGRES_DB_PORT')),
        user: this.configService.get('POSTGRES_DB_USERNAME'),
        password: this.configService.get('POSTGRES_DB_PASSWORD'),
        database: this.configService.get('POSTGRES_DB_DATABASE'),
      } as PoolConfig,
      tableName: 'citations',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'vector',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
      distanceStrategy: 'cosine' as DistanceStrategy,
    };

    this.vectorStore = await PGVectorStore.initialize(this.embeddings, config);
  }

  async onModuleDestroy() {
    await this.vectorStore.end();
  }

  async addText(input: {
    content: string;
    metadata: { userId: string; assetId: string };
  }): Promise<void> {
    const { content, metadata } = input;
    const textSplits = await this.textSplitter.splitText(content);

    const documents = textSplits.map(
      (text) => new Document({ pageContent: text, metadata }),
    );

    await this.vectorStore.addDocuments(documents);
  }

  async search(input: {
    query: string;
    metadata: { userId: string; assetId?: string };
  }): Promise<DocumentInterface[]> {
    const { query, metadata } = input;

    return this.vectorStore.similaritySearch(query, 5, {
      userId: metadata.userId,
      // assetId: metadata.assetId || undefined,
    });
  }
}
