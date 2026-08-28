// Catálogo do sistema de personagens — pixel art de verdade, inspirado em
// sprite de jogo 2D antigo (grade de 20x32 "pixels", contorno escuro,
// poucas sombras, cores fortes, proporção chibi). Documentado a fundo
// porque é o arquivo que mais vai crescer com o tempo.
//
// Cada item é desenhado numa grade de pixels (server/db/pixel-art.js) e
// convertido pra um fragmento SVG (<rect> comprimido por linha) — não tem
// curva suave, gradiente ou canto arredondado em lugar nenhum: só pixel
// pintado ou não. O contorno escuro ao redor de cada peça é automático
// (contorno() olha os vizinhos vazios), então autorar uma peça nova é só
// pintar as formas — não precisa desenhar a borda na mão.
//
// GRADE (20 larg. x 32 alt., eixo de simetria entre a coluna 9 e 10):
//   cabeça:   círculo em (9.5, 7) raio 6.4  → mais ou menos y 0–13, x 3–16
//   pescoço:  x 8–11, y 12–14
//   ombros/torso: y 14–22 (largura varia por tipo de corpo)
//   pernas:   x 7–8 e 11–12, y 23–28
//   sapatos:  y 28–29 (fixos, não customizável — o pedido não incluía
//             calça/tênis como categoria, só as listadas abaixo)
//
// {{pele}}/{{pele_sombra}} e {{cabelo}}/{{cabelo_sombra}} são tokens de
// texto: ficam escritos literalmente no SVG e só viram cor de verdade no
// cliente (public/js/core/personagem.js), trocados pelo tom escolhido e
// por uma versão mais escura dele (pra dar aquele degrade de "1 sombra só"
// sem precisar de um item por combinação de cor).
//
// Pra crescer no futuro, um item novo é só uma entrada nova no array
// ITENS (ou, com um admin, uma linha direto no banco) — nada no motor de
// desenho do cliente precisa mudar.

const {
  L, A, PRETO,
  novaGrade, ret, px, circulo, meioCirculo, linhaH, linhaV, diagonal, touca,
  espelhar, item,
} = require('./pixel-art');

const PELE = '{{pele}}';
const PELE_SOMBRA = '{{pele_sombra}}';
const CABELO = '{{cabelo}}';
const CABELO_SOMBRA = '{{cabelo_sombra}}';

// ---------- corpo base (cabeça, pescoço, pernas, pés — sempre iguais; só
// a largura do torso/braço muda por tipo de físico) ----------
function corpoBase(tw, aw) {
  return (grade) => {
    // pescoço
    ret(grade, 8, 12, 2, 3, PELE_SOMBRA);
    // torso (metade esquerda)
    ret(grade, 10 - tw, 14, tw, 9, PELE);
    // braço + mão (metade esquerda)
    ret(grade, 10 - tw - aw, 16, aw, 6, PELE);
    ret(grade, 10 - tw - aw, 22, aw, 2, PELE_SOMBRA);
    // pernas + sapatos (fixo)
    ret(grade, 7, 23, 2, 6, PELE_SOMBRA);
    ret(grade, 6, 29, 4, 2, PRETO);
    espelhar(grade);
    // cabeça (simétrica por natureza — desenha depois do espelhar pra não
    // ter risco de sobra de metade)
    circulo(grade, 9.5, 7, 6.4, PELE);
    // bochecha (sombra leve, um retângulo só do lado esquerdo)
    ret(grade, 4, 8, 2, 3, PELE_SOMBRA);
    // boca neutra
    px(grade, 8, 11, PRETO); px(grade, 9, 11, PRETO);
  };
}

// ---------- categorias ----------
const CATEGORIAS = [
  { slug: 'corpo', name: 'Corpo', tipo: 'visual', camada: 10, posicao: 1 },
  { slug: 'tom_pele', name: 'Tom de pele', tipo: 'cor', camada: 11, posicao: 2 },
  { slug: 'olhos', name: 'Olhos', tipo: 'visual', camada: 20, posicao: 3 },
  { slug: 'barba', name: 'Barba', tipo: 'visual', camada: 25, posicao: 4 },
  { slug: 'cor_cabelo', name: 'Cor do cabelo', tipo: 'cor', camada: 29, posicao: 5 },
  { slug: 'cabelo', name: 'Cabelo', tipo: 'visual', camada: 30, posicao: 6 },
  { slug: 'roupa', name: 'Roupa', tipo: 'visual', camada: 40, posicao: 7 },
  { slug: 'chapeu', name: 'Chapéus e bonés', tipo: 'visual', camada: 50, posicao: 8 },
  { slug: 'acessorio', name: 'Acessórios', tipo: 'visual', camada: 60, posicao: 9 },
  { slug: 'item_especial', name: 'Item especial', tipo: 'visual', camada: 70, posicao: 10 },
];

const ITENS = [];
let seq = 0;
function add(categoria, slug, name, desenhar, extra = {}) {
  seq += 1;
  ITENS.push({ categoria, slug, name, asset: item(desenhar), posicao: extra.posicao ?? seq, raridade: extra.raridade });
}
function addCor(categoria, slug, name, cor, extra = {}) {
  seq += 1;
  ITENS.push({ categoria, slug, name, asset: cor, posicao: extra.posicao ?? seq, raridade: extra.raridade });
}

// ---------- corpo: 3 físicos ----------
add('corpo', 'magro', 'Magro', corpoBase(3, 2));
add('corpo', 'medio', 'Médio', corpoBase(4, 2));
add('corpo', 'robusto', 'Robusto', corpoBase(5, 3));

// ---------- tom de pele ----------
addCor('tom_pele', 'clara', 'Clara', '#f2c9a0');
addCor('tom_pele', 'media', 'Média', '#e0a978');
addCor('tom_pele', 'dourada', 'Dourada', '#d9a066');
addCor('tom_pele', 'morena', 'Morena', '#b97a4a');
addCor('tom_pele', 'escura', 'Escura', '#7a4a2b');
addCor('tom_pele', 'bem_escura', 'Bem escura', '#4a2e1c');
addCor('tom_pele', 'verde', 'Verde (edição bonde)', '#7bc47f', { raridade: 'raro' });

// ---------- olhos (desenhados sem contorno próprio — já ficam sobre a
// cabeça, que tem contorno; olho com contorno duplo ia sujar o rosto) ----------
function olhoSimples(desenhar) {
  return (grade) => desenhar(grade);
}
add('olhos', 'tranquilo', 'Tranquilo', olhoSimples((g) => {
  px(g, 6, 7, PRETO); px(g, 7, 7, PRETO);
  espelhar(g);
}), {});
add('olhos', 'grande', 'Grande e atento', olhoSimples((g) => {
  ret(g, 5, 6, 2, 2, PRETO);
  espelhar(g);
}));
add('olhos', 'feliz', 'Feliz (fechadinho)', olhoSimples((g) => {
  px(g, 5, 7, PRETO); px(g, 6, 6, PRETO); px(g, 7, 7, PRETO);
  espelhar(g);
}));
add('olhos', 'serio', 'Sério', olhoSimples((g) => {
  ret(g, 5, 7, 3, 1, PRETO);
  ret(g, 5, 6, 1, 1, PRETO);
  espelhar(g);
}));
add('olhos', 'brilhante', 'Brilhante', olhoSimples((g) => {
  ret(g, 5, 6, 2, 2, PRETO);
  px(g, 6, 6, '#f4f1ea');
  espelhar(g);
}));
add('olhos', 'sonolento', 'Sonolento (vermelhinho)', olhoSimples((g) => {
  ret(g, 5, 7, 2, 1, PRETO);
  px(g, 5, 8, '#e0393e');
  espelhar(g);
}));
add('olhos', 'coracao', 'Apaixonado', olhoSimples((g) => {
  px(g, 5, 6, '#f0555a'); px(g, 7, 6, '#f0555a');
  px(g, 6, 7, '#f0555a');
  espelhar(g);
}), { raridade: 'raro' });

// ---------- barba (sobre o queixo, embaixo da boca) ----------
// peças pequenas ficam dominadas pelo próprio contorno se forem pequenas
// demais (o contorno automático come quase toda a área) — por isso essas
// são um pouco maiores do que pareceria necessário para uma barba.
add('barba', 'cavanhaque', 'Cavanhaque', (g) => {
  ret(g, 7, 11, 4, 3, '#241a15');
});
add('barba', 'cheia', 'Cheia', (g) => {
  ret(g, 4, 9, 4, 4, '#241a15');
  ret(g, 7, 11, 4, 3, '#241a15');
  espelhar(g);
});
add('barba', 'cavanhaque_ruivo', 'Cavanhaque ruivo', (g) => {
  ret(g, 7, 11, 4, 3, '#a5502a');
});
add('barba', 'grisalha', 'Grisalha', (g) => {
  ret(g, 4, 9, 4, 4, '#c9c4bd');
  ret(g, 7, 11, 4, 3, '#c9c4bd');
  espelhar(g);
});
add('barba', 'bigode', 'Bigode', (g) => {
  ret(g, 6, 9, 3, 2, '#241a15');
  espelhar(g);
});

// ---------- cor do cabelo (separada do estilo, mesmo esquema do tom de
// pele — assim 10 estilos x 7 cores já são 70 combinações só nessa dupla) ----------
addCor('cor_cabelo', 'preto', 'Preto', '#241a15');
addCor('cor_cabelo', 'castanho', 'Castanho', '#5b3a24');
addCor('cor_cabelo', 'loiro', 'Loiro', '#e8c873');
addCor('cor_cabelo', 'ruivo', 'Ruivo', '#c2622f');
addCor('cor_cabelo', 'grisalho', 'Grisalho', '#c9c4bd');
addCor('cor_cabelo', 'verde', 'Verde', '#5ede7c', { raridade: 'raro' });
addCor('cor_cabelo', 'rosa', 'Rosa', '#f472b6', { raridade: 'raro' });
addCor('cor_cabelo', 'azul', 'Azul', '#5aa9f8', { raridade: 'raro' });
addCor('cor_cabelo', 'roxo', 'Roxo', '#a78bfa', { raridade: 'raro' });

// ---------- cabelo (10 estilos, cor própria via {{cabelo}}) ----------
//
// Regra de silhueta pra não estourar por cima da cabeça nem tapar o rosto:
// a "touca" de cabelo (linhas cheias, de orelha a orelha) só pinta até a
// linha 4 — a cabeça (círculo cy=7 r=6.4) só começa a ficar larga de
// verdade a partir da linha 5, e os olhos moram na linha 7. Costeleta é
// sempre uma tira fina do lado de fora (x 2–4), nunca uma linha cheia, pra
// não cobrir o rosto por baixo da linha 4.
function costeleta(g, y0, altura, cor = CABELO) {
  ret(g, 3, y0, 2, altura, cor);
}

add('cabelo', 'curto', 'Curto', (g) => {
  touca(g, [[0, 2], [1, 4], [2, 5.5], [3, 6.4], [4, 6.6]], CABELO);
  costeleta(g, 5, 3);
  espelhar(g);
});
add('cabelo', 'moicano', 'Moicano', (g) => {
  ret(g, 9, -2, 2, 8, CABELO);
  ret(g, 8, 5, 1, 1, CABELO_SOMBRA);
  espelhar(g);
});
add('cabelo', 'afro', 'Black power', (g) => {
  touca(g, [[-2, 5], [-1, 7], [0, 8.5], [1, 9], [2, 9], [3, 8.6], [4, 8]], CABELO);
  espelhar(g);
});
add('cabelo', 'longo_liso', 'Longo liso', (g) => {
  touca(g, [[0, 2], [1, 4], [2, 5.5], [3, 6.4], [4, 6.6]], CABELO);
  ret(g, 2, 5, 2, 15, CABELO);
  ret(g, 3, 5, 1, 8, CABELO_SOMBRA);
  espelhar(g);
});
add('cabelo', 'topete', 'Topete', (g) => {
  touca(g, [[0, 3.4], [1, 3.2], [2, 2.6]], CABELO);
  costeleta(g, 3, 5);
  espelhar(g);
});
add('cabelo', 'trancas', 'Tranças', (g) => {
  touca(g, [[0, 2], [1, 4], [2, 5.5], [3, 6.4], [4, 6.6]], CABELO);
  ret(g, 1, 5, 2, 17, CABELO);
  ret(g, 2, 5, 1, 17, CABELO_SOMBRA);
  espelhar(g);
});
add('cabelo', 'careca', 'Careca', (g) => {
  ret(g, 5, 5, 1, 1, PELE_SOMBRA);
  espelhar(g);
});
add('cabelo', 'coque', 'Coque', (g) => {
  touca(g, [[0, 2], [1, 4], [2, 5.5], [3, 6.4], [4, 6.6]], CABELO);
  costeleta(g, 5, 3);
  circulo(g, 9.5, -1, 2.2, CABELO);
  espelhar(g);
});
add('cabelo', 'espetado', 'Espetado', (g) => {
  touca(g, [[2, 5], [3, 6]], CABELO);
  diagonal(g, 6, 2, 4, -2, CABELO, 2);
  diagonal(g, 9, 1, 9, -3, CABELO, 2);
  espelhar(g);
});
add('cabelo', 'ondulado', 'Ondulado', (g) => {
  touca(g, [[0, 2], [1, 4], [2, 5.7], [3, 6.6], [4, 6.8]], CABELO);
  costeleta(g, 5, 4);
  px(g, 2, 9, CABELO); px(g, 1, 10, CABELO);
  espelhar(g);
});

// ---------- roupa (10 estilos) ----------
function camisa(cor, sombra, mangaLonga) {
  return (g) => {
    ret(g, 6, 14, 4, 8, cor);
    ret(g, 6, 21, 4, 1, sombra);
    ret(g, mangaLonga ? 3 : 4, 16, mangaLonga ? 3 : 2, mangaLonga ? 6 : 3, cor);
    espelhar(g);
  };
}
add('roupa', 'camiseta_branca', 'Camiseta branca', camisa('#f2f7f4', '#c9d2cc', false));
add('roupa', 'camiseta_verde', 'Camiseta verde', camisa('#2fae62', '#227d47', false));
add('roupa', 'camiseta_preta', 'Camiseta preta', camisa('#232323', '#141414', false));
add('roupa', 'regata', 'Regata', (g) => {
  ret(g, 6, 14, 4, 8, '#f0555a');
  ret(g, 6, 21, 4, 1, '#c23a3f');
  espelhar(g);
});
add('roupa', 'moletom_cinza', 'Moletom com capuz', (g) => {
  ret(g, 6, 13, 4, 9, '#5a6470');
  ret(g, 3, 15, 3, 7, '#5a6470');
  ret(g, 8, 12, 2, 2, '#3f4750');
  espelhar(g);
});
add('roupa', 'jaqueta_jeans', 'Jaqueta jeans', (g) => {
  ret(g, 6, 14, 4, 8, '#4a6fa5');
  ret(g, 3, 16, 3, 6, '#4a6fa5');
  linhaV(g, 9, 14, 8, '#2f4a75');
  espelhar(g);
});
add('roupa', 'jaqueta_bomber', 'Bomber preta', (g) => {
  ret(g, 6, 14, 4, 7, '#1c1c1c');
  ret(g, 6, 21, 4, 1, '#000');
  ret(g, 3, 16, 3, 6, '#1c1c1c');
  ret(g, 6, 13, 4, 1, '#e0393e');
  espelhar(g);
});
add('roupa', 'colete', 'Colete xadrez', (g) => {
  ret(g, 6, 14, 4, 8, '#7a4a2b');
  ret(g, 4, 16, 2, 6, PELE); // braço fica de fora
  px(g, 7, 16, '#5b3a24'); px(g, 8, 18, '#5b3a24');
  espelhar(g);
});
add('roupa', 'estampa_folha', 'Estampa de folha', (g) => {
  ret(g, 6, 14, 4, 8, '#161f1a');
  ret(g, 4, 16, 2, 3, '#161f1a');
  ret(g, 8, 16, 2, 3, '#5ede7c');
  px(g, 9, 15, '#5ede7c'); px(g, 8, 18, '#5ede7c');
  espelhar(g);
});
add('roupa', 'terno', 'Terno', (g) => {
  ret(g, 6, 14, 4, 8, '#232838');
  ret(g, 3, 16, 3, 6, '#232838');
  ret(g, 8, 14, 2, 6, '#f2f7f4');
  linhaV(g, 9, 14, 6, '#c23a3f');
  espelhar(g);
}, { raridade: 'raro' });

// ---------- chapéus e bonés (8 estilos, desenhados por cima do cabelo) ----------
// mesma lógica do cabelo: a touca desce até a linha 4 SEMPRE cheia (sem
// nenhum pedaço isolado/flutuante) — um retângulo solto dentro da grade do
// item vira contorno preto nas bordas dele mesmo, e esse contorno cobre o
// que tiver por baixo (cabelo) numa faixa inteira. Detalhe de aba/sombra
// só é seguro se estiver DENTRO da área já pintada, nunca fora dela.
function bandaBone(cor, corSombra) {
  return (g) => {
    touca(g, [[-1, 4], [0, 5.5], [1, 6.6], [2, 7], [3, 7.1], [4, 7.1]], cor);
    ret(g, 9, 4, 2, 1, corSombra);
    espelhar(g);
  };
}
add('chapeu', 'bone_verde', 'Boné verde', bandaBone('#2fae62', '#227d47'));
add('chapeu', 'bone_preto', 'Boné preto', bandaBone('#1a1a1a', '#000'));
add('chapeu', 'bone_lado', 'Boné de lado', (g) => {
  touca(g, [[-1, 4], [0, 5.5], [1, 6.6], [2, 7], [3, 7.1], [4, 7.1]], '#c22c31');
  ret(g, 1, 3, 3, 3, '#8f1f24'); // aba de lado, saindo pela lateral já coberta
  espelhar(g);
}, { raridade: 'raro' });
add('chapeu', 'gorro', 'Gorro', (g) => {
  touca(g, [[-2, 3], [-1, 5.5], [0, 6.8], [1, 7.2], [2, 7.3], [3, 7.3], [4, 7.3]], '#c22c31');
  ret(g, 9, 4, 2, 1, '#8f1f24');
  circulo(g, 9.5, -3, 1.6, '#f2f7f4');
  espelhar(g);
});
add('chapeu', 'chapeu_praia', 'Chapéu de palha', (g) => {
  touca(g, [[-1, 8.5], [0, 9.5], [1, 9.5], [2, 4]], '#d9a066');
  touca(g, [[-2, 3.4], [-1, 5]], '#e0b57e');
  espelhar(g);
});
add('chapeu', 'cartola', 'Cartola', (g) => {
  ret(g, 4, -2, 12, 8, '#151515');
  ret(g, 1, 4, 18, 2, '#151515');
  ret(g, 4, 4, 12, 1, '#c22c31');
}, { raridade: 'epico' });
add('chapeu', 'coroa', 'Coroa', (g) => {
  ret(g, 3, 2, 14, 3, '#f3c24d');
  px(g, 3, 0, '#f3c24d'); px(g, 8, -1, '#f3c24d'); px(g, 11, -1, '#f3c24d');
  espelhar(g);
}, { raridade: 'lendario' });
add('chapeu', 'headset', 'Headset', (g) => {
  ret(g, 3, 3, 1, 6, '#232323');
  ret(g, 2, 5, 3, 3, '#e0393e');
  espelhar(g);
});

// ---------- acessórios (10 — óculos, máscaras, joias, itens temáticos) ----------
add('acessorio', 'oculos_sol', 'Óculos de sol', (g) => {
  ret(g, 4, 6, 3, 2, '#111');
  ret(g, 9, 6, 1, 1, '#111');
  espelhar(g);
}, {});
add('acessorio', 'oculos_redondo', 'Óculos redondo', (g) => {
  ret(g, 4, 6, 3, 2, PRETO);
  px(g, 5, 7, '#5aa9f8');
  espelhar(g);
});
add('acessorio', 'mascara_cirurgica', 'Máscara', (g) => {
  ret(g, 5, 9, 4, 3, '#f2f7f4');
  espelhar(g);
});
add('acessorio', 'mascara_caveira', 'Máscara caveira', (g) => {
  ret(g, 4, 8, 5, 5, '#f2f7f4');
  px(g, 5, 9, PRETO); px(g, 7, 9, PRETO);
  espelhar(g);
}, { raridade: 'epico' });
add('acessorio', 'corrente_prata', 'Corrente de prata', (g) => {
  ret(g, 8, 13, 4, 1, '#c7ced4');
  px(g, 9, 14, '#c7ced4');
  espelhar(g);
});
add('acessorio', 'corrente_ouro', 'Corrente de ouro', (g) => {
  ret(g, 7, 13, 6, 1, '#f3c24d');
  ret(g, 8, 14, 4, 1, '#f3c24d');
  espelhar(g);
}, { raridade: 'raro' });
add('acessorio', 'brinco', 'Brinco de argola', (g) => {
  px(g, 3, 9, '#f3c24d'); px(g, 3, 10, '#f3c24d');
  espelhar(g);
});
add('acessorio', 'cigarro_de_erva', 'Beck aceso', (g) => {
  diagonal(g, 5, 10, 2, 12, '#f2f7f4', 1);
  px(g, 1, 12, '#e0393e');
}, { raridade: 'raro' });
add('acessorio', 'cachimbo', 'Cachimbo', (g) => {
  diagonal(g, 5, 11, 3, 12, '#5b3a24', 1);
  ret(g, 1, 11, 2, 2, '#5b3a24');
}, { raridade: 'raro' });
add('acessorio', 'bandana', 'Bandana', (g) => {
  ret(g, 3, 4, 14, 2, '#c22c31');
  px(g, 2, 6, '#c22c31'); px(g, 17, 6, '#c22c31');
});

// ---------- item especial (6 — asas, aura, bicho de estimação, item
// flutuante — sempre por cima, alguns atrás do corpo) ----------
// as asas ficam dentro da própria grade (0–19) — nada de coordenada
// negativa, porque a grade não "vaza" pra fora e vira sliver cortado.
// Desenhadas por linhas de largura decrescente (igual "touca", mas sem
// espelhar dentro da linha) pra dar o afunilado de ponta de asa.
add('item_especial', 'asas_anjo', 'Asas de anjo', (g) => {
  ret(g, 0, 13, 3, 1, '#f2f7f4');
  ret(g, 0, 14, 4, 2, '#f2f7f4');
  ret(g, 1, 16, 3, 2, '#e3ded4');
  ret(g, 1, 18, 2, 2, '#e3ded4');
  ret(g, 2, 20, 1, 2, '#c9c2b6');
  espelhar(g);
}, { raridade: 'raro' });
add('item_especial', 'asas_dragao', 'Asas de dragão', (g) => {
  ret(g, 0, 13, 4, 2, '#8a2530');
  ret(g, 0, 15, 3, 2, '#8a2530');
  ret(g, 1, 17, 2, 2, '#5c1720');
  ret(g, 0, 15, 1, 1, '#5c1720');
  ret(g, 1, 19, 1, 2, '#5c1720');
  espelhar(g);
}, { raridade: 'epico' });
add('item_especial', 'aura_verde', 'Aura', (g) => {
  for (let j = 0; j < A; j += 3) { px(g, 0, j, '#5ede7c'); }
  espelhar(g);
}, { raridade: 'raro' });
add('item_especial', 'gato', 'Gato de estimação', (g) => {
  ret(g, 15, 25, 4, 3, '#4a4a4a');
  circulo(g, 18, 23, 2, '#4a4a4a');
  px(g, 17, 21, '#4a4a4a'); px(g, 19, 21, '#4a4a4a');
}, { raridade: 'raro' });
add('item_especial', 'estrela_flutuante', 'Estrela flutuante', (g) => {
  px(g, 16, 2, '#f3c24d'); ret(g, 15, 3, 3, 1, '#f3c24d'); px(g, 16, 4, '#f3c24d');
}, { raridade: 'raro' });
add('item_especial', 'folha_flutuante', 'Folhinha flutuante', (g) => {
  circulo(g, 16, 3, 2, '#5ede7c');
  px(g, 16, 5, '#3d8a52');
}, { raridade: 'raro' });

module.exports = { CATEGORIAS, ITENS };
