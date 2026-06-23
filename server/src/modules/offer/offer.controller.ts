// ===== FILE: src/modules/offer/offer.controller.ts =====

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler'; // ✅ مرة واحدة فقط
import { OfferService } from './offer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { QueryOffersDto } from './dto/query-offers.dto';

@Controller('offers')
export class OfferController {
  constructor(private offerService: OfferService) {}

  @SkipThrottle()
  @Get()
  async getOffers(@Query() query: QueryOffersDto) {
    return this.offerService.getOffers(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyOffers(@CurrentUser('id') userId: string) {
    return this.offerService.getMyOffers(userId);
  }

  @Get('my/trade-links')
  @UseGuards(JwtAuthGuard)
  async getMyActiveTradeLinks(@CurrentUser('id') userId: string) {
    return this.offerService.getActiveTradeLinksForSeller(userId);
  }

  @SkipThrottle()
  @Get(':id')
  async getOfferById(@Param('id') id: string) {
    return this.offerService.getOfferById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async createOffer(@CurrentUser('id') userId: string, @Body() createOfferDto: CreateOfferDto) {
    return this.offerService.createOffer(userId, createOfferDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async updateOffer(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateOfferDto: UpdateOfferDto,
  ) {
    return this.offerService.updateOffer(id, userId, updateOfferDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async deleteOffer(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.offerService.deleteOffer(id, userId);
  }
}