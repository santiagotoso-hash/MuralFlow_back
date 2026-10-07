import { EsquemaInicial1791322280071 } from './1791322280071-EsquemaInicial';
import { ReceberEmails1791330000000 } from './1791330000000-ReceberEmails';
import { ProvasBoletimSaude1791340000000 } from './1791340000000-ProvasBoletimSaude';
import { Aniversarios1791400000000 } from './1791400000000-Aniversarios';
import { FichaProfessor1791500000000 } from './1791500000000-FichaProfessor';

/**
 * Todas as migrations, em ordem. Ao gerar uma nova, adicione-a aqui.
 * (Lista explícita, como ENTIDADES: funciona igual em ts-node e no dist.)
 */
export const MIGRACOES = [
  EsquemaInicial1791322280071,
  ReceberEmails1791330000000,
  ProvasBoletimSaude1791340000000,
  Aniversarios1791400000000,
  FichaProfessor1791500000000,
];
