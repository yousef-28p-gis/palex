import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputeController {
  constructor(private disputeService: DisputeService) {}

  @Post()
  async openDispute(@CurrentUser('id') userId: string, @Body() openDisputeDto: OpenDisputeDto) {
    return this.disputeService.openDispute(userId, openDisputeDto);
  }

  @Get('user')
  async getUserDisputes(@CurrentUser('id') userId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.disputeService.getUserDisputes(userId, +page, +limit);
  }

  @Get(':id')
  async getDispute(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.disputeService.getDispute(id, userId);
  }

  @Post(':id/evidence')
  async addEvidence(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() addEvidenceDto: AddEvidenceDto) {
    return this.disputeService.addEvidence(id, userId, addEvidenceDto);
  }

  @Put(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('support_admin', 'super_admin')
  async resolveDispute(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() resolveDto: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(id, user.id, user.fullName, resolveDto);
  }

  // ==================== دوال الإدارة الجديدة ====================

  @Put(':id/resolve-by-admin')
  @UseGuards(RolesGuard)
  @Roles('support_admin', 'super_admin')
  async resolveDisputeByAdmin(
    @Param('id') id: string,
    @Body() body: { decision: 'release_to_buyer' | 'refund_to_seller' | 'cancel_trade'; notes?: string },
    @CurrentUser() admin: any,
  ) {
    return this.disputeService.resolveDisputeByAdmin(id, admin.id, admin.fullName, body.decision, body.notes);
  }

  @Post(':id/ban-seller')
  @UseGuards(RolesGuard)
  @Roles('support_admin', 'super_admin')
  async banSellerForNonCooperation(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() admin: any,
  ) {
    return this.disputeService.banSellerForNonCooperation(id, admin.id, admin.fullName, body.reason);
  }
}