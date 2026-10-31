import { evaluate, parse } from 'groq-js';

import type { Parametros } from '../fonte';
import { DATASET } from './dataset';

/**
 * Executa uma consulta no dataset das fixtures com o groq-js, a implementação de GROQ do próprio
 * Sanity: o mesmo texto que vai para a API, sem rede. O resultado não é conferido em tempo de
 * execução; quem garante o formato são os documentos, tipados pelos schemas (dataset.ts), e os
 * testes de conteudo.test.ts.
 */
export async function consultarFixtures<Resultado>(
  consulta: string,
  params: Parametros = {},
): Promise<Resultado> {
  const resultado = await evaluate(parse(consulta, { params }), { dataset: DATASET, params });
  return (await resultado.get()) as Resultado;
}
