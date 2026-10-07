/**
 * Disciplinas usadas em provas e no boletim. Lista fixa (e não texto livre)
 * para que "Matemática" e "matematica" não virem linhas diferentes no
 * boletim. Para mudar, edite aqui: o front busca em GET /boletim/disciplinas.
 */
export const DISCIPLINAS = [
  'Português',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Inglês',
  'Arte',
  'Educação Física',
] as const;

/** Média mínima para aprovação, usada para destacar notas no boletim. */
export const MEDIA_MINIMA = 6;
