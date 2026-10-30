import type { SchemaTypeDefinition } from 'sanity';

import { categoria } from './categoria';
import { configuracoes } from './configuracoes';
import { formato } from './formato';
import { post } from './post';
import { sobre } from './sobre';
import { tag } from './tag';

// Um tipo novo que o site mostre também entra no filtro do webhook que rebuilda a produção
// (docs/deploy.md, "O webhook no Sanity"). Sem isso, publicar um documento dele não vai ao ar.
export const schemaTypes: SchemaTypeDefinition[] = [
  post,
  categoria,
  formato,
  tag,
  configuracoes,
  sobre,
];
