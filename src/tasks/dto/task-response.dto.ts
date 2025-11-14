import { Expose, Transform, Type } from 'class-transformer';
import { TaskStatus } from '../entities/task.entity';
import { TeamResponseDto } from '../../teams/dto/team-response.dto';
import { TeamMemberResponseDto } from '../../teams/dto/team-member-response.dto';

const dateToISOString = ({ value }: { value?: Date | null }) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

export class TaskResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description?: string;

  @Expose()
  status: TaskStatus;

  @Expose()
  @Transform(dateToISOString, { toPlainOnly: true })
  dueDate?: string | null;

  @Expose()
  @Transform(dateToISOString, { toPlainOnly: true })
  createdAt: string;

  @Expose()
  @Transform(dateToISOString, { toPlainOnly: true })
  updatedAt: string;

  @Expose()
  @Type(() => TeamResponseDto)
  team?: TeamResponseDto;

  @Expose()
  @Type(() => TeamMemberResponseDto)
  assignee?: TeamMemberResponseDto;
}
