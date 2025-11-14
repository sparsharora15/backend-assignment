import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { Task } from '../entities/task.entity';
import { TaskRelations } from '../interfaces/task-relations.interface';

interface RelationLookupDto {
  assigneeId?: string;
  teamId?: string;
}

@Injectable()
export class TaskRelationsService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async resolveFromDto(dto: RelationLookupDto): Promise<TaskRelations> {
    const relations: TaskRelations = {};

    if (dto.assigneeId) {
      relations.assignee = await this.getTeamMemberOrThrow(dto.assigneeId);
    }
    if (dto.teamId) {
      relations.team = await this.getTeamOrThrow(dto.teamId);
    }

    if (relations.assignee && !relations.team && relations.assignee.teamId) {
      const inferredTeam = await this.teamRepository.findOne({
        where: { id: relations.assignee.teamId },
      });
      relations.team = inferredTeam ?? undefined;
    }

    if (
      relations.assignee &&
      relations.team &&
      relations.assignee.teamId !== relations.team.id
    ) {
      throw new BadRequestException(
        'Assignee must belong to the provided team',
      );
    }

    return relations;
  }

  async ensureMembershipConsistency(
    assignee: TeamMember,
    teamId?: string,
    team?: Team,
  ): Promise<void> {
    if (!teamId) {
      return;
    }

    if (assignee.teamId !== teamId) {
      const resolvedTeam = team ?? (await this.getTeamOrThrow(teamId));
      throw new BadRequestException(
        `Assignee ${assignee.id} must belong to team ${resolvedTeam.name}`,
      );
    }
  }

  async loadRelations(
    task: Task,
    existing: TaskRelations = {},
  ): Promise<TaskRelations> {
    const relations: TaskRelations = { ...existing };

    if (!relations.assignee && task.assigneeId) {
      const assignee = await this.teamMemberRepository.findOne({
        where: { id: task.assigneeId },
      });
      relations.assignee = assignee ?? undefined;
    }

    if (!relations.team && task.teamId) {
      const team = await this.teamRepository.findOne({
        where: { id: task.teamId },
      });
      relations.team = team ?? undefined;
    }

    return relations;
  }

  async getTeamMemberOrThrow(id: string): Promise<TeamMember> {
    const member = await this.teamMemberRepository.findOne({ where: { id } });
    if (!member) {
      throw new NotFoundException(`Team member with id ${id} was not found`);
    }
    return member;
  }

  async getTeamOrThrow(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} was not found`);
    }
    return team;
  }
}
