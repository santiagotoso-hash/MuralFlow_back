import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DISCIPLINAS } from '../../common/disciplinas';
import { TipoEvento } from '../evento.entity';

export class CriarEventoDto {
  @ApiProperty({ example: 'Festa Junina' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ enum: TipoEvento })
  @IsOptional()
  @IsEnum(TipoEvento)
  tipo?: TipoEvento;

  @ApiPropertyOptional({
    enum: DISCIPLINAS,
    description: 'Obrigatória para provas',
  })
  @ValidateIf((o: CriarEventoDto) => o.tipo === TipoEvento.PROVA)
  @IsIn(DISCIPLINAS, { message: 'Escolha a disciplina da prova' })
  disciplina?: string;

  @ApiProperty({ example: '2026-06-20T14:00:00-03:00' })
  @IsDateString({}, { message: 'Data de início inválida' })
  inicio: string;

  @ApiPropertyOptional({ example: '2026-06-20T18:00:00-03:00' })
  @IsOptional()
  @IsDateString({}, { message: 'Data de término inválida' })
  fim?: string;

  @ApiPropertyOptional({ example: 'Quadra da escola' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  local?: string;

  @ApiPropertyOptional({ description: 'Vazio = escola inteira' })
  @IsOptional()
  @IsUUID('4')
  turmaId?: string;
}
