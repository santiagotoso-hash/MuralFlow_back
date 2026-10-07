# MuralFlow — API

Comunicação entre a escola e as famílias dos alunos: **comunicados com confirmação de leitura**, **agenda escolar** e **mensagens diretas** entre responsáveis e professores.

Front-end: repositório `escola-conecta-front`.

Stack: NestJS 11 · TypeORM · PostgreSQL · JWT · Swagger · porta 4001.

## Papéis

| Papel           | O que faz                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Direção** (`admin`) | Tudo: cadastra usuários, turmas e alunos; publica para a escola inteira; vê quem confirmou cada comunicado. |
| **Professor**   | Vê as suas turmas e alunos; publica comunicados e eventos para as suas turmas; responde às famílias. |
| **Responsável** | Vê os filhos, os comunicados e a agenda da escola e das turmas deles; confirma ciência; conversa com a escola. |

A regra de "quem enxerga o quê" está num só lugar: `src/common/acesso/acesso.service.ts`.

## Como rodar

Pré-requisitos: Node 20+ e PostgreSQL (local ou Neon).

```bash
cp .env.example .env        # ajuste DATABASE_URL (ou DB_*) e JWT_SECRET
npm install
npm run migration:run       # cria/atualiza as tabelas
npm run seed                # dados de demonstração (APAGA os dados!)
npm run start:dev           # http://localhost:4001 · Swagger em http://localhost:4001/api
```

### Usuários de demonstração

Todos com a senha **`Senha@123`**:

| Papel                         | E-mail                         |
| ----------------------------- | ------------------------------ |
| Direção                       | `direcao@muralflow.com.br` |
| Professora do 5º Ano A        | `carla@muralflow.com.br`   |
| Professor do 2º Ano B         | `roberto@muralflow.com.br` |
| Mãe do Lucas e da Beatriz     | `maria@email.com`              |
| Pai do Lucas e da Beatriz     | `joao@email.com`               |
| Mãe do Gabriel                | `fernanda@email.com`           |

## API (resumo)

Tudo exige `Authorization: Bearer <token>`, exceto `POST /auth/entrar` e `GET /saude`.

| Método | Rota                          | Quem             |
| ------ | ----------------------------- | ---------------- |
| POST   | `/auth/entrar`                | público          |
| GET/PATCH | `/usuarios/eu`             | todos            |
| GET    | `/usuarios?papel=`            | equipe           |
| POST/PATCH | `/usuarios`, `/usuarios/:id` | direção       |
| GET    | `/turmas`, `/alunos`          | todos (filtrado) |
| POST/PATCH/DELETE | `/turmas`, `/alunos` | direção          |
| GET    | `/comunicados`                | todos (filtrado) |
| POST/DELETE | `/comunicados`           | equipe           |
| POST   | `/comunicados/:id/ciencia`    | responsável      |
| GET    | `/eventos?de=&ate=`           | todos (filtrado) |
| POST/DELETE | `/eventos`               | equipe           |
| GET/POST | `/conversas`                | todos (filtrado) |
| GET    | `/conversas/:id` (marca como lida) | participantes |
| POST   | `/conversas/:id/mensagens`    | participantes    |

## Banco e migrations

O esquema do banco muda **só por migrations** (`src/database/migrations`). `DB_SYNC` fica sempre `false`.

| Comando | O que faz |
| --- | --- |
| `npm run migration:generate --nome=AdicionaCampoX` | Compara as entidades com o banco do `.env` e gera a migration |
| `npm run migration:run` | Aplica as migrations pendentes |
| `npm run migration:revert` | Desfaz a última migration aplicada |
| `npm run migration:show` | Lista as migrations e quais já rodaram |
| `npm run db:reset` | Apaga o esquema, roda as migrations e o seed (só em dev!) |

Fluxo para mudar uma entidade:

1. Altere a entidade e rode `npm run migration:generate --nome=DescricaoDaMudanca` contra o banco de **dev**. Registre a migration gerada em `src/database/migrations/index.ts` (lista explícita, usada pela API e pela CLI).
2. Revise o arquivo gerado, rode `npm run migration:run` e teste.
3. Commit da entidade **junto com** a migration, no mesmo PR.
4. No deploy, o build roda `npm run migration:run:prod` antes de publicar.

Regras:

- Migration já mergeada não se edita: corrija com outra migration.
- Renomear ou apagar coluna: em dois deploys (adiciona a nova e migra o código; apaga a velha depois).
- Nunca aponte o `.env` local para o banco de produção.

## Deploy na Vercel

O runtime da Vercel não permite `require()` de módulos ES. O NestJS 12 é só ESM e quebra lá com `ERR_REQUIRE_ESM`, por isso o projeto fica no **NestJS 11** (CommonJS).
Para testar localmente nas mesmas condições: `npm run build && node --no-experimental-require-module dist/src/main`.

Banco hospedado (Neon, Supabase…): use `DATABASE_URL` com a URL *pooled* e `DB_SSL=true`.

## Próximos passos sugeridos

- Migrations do TypeORM (hoje o esquema vem do `DB_SYNC`).
- Recuperação de senha por e-mail (hoje a secretaria redefine).
- Notificações (e-mail / push) quando sai um comunicado ou chega mensagem.
- Mensagens em tempo real (WebSocket); hoje a conversa aberta atualiza a cada 15 s.
- Anexos em comunicados (PDF, fotos) e autorizações de passeio com assinatura.
- Frequência e boletim.
