import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async create(createTeamDto: CreateTeamDto) {
    const now = new Date();
    const team = this.teamRepository.create({
      id: randomUUID(),
      name: createTeamDto.name,
      description: createTeamDto.description,
      createdAt: now,
      updatedAt: now,
    });
    const savedTeam = await this.teamRepository.save(team);

    if (createTeamDto.members?.length) {
      const members = createTeamDto.members.map((member) =>
        this.teamMemberRepository.create({
          id: randomUUID(),
          name: member.name,
          email: member.email,
          role: member.role,
          teamId: savedTeam.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      await this.teamMemberRepository.save(members);
    }

    return this.findOne(savedTeam.id);
  }

  async findAll() {
    const teams = await this.teamRepository.find({
      order: { name: 'ASC' },
    });
    return Promise.all(teams.map((team) => this.hydrateTeam(team)));
  }

  async findOne(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} was not found`);
    }
    return this.hydrateTeam(team);
  }

  async addMember(teamId: string, memberDto: CreateTeamMemberDto) {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team with id ${teamId} was not found`);
    }
    const member = this.teamMemberRepository.create({
      id: randomUUID(),
      ...memberDto,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.teamMemberRepository.save(member);
  }

  private async hydrateTeam(team: Team) {
    const members = await this.teamMemberRepository.find({
      where: { teamId: team.id },
      order: { name: 'ASC' },
    });
    return { ...team, members };
  }
}
