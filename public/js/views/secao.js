// Uma seção do fórum: a lista de tópicos dela, com ordenação e o botão de
// abrir tópico novo (que muda de cara conforme o tipo da seção).

import { api } from '../core/api.js';
import { el, esc, esqueletos, vazio } from '../core/ui.js';
import { store, ouvirNaTela } from '../core/store.js';
import { listaDeTopicos } from '../core/cards.js';

const ORDENS = [
  { chave: 'recentes', rotulo: 'Movimento' },
  { chave: 'novos', rotulo: 'Novos' },
  { chave: 'populares', rotulo: 'Bombando' },
];

export async function render({ slug }) {
  if (!store.secoes.length) {
    const { secoes, categorias } = await api.get('/api/secoes');
    store.secoes = secoes;
    store.categorias = categorias;
  }

  const secao = store.secaoPorSlug(slug);
  if (!secao) {
    return {
      node: el(`<div class="conteudo">${vazio({ emoji: '🤔', titulo: 'Essa seção não existe' })}</div>`),
      titulo: 'Ops',
      voltar: true,
    };
  }

  const acaoNova =
    secao.kind === 'captura'
      ? { html: '<svg class="ic-svg-inline" viewBox="0 0 64 64"><use href="#icone-captura" /></svg> Capturar', para: '/capturar' }
      : secao.kind === 'video'
      ? { html: '🎥 Postar vídeo', para: `/novo/${secao.slug}` }
      : { html: '✏️ Abrir tópico', para: `/novo/${secao.slug}` };

  const iconeGrande =
    secao.kind === 'captura'
      ? '<svg viewBox="0 0 64 64" style="width:30px;height:30px"><use href="#icone-captura" /></svg>'
      : `<span style="font-size:30px">${secao.emoji}</span>`;

  const node = el(`
    <div class="conteudo">
      <div class="hero">
        <div class="flex meio g10">
          ${iconeGrande}
          <div class="crescer">
            <h1 style="font-size:19px">${esc(secao.name)}</h1>
            <p style="font-size:13px">${esc(secao.description || '')}</p>
          </div>
        </div>
        <button class="btn btn-principal btn-largo" style="margin-top:14px"
                data-acao="ir" data-para="${acaoNova.para}">${acaoNova.html}</button>
      </div>

      <div class="filtros">
        ${ORDENS.map((o, i) => `<button class="filtro${i === 0 ? ' ativo' : ''}" data-ordem="${o.chave}">${o.rotulo}</button>`).join('')}
      </div>

      <div id="lista">${esqueletos(4)}</div>
    </div>
  `);

  const lista = node.querySelector('#lista');
  let ordem = 'recentes';

  async function carregar() {
    lista.innerHTML = esqueletos(4);
    try {
      const { topicos } = await api.get(`/api/topicos?secao=${encodeURIComponent(slug)}&ordem=${ordem}&limite=40`);
      store.guardarTopicos(topicos);
      lista.innerHTML = topicos.length
        ? listaDeTopicos(topicos, { mostrarSecao: false })
        : vazio({
            emoji: secao.emoji,
            titulo: 'Nada por aqui ainda',
            texto: `Seja o primeiro a postar em ${secao.name}.`,
            acao: `<button class="btn btn-principal" data-acao="ir" data-para="${acaoNova.para}">${acaoNova.html}</button>`,
          });
    } catch (err) {
      lista.innerHTML = vazio({ emoji: '📡', titulo: 'Não consegui carregar', texto: err.message });
    }
  }

  node.querySelectorAll('.filtro').forEach((b) => {
    b.onclick = () => {
      ordem = b.dataset.ordem;
      node.querySelectorAll('.filtro').forEach((x) => x.classList.toggle('ativo', x === b));
      carregar();
    };
  });

  await carregar();

  ouvirNaTela('topico_novo', (msg) => {
    if (msg.topico.sectionSlug !== slug) return;
    lista.querySelector('.vazio')?.remove();
    lista.insertAdjacentHTML('afterbegin', listaDeTopicos([msg.topico], { mostrarSecao: false }));
  });

  const tituloTela = secao.kind === 'captura' ? secao.name : `${secao.emoji} ${secao.name}`;
  return { node, titulo: tituloTela, voltar: true, aba: 'forum' };
}
