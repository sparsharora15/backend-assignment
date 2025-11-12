import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  role?: string;
}
