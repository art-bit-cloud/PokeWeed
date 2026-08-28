// Comunidade: os vídeos que a galera ensinou e as dúvidas em aberto.

import { api } from '../core/api.js';
import { el, esqueletos, vazio } from '../core/ui.js';
import { store, ouvirNaTela } from '../core/store.js';
import { listaDeTopicos } from '../core/cards.js';

const ABAS = [
  { chave: 'tutoriais', rotulo: '🎥 Vídeos' },
  { chave: 'duvidas', rotulo: '❓ Dúvidas' },
];

export async function render(_params, query) {
  const node = el(`
    <div class="conteudo">
      <div class="comunidade-destaque">
        <button class="destaque-card" data-acao="ir" data-para="/novo/tutoriais">
          <div class="emoji">🎥</div>
          <h3>Ensinar algo</h3>
          <p>Grava ou manda o link e mostra pro bonde</p>
        </button>
        <button class="destaque-card" data-acao="ir" data-para="/novo/duvidas">
          <div class="emoji">❓</div>
          <h3>Tirar dúvida</h3>
          <p>Pergunta que alguém responde</p>
        </button>
      </div>

      <div class="abas">
        ${ABAS.map((a, i) => `<button class="aba${i === 0 ? ' ativa' : ''}" data-aba="${a.chave}">${a.rotulo}</button>`).join('')}
      </div>

      <div id="lista">${esqueletos(3)}</div>
    </div>
  `);

  const lista = node.querySelector('#lista');
  let abaAtual = query?.aba === 'duvidas' ? 'duvidas' : 'tutoriais';

  function marcarAba() {
    node.querySelectorAll('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === abaAtual));
  }

  async function carregar() {
    marcarAba();
    lista.innerHTML = esqueletos(3);
    try {
      const { topicos } = await api.get(`/api/topicos?secao=${abaAtual}&ordem=recentes&limite=40`);
      store.guardarTopicos(topicos);
      lista.innerHTML = topicos.length
        ? listaDeTopicos(topicos, { mostrarSecao: false })
        : abaAtual === 'tutoriais'
        ? vazio({
            emoji: '🎬',
            titulo: 'Nenhum vídeo ainda',
            texto: 'Grava um tutorial rápido ou cola um link do YouTube. Fica salvo pro bonde inteiro.',
            acao: '<button class="btn btn-principal" data-acao="ir" data-para="/novo/tutoriais">Postar vídeo</button>',
          })
        : vazio({
            emoji: '💭',
            titulo: 'Nenhuma dúvida em aberto',
            texto: 'Pergunta o que quiser. Quem responder melhor ganha o selo de melhor resposta.',
            acao: '<button class="btn btn-principal" data-acao="ir" data-para="/novo/duvidas">Perguntar</button>',
          });
    } catch (err) {
      lista.innerHTML = vazio({ emoji: '📡', titulo: 'Não consegui carregar', texto: err.message });
    }
  }

  node.querySelectorAll('.aba').forEach((b) => {
    b.onclick = () => {
      abaAtual = b.dataset.aba;
      history.replaceState(null, '', `#/comunidade?aba=${abaAtual}`);
      carregar();
    };
  });

  await carregar();

  ouvirNaTela('topico_novo', (msg) => {
    if (msg.topico.sectionSlug !== abaAtual) return;
    lista.querySelector('.vazio')?.remove();
    lista.insertAdjacentHTML('afterbegin', listaDeTopicos([msg.topico], { mostrarSecao: false }));
  });

  return { node, titulo: 'Comunidade', aba: 'comunidade' };
}
