import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../core/database/entities/abstract.entity';
import { Category } from '../../category/entities/category.entity';

@Entity('tasks')
export class Task extends AbstractEntity {
  @Column({ nullable: false })
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.tasks, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
