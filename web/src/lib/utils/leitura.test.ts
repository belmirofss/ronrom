import { describe, expect, it } from 'vitest';
import { contarPalavras, tempoDeLeitura } from '@/lib/utils/leitura';

const palavras = (n: number) => Array.from({ length: n }, (_, i) => `palavra${i}`).join(' ');

const bloco = (style: string, ...textos: string[]) => ({
  _type: 'block',
  style,
  children: textos.map((text) => ({ _type: 'span', text })),
});

describe('tempoDeLeitura', () => {
  it('devolve o mínimo de 1 minuto sem texto', () => {
    expect(tempoDeLeitura([])).toBe('1 min de leitura');
    expect(tempoDeLeitura(undefined)).toBe('1 min de leitura');
    expect(tempoDeLeitura(null)).toBe('1 min de leitura');
    expect(tempoDeLeitura([bloco('normal'), bloco('normal', '')])).toBe('1 min de leitura');
  });

  it('não conta imagens, vídeos e embeds, nem as legendas e o alt deles', () => {
    const corpo = [
      { _type: 'imagem', alt: palavras(500), legenda: palavras(500) },
      { _type: 'galeria', imagens: [{ alt: palavras(500) }] },
      { _type: 'video', legenda: palavras(500) },
      { _type: 'citacaoDestaque', texto: palavras(500) },
    ];
    expect(tempoDeLeitura(corpo)).toBe('1 min de leitura');
  });

  it('dá 1 minuto para menos de 200 palavras', () => {
    expect(tempoDeLeitura([bloco('normal', palavras(150))])).toBe('1 min de leitura');
    expect(tempoDeLeitura([bloco('normal', palavras(200))])).toBe('1 min de leitura');
  });

  it('arredonda para cima', () => {
    expect(tempoDeLeitura([bloco('normal', palavras(201))])).toBe('2 min de leitura');
    expect(tempoDeLeitura([bloco('normal', palavras(400))])).toBe('2 min de leitura');
  });

  it('dá 10 minutos para 2.000 palavras', () => {
    expect(tempoDeLeitura([bloco('normal', palavras(2000))])).toBe('10 min de leitura');
  });

  it('conta todos os blocos de texto e todos os spans, com ou sem marcas', () => {
    const corpo = [
      bloco('h2', palavras(50)),
      bloco('normal', `${palavras(50)} `, palavras(50)), // o segundo span em negrito
      { ...bloco('normal', palavras(50)), listItem: 'bullet', level: 1 },
      bloco('blockquote', palavras(1)),
    ];
    expect(tempoDeLeitura(corpo)).toBe('2 min de leitura');
  });

  it('junta os spans de uma mesma palavra', () => {
    // "neg" + "rito" (com marca só no começo) é uma palavra só: 200 no total, não 201.
    const corpo = [bloco('normal', `${palavras(199)} neg`, 'rito')];
    expect(tempoDeLeitura(corpo)).toBe('1 min de leitura');
  });

  it('ignora espaços repetidos, quebras de linha e pontuação solta', () => {
    const texto = `  ${palavras(200).replaceAll(' ', '   \n\t ')}  —  ...  !  `;
    expect(tempoDeLeitura([bloco('normal', texto)])).toBe('1 min de leitura');
    expect(tempoDeLeitura([bloco('normal', `${texto} mais`)])).toBe('2 min de leitura');
  });
});

describe('contarPalavras', () => {
  it('conta as palavras dos blocos de texto e ignora o resto', () => {
    expect(contarPalavras([bloco('normal', 'neg', 'rito e — mais'), { _type: 'imagem' }])).toBe(3);
    expect(contarPalavras(undefined)).toBe(0);
  });
});
