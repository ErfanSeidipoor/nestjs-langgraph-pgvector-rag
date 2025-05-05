import { BaseMessage } from '@langchain/core/messages';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Thread } from '../../postgres-db/entities';
import { UserService } from '../../user.module/user.service';
import { ThreadService } from '../services/thread.service';
import { AgentService } from '../services/agent.service';

@Controller('/thread')
export class ThreadController {
  constructor(
    private readonly threadService: ThreadService,
    private readonly userService: UserService,
    private readonly agentService: AgentService,
  ) {}

  @Post()
  create(
    @Headers('Authorization') token: string,
    @Body('title') title: string,
    @Body('prompt') prompt: string,
  ): Promise<{ thread: Thread }> {
    const validation = this.userService.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = validation.id;

    return this.threadService.create({ userId, title, prompt });
  }

  @Post('/:threadId/continue')
  continue(
    @Headers('Authorization') token: string,
    @Param('threadId') threadId: string,
    @Body('prompt') prompt: string,
  ): Promise<BaseMessage[]> {
    const validation = this.userService.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = validation.id;

    return this.threadService.continue({ userId, threadId, prompt });
  }

  @Get()
  get(@Headers('Authorization') token: string): Promise<Thread[]> {
    const validation = this.userService.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = validation.id;

    return this.threadService.getAll(userId);
  }

  @Get('/:threadId/message')
  getMessage(
    @Headers('Authorization') token: string,
    @Param('threadId') threadId: string,
  ) {
    const validation = this.userService.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = validation.id;

    return this.threadService.getMessages({ userId, threadId });
  }

  @Get('/:threadId')
  getById(
    @Headers('Authorization') token: string,
    @Param('threadId') threadId: string,
  ): Promise<Thread> {
    const validation = this.userService.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = validation.id;

    return this.threadService.getById(userId, threadId);
  }

  @Post('/print')
  printGraph() {
    return this.agentService.print();
  }
}
