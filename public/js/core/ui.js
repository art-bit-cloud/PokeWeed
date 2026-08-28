// Peças soltas usadas por todas as telas: montar elemento, escapar texto,
// avatar, "há quanto tempo", avisinho e modal.

import { montarPersonagemSvg, temPersonagem } from './personagem.js';

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

// Transforma uma string de HTML num elemento de verdade.
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html).trim();
  return t.content.firstElementChild;
}

export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Deixa quebras de linha e transforma link solto em link clicável.
export function textoRico(valor) {
  return esc(valor)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br />');
}

export function quando(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return 'agora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} d`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function dataLonga(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Avatar: personagem (se a pessoa já criou um), senão foto, senão um
// círculo com a inicial. Quem nunca abriu "Meu personagem" não percebe
// diferença nenhuma — continua vendo exatamente o de sempre.
export function avatar(user, tamanho = 32, opcoes = {}) {
  const classe = `avatar av-${tamanho}${opcoes.classe ? ' ' + opcoes.classe : ''}`;
  const nome = esc(user?.username || '?');

  if (temPersonagem(user?.character)) {
    const svg = montarPersonagemSvg(user.character, { modo: 'mini' });
    if (svg) return `<span class="${classe} personagem" role="img" aria-label="${nome}">${svg}</span>`;
  }

  if (user?.avatarPath) {
    return `<img class="${classe}" src="${esc(user.avatarPath)}" alt="${nome}" loading="lazy" />`;
  }
  const letra = esc((user?.username || '?').trim().charAt(0) || '?');
  const cor = user?.accent ? ` style="background:${esc(user.accent)}"` : '';
  return `<span class="${classe} letra"${cor}>${letra}</span>`;
}

// Avisinho no rodapé. tipo: 'ok' | 'erro' | ''
let avisoTimer = null;
export function aviso(mensagem, tipo = '') {
  document.querySelector('.aviso')?.remove();
  const node = el(`<div class="aviso ${tipo}">${esc(mensagem)}</div>`);
  document.body.appendChild(node);
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => node.remove(), 2600);
}

// Modal de baixo pra cima. Devolve o elemento e uma função pra fechar.
export function modal({ titulo, sub, corpo, aoFechar }) {
  const node = el(`
    <div class="modal">
      <div class="modal-caixa">
        <div class="modal-alca"></div>
        ${titulo ? `<h2 class="modal-titulo">${esc(titulo)}</h2>` : ''}
        ${sub ? `<p class="modal-sub">${esc(sub)}</p>` : ''}
        <div class="modal-conteudo"></div>
      </div>
    </div>
  `);
  node.querySelector('.modal-conteudo').append(corpo);

  const fechar = () => {
    node.remove();
    document.body.classList.remove('travado');
    document.removeEventListener('keydown', aoTeclar);
    if (aoFechar) aoFechar();
  };
  const aoTeclar = (e) => { if (e.key === 'Escape') fechar(); };

  node.addEventListener('click', (e) => { if (e.target === node) fechar(); });
  document.addEventListener('keydown', aoTeclar);
  document.body.appendChild(node);
  document.body.classList.add('travado');

  return { node, fechar };
}

export function confirmar({ titulo, mensagem, botao = 'Confirmar', perigo = true }) {
  return new Promise((resolve) => {
    const corpo = el(`
      <div>
        <p class="dim" style="font-size:14px;line-height:1.55;margin-bottom:18px">${esc(mensagem)}</p>
        <div class="flex g8">
          <button class="btn btn-fantasma crescer" data-nao>Cancelar</button>
          <button class="btn ${perigo ? 'btn-perigo' : 'btn-principal'} crescer" data-sim>${esc(botao)}</button>
        </div>
      </div>
    `);
    let respondido = false;
    const m = modal({ titulo, corpo, aoFechar: () => { if (!respondido) resolve(false); } });
    corpo.querySelector('[data-nao]').onclick = () => { respondido = true; m.fechar(); resolve(false); };
    corpo.querySelector('[data-sim]').onclick = () => { respondido = true; m.fechar(); resolve(true); };
  });
}

// Estado vazio padronizado.
export function vazio({ emoji = '🌿', titulo, texto, acao }) {
  return `
    <div class="vazio">
      <div class="emoji">${emoji}</div>
      <h3>${esc(titulo)}</h3>
      ${texto ? `<p>${esc(texto)}</p>` : ''}
      ${acao || ''}
    </div>
  `;
}

export function esqueletos(n = 3) {
  return Array.from({ length: n }, () => '<div class="esqueleto esqueleto-card"></div>').join('');
}

// Pega um quadro do vídeo escolhido pra servir de capa. Sem isso o card do
// vídeo enviado fica um retângulo preto na listagem.
export function capaDoVideo(arquivo, { largura = 640, segundo = 1 } = {}) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;

    const desistir = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    const prazo = setTimeout(desistir, 6000);

    v.onerror = desistir;
    v.onloadedmetadata = () => {
      // um pouco depois do início, pra não pegar um quadro preto de abertura
      v.currentTime = Math.min(segundo, Math.max(0, (v.duration || 1) / 3));
    };
    v.onseeked = () => {
      clearTimeout(prazo);
      try {
        const escala = Math.min(1, largura / (v.videoWidth || largura));
        const c = document.createElement('canvas');
        c.width = Math.round((v.videoWidth || largura) * escala);
        c.height = Math.round((v.videoHeight || largura * 0.5625) * escala);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.75));
      } catch {
        desistir();
      }
    };
    v.src = url;
  });
}

// Lê um arquivo de imagem, corta e reduz antes de enviar (nada de mandar 8MB
// de foto pro servidor). `proporcao` = largura/altura desejada.
export function imagemParaDataUrl(arquivo, { largura = 900, proporcao = null, qualidade = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não consegui ler esse arquivo.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Esse arquivo não é uma imagem válida.'));
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;

        if (proporcao) {
          const atual = img.width / img.height;
          if (atual > proporcao) {
            sw = img.height * proporcao;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / proporcao;
            sy = (img.height - sh) / 2;
          }
        }

        const escala = Math.min(1, largura / sw);
        const c = document.createElement('canvas');
        c.width = Math.round(sw * escala);
        c.height = Math.round(sh * escala);
        c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', qualidade));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}
