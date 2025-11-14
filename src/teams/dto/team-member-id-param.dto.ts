import { IsUUID } from 'class-validator';

export class TeamMemberIdParamDto {
  @IsUUID()
  teamMemberId: string;
}
