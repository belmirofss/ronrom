import { useState } from 'react';
import {
  type DocumentActionComponent,
  type SanityClient,
  type SanityDocument,
  useClient,
  useDocumentOperation,
} from 'sanity';

import { API_VERSION } from '../env';
import { caminhoDoPost, slugsAnterioresAoPublicar } from '../lib/post';

type PostSalvo = SanityDocument & {
  tipo?: string;
  slug?: { current?: string };
  categoria?: { _ref?: string };
  formato?: { _ref?: string };
  slugsAnteriores?: string[];
};

// Slug de cada categoria e formato citado nos posts, por `_id`.
async function slugsDaTaxonomia(client: SanityClient, posts: PostSalvo[]) {
  const ids = posts.flatMap((post) =>
    [post.categoria?._ref, post.formato?._ref].filter((id) => id !== undefined),
  );
  const documentos = await client.fetch<{ _id: string; slug?: string }[]>(
    '*[_id in $ids]{ _id, "slug": slug.current }',
    { ids },
  );
  return new Map(documentos.map(({ _id, slug }) => [_id, slug]));
}

function caminho(post: PostSalvo, slugs: Map<string, string | undefined>) {
  return caminhoDoPost({
    tipo: post.tipo,
    slug: post.slug?.current,
    categoria: post.categoria?._ref && slugs.get(post.categoria._ref),
    formato: post.formato?._ref && slugs.get(post.formato._ref),
  });
}

const envolvidas = new WeakMap<DocumentActionComponent, DocumentActionComponent>();

// Envolve o "Publicar" padrão do post. Quando o post já está no ar e o endereço muda (slug,
// categoria ou formato), guarda o caminho antigo em `slugsAnteriores` antes de publicar, para a
// #53 gerar o redirect. O publish lê o rascunho na hora de executar, então leva o patch junto.
export function publicarPost(publicar: DocumentActionComponent): DocumentActionComponent {
  const existente = envolvidas.get(publicar);
  if (existente) return existente;

  const PublicarPost: DocumentActionComponent = (props) => {
    const original = publicar(props);
    const client = useClient({ apiVersion: API_VERSION });
    const { patch } = useDocumentOperation(props.id, props.type);
    const [falhou, setFalhou] = useState(false);

    if (!original) return null;

    return {
      ...original,
      dialog: falhou
        ? {
            type: 'popover',
            content:
              'Não deu para conferir o endereço antigo do post, então ele não foi publicado. Confira a internet e tente de novo.',
            onClose: () => setFalhou(false),
          }
        : (original.dialog ?? null),
      onHandle: async () => {
        const rascunho = props.draft as PostSalvo | null;
        const publicado = props.published as PostSalvo | null;

        if (rascunho && publicado) {
          try {
            const slugs = await slugsDaTaxonomia(client, [rascunho, publicado]);
            const anteriores = slugsAnterioresAoPublicar(
              rascunho.slugsAnteriores ?? [],
              caminho(publicado, slugs),
              caminho(rascunho, slugs),
            );
            if (anteriores) patch.execute([{ set: { slugsAnteriores: anteriores } }]);
          } catch (erro) {
            // Publicar sem guardar o endereço antigo deixaria um link quebrado.
            console.error(erro);
            setFalhou(true);
            return;
          }
        }

        original.onHandle?.();
      },
    };
  };

  if (publicar.action) PublicarPost.action = publicar.action;
  PublicarPost.displayName = 'PublicarPost';
  envolvidas.set(publicar, PublicarPost);
  return PublicarPost;
}
