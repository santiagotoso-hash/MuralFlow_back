/**
 * Dados de demonstração: uma escola com direção, 2 professores, 3 famílias,
 * turmas, alunos (com ficha de saúde), comunicados, eventos, provas, notas
 * do boletim e uma conversa.
 *
 *   npm run seed
 *
 * APAGA os dados de todas as tabelas antes de inserir. Não mexe no esquema:
 * as tabelas vêm das migrations (`npm run migration:run`).
 * Recusa rodar com NODE_ENV=production.
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Aluno } from '../alunos/aluno.entity';
import { Nota } from '../boletim/nota.entity';
import { Papel } from '../common/enums/papel.enum';
import { CienciaComunicado } from '../comunicados/ciencia-comunicado.entity';
import {
  CategoriaComunicado,
  Comunicado,
} from '../comunicados/comunicado.entity';
import { Evento, TipoEvento } from '../eventos/evento.entity';
import { Conversa } from '../mensagens/conversa.entity';
import { Mensagem } from '../mensagens/mensagem.entity';
import { Turma, Turno } from '../turmas/turma.entity';
import { Usuario } from '../usuarios/usuario.entity';
import ds from './data-source';

const SENHA_DEMO = 'Senha@123';

/** Data relativa a hoje, às `hora` horas. */
function emDias(dias: number, hora = 8) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('O seed não roda com NODE_ENV=production.');
  }
  await ds.initialize();
  if (await ds.showMigrations()) {
    throw new Error('Há migrations pendentes. Rode antes: npm run migration:run');
  }
  console.log('Conectado. Limpando tabelas...');
  const tabelas = ds.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
  await ds.query(`TRUNCATE ${tabelas} RESTART IDENTITY CASCADE`);

  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
  const usuarios = ds.getRepository(Usuario);
  const criar = (nome: string, email: string, papel: Papel, telefone?: string) =>
    usuarios.save(
      usuarios.create({ nome, email, papel, senhaHash, telefone: telefone ?? null }),
    );

  const diretora = await criar('Ana Paula Ribeiro', 'direcao@muralflow.com.br', Papel.ADMIN);
  const profCarla = await criar('Carla Mendes', 'carla@muralflow.com.br', Papel.PROFESSOR);
  const profRoberto = await criar('Roberto Lima', 'roberto@muralflow.com.br', Papel.PROFESSOR);
  // Ficha dos professores.
  await usuarios.update(profCarla.id, {
    telefone: '(11) 97777-1234', dataNascimento: '1986-05-20', endereco: 'Rua das Acácias, 45 — Vila Mariana, São Paulo/SP',
    alergias: 'Dipirona', anotacoes: 'Coordena a feira de ciências. Formação em Pedagogia (USP).',
  });
  await usuarios.update(profRoberto.id, {
    telefone: '(11) 96666-5678', dataNascimento: '1979-11-03', endereco: 'Av. Brasil, 1200, ap. 52 — Centro, São Paulo/SP',
  });
  const maria = await criar('Maria Souza', 'maria@email.com', Papel.RESPONSAVEL, '(11) 98765-4321');
  const joao = await criar('João Souza', 'joao@email.com', Papel.RESPONSAVEL, '(11) 91234-5678');
  const fernanda = await criar('Fernanda Oliveira', 'fernanda@email.com', Papel.RESPONSAVEL, '(21) 99876-1234');

  const ano = new Date().getFullYear();
  const turmas = ds.getRepository(Turma);
  const quintoA = await turmas.save(
    turmas.create({ nome: '5º Ano A', anoLetivo: ano, turno: Turno.MANHA, professores: [profCarla] }),
  );
  const segundoB = await turmas.save(
    turmas.create({ nome: '2º Ano B', anoLetivo: ano, turno: Turno.TARDE, professores: [profRoberto] }),
  );

  const alunos = ds.getRepository(Aluno);
  const lucas = await alunos.save(
    alunos.create({
      nome: 'Lucas Souza', matricula: `${ano}-0001`, dataNascimento: '2016-03-14', turma: quintoA, responsaveis: [maria, joao],
      alergias: 'Amendoim e castanhas (reação forte)', medicamentos: 'Antialérgico na mochila, bolso da frente', saudeAtualizadaEm: new Date(),
    }),
  );
  const beatriz = await alunos.save(
    alunos.create({
      nome: 'Beatriz Souza', matricula: `${ano}-0002`, dataNascimento: '2019-08-02', turma: segundoB, responsaveis: [maria, joao],
      restricoesAlimentares: 'Intolerância à lactose', saudeAtualizadaEm: new Date(),
    }),
  );
  const gabriel = await alunos.save(
    alunos.create({ nome: 'Gabriel Oliveira', matricula: `${ano}-0003`, dataNascimento: '2016-11-21', turma: quintoA, responsaveis: [fernanda] }),
  );

  const comunicados = ds.getRepository(Comunicado);
  const reuniao = await comunicados.save(
    comunicados.create({
      titulo: 'Reunião de pais e mestres',
      conteudo:
        'Convidamos todas as famílias para a reunião de pais e mestres do bimestre, ' +
        'no auditório da escola. Vamos apresentar o desempenho das turmas e o calendário ' +
        'das próximas avaliações. Por favor, confirme a ciência deste comunicado.',
      categoria: CategoriaComunicado.EVENTO,
      exigeCiencia: true,
      autor: diretora,
      turma: null,
    }),
  );
  await comunicados.save([
    comunicados.create({
      titulo: 'Material para a aula de Ciências',
      conteudo:
        'Na próxima semana faremos um experimento sobre germinação. Cada aluno deve ' +
        'trazer um copo plástico, algodão e 5 grãos de feijão.',
      categoria: CategoriaComunicado.PEDAGOGICO,
      autor: profCarla,
      turma: quintoA,
    }),
    comunicados.create({
      titulo: 'Vacinação contra a gripe',
      conteudo:
        'A UBS do bairro fará vacinação na escola. Envie a carteirinha de vacinação ' +
        'na mochila e assine a autorização até sexta-feira.',
      categoria: CategoriaComunicado.URGENTE,
      exigeCiencia: true,
      autor: diretora,
      turma: null,
    }),
  ]);
  await ds.getRepository(CienciaComunicado).save({ comunicado: reuniao, usuario: fernanda });

  const eventos = ds.getRepository(Evento);
  await eventos.save([
    eventos.create({ titulo: 'Reunião de pais e mestres', tipo: TipoEvento.REUNIAO, inicio: emDias(5, 19), fim: emDias(5, 21), local: 'Auditório' }),
    eventos.create({ titulo: 'Prova de Matemática', tipo: TipoEvento.PROVA, disciplina: 'Matemática', inicio: emDias(8, 8), turma: quintoA, descricao: 'Frações e números decimais (capítulos 4 e 5).' }),
    eventos.create({ titulo: 'Prova de Português', tipo: TipoEvento.PROVA, disciplina: 'Português', inicio: emDias(3, 8), turma: quintoA, descricao: 'Interpretação de texto e uso da vírgula.' }),
    eventos.create({ titulo: 'Avaliação de Ciências', tipo: TipoEvento.PROVA, disciplina: 'Ciências', inicio: emDias(10, 14), turma: segundoB, descricao: 'Os animais e seus hábitats.' }),
    eventos.create({ titulo: 'Prova de História', tipo: TipoEvento.PROVA, disciplina: 'História', inicio: emDias(-6, 8), turma: quintoA, descricao: 'Brasil colônia.' }),
    eventos.create({ titulo: 'Recesso escolar', tipo: TipoEvento.FERIADO, inicio: emDias(15, 0), descricao: 'Não haverá aula.' }),
    eventos.create({ titulo: 'Passeio ao Zoológico', tipo: TipoEvento.PASSEIO, inicio: emDias(12, 7), fim: emDias(12, 16), turma: segundoB, local: 'Saída do portão principal', descricao: 'Enviar lanche e boné. Autorização assinada obrigatória.' }),
    eventos.create({ titulo: 'Festa Junina', tipo: TipoEvento.FESTA, inicio: emDias(20, 14), fim: emDias(20, 20), local: 'Quadra da escola' }),
  ]);

  // Boletim: 1º a 3º bimestre lançados.
  const boletim: [Aluno, Record<string, number[]>][] = [
    [lucas, { Português: [8.5, 7, 9], Matemática: [6, 5.5, 7.5], Ciências: [9, 9.5, 8], História: [7, 8, 7.5], Geografia: [8, 7.5, 8.5] }],
    [gabriel, { Português: [7, 7.5, 8], Matemática: [9, 8.5, 9.5], Ciências: [6.5, 7, 6], História: [5, 6, 6.5], Geografia: [7, 7, 7.5] }],
    [beatriz, { Português: [9, 9, 9.5], Matemática: [8, 8.5, 9], Ciências: [10, 9, 9.5] }],
  ];
  const notas = ds.getRepository(Nota);
  await notas.save(
    boletim.flatMap(([aluno, porDisciplina]) =>
      Object.entries(porDisciplina).flatMap(([disciplina, valores]) =>
        valores.map((valor, i) => notas.create({ alunoId: aluno.id, disciplina, bimestre: i + 1, anoLetivo: ano, valor })),
      ),
    ),
  );

  const conversa = await ds.getRepository(Conversa).save({
    assunto: 'Saída antecipada na sexta',
    aluno: lucas,
    responsavel: maria,
    ultimaMensagemEm: new Date(),
    ultimaDaEscola: true,
    lidaPelaFamiliaEm: null,
    lidaPelaEscolaEm: new Date(),
  });
  const mensagens = ds.getRepository(Mensagem);
  await mensagens.save(mensagens.create({ conversa, autor: maria, texto: 'Bom dia, professora! Na sexta o Lucas vai sair às 10h para uma consulta médica. O pai vai buscar.' }));
  await mensagens.save(mensagens.create({ conversa, autor: profCarla, texto: 'Bom dia, Maria! Anotado. Vou deixar a lição de casa separada para ele. Obrigada por avisar!' }));

  console.log(`\nPronto! Todos os usuários têm a senha: ${SENHA_DEMO}`);
  console.table([
    { papel: 'Direção', email: diretora.email },
    { papel: 'Professora 5º A', email: profCarla.email },
    { papel: 'Professor 2º B', email: profRoberto.email },
    { papel: 'Mãe (Lucas e Beatriz)', email: maria.email },
    { papel: 'Pai (Lucas e Beatriz)', email: joao.email },
    { papel: 'Mãe (Gabriel)', email: fernanda.email },
  ]);
  await ds.destroy();
}

main().catch((erro) => {
  console.error('Falha no seed:', erro);
  process.exit(1);
});
