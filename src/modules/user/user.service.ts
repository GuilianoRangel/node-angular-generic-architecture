import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async findByUsername(username: string): Promise<User | undefined> {
        return this.userRepository.findOne({ where: { username } });
    }

    async create(user: Partial<User>): Promise<User> {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const newUser = this.userRepository.create({ ...user, password: hashedPassword });
        return this.userRepository.save(newUser);
    }
}
