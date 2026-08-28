// Motor de desenho do personagem. O catálogo (categorias + o SVG/cor de
// cada item) é buscado do servidor uma vez só e guardado em
// store.catalogoPersonagem; a partir daí, montar o personagem de qualquer
// usuário em qualquer lugar da tela é só concatenar texto — sem rede, sem
// imagem nenhuma pra baixar.
//
// O desenho em si é pixel art de verdade: uma grade de 20x32 "pixels"
// (ver server/db/pixel-art.js e server/db/personagem-catalogo.js), cada
// item já vem do servidor como <rect> comprimido por linha. Aqui no
// cliente só falta: (1) trocar os tokens {{pele}}/{{cabelo}} pela cor
// escolhida — e sua versão escurecida, pra dar aquele degrade de "uma
// sombra só" sem precisar de um item por combinação de cor — e (2) marcar
// o SVG com shape-rendering="crispEdges", senão o navegador borra os
// cantos do pixel ao ampliar e perde a cara de sprite antigo.

import { api } from './api.js';
import { store } from './store.js';

const PELE_PADRAO = '#caa374';
const CABELO_PADRAO = '#241a15';
const cacheSvg = new Map();

// escurece uma cor hex em `quantidade` (0–1) — é a única "sombra" que esse
// estilo usa, de propósito (poucos níveis de sombra, como pixel art antiga).
function escurecer(hex, quantidade = 0.28) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const canal = (deslocamento) => {
    const v = (n >> deslocamento) & 0xff;
    return Math.max(0, Math.round(v * (1 - quantidade)));
  };
  const r = canal(16), g = canal(8), b = canal(0);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

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

// Grade do desenho: 20 de largura x 32 de altura (ver server/db/pixel-art.js).
// 'mini': recorte quadrado em volta do rosto, pra caber redondo num avatar
// pequeno. 'cheio': personagem inteiro, da cabeça aos pés.
function viewBoxDoModo(modo) {
  return modo === 'cheio' ? '0 0 20 32' : '2 0 16 16';
}

function substituirCores(asset, corPele, corCabelo) {
  return asset
    .replaceAll('{{pele_sombra}}', escurecer(corPele))
    .replaceAll('{{pele}}', corPele)
    .replaceAll('{{cabelo_sombra}}', escurecer(corCabelo))
    .replaceAll('{{cabelo}}', corCabelo);
}

export function montarPersonagemSvg(character, { modo = 'mini' } = {}) {
  const cat = store.catalogoPersonagem;
  if (!cat || !temPersonagem(character)) return null;

  const chave = modo + '|' + JSON.stringify(character);
  if (cacheSvg.has(chave)) return cacheSvg.get(chave);

  let corPele = PELE_PADRAO;
  const tomPeleItem = character.tom_pele && cat.itensPorCategoria.get('tom_pele')?.get(character.tom_pele);
  if (tomPeleItem?.asset) corPele = tomPeleItem.asset;

  let corCabelo = CABELO_PADRAO;
  const corCabeloItem = character.cor_cabelo && cat.itensPorCategoria.get('cor_cabelo')?.get(character.cor_cabelo);
  if (corCabeloItem?.asset) corCabelo = corCabeloItem.asset;

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

  const miolo = camadas.map((c) => substituirCores(c.asset, corPele, corCabelo)).join('');
  const svg = `<svg viewBox="${viewBoxDoModo(modo)}" class="pj-svg" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">${miolo}</svg>`;

  cacheSvg.set(chave, svg);
  if (cacheSvg.size > 500) cacheSvg.delete(cacheSvg.keys().next().value);
  return svg;
}

// Recorte de miniatura por categoria — cada tipo de peça mora numa região
// diferente do boneco (cabelo é lá em cima, sapato é lá embaixo, asas são
// bem largas...), então uma miniatura só com aquele pedaço fica ilegível
// se usar sempre o mesmo enquadramento. Coordenadas na grade de 20x32.
const RECORTE_MINIATURA = {
  corpo: '0 0 20 32',
  olhos: '3 4 14 6',
  barba: '3 8 14 6',
  cabelo: '0 -4 20 18',
  roupa: '1 12 18 12',
  chapeu: '0 -4 20 12',
  acessorio: '0 2 20 16',
  item_especial: '0 -3 20 32',
};

// Miniatura de UM item isolado (pro grid do editor) — não é o personagem
// inteiro, só aquela peça, recortada na região onde ela costuma ficar.
export function montarItemSvg(categoriaSlug, item, corPele = PELE_PADRAO, corCabelo = CABELO_PADRAO) {
  if (!item?.asset) return null;
  const viewBox = RECORTE_MINIATURA[categoriaSlug] || '0 0 20 32';
  const miolo = substituirCores(item.asset, corPele, corCabelo);
  return `<svg viewBox="${viewBox}" class="pj-svg" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">${miolo}</svg>`;
}

// Personagem "em branco": primeiro item de cada categoria essencial, pra
// quem nunca abriu o editor não começar do zero absoluto.
export function personagemPadrao() {
  const cat = store.catalogoPersonagem;
  if (!cat) return {};
  const essenciais = ['corpo', 'tom_pele', 'cor_cabelo', 'cabelo', 'olhos'];
  const config = {};
  for (const slug of essenciais) {
    const primeiro = cat.categorias.find((c) => c.slug === slug)?.itens[0];
    if (primeiro) config[slug] = primeiro.slug;
  }
  return config;
}
