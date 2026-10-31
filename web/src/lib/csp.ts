// Relatórios de violação da CSP (#41), recebidos pelo /api/csp-report. A política fica no
// web/vercel.json; por que assim e como passar do Report-Only para o modo enforce:
// docs/cabecalhos.md.

/** O que interessa de uma violação, igual para os dois formatos que os navegadores mandam. */
export interface ViolacaoDaCsp {
  pagina: string;
  bloqueado: string;
  diretiva: string;
  modo: string;
  arquivo?: string;
  linha?: number;
}

// Relatório maior que isso é descartado sem ler: nenhum navegador manda tanto para poucas violações.
export const TAMANHO_MAXIMO = 64 * 1024;

// O máximo de violações registradas por pedido (o Chrome agrupa várias num POST só).
const MAXIMO_POR_PEDIDO = 20;

type Bruto = Record<string, unknown>;

function ehObjeto(valor: unknown): valor is Bruto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.slice(0, 500) : '';
}

function violacao(campos: {
  pagina: unknown;
  bloqueado: unknown;
  diretiva: unknown;
  modo: unknown;
  arquivo: unknown;
  linha: unknown;
}): ViolacaoDaCsp {
  const arquivo = texto(campos.arquivo);
  return {
    pagina: texto(campos.pagina),
    bloqueado: texto(campos.bloqueado),
    diretiva: texto(campos.diretiva),
    modo: texto(campos.modo),
    ...(arquivo ? { arquivo } : {}),
    ...(typeof campos.linha === 'number' ? { linha: campos.linha } : {}),
  };
}

/**
 * Lê o corpo de um relatório nos dois formatos: o antigo do `report-uri`
 * (`application/csp-report`, um objeto `{"csp-report": {...}}`, usado pelo Firefox e pelo Safari) e o
 * da Reporting API (`application/reports+json`, uma lista de `{type: "csp-violation", body}`, usado
 * pelo Chrome com o `report-to`). Corpo inválido ou de outro tipo de relatório vira lista vazia.
 */
export function lerRelatorioDaCsp(corpo: string): ViolacaoDaCsp[] {
  let dados: unknown;
  try {
    dados = JSON.parse(corpo);
  } catch {
    return [];
  }

  if (ehObjeto(dados) && ehObjeto(dados['csp-report'])) {
    const r = dados['csp-report'];
    return [
      violacao({
        pagina: r['document-uri'],
        bloqueado: r['blocked-uri'],
        diretiva: r['effective-directive'] ?? r['violated-directive'],
        modo: r['disposition'],
        arquivo: r['source-file'],
        linha: r['line-number'],
      }),
    ];
  }

  if (!Array.isArray(dados)) return [];
  return dados
    .filter((r): r is Bruto => ehObjeto(r) && r['type'] === 'csp-violation' && ehObjeto(r['body']))
    .slice(0, MAXIMO_POR_PEDIDO)
    .map((r) => {
      const b = r['body'] as Bruto;
      return violacao({
        pagina: b['documentURL'],
        bloqueado: b['blockedURL'],
        diretiva: b['effectiveDirective'],
        modo: b['disposition'],
        arquivo: b['sourceFile'],
        linha: b['lineNumber'],
      });
    });
}
