import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ example: 'Hoy me sentí muy abrumada con el trabajo...' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
