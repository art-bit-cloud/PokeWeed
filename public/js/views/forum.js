// Home do fórum: um resumo, a lista de seções e o que rolou de mais recente.

import { api } from '../core/api.js';
import { el, esc, esqueletos, vazio, avatar, quando } from '../core/ui.js';
import { store, ouvirNaTela } from '../core/store.js';
import { listaDeTopicos } from '../core/cards.js';

export async function render() {
  const node = el(`
    <div class="conteudo">
      <div class="hero">
        <h1>Salve, ${esc(store.eu.username)} 🌿</h1>
        <p>O que o bonde aprontou hoje.</p>
        <div class="hero-numeros" id="hero-numeros"></div>
      </div>

      <div class="secao-bloco">
        <div class="titulo-linha"><h2>SEÇÕES</h2></div>
        <div class="forum-tabela" id="lista-secoes"></div>
      </div>

      <div class="secao-bloco">
        <div class="titulo-linha">
          <h2>MOVIMENTO RECENTE</h2>
          <a href="#/s/geral">ver tudo</a>
        </div>
        <div id="recentes">${esqueletos(3)}</div>
      </div>
    </div>
  `);

  const numeros = node.querySelector('#hero-numeros');
  const listaSecoes = node.querySelector('#lista-secoes');
  const recentes = node.querySelector('#recentes');

  function pintarSecoes() {
    listaSecoes.innerHTML = store.secoes
      .map((s, i) => {
        const icone =
          s.kind === 'captura'
            ? '<svg viewBox="0 0 64 64"><use href="#icone-captura" /></svg>'
            : s.emoji;
        const ultimo = s.ultimo
          ? `<span class="forum-ultimo">
               ${avatar({ username: s.ultimo.username, avatarPath: s.ultimo.avatarPath, character: s.ultimo.character }, 18)}
               <span class="cortar">${esc(s.ultimo.title)}</span>
               <span class="ponto">·</span>
               <span class="quando">${quando(s.ultimo.lastActivityAt)}</span>
             </span>`
          : `<span class="forum-ultimo vazia">Nenhum tópico ainda</span>`;
        return `
        <button class="forum-linha" data-acao="ir" data-para="/s/${esc(s.slug)}">
          <span class="forum-pos">${String(i + 1).padStart(2, '0')}</span>
          <span class="forum-icone">${icone}</span>
          <span class="forum-info">
            <span class="forum-linha-topo">
              <h3>${esc(s.name)}</h3>
              <span class="forum-qtd">${s.topicCount} <small>tóp.</small></span>
            </span>
            <span class="forum-desc">${esc(s.description || '')}</span>
            ${ultimo}
          </span>
        </button>
      `;
      })
      .join('');
  }

  function pintarNumeros(n) {
    if (!n) return;
    numeros.innerHTML = `
      <div class="hero-numero"><b>${n.membros}</b><span>membros</span></div>
      <div class="hero-numero"><b>${n.topicos}</b><span>tópicos</span></div>
      <div class="hero-numero"><b>${n.capturas}</b><span>capturas</span></div>
      <div class="hero-numero"><b>${n.respostas}</b><span>respostas</span></div>
    `;
  }

  async function carregar() {
    const [{ secoes, categorias }, { numeros: n }, { topicos }] = await Promise.all([
      api.get('/api/secoes'),
      api.get('/api/resumo'),
      api.get('/api/topicos?limite=12'),
    ]);

    store.secoes = secoes;
    store.categorias = categorias;
    store.numeros = n;
    store.guardarTopicos(topicos);

    pintarSecoes();
    pintarNumeros(n);
    recentes.innerHTML = topicos.length
      ? listaDeTopicos(topicos)
      : vazio({
          emoji: '🌱',
          titulo: 'O fórum tá vazio',
          texto: 'Ninguém postou nada ainda. Abre o primeiro tópico ou captura teu primeiro beck.',
          acao: '<button class="btn btn-principal" data-acao="ir" data-para="/capturar">Capturar agora</button>',
        });
  }

  await carregar().catch((err) => {
    recentes.innerHTML = vazio({ emoji: '📡', titulo: 'Não consegui carregar', texto: err.message });
  });

  // novidades ao vivo entram no topo da lista
  ouvirNaTela('topico_novo', (msg) => {
    const atual = recentes.querySelector('.vazio');
    if (atual) recentes.innerHTML = '';
    recentes.insertAdjacentHTML('afterbegin', listaDeTopicos([msg.topico]));
  });

  return { node, titulo: 'PokeWeed', aba: 'forum' };
}
