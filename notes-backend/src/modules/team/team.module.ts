import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from './team.schema';
import { TeamService } from './team.service';
import { NotificationModule } from '../notification/notification.module';
@Module({
  imports: [MongooseModule.forFeature([{ name: Team.name, schema: TeamSchema }]), NotificationModule,],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
