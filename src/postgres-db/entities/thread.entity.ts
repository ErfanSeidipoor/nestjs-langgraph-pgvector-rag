import {
  Column,
  Entity,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('threads', { schema: 'public' })
export class Thread extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id = uuidv4();

  @Column('varchar', { name: 'title', nullable: true })
  title: string | null = null;

  @Column('text', { name: 'initial_prompt', nullable: true })
  initialPrompt: string | null = null;

  @Column('varchar', { name: 'user_id', nullable: false })
  userId: string;

  @ManyToOne(() => User, (user) => user.threads, {
    nullable: true,
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user?: User;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP(6)',
    name: 'created_at',
  })
  public createdAt: Date = new Date();

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    name: 'updated_at',
  })
  public updatedAt: Date = new Date();

  @DeleteDateColumn({
    type: 'timestamptz',
    default: () => `null`,
    name: 'deleted_at',
  })
  public deletedAt: Date | null = null;
}
