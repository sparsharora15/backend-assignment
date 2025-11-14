import { plainToInstance } from 'class-transformer';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamResponseDto } from '../dto/team-response.dto';
import { TeamMemberResponseDto } from '../dto/team-member-response.dto';

export class TeamMapper {
  static toResponse(team: Team, members?: TeamMember[]): TeamResponseDto {
    return plainToInstance(TeamResponseDto, {
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members: members
        ? members.map((member) =>
            plainToInstance(TeamMemberResponseDto, {
              id: member.id,
              name: member.name,
              email: member.email,
              role: member.role,
            }),
          )
        : undefined,
    });
  }

  static toMemberResponse(member: TeamMember): TeamMemberResponseDto {
    return plainToInstance(TeamMemberResponseDto, {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    });
  }
}
