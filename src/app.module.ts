import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { AuthModule } from './auth/auth.module';
import { Task } from './tasks/entities/task.entity';
import { Team } from './teams/entities/team.entity';
import { TeamMember } from './teams/entities/team-member.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mongodb',
        url: config.get<string>(
          'DATABASE_URL',
          'mongodb://localhost:27017/task_tracker',
        ),
        database: config.get<string>('DATABASE_NAME', 'task_tracker'),
        useUnifiedTopology: true,
        entities: [Task, Team, TeamMember],
        synchronize: true,
        logging: config.get<string>('DATABASE_LOGGING') === 'true',
      }),
    }),
    AuthModule,
    TeamsModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
