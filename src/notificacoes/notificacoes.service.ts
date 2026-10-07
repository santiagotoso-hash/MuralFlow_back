import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Papel } from '../common/enums/papel.enum';
import type { Comunicado } from '../comunicados/comunicado.entity';
import { Destinatario, MailService } from '../mail/mail.service';
import {
  emailAniversarioProfessores,
  emailComunicado,
  emailMensagem,
} from '../mail/templates';
import type { Conversa } from '../mensagens/conversa.entity';
import { Usuario } from '../usuarios/usuario.entity';

/**
 * Decide QUEM recebe aviso por e-mail e dispara o envio.
 *
 * Os métodos públicos nunca lançam: um problema no e-mail não pode fazer
 * falhar a publicação de um comunicado ou o envio de uma mensagem. Quem
 * chama usa `void` e segue (a resposta da API não espera o Brevo).
 */
@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {}

  /** Responsáveis com filho na turma do comunicado (ou na escola toda). */
  async comunicadoPublicado(comunicado: Comunicado) {
    try {
      const qb = this.usuarios
        .createQueryBuilder('u')
        .innerJoin('aluno_responsaveis', 'ar', 'ar.responsavel_id = u.id')
        .innerJoin('alunos', 'a', 'a.id = ar.aluno_id')
        .where('u.papel = :papel', { papel: Papel.RESPONSAVEL })
        .andWhere('u.ativo = true AND u.receber_emails = true')
        .select(['u.email', 'u.nome'])
        .distinct(true);
      if (comunicado.turma) {
        qb.andWhere('a.turma_id = :turmaId', { turmaId: comunicado.turma.id });
      }
      const destinatarios = await qb.getMany();

      const { assunto, html } = emailComunicado({
        titulo: comunicado.titulo,
        conteudo: comunicado.conteudo,
        autor: comunicado.autor?.nome ?? 'A escola',
        destino: comunicado.turma?.nome ?? 'toda a escola',
        exigeCiencia: comunicado.exigeCiencia,
        url: this.link(`/comunicados#${comunicado.id}`),
      });
      await this.mail.enviar(this.para(destinatarios), assunto, html, [
        'comunicado',
      ]);
    } catch (erro) {
      this.falhou('comunicado', comunicado.id, erro);
    }
  }

  /**
   * Avisa o outro lado da conversa. Só é chamado quando a mensagem torna a
   * conversa "não lida" para quem recebe: numa troca rápida de várias
   * mensagens seguidas, sai um e-mail só, não um por mensagem.
   *
   * Família escreveu → professores da turma do aluno (sem professor: direção).
   * Escola escreveu → o responsável da conversa.
   * `autor.id = null`: mensagem automática da escola.
   */
  async mensagemRecebida(
    conversa: Conversa,
    autor: { id: string | null; papel: Papel },
    texto: string,
  ) {
    try {
      let destinatarios: Usuario[];
      if (autor.papel === Papel.RESPONSAVEL) {
        destinatarios = conversa.aluno.turma
          ? await this.usuarios
              .createQueryBuilder('u')
              .innerJoin('turma_professores', 'tp', 'tp.professor_id = u.id')
              .where('tp.turma_id = :turmaId', {
                turmaId: conversa.aluno.turma.id,
              })
              .andWhere('u.ativo = true AND u.receber_emails = true')
              .getMany()
          : [];
        if (destinatarios.length === 0) {
          destinatarios = await this.usuarios.findBy({
            papel: Papel.ADMIN,
            ativo: true,
            receberEmails: true,
          });
        }
      } else {
        const r = conversa.responsavel;
        destinatarios = r.ativo && r.receberEmails ? [r] : [];
      }

      const nomeAutor = autor.id
        ? ((await this.usuarios.findOneBy({ id: autor.id }))?.nome ?? 'Alguém')
        : 'A escola';
      const { assunto, html } = emailMensagem({
        autor: nomeAutor,
        assunto: conversa.assunto,
        aluno: conversa.aluno.nome,
        texto,
        url: this.link(`/mensagens?conversa=${conversa.id}`),
      });
      await this.mail.enviar(
        this.para(destinatarios.filter((d) => d.id !== autor.id)),
        assunto,
        html,
        ['mensagem'],
      );
    } catch (erro) {
      this.falhou('mensagem', conversa.id, erro);
    }
  }

  /** Avisa os professores da turma sobre os aniversariantes do dia. */
  async aniversariosNaTurma(
    turma: { id: string; nome: string },
    aniversariantes: { nome: string; idade: number | null }[],
  ) {
    try {
      const professores = await this.usuarios
        .createQueryBuilder('u')
        .innerJoin('turma_professores', 'tp', 'tp.professor_id = u.id')
        .where('tp.turma_id = :turmaId', { turmaId: turma.id })
        .andWhere('u.ativo = true AND u.receber_emails = true')
        .getMany();
      const { assunto, html } = emailAniversarioProfessores({
        turma: turma.nome,
        aniversariantes,
        url: this.link('/painel'),
      });
      await this.mail.enviar(this.para(professores), assunto, html, [
        'aniversario',
      ]);
    } catch (erro) {
      this.falhou('aniversário', turma.id, erro);
    }
  }

  private para(usuarios: Pick<Usuario, 'email' | 'nome'>[]): Destinatario[] {
    return usuarios.map((u) => ({ email: u.email, nome: u.nome }));
  }

  /** FRONTEND_URL pode ter vários domínios; o primeiro é o principal. */
  private link(caminho: string) {
    const base = String(this.config.get('FRONTEND_URL')).split(',')[0].trim();
    return `${base.replace(/\/$/, '')}${caminho}`;
  }

  private falhou(tipo: string, id: string, erro: unknown) {
    this.logger.error(
      `Falha ao enviar e-mail de ${tipo} (${id}): ${(erro as Error)?.message ?? erro}`,
    );
  }
}
