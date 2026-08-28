// O card de tópico, usado no fórum, na seção, na comunidade, na busca e no
// perfil. Um lugar só pra mexer quando quiser mudar a cara da listagem.

import { esc, avatar, quando } from './ui.js';

function selo(t) {
  if (t.pinned) return '<span class="chip ouro">📌 fixado</span>';
  if (t.solved) return '<span class="chip verde">✓ resolvido</span>';
  return '';
}

function midia(t) {
  if (t.kind === 'captura' && t.photoPath) {
    return `
      <div class="topico-midia">
        <img src="${esc(t.photoPath)}" alt="${esc(t.title)}" loading="lazy" />
        <span class="midia-etiqueta">${esc(t.category || 'Captura')}${t.quantity ? ' · ' + esc(t.quantity) : ''}</span>
      </div>
    `;
  }
  if (t.kind === 'video') {
    // se a capa não carregar (link externo bloqueado, imagem sumida), cai num
    // fundo liso em vez de mostrar imagem quebrada
    const reserva = '<div style="aspect-ratio:16/9;background:linear-gradient(140deg,#22302a,#0f1512)"></div>';
    const capa = t.videoThumb
      ? `<img src="${esc(t.videoThumb)}" alt="" loading="lazy"
              onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'aspect-ratio:16/9;background:linear-gradient(140deg,#22302a,#0f1512)'}))" />`
      : reserva;
    return `
      <div class="topico-midia video-capa">
        ${capa}
        <div class="topico-play"><span class="bt">▶</span></div>
        <span class="midia-etiqueta">🎥 ${t.videoPath ? 'vídeo' : 'YouTube'}</span>
      </div>
    `;
  }
  return '';
}

function nota(t) {
  if (t.kind !== 'captura') return '';
  const media = t.avgOverall !== null ? t.avgOverall.toFixed(1) : '—';
  return `<span class="acao acao-nota">⭐ ${media}<span class="muted" style="font-weight:600"> (${t.ratingCount})</span></span>`;
}

export function cardTopico(t, { mostrarSecao = true } = {}) {
  const autor = { username: t.username, avatarPath: t.avatarPath, accent: t.accent, character: t.character };
  return `
    <article class="topico-card${t.pinned ? ' fixado' : ''}" data-topico="${t.id}">
      <div class="topico-topo">
        <button class="flex meio g6" data-acao="perfil" data-user="${esc(t.username)}"
                style="background:none;border:none;padding:0;color:inherit;font:inherit">
          ${avatar(autor, 24)}
          <span class="autor">${esc(t.username)}</span>
        </button>
        <span class="ponto">·</span>
        <span>${quando(t.createdAt)}</span>
        ${mostrarSecao ? `<span class="ponto">·</span><span>${t.sectionEmoji} ${esc(t.sectionName)}</span>` : ''}
        ${selo(t) ? `<span style="margin-left:auto">${selo(t)}</span>` : ''}
      </div>

      <button class="topico-corpo" data-acao="abrir-topico" data-id="${t.id}"
              style="background:none;border:none;width:100%;text-align:left;color:inherit;font:inherit;display:block">
        <h3 class="topico-titulo">${esc(t.title)}</h3>
        ${t.body ? `<p class="topico-resumo cortar-2">${esc(t.body)}</p>` : ''}
      </button>

      ${midia(t) ? `<button data-acao="abrir-topico" data-id="${t.id}" style="background:none;border:none;padding:0;width:100%;display:block">${midia(t)}</button>` : ''}

      <div class="topico-rodape">
        <button class="acao${t.liked ? ' curtido' : ''}" data-acao="curtir" data-id="${t.id}">
          <span class="ic">${t.liked ? '❤️' : '🤍'}</span><span data-curtidas="${t.id}">${t.likeCount}</span>
        </button>
        <button class="acao" data-acao="abrir-topico" data-id="${t.id}">
          <span class="ic">💬</span>${t.replyCount}
        </button>
        ${nota(t)}
      </div>
    </article>
  `;
}

export function listaDeTopicos(lista, opcoes) {
  return lista.map((t) => cardTopico(t, opcoes)).join('');
}
