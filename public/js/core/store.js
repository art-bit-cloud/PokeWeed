// Estado do app numa caixinha só. Nada de localStorage: o que precisa durar
// mora no servidor, o resto é cache de tela.

const ouvintes = new Map();

export const store = {
  eu: null,
  secoes: [],
  categorias: [],
  numeros: null,
  podeModerar: false,
  catalogoPersonagem: null,

  // cache de tópicos por id, pra atualizar curtida/nota sem recarregar tudo
  topicos: new Map(),

  guardarTopicos(lista) {
    for (const t of lista) this.topicos.set(t.id, t);
    return lista;
  },
  guardarTopico(t) {
    this.topicos.set(t.id, t);
    return t;
  },
  pegarTopico(id) {
    return this.topicos.get(Number(id)) || null;
  },
  secaoPorSlug(slug) {
    return this.secoes.find((s) => s.slug === slug) || null;
  },
};

// Eventos internos (o websocket avisa, as telas escutam).
export function ouvir(evento, fn) {
  if (!ouvintes.has(evento)) ouvintes.set(evento, new Set());
  ouvintes.get(evento).add(fn);
  return () => ouvintes.get(evento).delete(fn);
}

export function emitir(evento, dados) {
  const set = ouvintes.get(evento);
  if (!set) return;
  for (const fn of [...set]) {
    try {
      fn(dados);
    } catch (err) {
      console.error('[ouvinte]', evento, err);
    }
  }
}

// Limpa os ouvintes de tela quando troca de página.
const ouvintesDaTela = [];
export function ouvirNaTela(evento, fn) {
  ouvintesDaTela.push(ouvir(evento, fn));
}
export function limparOuvintesDaTela() {
  while (ouvintesDaTela.length) ouvintesDaTela.pop()();
}
