import { ApiProperty } from '@nestjs/swagger';

export class JournalEntryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  entryId: string;

  @ApiProperty({ example: 'Hoy me sentí muy abrumada con el trabajo...' })
  text: string;

  @ApiProperty({
    example:
      'Entiendo cómo te sientes y es completamente válido sentirse así. Estoy aquí contigo.',
  })
  aiResponse: string;

  @ApiProperty({ example: '2026-03-07T13:00:00.000Z' })
  createdAt: string;
}
