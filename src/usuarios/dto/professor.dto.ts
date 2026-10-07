import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Ficha do professor. Texto vazio apaga o campo.
 * O próprio professor edita nome, telefone, endereço, nascimento e alergias;
 * e-mail (é o login) e anotações só a direção.
 */
export class AtualizarProfessorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome?: string;

  @ApiPropertyOptional({ description: 'Só a direção' })
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email?: string;

  @ApiPropertyOptional({ example: '(11) 98765-4321' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @ApiPropertyOptional({
    example: 'Rua das Flores, 123 — Centro, São Paulo/SP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  endereco?: string;

  @ApiPropertyOptional({ example: '1985-04-12', description: 'Vazio apaga' })
  @IsOptional()
  @IsString()
  dataNascimento?: string;

  @ApiPropertyOptional({ example: 'Dipirona' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alergias?: string;

  @ApiPropertyOptional({ description: 'Só a direção' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  anotacoes?: string;
}
