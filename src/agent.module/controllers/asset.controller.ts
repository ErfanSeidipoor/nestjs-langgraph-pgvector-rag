import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Asset } from 'src/postgres-db/entities';
import { UserService } from '../../user.module/user.service';
import { AssetService } from '../services/asset.service';
import { DocumentInterface } from '@langchain/core/dist/documents/document';

@Controller('/asset')
export class AssetController {
  constructor(
    private readonly userService: UserService,
    private readonly assetService: AssetService,
  ) {}

  @Post()
  create(
    @Headers('Authorization') token: string,
    @Body('content') content: string,
  ): Promise<{ asset: Asset }> {
    const validation = this.userService.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = validation.id;

    return this.assetService.create({ userId, content });
  }

  @Get('/:assetId/search-documents')
  get(
    @Headers('Authorization') token: string,
    @Param('assetId') assetId: string,
    @Query('query') query: string,
  ): Promise<DocumentInterface[]> {
    const validation = this.userService.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = validation.id;

    return this.assetService.searchDocuments({ query, assetId, userId });
  }
}
