import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  signup(
    @Body('username') username: string,
    @Body('password') password: string,
  ): Promise<{ username: string; token: string }> {
    return this.userService.signup(username, password);
  }

  @Post('signin')
  signin(
    @Body('username') username: string,
    @Body('password') password: string,
  ): Promise<{ username: string; token: string }> {
    return this.userService.signin(username, password);
  }

  @Get('profile')
  getProfile(@Headers('Authorization') token: string): {
    username: string;
    id: string;
  } {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    const validation = this.userService.validateToken(token);

    console.log({ validation });

    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }

    return { username: validation.username, id: validation.id };
  }
}
