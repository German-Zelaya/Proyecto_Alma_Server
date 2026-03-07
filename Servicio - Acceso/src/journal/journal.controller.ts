import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from './guards/auth.guard';
import { JournalService } from './journal.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { JournalEntryResponseDto } from './dto/journal-entry-response.dto';

@ApiTags('journal')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear entrada de diario', description: 'Recibe texto libre, obtiene respuesta empática de IA y guarda la entrada.' })
  @ApiResponse({ status: 201, description: 'Entrada creada', type: JournalEntryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  create(@Req() req: Request & { user: { userId: string } }, @Body() dto: CreateEntryDto) {
    return this.journalService.createEntry(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de entradas', description: 'Retorna todas las entradas del diario de la usuaria autenticada.' })
  @ApiResponse({ status: 200, description: 'Listado de entradas', type: [JournalEntryResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  findAll(@Req() req: Request & { user: { userId: string } }) {
    return this.journalService.getEntries(req.user.userId);
  }
}
