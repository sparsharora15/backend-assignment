import { ObjectId } from 'mongodb';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

@Entity('tasks')
export class Task {
  @ObjectIdColumn()
  _id: ObjectId;

  @Index({ unique: true })
  @Column()
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  dueDate?: Date;

  @Column({ default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ nullable: true })
  teamId?: string;

  @Column({ nullable: true })
  assigneeId?: string;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  team?: Team;
  assignee?: TeamMember;
}
