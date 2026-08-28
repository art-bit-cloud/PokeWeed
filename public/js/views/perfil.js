// Perfil de alguém: banner, avatar, bio, cor de destaque, música e o que a
// pessoa já postou. Cada um monta o seu do jeito que quiser.

import { api } from '../core/api.js';
import { el, esc, avatar, dataLonga, esqueletos, vazio, modal } from '../core/ui.js';
import { store } from '../core/store.js';
import { listaDeTopicos } from '../core/cards.js';
import { temPersonagem, montarPersonagemSvg } from '../core/personagem.js';

function blocoMusica(p) {
  if (!p.musicEmbed) return '';
  const nome = p.musicTitle || (p.musicProvider === 'spotify' ? 'Música no Spotify' : 'Música no YouTube');
  return `
    <div class="musica" id="musica">
      <div class="disco">${p.musicProvider === 'spotify' ? '🎧' : '🎵'}</div>
      <div class="info">
        <div class="rotulo">Tocando no perfil</div>
        <div class="nome">${esc(nome)}</div>
      </div>
      <button class="play" id="bt-tocar" title="Tocar">▶</button>
    </div>
    <div class="musica-frame oculto" id="frame-musica"></div>
  `;
}

export async function render({ username }) {
  const node = el(`<div class="conteudo sem-padding" id="raiz"><div style="padding:14px">${esqueletos(3)}</div></div>`);

  let dados;
  try {
    dados = await api.get(`/api/perfil/${encodeURIComponent(username)}`);
  } catch (err) {
    node.innerHTML = `<div style="padding:14px">${vazio({ emoji: '👻', titulo: 'Perfil não encontrado', texto: err.message })}</div>`;
    return { node, titulo: 'Perfil', voltar: true };
  }

  const { perfil: p, ehMeu, capturas, topicos, respostas } = dados;
  const acento = p.accent || '#57e08a';
  const temPj = temPersonagem(p.character);

  const bannerEstilo = p.bannerPath
    ? `background-image:url('${esc(p.bannerPath)}')`
    : `background:linear-gradient(140deg, ${esc(acento)}, #1a241f)`;

  node.innerHTML = `
    <div style="--accent:${esc(acento)};--accent-soft:${esc(acento)}22">
      <div class="perfil-banner" style="${bannerEstilo}"></div>

      <div class="perfil-cabeca">
        <div class="perfil-avatar-caixa">
          <button type="button" class="perfil-avatar-btn" data-ver-personagem
                  style="background:none;border:none;padding:0;display:block${temPj ? ';cursor:pointer' : ''}">
            ${avatar(p, 88, { classe: 'perfil-avatar' })}
          </button>
          <div class="flex g6">
            ${
              ehMeu
                ? `<button class="btn btn-fantasma btn-pequeno" data-acao="ir" data-para="/perfil/editar">Editar perfil</button>
                   <button class="btn btn-fantasma btn-pequeno" data-acao="ir" data-para="/personagem">🎨 Personagem</button>`
                : ''
            }
          </div>
        </div>

        <h1 class="perfil-nome">${esc(p.username)}</h1>
        ${p.status ? `<div class="perfil-status">${esc(p.status)}</div>` : ''}
        ${p.bio ? `<div class="perfil-bio">${esc(p.bio)}</div>` : ''}

        <div class="perfil-meta">
          <span>📅 no bonde desde ${dataLonga(p.createdAt)}</span>
        </div>

        ${blocoMusica(p)}

        <div class="perfil-numeros">
          <div class="perfil-numero"><b>${p.stats.capturas}</b><span>capturas</span></div>
          <div class="perfil-numero"><b>${p.stats.topicos}</b><span>tópicos</span></div>
          <div class="perfil-numero"><b>${p.stats.respostas}</b><span>respostas</span></div>
          <div class="perfil-numero">
            <b>${p.stats.notaMedia !== null ? p.stats.notaMedia.toFixed(1) : '—'}</b><span>nota média</span>
          </div>
        </div>
      </div>

      <div style="padding:0 14px 14px">
        <div class="abas">
          <button class="aba ativa" data-p="capturas">Capturas</button>
          <button class="aba" data-p="topicos">Tópicos</button>
          <button class="aba" data-p="respostas">Respostas</button>
        </div>
        <div id="painel"></div>
      </div>
    </div>
  `;

  const painel = node.querySelector('#painel');

  function pintar(qual) {
    if (qual === 'capturas') {
      painel.innerHTML = capturas.length
        ? `<div class="grade-capturas">${capturas
            .map(
              (c) => `
          <button data-acao="abrir-topico" data-id="${c.id}">
            <img src="${esc(c.photoPath)}" alt="${esc(c.title)}" loading="lazy" />
          </button>`
            )
            .join('')}</div>`
        : vazio({
            emoji: '📸',
            titulo: ehMeu ? 'Você ainda não capturou nada' : 'Nenhuma captura ainda',
            texto: ehMeu ? 'Toca no botão do meio da barra de baixo pra registrar a primeira.' : '',
          });
      return;
    }

    if (qual === 'topicos') {
      painel.innerHTML = topicos.length
        ? listaDeTopicos(topicos)
        : vazio({ emoji: '📝', titulo: 'Nenhum tópico ainda' });
      return;
    }

    painel.innerHTML = respostas.length
      ? respostas
          .map(
            (r) => `
        <button class="card card-clicavel" data-acao="abrir-topico" data-id="${r.topicId}"
                style="width:100%;text-align:left;display:block">
          <div class="card-corpo">
            <div class="muted" style="font-size:12px;margin-bottom:4px">
              ${r.sectionEmoji} em <b style="color:var(--text-dim)">${esc(r.topicTitle)}</b>
            </div>
            <div style="font-size:14px;line-height:1.5" class="cortar-3">${esc(r.body)}</div>
          </div>
        </button>`
          )
          .join('')
      : vazio({ emoji: '💬', titulo: 'Nenhuma resposta ainda' });
  }

  pintar('capturas');

  if (temPj) {
    node.querySelector('[data-ver-personagem]').onclick = () => {
      const corpo = el(
        `<div class="pj-modal-preview"><div class="pj-preview">${montarPersonagemSvg(p.character, { modo: 'cheio' })}</div></div>`
      );
      modal({ titulo: `Personagem de @${p.username}`, corpo });
    };
  }

  node.querySelectorAll('.aba').forEach((b) => {
    b.onclick = () => {
      node.querySelectorAll('.aba').forEach((x) => x.classList.toggle('ativa', x === b));
      pintar(b.dataset.p);
    };
  });

  // Música: navegador de celular bloqueia som automático, então o toque na
  // tela é o que libera. Por isso o play é explícito.
  const btTocar = node.querySelector('#bt-tocar');
  if (btTocar) {
    btTocar.onclick = () => {
      const frame = node.querySelector('#frame-musica');
      const caixa = node.querySelector('#musica');
      if (!frame.classList.contains('oculto')) {
        frame.classList.add('oculto');
        frame.innerHTML = '';
        caixa.classList.remove('tocando');
        btTocar.textContent = '▶';
        return;
      }
      const separador = p.musicEmbed.includes('?') ? '&' : '?';
      const altura = p.musicProvider === 'spotify' ? 152 : 200;
      frame.innerHTML = `
        <iframe src="${esc(p.musicEmbed)}${separador}autoplay=1" height="${altura}"
                allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
                referrerpolicy="strict-origin-when-cross-origin" loading="lazy"></iframe>`;
      frame.classList.remove('oculto');
      caixa.classList.add('tocando');
      btTocar.textContent = '⏸';
    };
  }

  return {
    node,
    titulo: `@${p.username}`,
    voltar: true,
    aba: ehMeu ? 'perfil' : null,
  };
}
