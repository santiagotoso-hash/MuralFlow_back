/**
 * HTML dos e-mails, gerado aqui no back (nada fica hospedado no Brevo).
 * Tudo que vem do usuário passa por `esc()`: títulos e textos de
 * comunicados/mensagens são escritos por pessoas.
 */

const COR = '#0F766E';

export function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Texto com quebras de linha → HTML seguro, cortado em `max` caracteres. */
function paragrafos(texto: string, max = 600): string {
  const cortado =
    texto.length > max ? `${texto.slice(0, max).trimEnd()}…` : texto;
  return esc(cortado).replace(/\n/g, '<br>');
}

function layout(opcoes: {
  preheader: string;
  etiqueta: string;
  titulo: string;
  corpo: string;
  botao: { texto: string; url: string };
  rodape: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#F5F7F6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0E1513">
<span style="display:none;max-height:0;overflow:hidden">${esc(opcoes.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="padding:0 4px 16px;font-weight:700;font-size:16px;color:${COR}">MuralFlow</td></tr>
  <tr><td style="background:#FFFFFF;border:1px solid #E0E6E4;border-radius:12px;padding:28px">
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${COR};text-transform:uppercase;letter-spacing:.04em">${esc(opcoes.etiqueta)}</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${esc(opcoes.titulo)}</h1>
    <div style="font-size:15px;line-height:1.6;color:#44514D">${opcoes.corpo}</div>
    <p style="margin:28px 0 0">
      <a href="${esc(opcoes.botao.url)}" style="display:inline-block;background:${COR};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">${esc(opcoes.botao.texto)}</a>
    </p>
  </td></tr>
  <tr><td style="padding:16px 4px;font-size:12px;line-height:1.5;color:#63716C">${opcoes.rodape}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const RODAPE =
  'Você recebeu este e-mail porque tem uma conta no MuralFlow. ' +
  'Para parar de receber avisos por e-mail, desative a opção em <b>Meu perfil</b>.';

export function emailComunicado(dados: {
  titulo: string;
  conteudo: string;
  autor: string;
  destino: string;
  exigeCiencia: boolean;
  url: string;
}) {
  const assunto = dados.exigeCiencia
    ? `Confirme a leitura: ${dados.titulo}`
    : `Novo comunicado: ${dados.titulo}`;
  const html = layout({
    preheader: `${dados.autor} publicou um comunicado para ${dados.destino}.`,
    etiqueta: `Comunicado · ${dados.destino}`,
    titulo: dados.titulo,
    corpo:
      `<p style="margin:0 0 12px">${paragrafos(dados.conteudo)}</p>` +
      `<p style="margin:0;font-size:13px;color:#63716C">Publicado por ${esc(dados.autor)}</p>` +
      (dados.exigeCiencia
        ? `<p style="margin:16px 0 0;padding:12px;background:#FFFBEB;border-radius:8px;font-size:14px;color:#92400E">A escola pediu que você confirme a leitura deste comunicado.</p>`
        : ''),
    botao: {
      texto: dados.exigeCiencia ? 'Abrir e confirmar' : 'Ver comunicado',
      url: dados.url,
    },
    rodape: RODAPE,
  });
  return { assunto, html };
}

export function emailMensagem(dados: {
  autor: string;
  assunto: string;
  aluno: string;
  texto: string;
  url: string;
}) {
  return {
    assunto: `Nova mensagem sobre ${dados.aluno}: ${dados.assunto}`,
    html: layout({
      preheader: `${dados.autor}: ${dados.texto.slice(0, 90)}`,
      etiqueta: `Mensagem · ${dados.aluno}`,
      titulo: dados.assunto,
      corpo:
        `<p style="margin:0 0 8px;font-size:13px;color:#63716C">${esc(dados.autor)} escreveu:</p>` +
        `<p style="margin:0;padding:12px 16px;background:#F5F7F6;border-radius:8px">${paragrafos(dados.texto, 400)}</p>`,
      botao: { texto: 'Responder', url: dados.url },
      rodape:
        'Por segurança, responda pelo MuralFlow, não por este e-mail. ' +
        RODAPE,
    }),
  };
}

export function emailAniversarioProfessores(dados: {
  turma: string;
  aniversariantes: { nome: string; idade: number | null }[];
  url: string;
}) {
  const nomes = dados.aniversariantes.map((a) => a.nome.split(' ')[0]);
  const lista = dados.aniversariantes
    .map(
      (a) =>
        `<li style="margin:0 0 6px"><b>${esc(a.nome)}</b>${a.idade ? ` · ${a.idade} anos` : ''}</li>`,
    )
    .join('');
  return {
    assunto: `🎂 Hoje é aniversário de ${nomes.join(' e ')} (${dados.turma})`,
    html: layout({
      preheader: `Aniversariantes de hoje no ${dados.turma}.`,
      etiqueta: `Aniversário · ${dados.turma}`,
      titulo:
        dados.aniversariantes.length === 1
          ? 'Hoje tem aniversariante na turma!'
          : 'Hoje tem aniversariantes na turma!',
      corpo:
        `<ul style="margin:0 0 12px;padding-left:20px">${lista}</ul>` +
        `<p style="margin:0">A família já recebeu uma mensagem de feliz aniversário da escola. ` +
        `Que tal parabenizar em sala também?</p>`,
      botao: { texto: 'Ver mensagens', url: dados.url },
      rodape: RODAPE,
    }),
  };
}
