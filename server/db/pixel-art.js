// Kit de desenho pra pixel art de verdade — não é vetor suave, é uma GRADE
// de pixels (20 larg. x 32 alt.) que vira <rect> no final. Cada função pinta
// pixels na grade; no fim, `contorno()` desenha 1px preto em volta da
// silhueta e `paraSvg()` comprime cada linha em retângulos (RLE), então um
// item com bastante área ainda gera pouco HTML.
//
// Por que grade em vez de formas soltas tipo o catálogo antigo: pixel art
// de verdade não tem curva suave, opacidade fracionada ou canto arredondado
// — é o pixel inteiro pintado ou não. Desenhar numa grade força esse
// resultado por construção, em vez de depender de "lembrar" de não usar
// rx/opacity toda vez.
//
// {{pele}} e {{pele_sombra}} são tokens de texto — ficam gravados no SVG
// igual qualquer cor e só viram cor de verdade depois, no cliente
// (montarPersonagemSvg), trocados pelo tom de pele escolhido (e sua sombra,
// calculada na hora). O mesmo pro cabelo: {{cabelo}}/{{cabelo_sombra}}
// quando o item quiser respeitar a cor de cabelo escolhida em vez de ter
// cor fixa.

const L = 20; // largura da grade, em "pixels"
const A = 32; // altura da grade, em "pixels"

const PRETO = '#1c1512'; // contorno — preto meio amarronzado, mais "pixel art" que #000 puro

function novaGrade() {
  return Array.from({ length: A }, () => new Array(L).fill(null));
}

function dentro(x, y) {
  return x >= 0 && x < L && y >= 0 && y < A;
}

function ret(grade, x, y, w, h, cor) {
  for (let j = Math.max(0, y); j < Math.min(A, y + h); j++) {
    for (let i = Math.max(0, x); i < Math.min(L, x + w); i++) grade[j][i] = cor;
  }
  return grade;
}

function px(grade, x, y, cor) {
  if (dentro(x, y)) grade[y][x] = cor;
  return grade;
}

// "círculo" pixelizado — por distância ao centro, então sai serrilhado de
// propósito (é o visual certo pra baixa resolução, não um bug).
function circulo(grade, cx, cy, r, cor) {
  const r2 = r * r;
  for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) {
    for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
      if (!dentro(i, j)) continue;
      const dx = i - cx + 0.5;
      const dy = j - cy + 0.5;
      if (dx * dx + dy * dy <= r2) grade[j][i] = cor;
    }
  }
  return grade;
}

// meio-círculo (só a parte de cima, ou só a de baixo) — útil pra topo de
// cabelo, viseira de boné etc.
function meioCirculo(grade, cx, cy, r, cor, lado = 'cima') {
  const r2 = r * r;
  for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) {
    if (lado === 'cima' && j > cy) continue;
    if (lado === 'baixo' && j < cy) continue;
    for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
      if (!dentro(i, j)) continue;
      const dx = i - cx + 0.5;
      const dy = j - cy + 0.5;
      if (dx * dx + dy * dy <= r2) grade[j][i] = cor;
    }
  }
  return grade;
}

function linhaH(grade, x, y, w, cor) {
  return ret(grade, x, y, w, 1, cor);
}
function linhaV(grade, x, y, h, cor) {
  return ret(grade, x, y, 1, h, cor);
}

// diagonal simples (Bresenham básico) — pra franjas, correntes, rachaduras
function diagonal(grade, x0, y0, x1, y1, cor, espessura = 1) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (let guard = 0; guard < 200; guard++) {
    for (let e = 0; e < espessura; e++) px(grade, x + e, y, cor);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return grade;
}

// preenche uma "touca" por linhas explícitas: cada entrada é
// [y, meiaLargura] contada a partir do centro (9.5) — dá controle fino de
// silhueta pra cabelo/chapéu, coisa que um círculo sozinho não dá (vira
// bloco largo demais rápido se o raio for grande). Sempre simétrico.
function touca(grade, linhas, cor) {
  for (const [y, meiaLargura] of linhas) {
    const largura = Math.round(meiaLargura * 2);
    ret(grade, 10 - Math.round(meiaLargura), y, largura, 1, cor);
  }
  return grade;
}

// espelha a metade esquerda (colunas 0..L/2-1) pra direita — a maioria dos
// sprites olhando de frente é simétrica, então desenhar só um lado poupa
// metade do trabalho e garante simetria perfeita.
function espelhar(grade) {
  const meio = L / 2;
  for (let j = 0; j < A; j++) {
    for (let i = 0; i < meio; i++) grade[j][L - 1 - i] = grade[j][i];
  }
  return grade;
}

// contorno automático: 1px escuro em qualquer pixel vazio que encoste (nas
// 4 direções, e nas diagonais pra não deixar buraco no canto) num pixel
// pintado. É isso que dá a cara de "sprite recortado" da pixel art.
function contorno(grade, cor = PRETO) {
  const original = grade.map((linha) => linha.slice());
  const viz = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  for (let j = 0; j < A; j++) {
    for (let i = 0; i < L; i++) {
      if (original[j][i]) continue;
      const encosta = viz.some(([dx, dy]) => {
        const x = i + dx, y = j + dy;
        return dentro(x, y) && original[y][x];
      });
      if (encosta) grade[j][i] = cor;
    }
  }
  return grade;
}

// grade -> SVG, comprimindo cada linha em retângulos (RLE horizontal).
function paraSvg(grade) {
  const partes = [];
  for (let j = 0; j < A; j++) {
    let i = 0;
    while (i < L) {
      const cor = grade[j][i];
      if (!cor) { i++; continue; }
      let k = i + 1;
      while (k < L && grade[j][k] === cor) k++;
      partes.push(`<rect x="${i}" y="${j}" width="${k - i}" height="1" fill="${cor}"/>`);
      i = k;
    }
  }
  return partes.join('');
}

// monta um item inteiro: recebe uma função que pinta na grade, aplica
// contorno automático e devolve o SVG já pronto.
function item(desenhar, { semContorno = false, corContorno = PRETO } = {}) {
  const grade = novaGrade();
  desenhar(grade);
  if (!semContorno) contorno(grade, corContorno);
  return paraSvg(grade);
}

module.exports = {
  L, A, PRETO,
  novaGrade, ret, px, circulo, meioCirculo, linhaH, linhaV, diagonal, touca,
  espelhar, contorno, paraSvg, item,
};
