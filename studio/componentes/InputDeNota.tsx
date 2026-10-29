import { useId, useState } from 'react';
import { type NumberInputProps, set, unset } from 'sanity';
import styled, { css } from 'styled-components';

import { coracoesDaNota, NOTAS, notaValida, rotuloDaNota } from '../lib/nota';
import { creme, vinho } from '../marca/cores';
import { Coracao } from './Coracao';

const TAMANHO_DO_CORACAO = 32;

const Linha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;

const Coracoes = styled.div`
  display: inline-flex;
  gap: 4px;
`;

const Celula = styled.span`
  position: relative;
  display: inline-flex;
  border-radius: 4px;

  &:has(input:focus-visible) {
    outline: 2px solid ${vinho};
    outline-offset: 2px;
  }
`;

// Cada coração tem duas metades clicáveis por cima do desenho: a esquerda grava ,5.
const Metade = styled.label<{ $direita: boolean; $ativa: boolean }>`
  position: absolute;
  inset: 0 ${({ $direita }) => ($direita ? '0 0 50%' : '50% 0 0')};
  cursor: ${({ $ativa }) => ($ativa ? 'pointer' : 'default')};
`;

// Fora da tela, mas ainda focável e lido pelo leitor de tela.
const escondido = css`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

const Radio = styled.input`
  ${escondido}
`;

const SoParaLeitorDeTela = styled.span`
  ${escondido}
`;

const Rotulo = styled.span`
  font-size: 0.875rem;
`;

const BotaoLimpar = styled.button`
  padding: 4px 10px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: none;
  color: ${vinho};
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;

  &:hover {
    background: ${creme};
  }

  &:focus-visible {
    outline: 2px solid ${vinho};
    outline-offset: 2px;
  }
`;

// Nota da review em 5 corações clicáveis, de meio em meio. Por baixo são 10 radios nativos
// (meio coração … 5 corações): as setas do teclado andam de meio em meio e o leitor de tela
// anuncia o rótulo de cada um. Passar o mouse pré-visualiza a nota antes do clique.
export function InputDeNota({
  value,
  onChange,
  readOnly,
  elementProps,
  schemaType,
}: NumberInputProps) {
  const nome = useId();
  const [previa, setPrevia] = useState<number>();
  const nota = notaValida(value) ? value : undefined;
  const exibida = readOnly ? nota : (previa ?? nota);
  // O Sanity foca o campo por este ref (ao clicar num erro de validação, por exemplo).
  const focoDoCampo = nota ?? NOTAS[0];

  return (
    <Linha>
      <Coracoes
        role="radiogroup"
        id={elementProps.id}
        aria-label={schemaType.title}
        aria-describedby={elementProps['aria-describedby']}
        onFocus={elementProps.onFocus}
        onBlur={elementProps.onBlur}
        onMouseLeave={() => setPrevia(undefined)}
      >
        {coracoesDaNota(exibida).map((preenchimento, i) => (
          <Celula key={i}>
            <Coracao preenchimento={preenchimento} tamanho={TAMANHO_DO_CORACAO} />
            {[i + 0.5, i + 1].map((opcao) => (
              <Metade
                key={opcao}
                $direita={Number.isInteger(opcao)}
                $ativa={!readOnly}
                onMouseEnter={() => !readOnly && setPrevia(opcao)}
              >
                <Radio
                  type="radio"
                  name={nome}
                  value={opcao}
                  checked={nota === opcao}
                  disabled={readOnly}
                  ref={opcao === focoDoCampo ? elementProps.ref : undefined}
                  onChange={() => onChange(set(opcao))}
                />
                <SoParaLeitorDeTela>{rotuloDaNota(opcao)}</SoParaLeitorDeTela>
              </Metade>
            ))}
          </Celula>
        ))}
      </Coracoes>
      {/* Repete em texto o que o radio marcado já anuncia, então fica escondido do leitor de tela. */}
      <Rotulo aria-hidden="true">
        {exibida === undefined ? 'Sem nota' : rotuloDaNota(exibida)}
      </Rotulo>
      {!readOnly && value !== undefined && (
        <BotaoLimpar
          type="button"
          onClick={() => {
            // O botão some depois de limpar: o foco volta para os corações em vez de se perder.
            elementProps.ref.current?.focus();
            onChange(unset());
          }}
        >
          Limpar
        </BotaoLimpar>
      )}
    </Linha>
  );
}
