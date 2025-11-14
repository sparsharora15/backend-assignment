import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskRelationsService } from './services/task-relations.service';
import { TaskMapper } from './mappers/task.mapper';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskRelations } from './interfaces/task-relations.interface';
import { TaskFiltersDto } from './dto/task-filters.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly taskRelationsService: TaskRelationsService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<TaskResponseDto> {
    const relations =
      await this.taskRelationsService.resolveFromDto(createTaskDto);
    const now = new Date();
    const task = this.taskRepository.create({
      id: randomUUID(),
      title: createTaskDto.title,
      description: createTaskDto.description,
      dueDate: createTaskDto.dueDate
        ? new Date(createTaskDto.dueDate)
        : undefined,
      status: createTaskDto.status ?? TaskStatus.PENDING,
      assigneeId: relations.assignee?.id,
      teamId:
        createTaskDto.teamId ??
        relations.team?.id ??
        relations.assignee?.teamId,
      createdAt: now,
      updatedAt: now,
    });
    const validatedRelations = await this.validateTaskRelations(
      task,
      relations,
    );
    const saved = await this.taskRepository.save(task);
    const hydratedRelations = await this.taskRelationsService.loadRelations(
      saved,
      validatedRelations,
    );
    return TaskMapper.toResponse(saved, hydratedRelations);
  }

  async findAll(): Promise<TaskResponseDto[]> {
    const tasks = await this.taskRepository.find({
      order: {
        dueDate: 'ASC',
        createdAt: 'DESC',
      },
    });
    const hydrated = await Promise.all(
      tasks.map(async (task) => ({
        task,
        relations: await this.taskRelationsService.loadRelations(task),
      })),
    );
    return TaskMapper.toResponseList(hydrated);
  }

  async findOne(id: string): Promise<TaskResponseDto> {
    const task = await this.getTaskOrThrow(id);
    const relations = await this.taskRelationsService.loadRelations(task);
    return TaskMapper.toResponse(task, relations);
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const task = await this.getTaskOrThrow(id);
    const relations =
      await this.taskRelationsService.resolveFromDto(updateTaskDto);

    this.applyUpdates(task, updateTaskDto, relations);
    const validatedRelations = await this.validateTaskRelations(
      task,
      relations,
    );
    task.updatedAt = new Date();
    const saved = await this.taskRepository.save(task);
    const hydratedRelations = await this.taskRelationsService.loadRelations(
      saved,
      validatedRelations,
    );
    return TaskMapper.toResponse(saved, hydratedRelations);
  }

  async assign(taskId: string, teamMemberId: string): Promise<TaskResponseDto> {
    const task = await this.getTaskOrThrow(taskId);
    const assignee =
      await this.taskRelationsService.getTeamMemberOrThrow(teamMemberId);
    task.assigneeId = assignee.id;
    task.teamId = assignee.teamId;
    const validatedRelations = await this.validateTaskRelations(task, {
      assignee,
    });
    task.updatedAt = new Date();
    const saved = await this.taskRepository.save(task);
    const relations = await this.taskRelationsService.loadRelations(
      saved,
      validatedRelations,
    );
    return TaskMapper.toResponse(saved, relations);
  }

  async complete(taskId: string): Promise<TaskResponseDto> {
    const task = await this.getTaskOrThrow(taskId);
    task.status = TaskStatus.COMPLETED;
    const validatedRelations = await this.validateTaskRelations(task, {});
    task.updatedAt = new Date();
    const saved = await this.taskRepository.save(task);
    const relations = await this.taskRelationsService.loadRelations(
      saved,
      validatedRelations,
    );
    return TaskMapper.toResponse(saved, relations);
  }

  async findByAssignee(
    assigneeId: string,
    filters: TaskFiltersDto,
  ): Promise<TaskResponseDto[]> {
    const assignee =
      await this.taskRelationsService.getTeamMemberOrThrow(assigneeId);
    const tasks = await this.taskRepository.find({
      where: {
        assigneeId: assignee.id,
        ...(filters.status ? { status: filters.status } : {}),
      },
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
    const hydrated = await Promise.all(
      tasks.map(async (task) => ({
        task,
        relations: await this.taskRelationsService.loadRelations(task, {
          assignee,
        }),
      })),
    );
    return TaskMapper.toResponseList(hydrated);
  }

  private applyUpdates(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    relations: TaskRelations,
  ): void {
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

    if (relations.team) {
      task.teamId = relations.team.id;
    } else if (updateTaskDto.teamId !== undefined) {
      task.teamId = updateTaskDto.teamId;
    }

    if (relations.assignee) {
      task.assigneeId = relations.assignee.id;
      task.teamId = relations.assignee.teamId;
    } else if (updateTaskDto.assigneeId !== undefined) {
      task.assigneeId = updateTaskDto.assigneeId;
    }
  }

  private async validateTaskRelations(
    task: Task,
    relations: TaskRelations,
  ): Promise<TaskRelations> {
    const enriched: TaskRelations = { ...relations };

    if (task.assigneeId) {
      if (!enriched.assignee || enriched.assignee.id !== task.assigneeId) {
        enriched.assignee =
          await this.taskRelationsService.getTeamMemberOrThrow(task.assigneeId);
      }
    } else {
      enriched.assignee = undefined;
    }

    if (task.teamId) {
      if (!enriched.team || enriched.team.id !== task.teamId) {
        enriched.team = await this.taskRelationsService.getTeamOrThrow(
          task.teamId,
        );
      }
    } else {
      enriched.team = undefined;
    }

    if (task.assigneeId && task.teamId && enriched.assignee) {
      await this.taskRelationsService.ensureMembershipConsistency(
        enriched.assignee,
        task.teamId,
        enriched.team,
      );
    }

    return enriched;
  }

  private async getTaskOrThrow(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with id ${id} was not found`);
    }
    return task;
  }
}
