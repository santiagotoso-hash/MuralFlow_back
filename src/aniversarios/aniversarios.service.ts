import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Aluno } from '../alunos/aluno.entity';
import { Papel } from '../common/enums/papel.enum';
import { Conversa } from '../mensagens/conversa.entity';
import { Mensagem } from '../mensagens/mensagem.entity';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

const TZ = 'America/Sao_Paulo';
/** Ninguém recebe "feliz aniversário" de madrugada. */
const HORA_DO_ENVIO = 7;
const UMA_HORA = 60 * 60 * 1000;

/** Ano, mês, dia e hora agora em Brasília. */
function agoraEmBrasilia(agora: Date) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(agora)
      .map((p) => [p.type, Number(p.value)]),
  );
  return {
    ano: partes.year,
    mes: partes.month,
    dia: partes.day,
    hora: partes.hour,
  };
}

const bissexto = (ano: number) =>
  (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

/**
 * No dia do aniversário do aluno (a partir das 7h de Brasília):
 *  - cada responsável recebe, em Mensagens, um "feliz aniversário" da escola
 *    (e o aviso por e-mail, como qualquer mensagem nova);
 *  - os professores da turma recebem um e-mail com os aniversariantes.
 *
 * Roda ao subir a API e depois de hora em hora. Se a API estava dormindo
 * (hospedagem gratuita), envia na primeira verificação do dia. Cada aluno é
 * "reservado" com um UPDATE atômico antes do envio, então reiniciar a API ou
 * ter duas instâncias rodando não manda nada em dobro.
 */
@Injectable()
export class AniversariosService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AniversariosService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Aluno) private readonly alunos: Repository<Aluno>,
    @InjectRepository(Conversa)
    private readonly conversas: Repository<Conversa>,
    @InjectRepository(Mensagem)
    private readonly mensagens: Repository<Mensagem>,
    private readonly notificacoes: NotificacoesService,
  ) {}

  onApplicationBootstrap() {
    void this.verificar();
    this.timer = setInterval(() => void this.verificar(), UMA_HORA);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async verificar(agora = new Date()) {
    const { ano, mes, dia, hora } = agoraEmBrasilia(agora);
    if (hora < HORA_DO_ENVIO) return;
    try {
      const ids = await this.reservarAniversariantes(ano, mes, dia);
      if (ids.length === 0) return;
      const alunos = await this.alunos.find({
        where: { id: In(ids) },
        relations: { turma: true, responsaveis: true },
        order: { nome: 'ASC' },
      });
      this.logger.log(
        `Aniversariantes de hoje: ${alunos.map((a) => a.nome).join(', ')}`,
      );

      for (const aluno of alunos) await this.parabenizarFamilia(aluno, ano);

      const porTurma = new Map<string, Aluno[]>();
      for (const a of alunos) {
        if (a.turma)
          porTurma.set(a.turma.id, [...(porTurma.get(a.turma.id) ?? []), a]);
      }
      for (const lista of porTurma.values()) {
        void this.notificacoes.aniversariosNaTurma(
          lista[0].turma!,
          lista.map((a) => ({ nome: a.nome, idade: this.idade(a, ano) })),
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao verificar aniversários: ${(erro as Error)?.message ?? erro}`,
      );
    }
  }

  /**
   * Marca como "parabenizados este ano" os aniversariantes de hoje que ainda
   * não foram, e devolve os IDs marcados. Quem nasceu em 29/02 é lembrado em
   * 28/02 nos anos que não são bissextos.
   */
  private async reservarAniversariantes(ano: number, mes: number, dia: number) {
    const tambem29deFevereiro = mes === 2 && dia === 28 && !bissexto(ano);
    const { raw } = await this.alunos
      .createQueryBuilder()
      .update()
      .set({ aniversarioParabenizadoEm: ano })
      .where('data_nascimento IS NOT NULL')
      .andWhere(
        '(aniversario_parabenizado_em IS NULL OR aniversario_parabenizado_em < :ano)',
        { ano },
      )
      .andWhere(
        `((EXTRACT(MONTH FROM data_nascimento) = :mes AND EXTRACT(DAY FROM data_nascimento) = :dia)
          OR (:tambem29 AND EXTRACT(MONTH FROM data_nascimento) = 2 AND EXTRACT(DAY FROM data_nascimento) = 29))`,
        { mes, dia, tambem29: tambem29deFevereiro },
      )
      .returning('id')
      .execute();
    return (raw as { id: string }[]).map((r) => r.id);
  }

  private async parabenizarFamilia(aluno: Aluno, ano: number) {
    const nome = aluno.nome.split(' ')[0];
    const idade = this.idade(aluno, ano);
    const texto =
      `Feliz aniversário, ${nome}! 🎉\n\n` +
      `Hoje é um dia muito especial, e toda a equipe da escola deseja ` +
      `${idade ? `muitas felicidades pelos seus ${idade} anos` : 'muitas felicidades'}, ` +
      `com muita saúde, alegria e aprendizado.\n\nUm grande abraço!`;

    for (const responsavel of aluno.responsaveis.filter((r) => r.ativo)) {
      const agora = new Date();
      const conversa = await this.conversas.save(
        this.conversas.create({
          assunto: `Feliz aniversário, ${nome}! 🎂`,
          aluno: { id: aluno.id },
          responsavel: { id: responsavel.id },
          ultimaMensagemEm: agora,
          ultimaDaEscola: true,
          lidaPelaEscolaEm: agora,
          lidaPelaFamiliaEm: null,
        }),
      );
      await this.mensagens.save(
        this.mensagens.create({
          conversa: { id: conversa.id },
          autor: null,
          automatica: true,
          texto,
        }),
      );
      void this.notificacoes.mensagemRecebida(
        { ...conversa, aluno, responsavel },
        { id: null, papel: Papel.ADMIN },
        texto,
      );
    }
  }

  private idade(aluno: Aluno, ano: number) {
    const nascido = Number(aluno.dataNascimento?.slice(0, 4));
    return nascido && ano > nascido ? ano - nascido : null;
  }
}
