import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';

export enum AssetStatus {
  CREATED = 'CREATED',
  EMBEDDING = 'EMBEDDING',
  COMPLETED = 'COMPLETED',
}

@Entity('assets', { schema: 'public' })
export class Asset extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id = uuidv4();

  @Column('text', { name: 'content', nullable: true })
  content: string | null = null;

  @Column('varchar', { name: 'user_id', nullable: false })
  userId?: string;

  @Column({
    type: 'enum',
    name: 'status',
    enum: AssetStatus,
    nullable: true,
  })
  status?: AssetStatus;

  @ManyToOne(() => User, (user) => user.assets, {
    nullable: true,
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user?: User;
}
