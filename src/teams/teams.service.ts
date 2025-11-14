import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { TeamMapper } from './mappers/team.mapper';
import { TeamResponseDto } from './dto/team-response.dto';
import { TeamMemberResponseDto } from './dto/team-member-response.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    const normalizedName = this.normalizeName(createTeamDto.name);
    await this.ensureTeamNameIsAvailable(normalizedName);

    const membersInput = (createTeamDto.members ?? []).map((member) => ({
      ...member,
      name: this.normalizeName(member.name),
      email: this.normalizeEmail(member.email),
    }));
    this.ensureNoDuplicateEmails(membersInput.map((member) => member.email));
    await this.ensureEmailsAreAvailable(membersInput.map((member) => member.email));

    const now = new Date();
    const team = this.teamRepository.create({
      id: randomUUID(),
      name: normalizedName,
      description: createTeamDto.description,
      createdAt: now,
      updatedAt: now,
    });
    const savedTeam = await this.teamRepository.save(team);

    if (membersInput.length) {
      const members = membersInput.map((member) =>
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

  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.teamRepository.find({
      order: { name: 'ASC' },
    });
    return Promise.all(teams.map((team) => this.hydrateTeam(team)));
  }

  async findOne(id: string): Promise<TeamResponseDto> {
    const team = await this.getTeamOrThrow(id);
    return this.hydrateTeam(team);
  }

  async addMember(
    teamId: string,
    memberDto: CreateTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    const team = await this.getTeamOrThrow(teamId);
    const normalizedEmail = this.normalizeEmail(memberDto.email);
    await this.ensureEmailsAreAvailable([normalizedEmail]);

    const member = this.teamMemberRepository.create({
      id: randomUUID(),
      name: this.normalizeName(memberDto.name),
      email: normalizedEmail,
      role: memberDto.role,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.teamMemberRepository.save(member);
    return TeamMapper.toMemberResponse(saved);
  }

  private async hydrateTeam(team: Team): Promise<TeamResponseDto> {
    const members = await this.teamMemberRepository.find({
      where: { teamId: team.id },
      order: { name: 'ASC' },
    });
    return TeamMapper.toResponse(team, members);
  }

  private async getTeamOrThrow(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} was not found`);
    }
    return team;
  }

  private normalizeName(value: string): string {
    return value.trim();
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private async ensureTeamNameIsAvailable(name: string) {
    const existing = await this.teamRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(
        `Team name '${name}' is already in use. Choose a different name.`,
      );
    }
  }

  private ensureNoDuplicateEmails(emails: string[]) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const email of emails) {
      if (seen.has(email)) {
        duplicates.add(email);
      } else {
        seen.add(email);
      }
    }

    if (duplicates.size) {
      throw new ConflictException(
        `Duplicate member emails in request: ${Array.from(duplicates).join(', ')}`,
      );
    }
  }

  private async ensureEmailsAreAvailable(emails: string[]) {
    if (!emails.length) {
      return;
    }

    const existingMembers = await this.teamMemberRepository.find({
      where: emails.map((email) => ({ email })),
    });

    if (existingMembers.length) {
      const duplicates = existingMembers
        .map((member) => member.email)
        .filter((email) => emails.includes(email));
      throw new ConflictException(
        `Team member email(s) already in use: ${[...new Set(duplicates)].join(', ')}`,
      );
    }
  }
}
