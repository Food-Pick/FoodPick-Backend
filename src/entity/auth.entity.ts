import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: string;

  @Column()
  password: string;

  @Column()
  nickname: string;

  @Column()
  email: string;

  @Column()
  gender: number;

  @Column()
  age: number;

  @Column()
  price: string;

  @Column('text', { array: true })
  favorite_food: string[];

  @Column('jsonb', { default: null })
  likes: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
