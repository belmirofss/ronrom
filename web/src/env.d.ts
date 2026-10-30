// O `tsc` (pnpm typecheck) não lê arquivos .astro: quem confere os tipos deles é o `astro check`, que
// resolve o arquivo de verdade e ignora esta declaração. Ela só existe para os testes de componente
// (docs/testes.md#teste-de-componente), que importam um .astro de dentro de um .ts.
declare module '*.astro' {
  const Componente: import('astro/runtime/server/index.js').AstroComponentFactory;
  export default Componente;
}
