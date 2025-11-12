import { ObjectId } from 'mongodb';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';
import { TeamMember } from './team-member.entity';

@Entity('teams')
export class Team {
  @ObjectIdColumn()
  _id: ObjectId;

  @Index({ unique: true })
  @Column()
  id: string;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  members?: TeamMember[];
}
