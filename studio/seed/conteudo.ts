// Conteúdo de exemplo do dataset development, gravado pelo scripts/seed.ts: 12 posts (uma review
// por categoria e pensamentos de todos os formatos), tags, Configurações do site e Sobre mim.
// Cobre os casos que o site precisa mostrar: frase bem curta, texto longo, post sem subtítulo e
// um post com todos os blocos do texto. Os textos e as pessoas são de exemplo; as imagens são
// ilustrações próprias, em seed/imagens.

import {
  citacao,
  citacaoDestaque,
  type Documento,
  galeria,
  imagem,
  lista,
  numerarChaves,
  paragrafo,
  referencia,
  subtitulo,
  subtituloMenor,
  video,
} from '../lib/seed';
import { slugify } from '../lib/slug';

export const IMAGENS = [
  'cafe',
  'cinema',
  'livro',
  'parque',
  'pao-de-queijo',
  'serie',
  'caderno',
  'treino',
  'frase',
  'gato',
  'compartilhamento',
] as const;

export type NomeDaImagem = (typeof IMAGENS)[number];

// `_id` do asset de cada imagem, depois de enviada.
export type Assets = Record<NomeDaImagem, string>;

const TAGS = [
  'Café',
  'Cinema',
  'Cinema japonês',
  'São Paulo',
  'Leitura',
  'Literatura brasileira',
  'Séries',
  'Domingo',
  'Rotina',
  'Treino',
  'Comida de rua',
  'Escrita',
  'Internet',
] as const;

type NomeDaTag = (typeof TAGS)[number];

const idDaTag = (nome: NomeDaTag) => `seed-tag-${slugify(nome)}`;

export const POSTS = {
  diasPerfeitos: 'seed-post-01',
  theBear: 'seed-post-02',
  tortoArado: 'seed-post-03',
  cafeDaEsquina: 'seed-post-04',
  ibirapuera: 'seed-post-05',
  paoDeQueijo: 'seed-post-06',
  cafePrimeiro: 'seed-post-07',
  gatoNoSol: 'seed-post-08',
  crossfit: 'seed-post-09',
  escreverAMao: 'seed-post-10',
  opiniao: 'seed-post-11',
  domingoSemCelular: 'seed-post-12',
} as const;

type Bloco = Record<string, unknown>;

interface DadosComuns {
  _id: string;
  titulo: string;
  subtitulo?: string;
  // Fixa, e não "agora": rodar o seed de novo grava o mesmo documento.
  dataDePublicacao: string;
  capa: { imagem: NomeDaImagem; alt: string; legenda?: string };
  tags: NomeDaTag[];
  corpo: (Bloco | Bloco[])[];
  seo?: { titulo?: string; descricao?: string };
}

type DadosDoPost = DadosComuns &
  (
    | { tipo: 'review'; categoria: string; nota: number; ficha: Record<string, unknown> }
    | { tipo: 'pensamento'; formato: string }
  );

function post(assets: Assets, dados: DadosDoPost): Documento {
  const { capa, tags, corpo, ...resto } = dados;
  return {
    ...resto,
    _type: 'post',
    slug: { _type: 'slug', current: slugify(dados.titulo) },
    ...(dados.tipo === 'review'
      ? { categoria: referencia(`categoria-${dados.categoria}`) }
      : { formato: referencia(`formato-${dados.formato}`) }),
    capa: imagem(assets[capa.imagem], {
      alt: capa.alt,
      ...(capa.legenda && { legenda: capa.legenda }),
    }),
    corpo: corpo.flat(),
    tags: tags.map((nome) => referencia(idDaTag(nome))),
  };
}

function posts(assets: Assets): DadosDoPost[] {
  return [
    {
      _id: POSTS.diasPerfeitos,
      tipo: 'review',
      categoria: 'filmes',
      nota: 5,
      titulo: 'Dias Perfeitos',
      subtitulo: 'O filme mais calmo do ano é também o que mais ficou comigo',
      dataDePublicacao: '2026-10-28T12:30:00.000Z',
      capa: { imagem: 'cinema', alt: 'Ilustração de uma sala de cinema com a tela acesa' },
      tags: ['Cinema', 'Cinema japonês', 'Rotina'],
      ficha: {
        direcao: 'Wim Wenders',
        ano: 2023,
        duracao: 124,
        ondeVi: { meio: 'cinema', qual: 'Cine Belas Artes' },
        valeAPena: 'Vale, de preferência numa sessão de domingo à tarde',
      },
      seo: {
        titulo: 'Dias Perfeitos (2023): review',
        descricao:
          'Hirayama limpa banheiros em Tóquio e encontra beleza na repetição. Por que Dias Perfeitos, de Wim Wenders, é um filme para ver com calma.',
      },
      corpo: [
        paragrafo(
          'Hirayama acorda antes do sol, rega as plantas, escolhe uma fita cassete e sai para limpar os banheiros públicos de Tóquio. No dia seguinte, faz ',
          { texto: 'tudo de novo', italico: true },
          '. Contado assim, parece pouco. Na tela, é ',
          { texto: 'quase tudo', negrito: true },
          '.',
        ),
        subtitulo('Uma rotina que não pesa'),
        paragrafo(
          'O filme de Wim Wenders não tenta convencer ninguém de que a vida simples é melhor. Ele só mostra, com paciência, alguém que escolheu prestar atenção: na luz que atravessa as folhas, nos livros de bolso, no sorriso de um desconhecido.',
        ),
        citacaoDestaque(
          'Da próxima vez é da próxima vez. Agora é agora.',
          'Hirayama, em Dias Perfeitos',
        ),
        imagem(
          assets.cinema,
          {
            alt: 'Ilustração de uma tela de cinema e fileiras de poltronas',
            legenda: 'A sessão de domingo, quase vazia',
            largura: 'larga',
          },
          'imagem',
        ),
        subtituloMenor('O que reparei na segunda vez'),
        ...lista(
          'bullet',
          'As fitas cassete contam a história junto com a imagem.',
          'Quase não há diálogo nos primeiros vinte minutos.',
          ['Cada sonho em preto e branco repete ', { texto: 'algo do dia', italico: true }, '.'],
        ),
        paragrafo('Se for ver pela primeira vez, a minha ordem preferida é:'),
        ...lista(
          'number',
          'Assistir sem ler nada antes.',
          'Ouvir a trilha no caminho de volta para casa.',
          'Rever uma semana depois, já sabendo o final.',
        ),
        citacao(
          'Às vezes o filme mais silencioso da sessão é o que continua falando quando a gente chega em casa.',
        ),
        video('https://www.youtube.com/watch?v=EEJXuQD4Sss', 'Trailer oficial em português'),
        paragrafo(
          'Depois da sessão, fui direto para o ',
          { texto: 'café da esquina', post: POSTS.cafeDaEsquina },
          ' e passei uma hora sem olhar o celular. Para quem quiser saber mais do filme, a página no ',
          { texto: 'Letterboxd', link: 'https://letterboxd.com/film/perfect-days-2023/' },
          ' tem boas resenhas.',
        ),
        galeria([
          imagem(assets.cinema, {
            alt: 'Ilustração da sala de cinema',
            legenda: 'Antes da sessão',
          }),
          imagem(assets.cafe, {
            alt: 'Ilustração de uma xícara de café',
            legenda: 'Depois da sessão',
          }),
          imagem(assets.parque, {
            alt: 'Ilustração de um parque com árvores',
            legenda: 'O caminho de volta',
          }),
        ]),
        video('https://www.instagram.com/p/DExemploRonrom/', 'Post de exemplo do Instagram'),
        paragrafo('Saí do cinema querendo comprar uma câmera analógica. Ainda não comprei.'),
      ],
    },
    {
      _id: POSTS.theBear,
      tipo: 'review',
      categoria: 'series',
      nota: 4.5,
      titulo: 'The Bear',
      subtitulo: 'Uma cozinha barulhenta e, no meio dela, uma série sobre luto',
      dataDePublicacao: '2026-10-21T22:00:00.000Z',
      capa: { imagem: 'serie', alt: 'Ilustração de uma televisão com o botão de play' },
      tags: ['Séries'],
      ficha: {
        criacao: 'Christopher Storer',
        anoDeEstreia: 2022,
        temporadasVistas: '1 a 3',
        ondeVi: { meio: 'streaming', qual: 'Disney+' },
        valeAPena: 'Vale, mas respire entre os episódios',
      },
      corpo: [
        paragrafo(
          'Comecei achando que era uma série sobre restaurante. Na metade da primeira temporada, entendi que a cozinha é só o lugar onde todo mundo grita o que não consegue dizer.',
        ),
        paragrafo(
          'O episódio de um plano só, no meio da primeira temporada, me deixou sem ar. A terceira temporada é mais lenta e dividiu opiniões; eu gostei de ver os personagens parados um pouco.',
        ),
      ],
    },
    {
      _id: POSTS.tortoArado,
      tipo: 'review',
      categoria: 'livros',
      nota: 4.5,
      titulo: 'Torto Arado',
      subtitulo: 'Duas irmãs, uma faca e a terra que nunca foi delas',
      dataDePublicacao: '2026-10-14T13:00:00.000Z',
      capa: { imagem: 'livro', alt: 'Ilustração de um livro aberto' },
      tags: ['Leitura', 'Literatura brasileira'],
      ficha: {
        autoria: 'Itamar Vieira Junior',
        editora: 'Todavia',
        ano: 2019,
        paginas: 264,
        formatoDoLivro: 'fisico',
        valeAPena: 'Vale, e vale ler devagar',
      },
      corpo: [
        paragrafo(
          'Demorei para começar e não consegui parar. A voz de cada narradora é tão diferente que, na virada de uma parte para a outra, fiquei alguns parágrafos estranhando, até entender quem estava falando.',
        ),
        citacao('Um livro sobre quem trabalha a terra sem nunca ser dono dela, contado de dentro.'),
        paragrafo(
          'Recomendo para quem gosta de ',
          { texto: 'romance que não tem pressa', italico: true },
          ' e para quem quer conhecer um pedaço do Brasil que quase não aparece nos livros.',
        ),
      ],
    },
    {
      _id: POSTS.cafeDaEsquina,
      tipo: 'review',
      categoria: 'restaurantes-e-cafes',
      nota: 4,
      titulo: 'Café da Esquina',
      subtitulo: 'O café de bairro que virou o meu escritório às quartas',
      dataDePublicacao: '2026-10-07T14:15:00.000Z',
      capa: {
        imagem: 'cafe',
        alt: 'Ilustração de uma xícara de café fumegante sobre a mesa',
        legenda: 'Ilustração de exemplo',
      },
      tags: ['Café', 'São Paulo'],
      ficha: {
        endereco: {
          rua: 'Rua das Laranjeiras, 120',
          bairro: 'Vila Madalena',
          cidade: 'São Paulo',
          uf: 'SP',
        },
        linkDoMapa: 'https://maps.google.com/?q=Rua+das+Laranjeiras+120+Sao+Paulo',
        faixaDePreco: 'R$$',
        tipoDeCozinha: 'cafeteria',
        oQuePedi: 'Coado do dia e bolo de fubá',
        instagram: '@cafedaesquina.exemplo',
        valeAPena: 'Vale, mas chegue antes das dez',
      },
      corpo: [
        paragrafo(
          'Seis mesas, uma janela grande e um dono que lembra o seu pedido na segunda visita. O coado muda toda semana e o bolo de fubá sai quente às nove.',
        ),
        subtitulo('O que pedir'),
        ...lista(
          'bullet',
          'Coado do dia',
          'Bolo de fubá com goiabada',
          'Pão na chapa, se for de manhã',
        ),
        paragrafo('Não tem tomada em todas as mesas: escolha a do canto, perto da estante.'),
      ],
    },
    {
      _id: POSTS.ibirapuera,
      tipo: 'review',
      categoria: 'lugares',
      nota: 4.5,
      // Sem subtítulo: o site precisa funcionar sem ele.
      titulo: 'Parque Ibirapuera num domingo de manhã',
      dataDePublicacao: '2026-09-30T11:00:00.000Z',
      capa: { imagem: 'parque', alt: 'Ilustração de um parque com lago e árvores' },
      tags: ['São Paulo', 'Domingo'],
      ficha: {
        endereco: {
          rua: 'Av. Pedro Álvares Cabral, s/n',
          bairro: 'Vila Mariana',
          cidade: 'São Paulo',
          uf: 'SP',
        },
        linkDoMapa: 'https://maps.google.com/?q=Parque+Ibirapuera',
        faixaDePreco: 'R$',
        valeAPena: 'Vale, antes das nove',
      },
      corpo: [
        paragrafo(
          'Antes das nove, o parque é dos corredores, dos cachorros e de quem leva uma canga para ler na grama. Depois das onze, é de todo mundo, e tudo bem também.',
        ),
        paragrafo(
          'Meu roteiro: entrar pelo portão 3, dar a volta no lago e terminar com um coco gelado.',
        ),
      ],
    },
    {
      _id: POSTS.paoDeQueijo,
      tipo: 'review',
      categoria: 'comidas',
      nota: 3.5,
      titulo: 'Pão de queijo da feira de sábado',
      subtitulo: 'Crocante por fora, mas o recheio de goiabada não convenceu',
      dataDePublicacao: '2026-09-23T15:30:00.000Z',
      capa: { imagem: 'pao-de-queijo', alt: 'Ilustração de uma cesta com pães de queijo' },
      tags: ['Comida de rua'],
      ficha: {
        marca: 'Barraca da Dona Lúcia, feira de sábado',
        preco: 18.5,
        oQueProvei: 'Pão de queijo tradicional e recheado com goiabada',
        valeAPena: 'O tradicional vale; o recheado, não',
      },
      corpo: [
        paragrafo(
          'O tradicional é tudo que se espera: casca fininha, miolo puxando. O recheado com goiabada chega doce demais e esconde o queijo.',
        ),
      ],
    },
    {
      _id: POSTS.cafePrimeiro,
      tipo: 'pensamento',
      formato: 'frases',
      // A frase bem curta: o card e a página precisam ficar bonitos com quase nada.
      titulo: 'Café primeiro.',
      dataDePublicacao: '2026-10-26T10:00:00.000Z',
      capa: { imagem: 'frase', alt: 'Ilustração de aspas grandes sobre fundo vinho' },
      tags: ['Café'],
      corpo: [paragrafo('Café primeiro. O resto depois.')],
    },
    {
      _id: POSTS.gatoNoSol,
      tipo: 'pensamento',
      formato: 'frases',
      titulo: 'Gato no sol',
      subtitulo: 'Um lembrete que mora em casa',
      dataDePublicacao: '2026-10-12T19:45:00.000Z',
      capa: { imagem: 'gato', alt: 'Ilustração de um gato sentado' },
      tags: ['Rotina'],
      corpo: [
        paragrafo(
          'Todo gato dormindo no sol é um lembrete de que quase nada é tão urgente quanto parece.',
        ),
      ],
    },
    {
      _id: POSTS.crossfit,
      tipo: 'pensamento',
      formato: 'textos',
      titulo: 'Seis meses de crossfit e eu ainda odeio burpee',
      subtitulo: 'Mas voltei todas as segundas, e isso diz alguma coisa',
      dataDePublicacao: '2026-10-19T23:10:00.000Z',
      capa: { imagem: 'treino', alt: 'Ilustração de um kettlebell no chão do box' },
      tags: ['Treino', 'Rotina'],
      corpo: [
        paragrafo(
          'Entrei no box em abril achando que ia durar um mês. A primeira aula terminou comigo sentada no chão, contando quantos burpees faltavam e negociando com o universo.',
        ),
        paragrafo(
          'Seis meses depois, ainda odeio burpee. Só que agora odeio de pé, e isso é progresso. O que me fez voltar não foi o espelho: foi a turma das sete, que sabe o meu nome e grita "mais um" no último round.',
        ),
        subtitulo('O que mudou'),
        ...lista(
          'bullet',
          'Durmo melhor nas noites de treino.',
          'Aprendi a pedir ajuda para ajustar a carga.',
          'Parei de comparar o meu tempo com o da lousa.',
        ),
        paragrafo('Não virei atleta. Virei alguém que vai. Por enquanto, basta.'),
      ],
    },
    {
      _id: POSTS.escreverAMao,
      tipo: 'pensamento',
      formato: 'artigos',
      // O texto longo: rolagem, índice e tempo de leitura.
      titulo: 'Por que eu ainda escrevo à mão',
      subtitulo: 'Um caderno, uma caneta e o tempo que a tela não me dá',
      dataDePublicacao: '2026-10-01T12:00:00.000Z',
      capa: {
        imagem: 'caderno',
        alt: 'Ilustração de um caderno pautado aberto com uma caneta ao lado',
      },
      tags: ['Escrita', 'Rotina'],
      seo: {
        descricao:
          'Escrever à mão é mais lento, e é exatamente por isso que eu continuo. Sobre cadernos, memória e o tempo de pensar antes de publicar.',
      },
      corpo: [
        paragrafo(
          'Todo texto deste blog começou num caderno. Não por romantismo, nem por desconfiar da tecnologia: eu escrevo no computador o dia inteiro, e é justamente por isso que preciso de um lugar onde as palavras andem mais devagar.',
        ),
        paragrafo(
          'Quando escrevo à mão, não consigo apagar sem deixar rastro. A frase riscada continua ali, olhando para mim, lembrando o caminho que eu quase segui. No editor de texto, a primeira versão desaparece no instante em que aparece a segunda, e eu perco a conversa entre as duas.',
        ),
        subtitulo('A lentidão como ferramenta'),
        paragrafo(
          'A mão é mais lenta que o pensamento. Parece um defeito, mas é a parte mais útil do processo: enquanto a caneta alcança a ideia, eu tenho tempo de perceber se ela vale a pena. Metade das frases morre no meio do caminho, e quase sempre com razão.',
        ),
        paragrafo(
          'No teclado, eu escrevo tão rápido quanto penso, e às vezes mais rápido do que deveria. Sai muito texto, e pouco dele é meu de verdade. Sai o que eu já li, o que eu acho que deveria dizer, o tom de quem eu sigo. Com a caneta, sobra menos, mas o que sobra tem a minha letra, nos dois sentidos.',
        ),
        citacao('Escrever devagar é um jeito de ler a si mesma enquanto escreve.'),
        subtitulo('O que vai para o caderno'),
        paragrafo(
          'Nem tudo. O caderno não é um diário, nem um arquivo. É uma bancada. Nele entram:',
        ),
        ...lista(
          'bullet',
          'a primeira frase de um texto, quando ela aparece no ônibus;',
          'listas de filmes, livros e lugares que alguém me indicou;',
          'trechos que eu copio de livros, para entender por que gostei;',
          'rascunhos de reviews, com a nota escrita a lápis, porque ela sempre muda.',
        ),
        paragrafo(
          'O que fica de fora: compromissos, contas e qualquer coisa com prazo. Para isso existe o celular, e ele faz muito bem esse trabalho. Misturar os dois foi o meu erro nos primeiros cadernos, que terminavam como agendas tristes.',
        ),
        subtitulo('Do papel para a tela'),
        paragrafo(
          'Passar o texto para o computador é a minha primeira revisão. Ao digitar, eu leio de novo, corto o que ficou repetido e descubro quais frases só funcionavam na minha cabeça. Muitas vezes o texto encolhe pela metade nessa passagem, e melhora.',
        ),
        subtituloMenor('O método, se é que dá para chamar assim'),
        ...lista(
          'number',
          'Escrevo à mão, sem parar para corrigir.',
          'Deixo descansar pelo menos uma noite.',
          'Digito relendo, e corto sem dó.',
          'Leio em voz alta antes de publicar.',
        ),
        paragrafo(
          'O último passo é o que mais me envergonha e o que mais funciona. A voz tropeça exatamente onde o leitor vai tropeçar. Se eu perco o fôlego no meio de uma frase, ela está longa demais. Se eu leio uma palavra com outra entonação, ela está no lugar errado.',
        ),
        subtitulo('Não é para todo mundo'),
        paragrafo(
          'Conheço gente que escreve maravilhosamente bem direto no celular, nos intervalos do dia, com o polegar. Não acho que o caderno seja melhor; acho que ele é melhor ',
          { texto: 'para mim', italico: true },
          '. Cada pessoa precisa encontrar o lugar em que pensa com mais calma, e às vezes esse lugar é uma nota no celular às duas da manhã.',
        ),
        paragrafo(
          'O que eu defendo é só isto: ter um lugar onde escrever não seja publicar. Um espaço sem curtida, sem contador de palavras, sem ninguém olhando. A internet nos acostumou a pensar em público, e algumas ideias precisam de um tempo no escuro antes de aguentar a luz.',
        ),
        subtitulo('O caderno certo não existe'),
        paragrafo(
          'Já gastei tempo demais escolhendo caderno. Pautado ou pontilhado, capa dura ou mole, A5 ou de bolso. Comprei os bonitos e não tive coragem de estragar a primeira página. Comprei os baratos e escrevi neles sem cerimônia. Adivinha quais eu terminei.',
        ),
        paragrafo(
          'Hoje uso qualquer um que caiba na bolsa e abra bem sobre a mesa. A caneta é a mesma há anos, uma esferográfica azul que custa pouco e não borra. Quando a ferramenta deixa de ser assunto, sobra mais atenção para o que importa, que é o que vai na página. O caderno perfeito é o que está com você quando a ideia aparece.',
        ),
        paragrafo(
          'Também desisti de ter um caderno para cada coisa. Tentei separar reviews, crônicas e listas, e passava mais tempo procurando o caderno certo do que escrevendo. Agora é um só, em ordem de chegada, com a data no canto de cada página. A bagunça faz parte: um rascunho de review ao lado de uma lista de compras conta mais sobre aquele dia do que qualquer organização.',
        ),
        subtitulo('Os cadernos velhos'),
        paragrafo(
          'Guardo todos numa caixa embaixo da cama. Releio de vez em quando e quase sempre acho graça: das letras apressadas, das certezas que não duraram, das listas de filmes que eu nunca vi. Mas também encontro frases que eu não lembrava de ter escrito e que hoje parecem de outra pessoa, uma pessoa que eu gosto de ter sido.',
        ),
        paragrafo(
          'É o único arquivo que eu tenho que não depende de senha, de assinatura ou de um aplicativo que pode sair do ar. Daqui a vinte anos, se eu quiser saber o que pensava num domingo de outubro de 2026, vai estar tudo ali, com a letra torta e a mancha de café na página.',
        ),
        paragrafo(
          'Se você nunca tentou, comece pequeno: um caderno qualquer, uma página por dia, sem objetivo. Veja o que aparece. Talvez nada. Talvez, como na ',
          { texto: 'crônica sobre o domingo sem celular', post: POSTS.domingoSemCelular },
          ', apareça exatamente o que estava faltando.',
        ),
      ],
    },
    {
      _id: POSTS.opiniao,
      tipo: 'pensamento',
      formato: 'opinioes',
      // Sem subtítulo.
      titulo: 'Ninguém precisa ter opinião sobre tudo',
      dataDePublicacao: '2026-09-16T21:00:00.000Z',
      capa: { imagem: 'frase', alt: 'Ilustração de aspas grandes sobre fundo vinho' },
      tags: ['Internet'],
      corpo: [
        paragrafo(
          'Toda semana a internet escolhe um assunto e espera que a gente tenha uma posição até sexta. Eu cansei. Algumas coisas eu não li, outras eu não entendi, e várias eu simplesmente não me importo.',
        ),
        paragrafo(
          '"Não sei" é uma resposta completa. "Ainda estou pensando" também. Acho que a gente ganharia muito se dissesse as duas com mais frequência.',
        ),
      ],
    },
    {
      _id: POSTS.domingoSemCelular,
      tipo: 'pensamento',
      formato: 'textos',
      titulo: 'Um domingo sem celular',
      subtitulo: 'Doze horas desconectada e um parque inteiro de volta',
      dataDePublicacao: '2026-09-09T20:00:00.000Z',
      capa: {
        imagem: 'parque',
        alt: 'Ilustração de um parque com lago e árvores',
        legenda: 'Ilustração de exemplo',
      },
      tags: ['Domingo', 'Rotina', 'São Paulo'],
      corpo: [
        paragrafo(
          'Deixei o celular na gaveta às oito da manhã e só voltei a pegar às oito da noite. Nas primeiras duas horas, a mão procurava o bolso sozinha.',
        ),
        paragrafo(
          'Fui a pé até o ',
          { texto: 'Ibirapuera', post: POSTS.ibirapuera },
          ', li quarenta páginas e almocei olhando para as pessoas. Ninguém morreu, nenhum e-mail pegou fogo, e eu lembro de cada pedaço daquele dia.',
        ),
      ],
    },
  ];
}

function configuracoes(assets: Assets): Documento {
  return {
    _id: 'configuracoes',
    _type: 'configuracoes',
    fraseDaSemana: {
      texto: 'Da próxima vez é da próxima vez. Agora é agora.',
      autoria: 'Hirayama, em Dias Perfeitos',
      data: '2026-10-26',
    },
    postEmDestaque: referencia(POSTS.diasPerfeitos),
    seo: {
      descricao:
        'Reviews de filmes, séries, livros, cafés e lugares, e pensamentos soltos sobre a vida, escritos com calma.',
      imagem: imagem(assets.compartilhamento, {
        alt: 'Ilustração do Ronrom em vinho, malva e rosa',
      }),
    },
    redes: [
      { _type: 'rede', rede: 'instagram', url: 'https://www.instagram.com/ronrom.exemplo' },
      { _type: 'rede', rede: 'letterboxd', url: 'https://letterboxd.com/ronromexemplo' },
      { _type: 'rede', rede: 'skoob', url: 'https://www.skoob.com.br/usuario/ronromexemplo' },
    ],
  };
}

function sobre(assets: Assets): Documento {
  return {
    _id: 'sobre',
    _type: 'sobre',
    nome: 'Lia',
    foto: imagem(assets.gato, { alt: 'Ilustração de um gato sentado, o mascote do Ronrom' }),
    bio: 'Escrevo sobre filmes, livros, cafés e as pequenas coisas do dia. Gosto de domingo, de caderno pautado e de gato dormindo no sol.',
    texto: [
      paragrafo(
        'Oi! Eu sou a Lia, e o Ronrom é o meu caderno aberto. Aqui entram as reviews do que eu vi, li, comi e visitei, e os pensamentos que não couberam em outro lugar.',
      ),
      subtitulo('O que você encontra aqui'),
      ...lista(
        'bullet',
        'Reviews com nota em corações, de meio a cinco.',
        'Textos, frases soltas e opiniões, sem calendário fixo.',
      ),
    ],
    seo: {
      descricao: 'Quem escreve o Ronrom e o que você encontra por aqui.',
    },
  };
}

// Tudo que o seed grava, menos a taxonomia (lib/taxonomia.ts), já com as `_key` dos arrays.
export function documentosDoSeed(assets: Assets): Documento[] {
  const tags = TAGS.map((nome) => ({
    _id: idDaTag(nome),
    _type: 'tag',
    nome,
    slug: { _type: 'slug', current: slugify(nome) },
  }));

  return numerarChaves([
    ...tags,
    ...posts(assets).map((dados) => post(assets, dados)),
    configuracoes(assets),
    sobre(assets),
  ]);
}
