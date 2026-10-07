import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Papel } from '../../common/enums/papel.enum';

export class CriarUsuarioDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  @ApiProperty({ example: 'maria.souza@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha inicial' })
  @IsString()
  @MinLength(6, { message: 'A senha precisa de pelo menos 6 caracteres' })
  senha: string;

  @ApiProperty({ enum: Papel })
  @IsEnum(Papel)
  papel: Papel;

  @ApiPropertyOptional({ example: '(11) 98765-4321' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;
}

/** Edição feita pela direção (pode mudar papel e ativar/desativar). */
export class AtualizarUsuarioDto extends PartialType(CriarUsuarioDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

/** Edição do próprio perfil: sem e-mail nem papel. */
export class AtualizarPerfilDto extends PartialType(
  PickType(CriarUsuarioDto, ['nome', 'telefone', 'senha'] as const),
) {
  @ApiPropertyOptional({ description: 'Receber avisos por e-mail' })
  @IsOptional()
  @IsBoolean()
  receberEmails?: boolean;
}
