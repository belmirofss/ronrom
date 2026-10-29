import type { SchemaTypeDefinition } from 'sanity';

import { categoria } from './categoria';
import { formato } from './formato';
import { post } from './post';
import { tag } from './tag';

export const schemaTypes: SchemaTypeDefinition[] = [post, categoria, formato, tag];
