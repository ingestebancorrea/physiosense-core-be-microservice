import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Therapist } from './entities/therapist.entity';
import { TherapistsController } from './therapist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Therapist])],
  controllers: [TherapistsController],
  exports: [TypeOrmModule],
})
export class TherapistModule {}