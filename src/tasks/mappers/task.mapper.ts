import { plainToInstance } from 'class-transformer';
import { Task } from '../entities/task.entity';
import { TaskRelations } from '../interfaces/task-relations.interface';
import { TaskResponseDto } from '../dto/task-response.dto';
import { TeamMapper } from '../../teams/mappers/team.mapper';

export class TaskMapper {
  static toResponse(
    task: Task,
    relations: TaskRelations = {},
  ): TaskResponseDto {
    return plainToInstance(TaskResponseDto, {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      team: relations.team
        ? TeamMapper.toResponse(relations.team, relations.team.members)
        : undefined,
      assignee: relations.assignee
        ? TeamMapper.toMemberResponse(relations.assignee)
        : undefined,
    });
  }

  static toResponseList(
    tasks: Array<{ task: Task; relations?: TaskRelations }>,
  ): TaskResponseDto[] {
    return tasks.map(({ task, relations }) =>
      this.toResponse(task, relations ?? {}),
    );
  }
}
