import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { TaskIdParamDto } from './dto/task-id-param.dto';
import { TeamMemberIdParamDto } from '../teams/dto/team-member-id-param.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get('assignees/:teamMemberId')
  findByAssignee(
    @Param() params: TeamMemberIdParamDto,
    @Query() filters: TaskFiltersDto,
  ) {
    return this.tasksService.findByAssignee(params.teamMemberId, filters);
  }

  @Get(':id')
  findOne(@Param() params: TaskIdParamDto) {
    return this.tasksService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: TaskIdParamDto,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(params.id, updateTaskDto);
  }

  @Patch(':id/complete')
  markComplete(@Param() params: TaskIdParamDto) {
    return this.tasksService.complete(params.id);
  }

  @Patch(':id/assign')
  assign(
    @Param() params: TaskIdParamDto,
    @Body() assignTaskDto: AssignTaskDto,
  ) {
    return this.tasksService.assign(params.id, assignTaskDto.teamMemberId);
  }
}
