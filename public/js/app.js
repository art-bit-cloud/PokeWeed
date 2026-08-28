// Junta tudo: decide se mostra o login ou o app, monta a casca (topo,
// conteúdo, barra de baixo), liga o roteador e trata os cliques que aparecem
// em várias telas (curtir, abrir tópico, abrir perfil).

import { api } from './core/api.js';
import { $, el, esc, avatar, aviso } from './core/ui.js';
import { store, limparOuvintesDaTela } from './core/store.js';
import * as router from './core/router.js';
import { conectar, desconectar } from './core/realtime.js';
import { carregarCatalogo } from './core/personagem.js';
import { telaLogin } from './views/auth.js';
import { abrirPokedex } from './views/pokedex.js';

const raiz = document.getElementById('raiz');

const TELAS = {
  '/forum': () => import('./views/forum.js'),
  '/s/:slug': () => import('./views/secao.js'),
  '/t/:id': () => import('./views/topico.js'),
  '/novo/:slug': () => import('./views/novo.js'),
  '/capturar': () => import('./views/capturar.js'),
  '/comunidade': () => import('./views/comunidade.js'),
  '/ranking': () => import('./views/ranking.js'),
  '/u/:username': () => import('./views/perfil.js'),
  '/perfil/editar': () => import('./views/editar.js'),
  '/personagem': () => import('./views/personagem.js'),
  '/busca': () => import('./views/busca.js'),
};

const ABAS = [
  { chave: 'forum', rotulo: 'Fórum', ic: '🏠', para: '/forum' },
  { chave: 'comunidade', rotulo: 'Comunidade', ic: '🎥', para: '/comunidade' },
  { chave: 'capturar' },
  { chave: 'ranking', rotulo: 'Ranking', ic: '🏆', para: '/ranking' },
  { chave: 'perfil', rotulo: 'Perfil', ic: '👤', para: null },
];

let saidaDaTela = null;

// ---------- casca ----------
function montarCasca() {
  raiz.innerHTML = '';
  const app = el(`
    <div id="app">
      <header class="topo" id="topo"></header>
      <main id="conteudo"></main>
      <nav class="barra" id="barra"></nav>
    </div>
  `);
  raiz.appendChild(app);
  pintarBarra(null);
}

function pintarTopo({ titulo, voltar }) {
  const topo = $('#topo');
  topo.innerHTML = voltar
    ? `
      <button class="topo-voltar" data-voltar title="Voltar">←</button>
      <span class="topo-titulo crescer">${esc(titulo || '')}</span>
      <div class="topo-acoes">
        <button class="icone-btn" data-acao="ir" data-para="/busca" title="Buscar">🔍</button>
      </div>`
    : `
      <span class="topo-marca">
        <span style="width:22px;height:22px;border-radius:999px;display:inline-block;
                     background:linear-gradient(180deg,#f0555a 0 46%,#0a0e0c 46% 54%,#f2f7f4 54%);
                     border:1.5px solid #0a0e0c"></span>
        Poke<em>Weed</em>
      </span>
      <div class="topo-acoes">
        <button class="icone-btn" data-acao="ir" data-para="/busca" title="Buscar">🔍</button>
        <button class="icone-btn" data-dex title="Sua Pokédex">
          <svg viewBox="0 0 64 64" style="width:22px;height:22px">
            <path d="M23 5 H55 A5 5 0 0 1 60 10 V54 A5 5 0 0 1 55 59 H9 A5 5 0 0 1 4 54 V24 Z"
                  fill="#e0393e" stroke="#7d1519" stroke-width="3" stroke-linejoin="round" />
            <circle cx="16" cy="18" r="6.5" fill="#dceeff" stroke="#7d1519" stroke-width="2.4" />
            <circle cx="16" cy="18" r="3.9" fill="#4b9bef" />
            <circle cx="31" cy="13" r="2" fill="#ff5c5f" />
            <circle cx="38.5" cy="13" r="2" fill="#ffd45c" />
            <circle cx="46" cy="13" r="2" fill="#6be08a" />
            <rect x="9" y="29" width="46" height="24" rx="4" fill="#0b1a11" stroke="#7d1519" stroke-width="2.4" />
            <g transform="translate(32 50) scale(0.6)" fill="#5ede7c"><use href="#folha-maconha" /></g>
          </svg>
        </button>
        <button class="icone-btn" data-meu-perfil title="Seu perfil" style="padding:0">
          ${avatar(store.eu, 32)}
        </button>
      </div>`;
}

function pintarBarra(abaAtiva) {
  $('#barra').innerHTML = ABAS.map((a) => {
    if (a.chave === 'capturar') {
      return `<button class="barra-capturar" data-acao="ir" data-para="/capturar" title="Capturar">
                <span class="bola"><svg viewBox="0 0 64 64"><use href="#icone-captura" /></svg></span>
              </button>`;
    }
    const para = a.para || `/u/${encodeURIComponent(store.eu.username)}`;
    return `<button class="barra-item${abaAtiva === a.chave ? ' ativo' : ''}" data-acao="ir" data-para="${esc(para)}">
              <span class="ic">${a.ic}</span>${a.rotulo}
            </button>`;
  }).join('');
}

// ---------- troca de tela ----------
async function trocarTela(achou) {
  if (saidaDaTela) {
    try { saidaDaTela(); } catch {}
    saidaDaTela = null;
  }
  limparOuvintesDaTela();
  document.querySelector('.modal')?.remove();
  document.body.classList.remove('travado');

  if (!achou) {
    router.ir('/forum', { substituir: true });
    return;
  }

  const conteudo = $('#conteudo');
  conteudo.innerHTML = '<div class="conteudo"><div class="esqueleto esqueleto-card"></div><div class="esqueleto esqueleto-card"></div></div>';

  let resultado;
  try {
    const modulo = await achou.tela();
    resultado = await modulo.render(achou.params, achou.query);
  } catch (err) {
    console.error(err);
    conteudo.innerHTML = `<div class="conteudo"><div class="vazio"><div class="emoji">💥</div>
      <h3>Deu ruim ao abrir essa tela</h3><p>${esc(err.message)}</p>
      <button class="btn btn-fantasma" data-acao="ir" data-para="/forum">Voltar pro fórum</button></div></div>`;
    return;
  }

  saidaDaTela = resultado.aoSair || null;

  if (resultado.semCasca) {
    // telas que ocupam tudo (câmera)
    $('#topo').style.display = 'none';
    $('#barra').style.display = 'none';
    conteudo.innerHTML = '';
    conteudo.appendChild(resultado.node);
  } else {
    $('#topo').style.display = '';
    $('#barra').style.display = '';
    pintarTopo(resultado);
    pintarBarra(resultado.aba);
    conteudo.innerHTML = '';
    conteudo.appendChild(resultado.node);
  }

  window.scrollTo(0, 0);
  document.title = resultado.titulo ? `${resultado.titulo} · PokeWeed` : 'PokeWeed';

  // algumas telas (câmera) só conseguem terminar de se preparar depois de
  // estarem de verdade na página
  if (resultado.aoMontar) {
    try {
      await resultado.aoMontar();
    } catch (err) {
      console.error('[aoMontar]', err);
    }
  }
}

// ---------- cliques que valem em qualquer tela ----------
function ligarCliquesGlobais() {
  document.addEventListener('click', async (e) => {
    const dex = e.target.closest('[data-dex]');
    if (dex) { abrirPokedex(); return; }

    const meu = e.target.closest('[data-meu-perfil]');
    if (meu) { router.ir(`/u/${store.eu.username}`); return; }

    const volta = e.target.closest('[data-voltar]');
    if (volta) { router.voltar(); return; }

    const nav = e.target.closest('[data-acao="ir"]');
    if (nav) { router.ir(nav.dataset.para); return; }

    const perfil = e.target.closest('[data-acao="perfil"]');
    if (perfil) { router.ir(`/u/${encodeURIComponent(perfil.dataset.user)}`); return; }

    const abrir = e.target.closest('[data-acao="abrir-topico"]');
    if (abrir) { router.ir(`/t/${abrir.dataset.id}`); return; }

    const curtir = e.target.closest('[data-acao="curtir"]');
    if (curtir) {
      const id = Number(curtir.dataset.id);
      curtir.classList.add('desativado');
      try {
        const r = await api.post(`/api/topicos/${id}/curtir`);
        const t = store.pegarTopico(id);
        if (t) { t.liked = r.curtiu; t.likeCount = r.total; }
        document.querySelectorAll(`[data-acao="curtir"][data-id="${id}"]`).forEach((b) => {
          b.classList.toggle('curtido', r.curtiu);
          b.querySelector('.ic').textContent = r.curtiu ? '❤️' : '🤍';
        });
        document.querySelectorAll(`[data-curtidas="${id}"]`).forEach((n) => { n.textContent = r.total; });
      } catch (err) {
        aviso(err.message, 'erro');
      } finally {
        curtir.classList.remove('desativado');
      }
    }
  });
}

// ---------- sair ----------
export async function sair() {
  await api.post('/api/sair').catch(() => {});
  desconectar();
  store.eu = null;
  store.topicos.clear();
  location.hash = '';
  mostrarLogin();
}
window.pokeweedSair = sair;

function mostrarLogin() {
  raiz.innerHTML = '';
  raiz.appendChild(telaLogin(entrar));
}

async function entrar(eu) {
  store.eu = eu;
  await carregarCatalogo().catch((err) => console.error('[catálogo de personagem]', err));
  montarCasca();
  conectar();
  await router.iniciar();
}

// ---------- início ----------
for (const [padrao, carregar] of Object.entries(TELAS)) router.rota(padrao, carregar);
router.aoNavegar(trocarTela);
ligarCliquesGlobais();

(async function comecar() {
  try {
    store.eu = await api.get('/api/eu');
  } catch {
    store.eu = null;
  }

  if (!store.eu) {
    mostrarLogin();
    return;
  }

  await carregarCatalogo().catch((err) => console.error('[catálogo de personagem]', err));
  montarCasca();
  conectar();
  router.iniciar();
})();
