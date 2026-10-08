/**
 * Gera o arquivo iCalendar (RFC 5545) da assinatura de agenda, que o Google
 * Calendar, o Outlook e o iPhone leem. Funções puras: sem banco, sem Nest.
 */
import type { AniversarioAgenda } from './aniversarios-agenda.service';
import { NOME_TIPO_EVENTO, type Evento } from './evento.entity';

const DOMINIO_UID = 'muralflow';

/** Escapa texto conforme o RFC 5545 (\\ ; , e quebras de linha). */
function texto(valor: string) {
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Dobra linhas em 75 octetos (UTF-8), sem partir caracteres no meio. */
function dobrar(linha: string) {
  const partes: string[] = [];
  let atual = '';
  let bytes = 0;
  for (const ch of linha) {
    const tamanho = Buffer.byteLength(ch);
    const limite = partes.length === 0 ? 75 : 74; // continuação começa com " "
    if (bytes + tamanho > limite) {
      partes.push(atual);
      atual = '';
      bytes = 0;
    }
    atual += ch;
    bytes += tamanho;
  }
  partes.push(atual);
  return partes.join('\r\n ');
}

/** 2026-10-08T13:00:00.000Z → 20261008T130000Z */
const utc = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function vevento(campos: [string, string][]) {
  return [
    'BEGIN:VEVENT',
    ...campos.map(([chave, valor]) => `${chave}:${valor}`),
    'END:VEVENT',
  ];
}

function deEvento(e: Evento, agora: string) {
  // Sem término: 1 hora, para aparecer como um bloco na agenda.
  const fim = e.fim ?? new Date(e.inicio.getTime() + 60 * 60 * 1000);
  const tipo = e.disciplina
    ? `Prova de ${e.disciplina}`
    : NOME_TIPO_EVENTO[e.tipo];
  const descricao = [
    `${tipo} · ${e.turma ? e.turma.nome : 'Escola inteira'}`,
    e.descricao,
  ]
    .filter(Boolean)
    .join('\n\n');
  const campos: [string, string][] = [
    ['UID', `evento-${e.id}@${DOMINIO_UID}`],
    ['DTSTAMP', agora],
    ['DTSTART', utc(e.inicio)],
    ['DTEND', utc(fim)],
    ['SUMMARY', texto(e.titulo)],
    ['DESCRIPTION', texto(descricao)],
  ];
  if (e.local) campos.push(['LOCATION', texto(e.local)]);
  return vevento(campos);
}

/**
 * Aniversário como evento de dia inteiro que se repete todo ano. O DTSTART
 * usa um ano fixo (2000, bissexto) só como âncora da repetição; quem nasceu
 * em 29/02 aparece no último dia de fevereiro nos outros anos.
 */
function deAniversario(a: AniversarioAgenda, agora: string) {
  const inicio = `2000${doisDigitos(a.mes)}${doisDigitos(a.dia)}`;
  const fimDoDia = new Date(Date.UTC(2000, a.mes - 1, a.dia + 1));
  const fim = utc(fimDoDia).slice(0, 8);
  const regra =
    a.mes === 2 && a.dia === 29
      ? 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1'
      : 'FREQ=YEARLY';
  const quem = a.tipo === 'professor' ? 'Professor(a)' : 'Aluno(a)';
  const turmas = a.turmas.length ? ` · ${a.turmas.join(', ')}` : '';
  return vevento([
    ['UID', `aniversario-${a.id.replace(':', '-')}@${DOMINIO_UID}`],
    ['DTSTAMP', agora],
    ['DTSTART;VALUE=DATE', inicio],
    ['DTEND;VALUE=DATE', fim],
    ['RRULE', regra],
    ['SUMMARY', texto(`🎂 Aniversário: ${a.nome}`)],
    ['DESCRIPTION', texto(`${quem}${turmas}`)],
    ['TRANSP', 'TRANSPARENT'],
  ]);
}

export function gerarIcs(
  nomeAgenda: string,
  eventos: Evento[],
  aniversarios: AniversarioAgenda[],
) {
  const agora = utc(new Date());
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MuralFlow//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${texto(nomeAgenda)}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    // Sugestão de atualização (o Google decide o próprio intervalo).
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...eventos.flatMap((e) => deEvento(e, agora)),
    ...aniversarios.flatMap((a) => deAniversario(a, agora)),
    'END:VCALENDAR',
  ];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}
