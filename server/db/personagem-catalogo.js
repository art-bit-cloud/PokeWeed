// Catálogo inicial do sistema de personagens.
//
// Cada categoria é uma aba do editor "Meu Personagem" e uma camada de
// desenho (quanto maior `camada`, mais em cima ela fica). Cada item é um
// fragmento SVG simples — no mesmo estilo vetorial do resto do site (a
// pokébola, a folhinha, o ícone da Pokédex): formas geométricas limpas,
// nada de emoji, nada de foto, nada de "boneco genérico".
//
// Pra crescer no futuro, um item novo é só uma linha nova neste arquivo
// (ou, quando existir um admin, uma linha nova direto no banco) — o
// código de desenho (personagem.js no cliente) não precisa mudar.
//
// GRADE DE COORDENADAS (viewBox "0 0 200 240"):
//   cabeça:  círculo em (100,54) raio 30
//   pescoço: x 92–108, y 78–98
//   ombros:  y ≈ 98
//   torso:   y 96–170 (largura varia por tipo de corpo)
//   roupas de torso: largura fixa e "folgada" (x 56–144), cobre qualquer
//     tipo de corpo por baixo — de propósito, visual streetwear largado.
//   pernas:  x 84–96 (esquerda) e 104–116 (direita), y 170–224
//   pés:     y 210–230
//
// O item de "corpo" usa o texto {{pele}} onde entra a cor do tom de pele
// escolhido — é a única categoria do tipo "cor" que não desenha nada
// sozinha, só tinge o corpo.
//
// Nenhum fragmento usa <defs>/gradiente/clipPath com id: um mesmo item
// pode aparecer dezenas de vezes numa tela (feed, ranking...) e ids
// repetidos num HTML colidiriam. Sombra e brilho são só formas com
// opacidade.

function ret(x, y, w, h, rx, cor, op) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${cor}"${op ? ` opacity="${op}"` : ''}/>`;
}
function circ(cx, cy, r, cor, op) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cor}"${op ? ` opacity="${op}"` : ''}/>`;
}
function elipse(cx, cy, rx, ry, cor, op) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${cor}"${op ? ` opacity="${op}"` : ''}/>`;
}
function linha(pontos, cor, largura, cap = 'round') {
  return `<path d="${pontos}" stroke="${cor}" stroke-width="${largura}" fill="none" stroke-linecap="${cap}"/>`;
}
function anel(cx, cy, r, cor, largura) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="${largura}"/>`;
}
const FUNDO_TOTAL = `${ret(0, 0, 200, 240, 0, '#000', 0)}`; // placeholder (não usado, cada fundo define o próprio base)

// ---------- corpo (a única categoria "base": cabeça, pescoço, pernas e
// mãos ficam sempre iguais; só a largura do torso/braço muda) ----------
function corpo(tw, aw) {
  return `
    ${elipse(100, 227, 30, 6, '#000', 0.16)}
    ${ret(84, 170, 12, 54, 6, '{{pele}}')}
    ${ret(104, 170, 12, 54, 6, '{{pele}}')}
    ${ret(100 - tw, 96, tw * 2, 74, 16, '{{pele}}')}
    ${ret(100 - tw - aw, 100, aw, 58, aw / 2, '{{pele}}')}
    ${ret(100 + tw, 100, aw, 58, aw / 2, '{{pele}}')}
    ${circ(100 - tw - aw / 2, 160, 7, '{{pele}}')}
    ${circ(100 + tw + aw / 2, 160, 7, '{{pele}}')}
    ${ret(92, 78, 16, 20, 4, '{{pele}}')}
    ${circ(100, 54, 30, '{{pele}}')}
  `;
}

// ---------- categorias ----------
const CATEGORIAS = [
  { slug: 'fundo', name: 'Fundo', tipo: 'visual', camada: 0, posicao: 1 },
  { slug: 'asas', name: 'Asas', tipo: 'visual', camada: 10, posicao: 2 },
  { slug: 'corpo', name: 'Corpo', tipo: 'visual', camada: 20, posicao: 3 },
  { slug: 'tom_pele', name: 'Tom de pele', tipo: 'cor', camada: 21, posicao: 4 },
  { slug: 'calca', name: 'Calças', tipo: 'visual', camada: 22, posicao: 5 },
  { slug: 'shorts', name: 'Shorts', tipo: 'visual', camada: 23, posicao: 6 },
  { slug: 'tenis', name: 'Tênis', tipo: 'visual', camada: 24, posicao: 7 },
  { slug: 'camiseta', name: 'Camisetas', tipo: 'visual', camada: 25, posicao: 8 },
  { slug: 'moletom', name: 'Moletons', tipo: 'visual', camada: 26, posicao: 9 },
  { slug: 'jaqueta', name: 'Jaquetas', tipo: 'visual', camada: 27, posicao: 10 },
  { slug: 'corrente', name: 'Correntes', tipo: 'visual', camada: 28, posicao: 11 },
  { slug: 'cabelo', name: 'Cabelo', tipo: 'visual', camada: 29, posicao: 12 },
  { slug: 'olhos', name: 'Olhos', tipo: 'visual', camada: 30, posicao: 13 },
  { slug: 'boca', name: 'Boca', tipo: 'visual', camada: 31, posicao: 14 },
  { slug: 'brinco', name: 'Brincos', tipo: 'visual', camada: 32, posicao: 15 },
  { slug: 'oculos', name: 'Óculos', tipo: 'visual', camada: 33, posicao: 16 },
  { slug: 'bone', name: 'Bonés', tipo: 'visual', camada: 34, posicao: 17 },
  { slug: 'acessorio', name: 'Outros acessórios', tipo: 'visual', camada: 35, posicao: 18 },
  { slug: 'moldura', name: 'Moldura', tipo: 'visual', camada: 100, posicao: 19 },
];

// ---------- itens ----------
// { categoria, slug, name, asset, raridade?, posicao? }
const ITENS = [
  // corpo — três porportes, todas com pescoço/pernas/cabeça no mesmo lugar
  { categoria: 'corpo', slug: 'esguio', name: 'Esguio', asset: corpo(26, 10), posicao: 1 },
  { categoria: 'corpo', slug: 'medio', name: 'Médio', asset: corpo(32, 12), posicao: 2 },
  { categoria: 'corpo', slug: 'robusto', name: 'Robusto', asset: corpo(40, 15), posicao: 3 },

  // tom de pele — itens "cor": o asset é o próprio valor de cor
  { categoria: 'tom_pele', slug: 'clara', name: 'Clara', asset: '#f2c9a0', posicao: 1 },
  { categoria: 'tom_pele', slug: 'media', name: 'Média', asset: '#d9a066', posicao: 2 },
  { categoria: 'tom_pele', slug: 'morena', name: 'Morena', asset: '#b97a4a', posicao: 3 },
  { categoria: 'tom_pele', slug: 'escura', name: 'Escura', asset: '#7a4a2b', posicao: 4 },
  { categoria: 'tom_pele', slug: 'bem_escura', name: 'Bem escura', asset: '#4a2e1c', posicao: 5 },
  { categoria: 'tom_pele', slug: 'verde', name: 'Verde (edição bonde)', asset: '#7bc47f', raridade: 'raro', posicao: 6 },

  // cabelo
  {
    categoria: 'cabelo', slug: 'moicano_verde', name: 'Moicano verde', posicao: 1,
    asset: `<path d="M91 40 L95 10 L100 2 L105 10 L109 40 Z" fill="#5ede7c"/>`,
  },
  {
    categoria: 'cabelo', slug: 'moicano_rosa', name: 'Moicano rosa', posicao: 2,
    asset: `<path d="M91 40 L95 10 L100 2 L105 10 L109 40 Z" fill="#f472b6"/>`,
  },
  {
    categoria: 'cabelo', slug: 'afro_roxo', name: 'Afro roxo', posicao: 3,
    asset: circ(100, 42, 36, '#a78bfa'),
  },
  {
    categoria: 'cabelo', slug: 'liso_preto', name: 'Liso preto', posicao: 4,
    asset: `${ret(66, 18, 68, 48, 30, '#1a1a1a')}${ret(63, 46, 11, 56, 5, '#1a1a1a')}${ret(126, 46, 11, 56, 5, '#1a1a1a')}`,
  },
  {
    categoria: 'cabelo', slug: 'careca', name: 'Careca', posicao: 5,
    asset: `<path d="M70 38 A30 30 0 0 1 130 38" stroke="#2a2a2a" stroke-width="3" fill="none" opacity="0.55"/>`,
  },
  {
    categoria: 'cabelo', slug: 'trancas_azul', name: 'Tranças azul', posicao: 6,
    asset: `${ret(72, 20, 56, 24, 14, '#5aa9f8')}${ret(67, 40, 10, 92, 5, '#5aa9f8')}${ret(123, 40, 10, 92, 5, '#5aa9f8')}`,
  },

  // olhos
  {
    categoria: 'olhos', slug: 'tranquilo', name: 'Tranquilo', posicao: 1,
    asset: `${elipse(86, 52, 6, 4, '#1a1a1a')}${elipse(114, 52, 6, 4, '#1a1a1a')}`,
  },
  {
    categoria: 'olhos', slug: 'suave', name: 'Suave (de leve vermelhinho)', posicao: 2,
    asset: `${ret(80, 51, 12, 3, 2, '#1a1a1a')}${ret(108, 51, 12, 3, 2, '#1a1a1a')}${elipse(86, 56, 7, 3, '#e0393e', 0.3)}${elipse(114, 56, 7, 3, '#e0393e', 0.3)}`,
  },
  {
    categoria: 'olhos', slug: 'determinado', name: 'Determinado', posicao: 3,
    asset: `<path d="M78 47 L94 52 L78 55 Z" fill="#1a1a1a"/><path d="M122 47 L106 52 L122 55 Z" fill="#1a1a1a"/>`,
  },
  {
    categoria: 'olhos', slug: 'brilhante', name: 'Brilhante', posicao: 4,
    asset: `${circ(86, 52, 6, '#1a1a1a')}${circ(88, 50, 2, '#fff')}${circ(114, 52, 6, '#1a1a1a')}${circ(116, 50, 2, '#fff')}`,
  },

  // boca
  { categoria: 'boca', slug: 'sorriso', name: 'Sorriso tranquilo', posicao: 1, asset: linha('M88 68 Q100 76 112 68', '#1a1a1a', 3) },
  {
    categoria: 'boca', slug: 'largo', name: 'Sorriso largo', posicao: 2,
    asset: `<path d="M85 66 Q100 82 115 66 Q100 73 85 66 Z" fill="#1a1a1a"/>${ret(94, 68, 12, 4, 2, '#fff')}`,
  },
  { categoria: 'boca', slug: 'seria', name: 'Séria', posicao: 3, asset: ret(90, 70, 20, 3, 1.5, '#1a1a1a') },
  {
    categoria: 'boca', slug: 'lingua', name: 'Língua de fora', posicao: 4,
    asset: `${linha('M86 66 Q100 74 114 66', '#1a1a1a', 3)}${ret(96, 72, 8, 12, 4, '#e0708a')}`,
  },

  // camisetas (manga curta)
  {
    categoria: 'camiseta', slug: 'branca', name: 'Branca lisa', posicao: 1,
    asset: `${ret(40, 98, 26, 32, 12, '#f2f7f4')}${ret(134, 98, 26, 32, 12, '#f2f7f4')}${ret(58, 94, 84, 66, 16, '#f2f7f4')}`,
  },
  {
    categoria: 'camiseta', slug: 'folha', name: 'Estampa de folha', posicao: 2,
    asset: `${ret(40, 98, 26, 32, 12, '#161f1a')}${ret(134, 98, 26, 32, 12, '#161f1a')}${ret(58, 94, 84, 66, 16, '#161f1a')}<g transform="translate(100 118) scale(0.9)" fill="#5ede7c"><use href="#folha-maconha"/></g>`,
  },
  {
    categoria: 'camiseta', slug: 'listrada', name: 'Listrada', posicao: 3,
    asset: `${ret(40, 98, 26, 32, 12, '#f2f7f4')}${ret(134, 98, 26, 32, 12, '#f2f7f4')}${ret(58, 94, 84, 66, 16, '#f2f7f4')}${ret(58, 104, 84, 8, 0, '#f0555a')}${ret(58, 122, 84, 8, 0, '#f0555a')}${ret(58, 140, 84, 8, 0, '#f0555a')}`,
  },

  // moletons (manga longa + capuz)
  {
    categoria: 'moletom', slug: 'cinza', name: 'Cinza', posicao: 1,
    asset: `${ret(96, 88, 8, 14, 3, '#3a4048')}${ret(38, 98, 28, 62, 13, '#4a525c')}${ret(134, 98, 28, 62, 13, '#4a525c')}${ret(56, 94, 88, 78, 18, '#4a525c')}`,
  },
  {
    categoria: 'moletom', slug: 'verde_militar', name: 'Verde militar', posicao: 2,
    asset: `${ret(96, 88, 8, 14, 3, '#3d4a34')}${ret(38, 98, 28, 62, 13, '#4f5f3f')}${ret(134, 98, 28, 62, 13, '#4f5f3f')}${ret(56, 94, 88, 78, 18, '#4f5f3f')}`,
  },

  // jaquetas (manga longa + gola + "zíper")
  {
    categoria: 'jaqueta', slug: 'jeans', name: 'Jaqueta jeans', posicao: 1,
    asset: `${ret(38, 98, 28, 62, 13, '#4a6fa5')}${ret(134, 98, 28, 62, 13, '#4a6fa5')}${ret(56, 94, 88, 78, 18, '#5b81b8')}${ret(98, 96, 4, 74, 0, '#2f4a75', 0.6)}${ret(60, 98, 12, 10, 3, '#2f4a75', 0.5)}`,
  },
  {
    categoria: 'jaqueta', slug: 'bomber', name: 'Bomber preta', posicao: 2,
    asset: `${ret(38, 148, 28, 14, 6, '#111')}${ret(134, 148, 28, 14, 6, '#111')}${ret(38, 98, 28, 54, 12, '#1c1c1c')}${ret(134, 98, 28, 54, 12, '#1c1c1c')}${ret(56, 94, 88, 78, 18, '#1c1c1c')}${ret(56, 94, 88, 12, 6, '#2c2c2c')}`,
  },

  // calças
  {
    categoria: 'calca', slug: 'jeans', name: 'Jeans', posicao: 1,
    asset: `${ret(80, 168, 17, 58, 6, '#3b5a86')}${ret(103, 168, 17, 58, 6, '#3b5a86')}`,
  },
  {
    categoria: 'calca', slug: 'cargo', name: 'Cargo', posicao: 2,
    asset: `${ret(80, 168, 17, 58, 6, '#5b5a3f')}${ret(103, 168, 17, 58, 6, '#5b5a3f')}${ret(78, 196, 12, 12, 3, '#4a4933')}${ret(110, 196, 12, 12, 3, '#4a4933')}`,
  },

  // shorts
  {
    categoria: 'shorts', slug: 'jeans', name: 'Jeans curto', posicao: 1,
    asset: `${ret(80, 168, 17, 30, 6, '#4a6fa5')}${ret(103, 168, 17, 30, 6, '#4a6fa5')}`,
  },
  {
    categoria: 'shorts', slug: 'moletom', name: 'Moletom curto', posicao: 2,
    asset: `${ret(80, 168, 17, 32, 6, '#4a525c')}${ret(103, 168, 17, 32, 6, '#4a525c')}`,
  },

  // tênis
  {
    categoria: 'tenis', slug: 'branco', name: 'Branco clássico', posicao: 1,
    asset: `${ret(77, 213, 21, 15, 6, '#f2f7f4')}${ret(102, 213, 21, 15, 6, '#f2f7f4')}${ret(77, 224, 21, 5, 2, '#c9d2cc')}${ret(102, 224, 21, 5, 2, '#c9d2cc')}`,
  },
  {
    categoria: 'tenis', slug: 'preto', name: 'Preto street', posicao: 2,
    asset: `${ret(77, 213, 21, 15, 6, '#161616')}${ret(102, 213, 21, 15, 6, '#161616')}${ret(77, 224, 21, 5, 2, '#3a3a3a')}${ret(102, 224, 21, 5, 2, '#3a3a3a')}`,
  },
  {
    categoria: 'tenis', slug: 'colorido', name: 'Color block', posicao: 3,
    asset: `${ret(77, 213, 21, 15, 6, '#f2f7f4')}${ret(102, 213, 21, 15, 6, '#f2f7f4')}${ret(77, 213, 21, 7, 6, '#f0555a')}${ret(102, 213, 21, 7, 6, '#5aa9f8')}`,
  },

  // bonés
  {
    categoria: 'bone', slug: 'verde', name: 'Boné verde', posicao: 1,
    asset: `${circ(100, 32, 30, '#2fae62')}${ret(96, 4, 8, 30, 4, '#2fae62')}${elipse(126, 40, 20, 7, '#227d47')}`,
  },
  {
    categoria: 'bone', slug: 'preto', name: 'Boné preto', posicao: 2,
    asset: `${circ(100, 32, 30, '#1a1a1a')}${ret(96, 4, 8, 30, 4, '#1a1a1a')}${elipse(126, 40, 20, 7, '#000')}`,
  },
  {
    categoria: 'bone', slug: 'gorro', name: 'Gorro', posicao: 3,
    asset: `${circ(100, 30, 32, '#c22c31')}${ret(68, 44, 64, 12, 6, '#f2f7f4')}${circ(100, 6, 7, '#f2f7f4')}`,
  },

  // óculos
  {
    categoria: 'oculos', slug: 'sol', name: 'De sol', posicao: 1,
    asset: `${ret(76, 46, 20, 12, 5, '#111')}${ret(104, 46, 20, 12, 5, '#111')}${ret(96, 50, 8, 3, 1, '#111')}`,
  },
  {
    categoria: 'oculos', slug: 'redondo', name: 'Redondo', posicao: 2,
    asset: `${anel(86, 52, 10, '#1a1a1a', 2.5)}${anel(114, 52, 10, '#1a1a1a', 2.5)}${linha('M96 52 L104 52', '#1a1a1a', 2.5)}`,
  },

  // correntes
  {
    categoria: 'corrente', slug: 'prata', name: 'Prata simples', posicao: 1,
    asset: `<path d="M84 96 Q100 112 116 96" stroke="#c7ced4" stroke-width="3" fill="none"/>`,
  },
  {
    categoria: 'corrente', slug: 'ouro', name: 'Ouro grossa', posicao: 2, raridade: 'raro',
    asset: `<path d="M82 96 Q100 116 118 96" stroke="#f3c24d" stroke-width="5" fill="none"/>${circ(100, 116, 6, '#f3c24d')}`,
  },

  // brincos
  { categoria: 'brinco', slug: 'argola', name: 'Argola', posicao: 1, asset: `${anel(70, 58, 4, '#f3c24d', 2)}${anel(130, 58, 4, '#f3c24d', 2)}` },
  { categoria: 'brinco', slug: 'ponto', name: 'Ponto de luz', posicao: 2, asset: `${circ(70, 58, 2.5, '#5aa9f8')}${circ(130, 58, 2.5, '#5aa9f8')}` },

  // outros acessórios (bichinho de estimação, bolsa — sempre "na frente")
  {
    categoria: 'acessorio', slug: 'gato', name: 'Gato de estimação', posicao: 1, raridade: 'raro',
    asset: `${elipse(168, 214, 18, 13, '#4a4a4a')}${circ(180, 196, 10, '#4a4a4a')}<path d="M172 190 L175 180 L179 191 Z" fill="#4a4a4a"/><path d="M184 190 L188 180 L191 191 Z" fill="#4a4a4a"/>${circ(184, 195, 1.6, '#eaeaea')}<path d="M152 220 Q140 210 148 200" stroke="#4a4a4a" stroke-width="3" fill="none"/>`,
  },
  {
    categoria: 'acessorio', slug: 'cachorro', name: 'Cachorro de estimação', posicao: 2, raridade: 'raro',
    asset: `${elipse(168, 215, 19, 14, '#b4813f')}${circ(182, 197, 11, '#b4813f')}<path d="M174 190 Q168 182 174 178 Q180 184 178 191 Z" fill="#8a5f2b"/><path d="M190 190 Q196 182 191 178 Q186 184 187 191 Z" fill="#8a5f2b"/>${circ(186, 196, 1.6, '#2a2a2a')}`,
  },
  {
    categoria: 'acessorio', slug: 'bolsa', name: 'Bolsa transversal', posicao: 3,
    asset: `${ret(60, 96, 10, 78, 4, '#5b3a24')}<path d="M60 96 L140 168 L136 176 L56 104 Z" fill="#5b3a24"/>${ret(118, 150, 26, 24, 6, '#7a5236')}`,
  },

  // asas (atrás do corpo)
  {
    categoria: 'asas', slug: 'anjo', name: 'Anjo', posicao: 1, raridade: 'raro',
    asset: `<path d="M62 96 Q10 100 6 150 Q34 140 50 160 Q40 120 62 96 Z" fill="#f2f7f4"/><path d="M138 96 Q190 100 194 150 Q166 140 150 160 Q160 120 138 96 Z" fill="#f2f7f4"/>`,
  },
  {
    categoria: 'asas', slug: 'dragao', name: 'Dragão', posicao: 2, raridade: 'epico',
    asset: `<path d="M64 100 Q4 96 2 132 Q28 118 40 132 Q20 140 10 160 Q46 152 64 130 Z" fill="#8a2530"/><path d="M136 100 Q196 96 198 132 Q172 118 160 132 Q180 140 190 160 Q154 152 136 130 Z" fill="#8a2530"/>`,
  },

  // fundos (sem gradiente/id — só formas planas sobrepostas)
  {
    categoria: 'fundo', slug: 'verde', name: 'Verde', posicao: 1,
    asset: `${ret(0, 0, 200, 240, 0, '#122117')}${circ(150, 60, 70, '#1d3a26', 0.7)}${circ(30, 190, 60, '#0d1a12', 0.6)}`,
  },
  {
    categoria: 'fundo', slug: 'roxo', name: 'Roxo', posicao: 2,
    asset: `${ret(0, 0, 200, 240, 0, '#1c1730')}${circ(150, 60, 70, '#2c2350', 0.7)}${circ(30, 190, 60, '#120e22', 0.6)}`,
  },
  {
    categoria: 'fundo', slug: 'grade', name: 'Grade retrô', posicao: 3,
    asset: `${ret(0, 0, 200, 240, 0, '#160f22')}${ret(0, 150, 200, 90, 0, '#2a1840')}${linha('M0 165 L200 165', '#e0393e', 1.5)}${linha('M0 182 L200 182', '#e0393e', 1.2, 'butt')}${linha('M0 202 L200 202', '#e0393e', 1, 'butt')}${linha('M0 226 L200 226', '#e0393e', 0.8, 'butt')}`,
  },
  {
    categoria: 'fundo', slug: 'folhas', name: 'Folhas flutuantes', posicao: 4,
    asset: `${ret(0, 0, 200, 240, 0, '#0f1a13')}<g transform="translate(40 50) scale(0.5)" fill="#5ede7c" opacity="0.5"><use href="#folha-maconha"/></g><g transform="translate(165 90) rotate(30) scale(0.35)" fill="#5ede7c" opacity="0.4"><use href="#folha-maconha"/></g><g transform="translate(30 190) rotate(-20) scale(0.4)" fill="#5ede7c" opacity="0.35"><use href="#folha-maconha"/></g>`,
  },

  // molduras (sempre por cima, só contorno — não pode tapar o personagem)
  {
    categoria: 'moldura', slug: 'neon', name: 'Neon verde', posicao: 1,
    asset: `${ret(4, 4, 192, 232, 18, 'none')}<rect x="5" y="5" width="190" height="230" rx="18" fill="none" stroke="#5ede7c" stroke-width="4"/><rect x="10" y="10" width="180" height="220" rx="14" fill="none" stroke="#5ede7c" stroke-width="1.4" opacity="0.55"/>`,
  },
  {
    categoria: 'moldura', slug: 'dourada', name: 'Dourada', posicao: 2, raridade: 'lendario',
    asset: `<rect x="5" y="5" width="190" height="230" rx="10" fill="none" stroke="#f3c24d" stroke-width="5"/>${circ(5, 5, 6, '#f3c24d')}${circ(195, 5, 6, '#f3c24d')}${circ(5, 235, 6, '#f3c24d')}${circ(195, 235, 6, '#f3c24d')}`,
  },
  {
    categoria: 'moldura', slug: 'rachada', name: 'Rachada (street)', posicao: 3,
    asset: `<path d="M6 6 L194 6 L194 234 L6 234 Z" fill="none" stroke="#f2f7f4" stroke-width="3"/><path d="M6 90 L20 96 L6 104" fill="none" stroke="#f2f7f4" stroke-width="2"/><path d="M194 150 L180 156 L194 164" fill="none" stroke="#f2f7f4" stroke-width="2"/>`,
  },
];

module.exports = { CATEGORIAS, ITENS };
