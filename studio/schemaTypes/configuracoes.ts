import { defineArrayMember, defineField, defineType } from 'sanity';

import { API_VERSION } from '../env';
import { campoDescricaoSeo, campoImagemDeCompartilhamento } from './campos';

// Acima disso a frase deixa de caber no bloco vinho da barra lateral sem rolar.
const TAMANHO_IDEAL_DA_FRASE = 280;

const REDES = [
  { value: 'instagram', title: 'Instagram' },
  { value: 'tiktok', title: 'TikTok' },
  { value: 'youtube', title: 'YouTube' },
  { value: 'letterboxd', title: 'Letterboxd' },
  { value: 'goodreads', title: 'Goodreads' },
  { value: 'skoob', title: 'Skoob' },
  { value: 'pinterest', title: 'Pinterest' },
  { value: 'outra', title: 'Outra' },
];

// Singleton (`_id` "configuracoes"): o que vale para o site inteiro. Fora do menu "Criar" e sem
// "Excluir" (sanity.config.ts).
export const configuracoes = defineType({
  name: 'configuracoes',
  title: 'Configurações do site',
  type: 'document',
  groups: [
    { name: 'home', title: 'Home', default: true },
    { name: 'seo', title: 'SEO e redes' },
  ],
  fields: [
    defineField({
      name: 'fraseDaSemana',
      title: 'Frase em destaque',
      type: 'object',
      group: 'home',
      description:
        'Aparece no bloco vinho da barra lateral. Para tirar a frase do site, apague o texto.',
      fields: [
        defineField({
          name: 'texto',
          title: 'Frase',
          type: 'text',
          rows: 3,
          validation: (rule) => [
            rule.custom((texto: string | undefined, contexto) => {
              const frase = contexto.parent as { autoria?: string; data?: string } | undefined;
              return !texto?.trim() && (frase?.autoria || frase?.data)
                ? 'Escreva a frase, ou apague também o autor e a data.'
                : true;
            }),
            rule
              .max(TAMANHO_IDEAL_DA_FRASE)
              .warning(
                `Acima de ${TAMANHO_IDEAL_DA_FRASE} caracteres, a frase fica longa demais para a barra lateral.`,
              ),
          ],
        }),
        defineField({
          name: 'autoria',
          title: 'Autor ou fonte',
          type: 'string',
          description: 'Opcional. Por exemplo: "Clarice Lispector" ou "ouvido no ônibus".',
        }),
        defineField({
          name: 'data',
          title: 'Data',
          type: 'date',
          description: 'Opcional. A data da frase.',
          options: { dateFormat: 'DD/MM/YYYY' },
        }),
      ],
    }),
    defineField({
      name: 'postEmDestaque',
      title: 'Post em destaque',
      type: 'reference',
      group: 'home',
      description:
        'O post que abre a página inicial, com a capa grande. Se ficar vazio, o destaque é o post mais recente.',
      to: [{ type: 'post' }],
      options: { disableNew: true },
      // Um rascunho no destaque deixaria a home sem o post: só vale post que já está no ar.
      validation: (rule) =>
        rule.custom(async (valor: { _ref?: string } | undefined, contexto) => {
          if (!valor?._ref) return true;
          const publicado = await contexto
            .getClient({ apiVersion: API_VERSION })
            .fetch<string | null>(
              '*[_id == $id][0]._id',
              { id: valor._ref },
              { perspective: 'published' },
            );
          return publicado
            ? true
            : 'Este post ainda não foi publicado. Publique antes de destacar.';
        }),
    }),
    defineField({
      name: 'seo',
      title: 'SEO padrão',
      type: 'object',
      group: 'seo',
      description:
        'Usado na página inicial e em toda página que não tiver os próprios dados de SEO.',
      fields: [
        campoDescricaoSeo(
          'Uma ou duas frases sobre o blog, que aparecem embaixo do título no Google e ao compartilhar.',
          true,
        ),
        campoImagemDeCompartilhamento(
          'Aparece quando o link do site é compartilhado no WhatsApp, Instagram e outras redes. O ideal é 1200 × 630 pixels.',
        ),
      ],
    }),
    defineField({
      name: 'redes',
      title: 'Redes sociais',
      type: 'array',
      group: 'seo',
      description:
        'Links para os seus perfis. Aparecem na página de privacidade, como o canal para pedidos sobre os dados, e ajudam o Google a saber que os perfis são seus.',
      of: [
        defineArrayMember({
          name: 'rede',
          title: 'Rede social',
          type: 'object',
          fields: [
            defineField({
              name: 'rede',
              title: 'Rede',
              type: 'string',
              options: { list: REDES },
              validation: (rule) => rule.required().error('Escolha a rede.'),
            }),
            defineField({
              name: 'url',
              title: 'Link do perfil',
              type: 'url',
              description: 'O endereço completo, como https://www.instagram.com/seu.perfil',
              validation: (rule) =>
                rule
                  .required()
                  .uri({ scheme: ['https'] })
                  .error('Cole o link completo do perfil, começando com https://.'),
            }),
          ],
          preview: {
            select: { rede: 'rede', url: 'url' },
            prepare: ({ rede, url }) => ({
              title: REDES.find(({ value }) => value === rede)?.title ?? 'Rede sem nome',
              subtitle: url,
            }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Configurações do site' }) },
});
