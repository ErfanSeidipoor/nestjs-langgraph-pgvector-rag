import { entities } from './entities';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          type: 'postgres',
          host: config.get('POSTGRES_DB_HOST'),
          username: config.get('POSTGRES_DB_USERNAME'),
          password: config.get('POSTGRES_DB_PASSWORD'),
          database: config.get('POSTGRES_DB_DATABASE'),
          port: Number(config.get('POSTGRES_DB_PORT')),
          synchronize: true,
          logging: false,
          entities,
        } as DataSourceOptions;
      },
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [],
  exports: [TypeOrmModule.forFeature(entities)],
})
export class PostgresDBModule {}
