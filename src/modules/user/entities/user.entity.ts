import { Entity, Column } from 'typeorm';
import { AbstractEntity } from '../../../core/database/entities/abstract.entity';

@Entity('users')
export class User extends AbstractEntity {
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;
}
