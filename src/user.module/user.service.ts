import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from '../postgres-db/entities';

@Injectable()
export class UserService {
  private readonly jwtSecret = 'your-secret-key'; // Replace with a secure secret key

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private generateToken(id: string, username: string): string {
    return jwt.sign({ username, id }, this.jwtSecret, { expiresIn: '10h' });
  }

  validateToken(
    token: string,
  ): { isValid: true; username: string; id: string } | { isValid: false } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        username: string;
        id: string;
      };
      return { isValid: true, username: decoded.username, id: decoded.id };
    } catch {
      return { isValid: false };
    }
  }

  async signup(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; token: string }> {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (user) {
      throw new BadRequestException('User already exists');
    }

    const newUser = await this.userRepository
      .create({ username, password })
      .save();

    const token = this.generateToken(newUser.id, username);
    return { id: newUser.id, username, token };
  }

  async signin(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; token: string }> {
    const user = await this.userRepository.findOne({
      where: { username, password },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const token = this.generateToken(user.id, username);
    return { id: user.id, username, token };
  }
}
