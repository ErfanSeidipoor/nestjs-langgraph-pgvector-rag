import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, AssetStatus } from '../../postgres-db/entities';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class AssetService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async getAll(userId: string): Promise<Asset[]> {
    return this.assetRepository.find({
      where: { userId },
    });
  }

  async getById(userId: string, assetId: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId, userId },
    });
    if (!asset) {
      throw new BadRequestException('asset not found');
    }
    return asset;
  }

  async create(input: {
    userId: string;
    content: string;
  }): Promise<{ asset: Asset }> {
    const { content, userId } = input;

    const asset = await this.assetRepository
      .create({
        content,
        userId,
        status: AssetStatus.CREATED,
      })
      .save();

    asset.status = AssetStatus.EMBEDDING;
    await asset.save();
    await this.embeddingService.addText({
      content,
      metadata: { assetId: asset.id, userId },
    });
    asset.status = AssetStatus.COMPLETED;
    await asset.save();

    return { asset };
  }

  async searchDocuments(input: {
    query: string;
    userId: string;
    assetId: string;
  }) {
    const { query, userId, assetId } = input;
    const asset = await this.getById(userId, assetId);

    if (asset.status !== AssetStatus.COMPLETED) {
      throw new BadRequestException('asset not completed');
    }
    return this.embeddingService.search({
      query,
      metadata: { assetId: asset.id, userId },
    });
  }
}
