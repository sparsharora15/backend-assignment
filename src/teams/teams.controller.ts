import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamIdParamDto } from './dto/team-id-param.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: TeamIdParamDto) {
    return this.teamsService.findOne(params.id);
  }

  @Post(':id/members')
  addMember(
    @Param() params: TeamIdParamDto,
    @Body() createTeamMemberDto: CreateTeamMemberDto,
  ) {
    return this.teamsService.addMember(params.id, createTeamMemberDto);
  }
}
