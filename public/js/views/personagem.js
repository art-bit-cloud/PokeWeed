// "Meu Personagem": editor do avatar em camadas. Prévia grande no topo,
// categorias em abas, itens em grade — clicou, equipou. Salva só os slugs
// das peças (o desenho de cada peça já mora no catálogo).

import { api } from '../core/api.js';
import { el, esc, aviso, confirmar, vazio } from '../core/ui.js';
import { store } from '../core/store.js';
import { ir } from '../core/router.js';
import {
  carregarCatalogo,
  montarPersonagemSvg,
  montarItemSvg,
  personagemPadrao,
  temPersonagem,
} from '../core/personagem.js';

export async function render() {
  const cat = await carregarCatalogo().catch(() => null);
  if (!cat || !cat.categorias.length) {
    return {
      node: el(`<div class="conteudo">${vazio({
        emoji: '🧩',
        titulo: 'Não consegui carregar o catálogo',
        texto: 'Confere sua conexão e tenta de novo.',
      })}</div>`),
      titulo: 'Meu personagem',
      voltar: true,
    };
  }

  const partidaSalva = temPersonagem(store.eu.character) ? { ...store.eu.character } : personagemPadrao();
  let rascunho = { ...partidaSalva };
  let categoriaAtiva = cat.categorias[0].slug;

  const node = el(`
    <div class="conteudo">
      <div class="pj-preview-caixa"><div class="pj-preview" id="preview"></div></div>
      <div class="filtros pj-abas" id="abas"></div>
      <div id="itens"></div>
      <div class="flex g8" style="margin:18px 0 6px">
        <button type="button" class="btn btn-fantasma crescer" id="bt-resetar">↺ Resetar</button>
        <button type="button" class="btn btn-principal crescer" id="bt-salvar">Salvar personagem</button>
      </div>
      <p class="muted" style="font-size:11.5px;text-align:center;margin-top:10px">
        Seu personagem aparece no seu perfil, nos seus posts e nos comentários.
      </p>
    </div>
  `);

  const preview = node.querySelector('#preview');
  const abas = node.querySelector('#abas');
  const itens = node.querySelector('#itens');

  function corPeleAtual() {
    const slug = rascunho.tom_pele;
    if (!slug) return undefined;
    return cat.itensPorCategoria.get('tom_pele')?.get(slug)?.asset;
  }

  function pintarPreview() {
    const svg = montarPersonagemSvg(rascunho, { modo: 'cheio' });
    preview.innerHTML =
      svg ||
      vazio({ emoji: '🧑', titulo: 'Escolhe as peças', texto: 'Comece pelo corpo e o tom de pele ali embaixo.' });
  }

  function pintarAbas() {
    abas.innerHTML = cat.categorias
      .map(
        (c) => `
        <button type="button" class="filtro${c.slug === categoriaAtiva ? ' ativo' : ''}" data-cat="${esc(c.slug)}">
          ${rascunho[c.slug] ? '● ' : ''}${esc(c.name)}
        </button>`
      )
      .join('');
    abas.querySelectorAll('.filtro').forEach((b) => {
      b.onclick = () => {
        categoriaAtiva = b.dataset.cat;
        pintarAbas();
        pintarItens();
      };
    });
  }

  function pintarItens() {
    const c = cat.categorias.find((x) => x.slug === categoriaAtiva);
    if (!c) return;
    const equipadoSlug = rascunho[c.slug] || null;
    const pele = corPeleAtual();

    if (!c.itens.length) {
      itens.innerHTML = vazio({ emoji: '🚧', titulo: 'Ainda sem itens nessa categoria', texto: 'Em breve tem mais por aqui.' });
      return;
    }

    const cards = c.itens
      .map((item) => {
        const ativo = item.slug === equipadoSlug;
        const miniatura =
          c.tipo === 'cor'
            ? `<span class="pj-swatch" style="background:${esc(item.asset)}"></span>`
            : montarItemSvg(c.slug, item, c.slug === 'corpo' ? pele : undefined) || '';
        const raridade = item.raridade && item.raridade !== 'comum' ? `<span class="pj-raridade ${esc(item.raridade)}">${esc(item.raridade)}</span>` : '';
        return `
          <button type="button" class="pj-item${ativo ? ' ativo' : ''}${item.desbloqueado ? '' : ' bloqueado'}"
                  data-item="${esc(item.slug)}" title="${esc(item.name)}" ${item.desbloqueado ? '' : 'disabled'}>
            <span class="pj-item-vis">${miniatura}</span>
            <span class="pj-item-nome">${esc(item.name)}</span>
            ${raridade}
          </button>`;
      })
      .join('');

    itens.innerHTML = `
      <div class="pj-itens-grade">${cards}</div>
      ${equipadoSlug ? `<button type="button" class="btn btn-fantasma btn-largo pj-remover" id="bt-remover">Remover ${esc(c.name.toLowerCase())}</button>` : ''}
    `;

    itens.querySelectorAll('.pj-item:not(.bloqueado)').forEach((b) => {
      b.onclick = () => {
        const slug = b.dataset.item;
        if (rascunho[categoriaAtiva] === slug) delete rascunho[categoriaAtiva];
        else rascunho[categoriaAtiva] = slug;
        pintarPreview();
        pintarAbas();
        pintarItens();
      };
    });

    itens.querySelector('#bt-remover')?.addEventListener('click', () => {
      delete rascunho[categoriaAtiva];
      pintarPreview();
      pintarAbas();
      pintarItens();
    });
  }

  pintarPreview();
  pintarAbas();
  pintarItens();

  node.querySelector('#bt-resetar').onclick = async () => {
    const temAlgoSalvo = temPersonagem(store.eu.character);
    const ok = await confirmar({
      titulo: 'Descartar alterações?',
      mensagem: temAlgoSalvo
        ? 'Volta pro último personagem que você salvou. O que você mudou agora se perde.'
        : 'Volta pro personagem inicial. O que você mudou agora se perde.',
      botao: 'Resetar',
      perigo: false,
    });
    if (!ok) return;
    rascunho = temAlgoSalvo ? { ...store.eu.character } : personagemPadrao();
    pintarPreview();
    pintarAbas();
    pintarItens();
  };

  node.querySelector('#bt-salvar').onclick = async () => {
    const botao = node.querySelector('#bt-salvar');
    botao.disabled = true;
    botao.textContent = 'Salvando...';
    try {
      const { character } = await api.put('/api/personagem', { character: rascunho });
      store.eu.character = character;
      aviso('Personagem salvo!', 'ok');
      ir(`/u/${encodeURIComponent(store.eu.username)}`, { substituir: true });
    } catch (err) {
      aviso(err.message, 'erro');
      botao.disabled = false;
      botao.textContent = 'Salvar personagem';
    }
  };

  return { node, titulo: 'Meu personagem', voltar: true, aba: 'perfil' };
}
