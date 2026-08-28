// A Pokédex: inventário pessoal em tela cheia, com o aparelho abrindo, as
// luzinhas piscando e a tela ligando tipo TV de tubo.

import { api } from '../core/api.js';
import { el, esc, aviso } from '../core/ui.js';
import { store } from '../core/store.js';
import { ir } from '../core/router.js';

let aberta = null;

export function abrirPokedex() {
  if (aberta) return;

  const node = el(`
    <div class="dex-fundo ligando" id="dex">
      <div class="dex-aparelho">
        <div class="dex-tampa">
          <div class="dex-lente"><span></span></div>
          <div class="dex-leds"><i class="dex-led r"></i><i class="dex-led a"></i><i class="dex-led v"></i></div>
          <div class="dex-titulo">POKÉ<em>WEED</em> DEX</div>
          <svg class="dex-folha" viewBox="-42 -42 84 84" aria-hidden="true"><use href="#folha-maconha" /></svg>
          <div class="dex-dobradica"></div>
        </div>

        <div class="dex-base">
          <div class="dex-tela">
            <div class="dex-vidro" id="dex-vidro">
              <div class="dex-boot" id="dex-boot">
                <p>&gt; POKEWEED DEX v2.0</p>
                <p>&gt; SINCRONIZANDO INVENTARIO...</p>
                <p>&gt; TREINADOR: @${esc(store.eu.username)}</p>
                <p>&gt; OK_</p>
              </div>
              <div id="dex-conteudo" class="oculto"></div>
            </div>
            <div class="dex-riscos"></div>
          </div>

          <div class="dex-controles">
            <button class="dex-botao" id="dex-fechar" title="Fechar"></button>
            <div class="dex-faixa"><i></i><i></i></div>
            <div class="dex-azuis"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <div class="dex-cruz"><span class="h"></span><span class="v"></span></div>
          </div>
          <div class="dex-dica">toca no botão vermelho pra fechar</div>
        </div>
      </div>
    </div>
  `);

  document.body.appendChild(node);
  document.body.classList.add('travado');
  void node.offsetWidth;
  node.classList.add('aberta');

  const fechar = () => {
    if (!aberta) return;
    aberta = null;
    node.classList.remove('aberta');
    document.body.classList.remove('travado');
    document.removeEventListener('keydown', aoTeclar);
    setTimeout(() => node.remove(), 320);
  };
  const aoTeclar = (e) => { if (e.key === 'Escape') fechar(); };

  aberta = { node, fechar };
  node.querySelector('#dex-fechar').onclick = fechar;
  node.addEventListener('click', (e) => { if (e.target === node) fechar(); });
  document.addEventListener('keydown', aoTeclar);

  setTimeout(async () => {
    if (!aberta) return;
    node.classList.remove('ligando');
    node.querySelector('#dex-boot').classList.add('oculto');

    const conteudo = node.querySelector('#dex-conteudo');
    conteudo.classList.remove('oculto');

    try {
      const { topicos } = await api.get(
        `/api/topicos?autor=${encodeURIComponent(store.eu.username)}&kind=captura&ordem=novos&limite=60`
      );
      const avaliadas = topicos.filter((t) => t.avgOverall !== null);
      const media = avaliadas.length ? avaliadas.reduce((s, t) => s + t.avgOverall, 0) / avaliadas.length : null;
      const totalNotas = topicos.reduce((s, t) => s + (t.ratingCount || 0), 0);

      conteudo.innerHTML = `
        <div class="dex-numeros">
          <div class="dex-numero"><span>REGISTROS</span><b>${String(topicos.length).padStart(3, '0')}</b></div>
          <div class="dex-numero"><span>MÉDIA</span><b>${media !== null ? media.toFixed(1) : '—'}</b></div>
          <div class="dex-numero"><span>AVALIAÇÕES</span><b>${String(totalNotas).padStart(3, '0')}</b></div>
        </div>
        <div class="dex-lista">
          ${
            topicos.length
              ? topicos
                  .map(
                    (t) => `
            <button class="dex-item" data-dex-topico="${t.id}">
              <img src="${esc(t.photoPath)}" alt="${esc(t.title)}" loading="lazy" />
              <span class="crescer">
                <span class="n"></span>
                <span class="t">${esc(t.title)}</span>
                <span class="m">${esc(t.category || '')}${t.quantity ? ' · ' + esc(t.quantity) : ''} · ⭐ ${
                      t.avgOverall !== null ? t.avgOverall.toFixed(1) : '—'
                    }</span>
              </span>
            </button>`
                  )
                  .join('')
              : `<p style="font-size:12.5px;line-height:1.6">&gt; NENHUM REGISTRO.<br />&gt; FECHA A DEX E CAPTURA<br />&nbsp;&nbsp;TEU PRIMEIRO BECK.</p>`
          }
        </div>
      `;

      conteudo.querySelectorAll('[data-dex-topico]').forEach((b) => {
        b.onclick = () => {
          fechar();
          ir(`/t/${b.dataset.dexTopico}`);
        };
      });
    } catch (err) {
      conteudo.innerHTML = `<p style="font-size:12.5px">&gt; ERRO: ${esc(err.message)}</p>`;
    }
  }, 1500);
}
