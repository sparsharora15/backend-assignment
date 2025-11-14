import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';
import { TaskRelationsService } from './services/task-relations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TeamMember, Team])],
  controllers: [TasksController],
  providers: [TasksService, TaskRelationsService],
})
export class TasksModule {}
