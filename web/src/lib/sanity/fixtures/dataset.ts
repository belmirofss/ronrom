import { CATEGORIAS, FORMATOS } from '../../../../../studio/lib/taxonomia';
import type { Categoria, Configuracoes, Formato, Post, Sobre } from '../tipos.gerados';
import {
  asset,
  citacao,
  citacaoDestaque,
  galeria,
  imagem,
  imagemNoTexto,
  italico,
  itemDeLista,
  link,
  linkInterno,
  negrito,
  paragrafo,
  referencia,
  sistema,
  subtitulo,
  video,
} from './documentos';

// Conteúdo de exemplo do modo fixtures (README desta pasta): 1 review de cada categoria, com nota e
// ficha, pensamentos dos dois formatos e um texto com todos os blocos do Portable Text.
// Os textos são inventados; só "Dias Perfeitos" é um filme de verdade. Tudo é publicado (sem
// rascunho) e tem data no passado, então todas as consultas acham os documentos.

// --- Taxonomia: a mesma do Studio (studio/lib/taxonomia.ts), com os `_id` e slugs de produção ---

const categorias = CATEGORIAS.map(
  ({ slug, ...categoria }) =>
    ({
      ...categoria,
      _type: 'categoria',
      ...sistema('2026-01-01T12:00:00Z'),
      slug: { _type: 'slug', current: slug },
    }) satisfies Categoria,
);

const formatos = FORMATOS.map(
  ({ slug, ...formato }) =>
    ({
      ...formato,
      _type: 'formato',
      ...sistema('2026-01-01T12:00:00Z'),
      slug: { _type: 'slug', current: slug },
    }) satisfies Formato,
);

// --- Imagens (placeholders em SVG) ---

const img = {
  diasPerfeitos: asset('capa-dias-perfeitos', 1200, 800, 'Dias Perfeitos'),
  farol: asset('capa-casa-do-farol', 1200, 800, 'A Casa do Farol'),
  laranjeiras: asset('capa-inverno-das-laranjeiras', 1200, 800, 'O Inverno das Laranjeiras'),
  cafe: asset('capa-cafe-do-bairro', 1200, 800, 'Café do Bairro'),
  mirante: asset('capa-mirante-do-morro-azul', 1200, 800, 'Mirante do Morro Azul'),
  paoDeQueijo: asset('capa-pao-de-queijo', 1200, 800, 'Pão de queijo'),
  caderno: asset('capa-caderno', 1200, 800, 'Caderno'),
  terca: asset('capa-terca-feira', 1200, 800, 'Terça-feira'),
  gatos: asset('capa-gatos', 800, 800, 'Gatos'),
  blogs: asset('capa-blogs', 1200, 800, 'Blogs'),
  paisagem: asset('paisagem', 2400, 1000, 'Paisagem larga'),
  mesa: asset('mesa', 900, 1200, 'Mesa de trabalho'),
  galeria1: asset('galeria-canetas', 1000, 1000, 'Canetas'),
  galeria2: asset('galeria-pagina', 1000, 1000, 'Página'),
  galeria3: asset('galeria-adesivos', 1000, 1000, 'Adesivos'),
  autora: asset('foto-autora', 800, 800, 'Autora'),
  compartilhamento: asset('compartilhamento', 1200, 630, 'Ronrom'),
};

// --- Posts ---

type Campos = Omit<Post, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev' | 'slug'>;

function post(slug: string, campos: Campos) {
  return {
    _id: `fixture-${slug}`,
    _type: 'post',
    ...sistema(campos.dataDePublicacao),
    slug: { _type: 'slug', current: slug },
    ...campos,
  } satisfies Post;
}

const ID_DIAS_PERFEITOS = 'fixture-dias-perfeitos';
const ID_CAFE_DO_BAIRRO = 'fixture-cafe-do-bairro';
// Link interno para um post que não está no ar: a consulta devolve `post: null` e o site mostra só
// o texto (studio/lib/corpo.ts).
const ID_FORA_DO_AR = 'fixture-post-apagado';

const reviews = [
  post('dias-perfeitos', {
    tipo: 'review',
    categoria: referencia('categoria-filmes'),
    titulo: 'Dias Perfeitos',
    subtitulo: 'Um filme sobre limpar banheiros e, mesmo assim, sobre tudo',
    dataDePublicacao: '2026-03-10T15:00:00-03:00',
    nota: 4.5,
    ficha: {
      direcao: 'Wim Wenders',
      ano: 2023,
      duracao: 124,
      ondeVi: { meio: 'cinema', qual: 'Cine Belas Artes' },
      valeAPena: 'Para ver num dia sem pressa, de preferência no cinema.',
    },
    capa: imagem(img.diasPerfeitos, 'Cartaz desenhado de um homem lendo sob uma árvore'),
    corpo: [
      paragrafo(
        'Saí do cinema querendo arrumar a casa, regar as plantas e ',
        italico('olhar mais para as árvores'),
        '. Pouca coisa acontece, e é justamente aí que o filme acerta.',
      ),
      subtitulo('h2', 'A rotina como personagem'),
      paragrafo(
        'Cada manhã se repete com pequenas variações: a fita no carro, o café da máquina, a foto da copa das árvores. ',
        negrito('A repetição nunca cansa'),
        ', porque o olhar muda um pouco a cada dia.',
      ),
      paragrafo(
        'Se você gostou deste, leia também o que escrevi sobre o ',
        linkInterno('café da esquina', ID_CAFE_DO_BAIRRO),
        ', outro lugar onde a rotina é tudo.',
      ),
    ],
  }),
  post('a-casa-do-farol', {
    tipo: 'review',
    categoria: referencia('categoria-series'),
    titulo: 'A Casa do Farol',
    subtitulo: 'Três temporadas de mistério numa ilha onde nada é o que parece',
    dataDePublicacao: '2026-04-02T20:30:00-03:00',
    nota: 4,
    ficha: {
      criacao: 'Marta Albuquerque',
      anoDeEstreia: 2022,
      anoDeFim: 2025,
      temporadasVistas: 'As três',
      ondeVi: { meio: 'streaming', qual: 'Farol+' },
      valeAPena: 'Sim, mas a segunda temporada pede paciência.',
    },
    capa: imagem(img.farol, 'Farol branco num rochedo ao entardecer', 'Ilustração de divulgação'),
    corpo: [
      paragrafo('Comecei sem esperar nada e terminei a primeira temporada num fim de semana.'),
      subtitulo('h2', 'O que funciona'),
      itemDeLista('bullet', ['A trilha sonora, quase toda de piano.']),
      itemDeLista('bullet', ['O elenco infantil, que segura cenas difíceis.']),
      itemDeLista('bullet', ['O último episódio, que amarra as pontas sem pressa.']),
      subtitulo('h2', 'O que não funciona'),
      paragrafo('A segunda temporada se perde em tramas paralelas que não levam a lugar nenhum.'),
    ],
  }),
  post('o-inverno-das-laranjeiras', {
    tipo: 'review',
    categoria: referencia('categoria-livros'),
    titulo: 'O Inverno das Laranjeiras',
    subtitulo: 'Um romance curto sobre uma família e o sítio que ela não consegue vender',
    dataDePublicacao: '2026-05-18T09:00:00-03:00',
    nota: 3.5,
    ficha: {
      autoria: 'Helena Prado',
      editora: 'Editora Ventania',
      ano: 2024,
      paginas: 212,
      formatoDoLivro: 'fisico',
      valeAPena: 'Vale pela segunda metade, que compensa o começo lento.',
    },
    capa: imagem(img.laranjeiras, 'Capa de livro com laranjeiras sob a geada'),
    corpo: [
      paragrafo('Li em três noites, com chá e cobertor, que é o jeito certo de ler este livro.'),
      citacao(
        'A casa guardava o frio como quem guarda um segredo: em silêncio e por tempo demais.',
      ),
      paragrafo(
        'O trecho acima é da página 47 e resume bem o tom. A escrita é bonita, mas ',
        negrito('o enredo demora a andar'),
        '.',
      ),
    ],
  }),
  post('cafe-do-bairro', {
    tipo: 'review',
    categoria: referencia('categoria-restaurantes-e-cafes'),
    titulo: 'Café do Bairro',
    subtitulo: 'O café coado mais honesto da Vila Mariana',
    dataDePublicacao: '2026-06-07T10:15:00-03:00',
    nota: 5,
    ficha: {
      endereco: {
        rua: 'Rua das Acácias, 120',
        bairro: 'Vila Mariana',
        cidade: 'São Paulo',
        uf: 'SP',
      },
      linkDoMapa: 'https://maps.google.com/?q=Rua+das+Acacias+120+Sao+Paulo',
      faixaDePreco: 'R$$',
      tipoDeCozinha: 'Cafeteria',
      oQuePedi: 'Coado do dia, pão de fermentação natural com manteiga e bolo de laranja.',
      instagram: '@cafedobairro',
      valeAPena: 'Muito. Vá de manhã, antes das dez, para pegar a mesa da janela.',
    },
    capa: imagem(img.cafe, 'Xícara de café numa mesa de madeira perto da janela'),
    corpo: [
      paragrafo(
        'Tem lugares que a gente visita uma vez e passa a chamar de "meu". Este é um deles.',
      ),
      subtitulo('h2', 'O que pedir'),
      itemDeLista('number', ['O coado do dia, sempre de um produtor pequeno.']),
      itemDeLista('number', ['O pão com manteiga, que chega quentinho.']),
      itemDeLista('number', ['O bolo de laranja, se ainda tiver.']),
    ],
  }),
  // Ficha de lugar sem tipo de cozinha nem Instagram: o caso do campo vazio, que a ficha esconde.
  post('mirante-do-morro-azul', {
    tipo: 'review',
    categoria: referencia('categoria-lugares'),
    titulo: 'Mirante do Morro Azul',
    subtitulo: 'Uma trilha curta com a melhor vista da serra',
    dataDePublicacao: '2026-07-21T18:00:00-03:00',
    nota: 3,
    ficha: {
      endereco: { rua: 'Estrada do Morro Azul, km 4', cidade: 'Campos do Jordão', uf: 'SP' },
      linkDoMapa: 'https://maps.google.com/?q=Campos+do+Jordao',
      faixaDePreco: 'R$',
      oQuePedi: 'Só a entrada do parque e um chocolate quente na saída.',
      valeAPena: 'A vista vale; a estrutura, nem tanto. Leve água.',
    },
    capa: imagem(img.mirante, 'Vista da serra coberta de neblina a partir de um mirante'),
    corpo: [
      paragrafo('A trilha leva uns quarenta minutos e é bem sinalizada, mas tem trechos íngremes.'),
      imagemNoTexto(
        img.paisagem,
        'Serra ao amanhecer, com nuvens abaixo do mirante',
        'larga',
        'Às sete da manhã, acima das nuvens.',
      ),
      paragrafo('Lá em cima, um banco de madeira e o silêncio. Faltam lixeiras e banheiro.'),
    ],
  }),
  post('pao-de-queijo-da-padaria-estrela', {
    tipo: 'review',
    categoria: referencia('categoria-comidas'),
    titulo: 'Pão de queijo da Padaria Estrela',
    dataDePublicacao: '2026-08-14T16:45:00-03:00',
    nota: 2.5,
    ficha: {
      marca: 'Padaria Estrela',
      preco: 4.5,
      oQueProvei: 'O pão de queijo tradicional, saindo do forno às quatro da tarde.',
      valeAPena: 'Só se estiver saindo do forno; frio, perde tudo.',
    },
    capa: imagem(img.paoDeQueijo, 'Cesta com pães de queijo dourados'),
    corpo: [
      paragrafo(
        'Crocante por fora, mas com ',
        negrito('pouco queijo'),
        ' por dentro. Fica a dúvida se era só um dia ruim.',
      ),
    ],
  }),
];

const pensamentos = [
  // O post com todos os blocos do Portable Text: estilos, listas (com subnível), marcas, links,
  // imagens normal e larga, galeria, vídeos do YouTube e do Instagram e citações em destaque.
  post('por-que-eu-anoto-tudo-num-caderno', {
    tipo: 'pensamento',
    formato: referencia('formato-textos'),
    // Era de "Artigos", que virou "Textos e opiniões" (#143): o caminho antigo vira redirect.
    slugsAnteriores: ['/pensamentos/artigos/por-que-eu-anoto-tudo-num-caderno'],
    titulo: 'Por que eu anoto tudo num caderno',
    subtitulo: 'Um elogio ao papel, às canetas que falham e às listas que nunca acabam',
    dataDePublicacao: '2026-09-05T08:00:00-03:00',
    capa: imagem(
      img.caderno,
      'Caderno aberto com anotações à mão e uma caneta',
      'Meu caderno de 2026',
    ),
    corpo: [
      paragrafo(
        'Tenho um caderno aberto ao lado do computador desde sempre. Nele vão ',
        negrito('listas de compras'),
        ', ',
        italico('frases ouvidas no ônibus'),
        ' e ideias que quase nunca viram nada.',
      ),
      subtitulo('h2', 'O papel lembra por mim'),
      paragrafo(
        'Há quem prefira aplicativos, e tudo bem. Um ',
        link('estudo bastante citado', 'https://www.example.com/estudo-escrita-a-mao'),
        ' diz que escrever à mão ajuda a memória, mas eu anoto mesmo é pelo prazer.',
      ),
      citacaoDestaque(
        'O caderno é o único lugar onde eu não preciso ser organizada.',
        'Eu mesma, numa terça-feira',
      ),
      subtitulo('h3', 'O que vai no caderno'),
      itemDeLista('bullet', ['Listas']),
      itemDeLista('bullet', ['de compras'], 2),
      itemDeLista(
        'bullet',
        ['de filmes para ver, como ', linkInterno('Dias Perfeitos', ID_DIAS_PERFEITOS)],
        2,
      ),
      itemDeLista('bullet', ['Frases soltas e rascunhos de posts']),
      itemDeLista('bullet', ['Desenhos ruins, mas sinceros']),
      subtitulo('h3', 'Como eu organizo'),
      itemDeLista('number', ['Uma página por dia, com a data no canto.']),
      itemDeLista('number', ['Um índice nas últimas páginas.']),
      itemDeLista('number', ['Adesivos coloridos para o que precisa voltar.']),
      imagemNoTexto(
        img.mesa,
        'Mesa de trabalho com caderno, canetas e uma xícara',
        'normal',
        'A mesa num dia bom.',
      ),
      paragrafo('E, quando a mesa está bagunçada, a bagunça vira foto:'),
      galeria([
        { de: img.galeria1, alt: 'Estojo com canetas coloridas', legenda: 'As canetas da vez' },
        { de: img.galeria2, alt: 'Página de caderno com uma lista riscada' },
        { de: img.galeria3, alt: 'Cartela de adesivos de gatos', legenda: 'Os adesivos favoritos' },
      ]),
      subtitulo('h2', 'Para ver e ouvir'),
      video(
        'youtube',
        'jNQXAC9IVRw',
        'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        'O primeiro vídeo do YouTube, de 2005.',
      ),
      // Código fictício: o post não existe no Instagram, então o embed mostra "indisponível".
      video('instagram', 'RonromFixture1', 'https://www.instagram.com/reel/RonromFixture1/'),
      citacao(
        'Escrever à mão é pensar devagar. — anotado na margem de um livro emprestado, que eu ',
        italico('juro'),
        ' que vou devolver.',
      ),
      paragrafo(
        'Escrevi mais sobre isso num ',
        linkInterno('texto que já saiu do ar', ID_FORA_DO_AR),
        '. Ou ',
        link('me mande um e-mail', 'mailto:contato@example.com'),
        ' contando como você anota as suas coisas.',
      ),
      citacaoDestaque('Nenhuma ideia é pequena demais para o caderno.'),
    ],
  }),
  // Post sem subtítulo.
  post('cronica-de-uma-terca-feira', {
    tipo: 'pensamento',
    formato: referencia('formato-textos'),
    titulo: 'Crônica de uma terça-feira',
    dataDePublicacao: '2026-09-23T21:10:00-03:00',
    capa: imagem(img.terca, 'Janela com chuva e luzes da cidade ao fundo'),
    corpo: [
      paragrafo('Choveu o dia inteiro e o ônibus atrasou duas vezes. Ainda assim, foi um bom dia.'),
      paragrafo(
        'Na fila da padaria, uma senhora explicava ao neto que o segredo do bolo é não abrir o forno. Anotei no caderno, claro.',
      ),
      paragrafo('À noite, o gato dormiu no meu colo e eu esqueci de reclamar da chuva.'),
    ],
  }),
  // A frase bem curta. Fora do sitemap (`noindex`) e com um endereço antigo, para os redirects (#53).
  post('sobre-gatos', {
    tipo: 'pensamento',
    formato: referencia('formato-frases'),
    titulo: 'Sobre gatos',
    dataDePublicacao: '2026-10-01T07:30:00-03:00',
    capa: imagem(img.gatos, 'Gato laranja dormindo enrolado numa almofada'),
    corpo: [paragrafo('Gato não pede desculpas, e talvez esteja certo.')],
    seo: { noindex: true },
    slugsAnteriores: ['/pensamentos/frases/gatos'],
  }),
  // SEO preenchido: título, descrição e imagem de compartilhamento próprios.
  post('a-internet-precisa-de-mais-blogs', {
    tipo: 'pensamento',
    formato: referencia('formato-textos'),
    // Era de "Opiniões", que virou "Textos e opiniões" (#143).
    slugsAnteriores: ['/pensamentos/opinioes/a-internet-precisa-de-mais-blogs'],
    titulo: 'A internet precisa de mais blogs',
    subtitulo: 'E de menos feeds que decidem o que a gente vê',
    dataDePublicacao: '2026-10-20T12:00:00-03:00',
    capa: imagem(img.blogs, 'Tela de computador com um blog aberto'),
    corpo: [
      paragrafo(
        'Sinto falta de quando a gente seguia pessoas, e não algoritmos. Um blog é uma casa: ',
        negrito('você escolhe a decoração'),
        ' e quem entra.',
      ),
      paragrafo(
        'Este aqui é a minha tentativa de voltar a esse tempo, com reviews como a do ',
        linkInterno('Café do Bairro', ID_CAFE_DO_BAIRRO),
        ' e textos sem pressa.',
      ),
    ],
    seo: {
      titulo: 'Por que a internet precisa de mais blogs',
      descricao:
        'Uma opinião sobre feeds, algoritmos e o prazer de ter um cantinho próprio na internet.',
      imagem: imagem(img.compartilhamento, 'Logotipo do Ronrom sobre fundo creme'),
    },
  }),
];

// --- Singletons ---

const configuracoes = {
  _id: 'configuracoes',
  _type: 'configuracoes',
  ...sistema('2026-01-01T12:00:00Z', '2026-10-20T12:00:00Z'),
  fraseDaSemana: {
    texto: 'Devagar também é um jeito de chegar.',
    autoria: 'Ditado de avó',
    data: '2026-10-26',
  },
  postEmDestaque: referencia(ID_DIAS_PERFEITOS),
  seo: {
    descricao:
      'Reviews de filmes, séries, livros, cafés e lugares, e pensamentos soltos de quem anota tudo.',
    imagem: imagem(img.compartilhamento, 'Logotipo do Ronrom sobre fundo creme'),
  },
  redes: [
    {
      _type: 'rede',
      _key: 'instagram',
      rede: 'instagram',
      url: 'https://www.instagram.com/ronrom.blog',
    },
    { _type: 'rede', _key: 'letterboxd', rede: 'letterboxd', url: 'https://letterboxd.com/ronrom' },
  ],
} satisfies Configuracoes;

const sobre = {
  _id: 'sobre',
  _type: 'sobre',
  ...sistema('2026-01-01T12:00:00Z', '2026-09-01T10:00:00Z'),
  nome: 'Ana Ronrom',
  bio: 'Escrevo sobre o que vejo, leio, como e penso, sempre com um caderno por perto.',
  foto: imagem(img.autora, 'Retrato desenhado da autora com um gato no colo'),
  texto: [
    paragrafo('Oi! Este é o Ronrom, o meu caderno público.'),
    subtitulo('h2', 'O que você encontra aqui'),
    itemDeLista('bullet', ['Reviews com nota em corações.']),
    itemDeLista('bullet', ['Pensamentos, de frases soltas a textos e opiniões.']),
    paragrafo(
      'Para falar comigo, me chame no ',
      link('Instagram', 'https://www.instagram.com/ronrom.blog'),
      '.',
    ),
  ],
  seo: {
    descricao: 'Quem escreve o Ronrom e por quê.',
    imagem: imagem(img.autora, 'Retrato desenhado da autora com um gato no colo'),
  },
} satisfies Sobre;

/** Todos os documentos das fixtures, no formato que o groq-js consulta. */
export const DATASET = [
  ...Object.values(img),
  ...categorias,
  ...formatos,
  ...reviews,
  ...pensamentos,
  configuracoes,
  sobre,
];
