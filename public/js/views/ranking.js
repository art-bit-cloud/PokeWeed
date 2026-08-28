// Ranking do bonde: quem mais captura, quem é melhor avaliado, quem é mais curtido.

import { api } from '../core/api.js';
import { el, esc, avatar, esqueletos, vazio } from '../core/ui.js';

const LISTAS = [
  { chave: 'capturadores', titulo: '📸 Top capturadores', valor: (r) => `${r.total} ${r.total === 1 ? 'captura' : 'capturas'}` },
  { chave: 'avaliados', titulo: '⭐ Melhor avaliados', valor: (r) => `${r.media.toFixed(1)} · ${r.avaliacoes}x` },
  { chave: 'curtidos', titulo: '❤️ Mais curtidos', valor: (r) => `${r.curtidas} curtidas` },
];

export async function render() {
  const node = el(`<div class="conteudo" id="raiz">${esqueletos(5)}</div>`);

  try {
    const dados = await api.get('/api/ranking');
    const temAlgo = LISTAS.some((l) => dados[l.chave]?.length);

    node.innerHTML = temAlgo
      ? LISTAS.map((l) => {
          const linhas = dados[l.chave] || [];
          if (!linhas.length) return '';
          return `
            <div class="secao-bloco">
              <div class="titulo-linha"><h2>${l.titulo}</h2></div>
              <div class="ranking-lista">
                ${linhas
                  .map(
                    (r, i) => `
                  <button class="ranking-item" data-acao="perfil" data-user="${esc(r.username)}">
                    <span class="ranking-pos">${i + 1}</span>
                    ${avatar(r, 32)}
                    <span class="ranking-nome">${esc(r.username)}</span>
                    <span class="ranking-valor">${l.valor(r)}</span>
                  </button>`
                  )
                  .join('')}
              </div>
            </div>`;
        }).join('')
      : vazio({
          emoji: '🏆',
          titulo: 'Ranking vazio',
          texto: 'Assim que rolarem capturas e avaliações, o pódio aparece aqui.',
          acao: '<button class="btn btn-principal" data-acao="ir" data-para="/capturar">Capturar primeiro</button>',
        });
  } catch (err) {
    node.innerHTML = vazio({ emoji: '📡', titulo: 'Não consegui carregar', texto: err.message });
  }

  return { node, titulo: 'Ranking', aba: 'ranking' };
}
