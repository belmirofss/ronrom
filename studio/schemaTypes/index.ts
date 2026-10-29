import type { SchemaTypeDefinition } from 'sanity';

import { categoria } from './categoria';
import { configuracoes } from './configuracoes';
import { formato } from './formato';
import { post } from './post';
import { sobre } from './sobre';
import { tag } from './tag';

export const schemaTypes: SchemaTypeDefinition[] = [
  post,
  categoria,
  formato,
  tag,
  configuracoes,
  sobre,
];
