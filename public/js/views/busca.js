// Busca: tópicos e pessoas.

import { api } from '../core/api.js';
import { el, esc, avatar, vazio, esqueletos } from '../core/ui.js';
import { store } from '../core/store.js';
import { listaDeTopicos } from '../core/cards.js';

export async function render(_params, query) {
  const node = el(`
    <div class="conteudo">
      <div class="busca-caixa" style="margin-bottom:16px">
        <span class="lupa">🔍</span>
        <input type="search" id="in-busca" placeholder="Buscar tópico ou pessoa..." value="${esc(query?.q || '')}" />
      </div>
      <div id="resultado"></div>
    </div>
  `);

  const campo = node.querySelector('#in-busca');
  const resultado = node.querySelector('#resultado');
  let timer = null;

  async function buscar(termo) {
    if (!termo.trim()) {
      resultado.innerHTML = vazio({ emoji: '🔍', titulo: 'Busque alguma coisa', texto: 'Título de tópico, texto, ou o nome de alguém do bonde.' });
      return;
    }
    resultado.innerHTML = esqueletos(3);
    try {
      const { topicos, pessoas } = await api.get(`/api/busca?q=${encodeURIComponent(termo)}`);
      store.guardarTopicos(topicos);

      if (!topicos.length && !pessoas.length) {
        resultado.innerHTML = vazio({ emoji: '🤷', titulo: 'Nada encontrado', texto: `Nenhum resultado pra "${termo}".` });
        return;
      }

      resultado.innerHTML = `
        ${
          pessoas.length
            ? `<div class="secao-bloco">
                 <div class="titulo-linha"><h2>PESSOAS</h2></div>
                 <div class="ranking-lista">
                   ${pessoas
                     .map(
                       (u) => `
                     <button class="ranking-item" data-acao="perfil" data-user="${esc(u.username)}">
                       ${avatar(u, 32)}
                       <span class="crescer">
                         <span class="ranking-nome">${esc(u.username)}</span>
                         ${u.status ? `<div class="muted" style="font-size:12px">${esc(u.status)}</div>` : ''}
                       </span>
                     </button>`
                     )
                     .join('')}
                 </div>
               </div>`
            : ''
        }
        ${
          topicos.length
            ? `<div class="secao-bloco">
                 <div class="titulo-linha"><h2>TÓPICOS</h2></div>
                 ${listaDeTopicos(topicos)}
               </div>`
            : ''
        }
      `;
    } catch (err) {
      resultado.innerHTML = vazio({ emoji: '📡', titulo: 'Deu erro na busca', texto: err.message });
    }
  }

  campo.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      history.replaceState(null, '', `#/busca?q=${encodeURIComponent(campo.value)}`);
      buscar(campo.value);
    }, 320);
  });

  await buscar(query?.q || '');
  setTimeout(() => campo.focus(), 60);

  return { node, titulo: 'Buscar', voltar: true };
}
