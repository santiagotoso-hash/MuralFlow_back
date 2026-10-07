import { BrevoClient } from '@getbrevo/brevo';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Destinatario {
  email: string;
  nome?: string;
}

/** Máximo de destinatários por chamada à API do Brevo (o limite é 2000). */
const LOTE = 1000;

/**
 * Único ponto de saída de e-mails. Usa o Brevo (mesmo provedor do Campus).
 *
 * Fora de produção NÃO chama o Brevo (a menos que MAIL_FORCE_SEND=true):
 * escreve o e-mail no log. Assim não se gasta o limite do plano gratuito
 * testando localmente.
 *
 * Atenção à versão do SDK: `@getbrevo/brevo` v6 usa
 * `new BrevoClient({ apiKey })` + `transactionalEmails.sendTransacEmail`.
 * Os exemplos com `TransactionalEmailsApi` são da v2/v3 e não existem mais.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: BrevoClient | null;
  private readonly envioReal: boolean;

  constructor(private readonly config: ConfigService) {
    const producao = config.get('NODE_ENV') === 'production';
    this.envioReal = producao || config.get('MAIL_FORCE_SEND') === true;

    const apiKey = config.get<string>('BREVO_API_KEY');
    this.client = apiKey ? new BrevoClient({ apiKey }) : null;
    if (!apiKey && this.envioReal) {
      this.logger.error('BREVO_API_KEY ausente: nenhum e-mail será enviado.');
    }
  }

  /**
   * Envia o MESMO e-mail para vários destinatários, cada um recebendo uma
   * cópia individual (ninguém vê o endereço dos outros).
   */
  async enviar(
    destinatarios: Destinatario[],
    assunto: string,
    html: string,
    tags: string[] = [],
  ): Promise<void> {
    if (destinatarios.length === 0) return;

    if (!this.envioReal || !this.client) {
      this.logger.log(
        `[DEV] E-mail NÃO enviado (${tags.join(', ') || 'sem tag'})\n` +
          `  Para: ${destinatarios.map((d) => d.email).join(', ')}\n` +
          `  Assunto: ${assunto}`,
      );
      return;
    }

    for (let i = 0; i < destinatarios.length; i += LOTE) {
      const lote = destinatarios.slice(i, i + LOTE);
      await this.client.transactionalEmails.sendTransacEmail({
        sender: {
          email: this.config.getOrThrow<string>('MAIL_FROM_ADDRESS'),
          name: this.config.get<string>('MAIL_FROM_NAME') ?? 'MuralFlow',
        },
        subject: assunto,
        htmlContent: html,
        tags,
        messageVersions: lote.map((d) => ({
          to: [d.nome ? { email: d.email, name: d.nome } : { email: d.email }],
        })),
      });
    }
  }
}
