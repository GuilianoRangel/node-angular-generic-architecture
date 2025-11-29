import { Entity, Column, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../core/database/entities/abstract.entity';
import { Task } from '../../task/entities/task.entity';

@Entity('categories')
export class Category extends AbstractEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Task, (task) => task.category)
  tasks: Task[];
}
