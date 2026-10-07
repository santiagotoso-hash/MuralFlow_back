import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DISCIPLINAS } from '../../common/disciplinas';

/** Qual pauta abrir: turma (na rota) + disciplina + bimestre. */
export class FiltroPautaDto {
  @ApiProperty({ enum: DISCIPLINAS })
  @IsIn(DISCIPLINAS, { message: 'Disciplina inválida' })
  disciplina: string;

  @ApiProperty({ minimum: 1, maximum: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  bimestre: number;
}

export class NotaAlunoDto {
  @ApiProperty()
  @IsUUID('4')
  alunoId: string;

  @ApiProperty({ nullable: true, description: '0 a 10; null apaga a nota' })
  @ValidateIf((o: NotaAlunoDto) => o.valor !== null)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Nota inválida' })
  @Min(0, { message: 'A nota vai de 0 a 10' })
  @Max(10, { message: 'A nota vai de 0 a 10' })
  valor: number | null;
}

export class LancarNotasDto extends FiltroPautaDto {
  @ApiProperty({ type: [NotaAlunoDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => NotaAlunoDto)
  notas: NotaAlunoDto[];
}
