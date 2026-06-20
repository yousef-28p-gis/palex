import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ==================== Dashboard Stats ====================
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ==================== Users Management ====================
  @Get('users')
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(+page, +limit, search);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users/:id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() suspendDto: SuspendUserDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.suspendUser(id, admin.id, admin.fullName, suspendDto);
  }

  @Post('users/:id/unsuspend')
  async unsuspendUser(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.unsuspendUser(id, admin.id, admin.fullName);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteUser(id, admin.id, admin.fullName);
  }

  // ==================== KYC Management ====================
  @Get('kyc/pending')
  @Roles('super_admin', 'kyc_admin')
  async getPendingKyc(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getPendingKyc(+page, +limit);
  }

  @Get('kyc/:id')
  @Roles('super_admin', 'kyc_admin')
  async getKycRequestById(@Param('id') id: string) {
    return this.adminService.getKycRequestById(id);
  }

  @Post('kyc/:userId/reset')
  @Roles('super_admin', 'kyc_admin')
  async resetUserKycStatus(@Param('userId') userId: string, @CurrentUser() admin: any) {
    return this.adminService.resetUserKycStatus(userId, admin.id, admin.fullName);
  }

  @Post('kyc/:id/approve')
  @Roles('super_admin', 'kyc_admin')
  async approveKyc(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.approveKyc(id, admin.id, admin.fullName);
  }

  @Post('kyc/:id/reject')
  @Roles('super_admin', 'kyc_admin')
  async rejectKyc(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() admin: any) {
    return this.adminService.rejectKyc(id, admin.id, admin.fullName, reason);
  }

  // ==================== Exchange Rate ====================
  @Post('exchange-rate')
  async updateExchangeRate(@Body() updateDto: UpdateExchangeRateDto, @CurrentUser() admin: any) {
    return this.adminService.updateExchangeRate(updateDto.usdToIls, admin.id, admin.fullName);
  }

  @Get('exchange-rate')
  async getExchangeRate() {
    return this.adminService.getExchangeRate();
  }

  // ==================== Network Fees Endpoints ====================
  
  @Get('fees')
  @Roles('super_admin', 'finance_admin')
  async getAllFees() {
    return this.adminService.getAllNetworkFees();
  }

  @Get('fees/:network')
  @Roles('super_admin', 'finance_admin')
  async getNetworkFee(@Param('network') network: string) {
    return this.adminService.getNetworkFee(network);
  }

  @Post('fees/:network')
  @Roles('super_admin', 'finance_admin')
  async updateNetworkFee(
    @Param('network') network: string,
    @Body('fee') fee: number,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateNetworkFee(network, fee, admin.id, admin.fullName);
  }

  // ==================== Audit Logs ====================
  @Get('audit-logs')
  async getAuditLogs(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAuditLogs(+page, +limit);
  }

  // ==================== Disputes Management ====================
  @Get('disputes')
  @Roles('super_admin', 'support_admin')
  async getDisputes(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getDisputes(+page, +limit);
  }

  @Get('disputes/:id')
  @Roles('super_admin', 'support_admin')
  async getDisputeById(@Param('id') id: string) {
    return this.adminService.getDisputeById(id);
  }

  @Put('disputes/:id/resolve')
  @Roles('super_admin', 'support_admin')
  async resolveDispute(
    @Param('id') id: string,
    @Body() resolveDto: { resolution: string; resolutionNotes?: string },
    @CurrentUser() admin: any,
  ) {
    return this.adminService.resolveDispute(id, admin.id, admin.fullName, resolveDto);
  }

  // ==================== Trades Management ====================
  @Get('trades')
  @Roles('super_admin', 'finance_admin')
  async getTrades(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getTrades(+page, +limit, status);
  }

  @Get('trades/:id')
  @Roles('super_admin', 'finance_admin')
  async getTradeById(@Param('id') id: string) {
    return this.adminService.getTradeById(id);
  }

  // ==================== Offers Management ====================
  @Get('offers')
  @Roles('super_admin')
  async getAllOffers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllOffers(+page, +limit, status);
  }

  @Delete('offers/:id')
  @Roles('super_admin')
  async deleteOffer(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteOffer(id, admin.id, admin.fullName);
  }

  // ==================== Notifications ====================
  @Post('notifications/send')
  @Roles('super_admin', 'support_admin')
  async sendNotification(
    @Body() data: { userId: string; title: string; message: string; type: string },
    @CurrentUser() admin: any,
  ) {
    return this.adminService.sendNotification(data.userId, data.title, data.message, data.type, admin.id, admin.fullName);
  }

  // ==================== Statistics ====================
  @Get('statistics')
  @Roles('super_admin')
  async getAdvancedStatistics() {
    return this.adminService.getAdvancedStatistics();
  }
}