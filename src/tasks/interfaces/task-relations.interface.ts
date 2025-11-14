import { Team } from '../../teams/entities/team.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';

export interface TaskRelations {
  assignee?: TeamMember;
  team?: Team;
}
