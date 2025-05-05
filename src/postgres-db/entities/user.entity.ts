import {
  Column,
  Entity,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
} from 'typeorm';
import { Thread } from './thread.entity';
import { v4 as uuidv4 } from 'uuid';
import { Asset } from './asset.entity';

@Entity('users', { schema: 'public' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id = uuidv4();

  @Column('varchar', { name: 'username', nullable: true })
  username: string | null = null;

  @Column('varchar', { name: 'password', nullable: true })
  password: string | null = null;

  @OneToMany(() => Thread, (thread) => thread.user, {
    nullable: true,
  })
  threads: Thread[] | null = null;

  @OneToMany(() => Asset, (asset) => asset.user, {
    nullable: true,
  })
  assets: Asset[] | null = null;

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
