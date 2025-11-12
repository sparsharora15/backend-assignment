import { ObjectId } from 'mongodb';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm';

@Entity('team_members')
export class TeamMember {
  @ObjectIdColumn()
  _id: ObjectId;

  @Index({ unique: true })
  @Column()
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ nullable: true })
  role?: string;

  @Column()
  teamId: string;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}
