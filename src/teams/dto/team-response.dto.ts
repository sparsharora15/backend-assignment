import { Expose, Transform, Type } from 'class-transformer';
import { TeamMemberResponseDto } from './team-member-response.dto';

const dateToISOString = ({ value }: { value?: Date | null }) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

export class TeamResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description?: string;

  @Expose()
  @Transform(dateToISOString, { toPlainOnly: true })
  createdAt: string;

  @Expose()
  @Transform(dateToISOString, { toPlainOnly: true })
  updatedAt: string;

  @Expose()
  @Type(() => TeamMemberResponseDto)
  members?: TeamMemberResponseDto[];
}
