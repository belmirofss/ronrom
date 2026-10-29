import { useEffect, useState } from 'react';
import { type ObjectInputProps, type ObjectMember, unset, useClient, useFormValue } from 'sanity';
import styled from 'styled-components';

import { API_VERSION } from '../env';
import { camposDoModelo, camposIgnorados, modeloDaFicha } from '../lib/ficha';
import type { ModeloDeFicha } from '../lib/taxonomia';
import { creme, vinho } from '../marca/cores';

const Aviso = styled.div`
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: ${vinho};
  background: ${creme};
  font-size: 0.875rem;
  line-height: 1.4;

  p {
    margin: 0;
  }
`;

const Coluna = styled.div`
  display: grid;
  gap: 16px;
`;

const BotaoApagar = styled.button`
  justify-self: start;
  padding: 4px 10px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: none;
  color: ${vinho};
  font: inherit;
  cursor: pointer;

  &:hover {
    background: white;
  }

  &:focus-visible {
    outline: 2px solid ${vinho};
    outline-offset: 2px;
  }
`;

// `undefined` enquanto carrega, `null` se a categoria não tem modelo (ou foi apagada).
type Modelo = ModeloDeFicha | null | undefined;

// Modelo de ficha da categoria, atualizado se alguém mudar o modelo dela com o post aberto. A
// referência aponta para o `_id` publicado, então o rascunho da categoria não conta.
function useModeloDaCategoria(id: string | undefined) {
  const client = useClient({ apiVersion: API_VERSION });
  const [carregado, setCarregado] = useState<{ id: string; modelo: Modelo; falhou: boolean }>();

  useEffect(() => {
    if (!id) return undefined;
    let ativo = true;
    const guardar = (modelo: unknown, falhou = false) => {
      if (ativo) setCarregado({ id, modelo: modeloDaFicha(modelo) ?? null, falhou });
    };

    client
      .fetch<string | null>('*[_id == $id][0].modeloFicha', { id })
      .then((modelo) => guardar(modelo))
      .catch((erro: unknown) => {
        console.error(erro);
        guardar(null, true);
      });
    const escuta = client
      .listen<{ modeloFicha?: string }>('*[_id == $id]', { id }, { includeResult: true })
      .subscribe((evento) => {
        if (evento.type === 'mutation') guardar(evento.result?.modeloFicha);
      });

    return () => {
      ativo = false;
      escuta.unsubscribe();
    };
  }, [client, id]);

  // Ao trocar de categoria, o modelo da anterior não vale enquanto o novo carrega.
  return carregado?.id === id ? carregado : undefined;
}

// Ficha da review: mostra só os campos do modelo da categoria escolhida. Campos preenchidos de
// outro modelo (de antes de trocar a categoria) não são apagados sem a autora pedir.
export function FichaInput(props: ObjectInputProps) {
  const { value, members, schemaType, readOnly, onChange, renderDefault } = props;
  const categoria = useFormValue(['categoria']) as { _ref?: string } | undefined;
  const carregado = useModeloDaCategoria(categoria?._ref);

  if (!categoria?._ref) {
    return (
      <Aviso>
        <p>Escolha a categoria para preencher a ficha.</p>
      </Aviso>
    );
  }
  if (!carregado) return <Aviso aria-busy="true">Carregando a ficha…</Aviso>;
  if (carregado.falhou) {
    return (
      <Aviso role="alert">
        <p>Não deu para carregar a ficha. Confira a internet e recarregue a página.</p>
      </Aviso>
    );
  }

  const { modelo } = carregado;
  if (!modelo) {
    return (
      <Aviso>
        <p>Esta categoria não tem modelo de ficha. Escolha o modelo no cadastro da categoria.</p>
      </Aviso>
    );
  }

  const doModelo = camposDoModelo(modelo);
  const ignorados = camposIgnorados(value, modelo);
  const posicao = (membro: ObjectMember) =>
    membro.kind === 'field' ? doModelo.indexOf(membro.name) : doModelo.length;
  const titulo = (campo: string) =>
    schemaType.fields.find(({ name }) => name === campo)?.type.title ?? campo;

  return (
    <Coluna>
      {ignorados.length > 0 && (
        <Aviso role="status">
          <p>
            Estes campos foram preenchidos para outra categoria e não aparecem no site:{' '}
            <strong>{ignorados.map(titulo).join(', ')}</strong>. Se voltar para a categoria
            anterior, eles voltam a valer.
          </p>
          {!readOnly && (
            <BotaoApagar
              type="button"
              onClick={() => onChange(ignorados.map((campo) => unset([campo])))}
            >
              Apagar esses campos
            </BotaoApagar>
          )}
        </Aviso>
      )}
      {renderDefault({
        ...props,
        // Na ordem do modelo: o "ano" do livro, por exemplo, fica no meio dos campos de filme no schema.
        members: members
          .filter((membro) => membro.kind !== 'field' || doModelo.includes(membro.name))
          .sort((a, b) => posicao(a) - posicao(b)),
      })}
    </Coluna>
  );
}
