import type { SchemaTypeDefinition } from 'sanity';

import { categoria } from './categoria';
import { formato } from './formato';
import { tag } from './tag';

export const schemaTypes: SchemaTypeDefinition[] = [categoria, formato, tag];
