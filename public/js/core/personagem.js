// Motor de desenho do personagem. O catálogo (categorias + o SVG/cor de
// cada item) é buscado do servidor uma vez só e guardado em
// store.catalogoPersonagem; a partir daí, montar o personagem de qualquer
// usuário em qualquer lugar da tela é só concatenar texto — sem rede, sem
// imagem nenhuma pra baixar.

import { api } from './api.js';
import { store } from './store.js';

const PELE_PADRAO = '#caa374';
const cacheSvg = new Map();

export async function carregarCatalogo() {
  if (store.catalogoPersonagem) return store.catalogoPersonagem;
  const { categorias } = await api.get('/api/personagem/catalogo');
  const itensPorCategoria = new Map();
  for (const c of categorias) {
    const mapa = new Map();
    for (const item of c.itens) mapa.set(item.slug, item);
    itensPorCategoria.set(c.slug, mapa);
  }
  store.catalogoPersonagem = { categorias, itensPorCategoria };
  return store.catalogoPersonagem;
}

export function temPersonagem(character) {
  return !!(character && Object.keys(character).length);
}

// 'mini': recorte quadrado em volta do rosto, pra caber redondo num avatar
// pequeno. 'cheio': personagem inteiro, da cabeça ao tênis.
function viewBoxDoModo(modo) {
  return modo === 'cheio' ? '0 0 200 240' : '40 6 120 120';
}

export function montarPersonagemSvg(character, { modo = 'mini' } = {}) {
  const cat = store.catalogoPersonagem;
  if (!cat || !temPersonagem(character)) return null;

  const chave = modo + '|' + JSON.stringify(character);
  if (cacheSvg.has(chave)) return cacheSvg.get(chave);

  let corPele = PELE_PADRAO;
  const tomPeleItem = character.tom_pele && cat.itensPorCategoria.get('tom_pele')?.get(character.tom_pele);
  if (tomPeleItem?.asset) corPele = tomPeleItem.asset;

  const camadas = [];
  for (const categoria of cat.categorias) {
    if (categoria.tipo === 'cor') continue; // não desenha camada própria (ex: tom de pele)
    const itemSlug = character[categoria.slug];
    if (!itemSlug) continue;
    const item = cat.itensPorCategoria.get(categoria.slug)?.get(itemSlug);
    if (!item?.asset) continue;
    camadas.push({ camada: categoria.camada, asset: item.asset });
  }
  camadas.sort((a, b) => a.camada - b.camada);

  const miolo = camadas.map((c) => c.asset.replaceAll('{{pele}}', corPele)).join('');
  const svg = `<svg viewBox="${viewBoxDoModo(modo)}" class="pj-svg" preserveAspectRatio="xMidYMid meet">${miolo}</svg>`;

  cacheSvg.set(chave, svg);
  if (cacheSvg.size > 500) cacheSvg.delete(cacheSvg.keys().next().value);
  return svg;
}

// Recorte de miniatura por categoria — cada tipo de peça mora numa região
// diferente do boneco (cabelo é lá em cima, tênis é lá embaixo, asas são
// bem largas...), então uma miniatura só com aquele pedaço fica ilegível
// se usar sempre o mesmo enquadramento.
const RECORTE_MINIATURA = {
  fundo: '0 0 200 240',
  asas: '0 0 200 240',
  corpo: '0 0 200 240',
  calca: '58 150 84 90',
  shorts: '58 150 84 60',
  tenis: '58 198 84 42',
  camiseta: '35 80 130 110',
  moletom: '25 78 150 130',
  jaqueta: '25 78 150 130',
  corrente: '58 78 84 50',
  cabelo: '50 -2 100 100',
  olhos: '62 34 76 36',
  boca: '72 54 56 32',
  brinco: '50 38 100 36',
  oculos: '62 34 76 36',
  bone: '50 -2 100 62',
  acessorio: '0 0 200 240',
  moldura: '0 0 200 240',
};

// Miniatura de UM item isolado (pro grid do editor) — não é o personagem
// inteiro, só aquela peça, recortada na região onde ela costuma ficar.
export function montarItemSvg(categoriaSlug, item, corPele = PELE_PADRAO) {
  if (!item?.asset) return null;
  const viewBox = RECORTE_MINIATURA[categoriaSlug] || '0 0 200 240';
  return `<svg viewBox="${viewBox}" class="pj-svg" preserveAspectRatio="xMidYMid meet">${item.asset.replaceAll('{{pele}}', corPele)}</svg>`;
}

// Personagem "em branco": primeiro item de cada categoria essencial, pra
// quem nunca abriu o editor não começar do zero absoluto.
export function personagemPadrao() {
  const cat = store.catalogoPersonagem;
  if (!cat) return {};
  const essenciais = ['corpo', 'tom_pele', 'cabelo', 'olhos', 'boca'];
  const config = {};
  for (const slug of essenciais) {
    const primeiro = cat.categorias.find((c) => c.slug === slug)?.itens[0];
    if (primeiro) config[slug] = primeiro.slug;
  }
  return config;
}
