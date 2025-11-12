import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    const { assignee, team } = await this.resolveRelations(createTaskDto);
    const now = new Date();
    const task = this.taskRepository.create({
      id: randomUUID(),
      title: createTaskDto.title,
      description: createTaskDto.description,
      dueDate: createTaskDto.dueDate
        ? new Date(createTaskDto.dueDate)
        : undefined,
      status: createTaskDto.status ?? TaskStatus.PENDING,
      assigneeId: assignee?.id,
      teamId: team?.id ?? assignee?.teamId,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.taskRepository.save(task);
    const resolvedTeamRecord =
      team ??
      (task.teamId
        ? await this.teamRepository.findOne({ where: { id: task.teamId } })
        : undefined);
    const normalizedTeam = resolvedTeamRecord ?? undefined;
    return this.hydrateTask(saved, assignee, normalizedTeam);
  }

  async findAll() {
    const tasks = await this.taskRepository.find({
      order: {
        dueDate: 'ASC',
        createdAt: 'DESC',
      },
    });
    return Promise.all(tasks.map((task) => this.hydrateTask(task)));
  }

  async findOne(id: string) {
    const task = await this.taskRepository.findOne({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException(`Task with id ${id} was not found`);
    }
    return this.hydrateTask(task);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.taskRepository.findOne({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException(`Task with id ${id} was not found`);
    }

    const { assignee, team } = await this.resolveRelations(updateTaskDto);

    if (updateTaskDto.title !== undefined) {
      task.title = updateTaskDto.title;
    }
    if (updateTaskDto.description !== undefined) {
      task.description = updateTaskDto.description;
    }
    if (updateTaskDto.dueDate !== undefined) {
      task.dueDate = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : undefined;
    }
    if (updateTaskDto.status !== undefined) {
      task.status = updateTaskDto.status;
    }

    if (updateTaskDto.teamId !== undefined || team) {
      const targetTeamId = team?.id ?? updateTaskDto.teamId ?? task.teamId;
      if (!targetTeamId) {
        task.teamId = undefined;
      } else {
        task.teamId = targetTeamId;
      }
    }
    if (updateTaskDto.assigneeId !== undefined || assignee) {
      const nextAssignee = assignee ?? undefined;
      if (nextAssignee) {
        task.assigneeId = nextAssignee.id;
        task.teamId = nextAssignee.teamId;
      }
    }

    if (task.assigneeId && task.teamId === undefined) {
      const member = await this.teamMemberRepository.findOne({
        where: { id: task.assigneeId },
      });
      task.teamId = member?.teamId ?? task.teamId;
    }

    if (task.assigneeId && task.teamId) {
      const member = await this.teamMemberRepository.findOne({
        where: { id: task.assigneeId },
      });
      if (member && member.teamId !== task.teamId) {
        throw new BadRequestException(
          'Assignee must belong to the same team as the task',
        );
      }
    }

    task.updatedAt = new Date();
    const saved = await this.taskRepository.save(task);
    return this.hydrateTask(saved);
  }

  async assign(taskId: string, teamMemberId: string) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} was not found`);
    }
    const member = await this.teamMemberRepository.findOne({
      where: { id: teamMemberId },
    });
    if (!member) {
      throw new NotFoundException(
        `Team member with id ${teamMemberId} was not found`,
      );
    }
    task.assigneeId = member.id;
    task.teamId = member.teamId;
    task.updatedAt = new Date();
    const saved = await this.taskRepository.save(task);
    const team = await this.teamRepository.findOne({
      where: { id: member.teamId },
    });
    return this.hydrateTask(saved, member, team ?? undefined);
  }

  private async resolveRelations(dto: {
    assigneeId?: string;
    teamId?: string;
  }) {
    let assignee: TeamMember | undefined;
    let team: Team | undefined;

    if (dto.assigneeId) {
      const foundAssignee = await this.teamMemberRepository.findOne({
        where: { id: dto.assigneeId },
      });
      if (!foundAssignee) {
        throw new NotFoundException(
          `Team member with id ${dto.assigneeId} was not found`,
        );
      }
      assignee = foundAssignee;
    }

    if (dto.teamId) {
      const foundTeam = await this.teamRepository.findOne({
        where: { id: dto.teamId },
      });
      if (!foundTeam) {
        throw new NotFoundException(`Team with id ${dto.teamId} was not found`);
      }
      team = foundTeam;
    }

    if (assignee && !team && assignee.teamId) {
      const inferredTeam = await this.teamRepository.findOne({
        where: { id: assignee.teamId },
      });
      team = inferredTeam ?? undefined;
    }

    if (assignee && team && assignee.teamId !== team.id) {
      throw new BadRequestException(
        'Assignee must belong to the provided team',
      );
    }

    return { assignee, team };
  }

  private async hydrateTask(
    task: Task,
    existingAssignee?: TeamMember,
    existingTeam?: Team,
  ) {
    let assignee: TeamMember | undefined = existingAssignee;
    if (!assignee && task.assigneeId) {
      const fetchedAssignee = await this.teamMemberRepository.findOne({
        where: { id: task.assigneeId },
      });
      assignee = fetchedAssignee ?? undefined;
    }

    let team: Team | undefined = existingTeam;
    if (!team && task.teamId) {
      const fetchedTeam = await this.teamRepository.findOne({
        where: { id: task.teamId },
      });
      team = fetchedTeam ?? undefined;
    }

    return {
      ...task,
      assignee,
      team,
    };
  }
}
