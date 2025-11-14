import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy, StrategyOptions } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

type JwtRequestExtractor = (request: Request) => string | null;

interface JwtStrategyConfig {
  jwtFromRequest: JwtRequestExtractor;
  ignoreExpiration: boolean;
  secretOrKey: string;
}

const bearerTokenExtractor: JwtRequestExtractor = (request: Request) => {
  const headerValue = request?.headers?.authorization;
  if (!headerValue || Array.isArray(headerValue)) {
    return null;
  }
  const [scheme, token] = headerValue.split(' ');
  if (!token || scheme?.toLowerCase() !== 'bearer') {
    return null;
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secretOrKey =
      configService.get<string>('JWT_SECRET') ?? 'super-secret';

    const strategyOptions: JwtStrategyConfig = {
      jwtFromRequest: bearerTokenExtractor,
      ignoreExpiration: false,
      secretOrKey,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super(strategyOptions as StrategyOptions);
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
