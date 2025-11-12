import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getConfiguredCredentials() {
    return {
      username: this.configService.get<string>('AUTH_USERNAME', 'admin'),
      password: this.configService.get<string>('AUTH_PASSWORD', 'changeme'),
    };
  }

  async login(loginDto: LoginDto) {
    const isValid = this.isValidUser(loginDto.username, loginDto.password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: JwtPayload = {
      sub: loginDto.username,
      username: loginDto.username,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }

  private isValidUser(username: string, password: string): boolean {
    const credentials = this.getConfiguredCredentials();
    return (
      username === credentials.username && password === credentials.password
    );
  }
}
