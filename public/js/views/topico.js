// Um tópico aberto: o post, a mídia, as notas (quando é captura) e as
// respostas, com campo de resposta grudado embaixo.

import { api } from '../core/api.js';
import { el, esc, avatar, quando, dataLonga, textoRico, aviso, modal, confirmar, vazio } from '../core/ui.js';
import { store, ouvirNaTela } from '../core/store.js';
import { ir } from '../core/router.js';

function blocoMidia(t) {
  if (t.kind === 'captura' && t.photoPath) {
    return `<div class="topico-foto"><img src="${esc(t.photoPath)}" alt="${esc(t.title)}" /></div>`;
  }
  if (t.kind === 'video' && t.videoPath) {
    return `
      <div class="topico-video">
        <video controls playsinline preload="metadata" src="${esc(t.videoPath)}"></video>
      </div>`;
  }
  if (t.kind === 'video' && t.videoEmbed) {
    return `
      <div class="topico-video">
        <iframe src="${esc(t.videoEmbed)}" title="${esc(t.title)}" allowfullscreen
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                referrerpolicy="strict-origin-when-cross-origin"></iframe>
      </div>`;
  }
  return '';
}

function blocoNotas(t) {
  if (t.kind !== 'captura') return '';
  const v = (n) => (n === null ? '—' : n.toFixed(1));
  return `
    <div class="notas-resumo">
      <div class="nota-caixa"><b>${v(t.avgEnrolacao)}</b><span>Enrolação</span></div>
      <div class="nota-caixa"><b>${v(t.avgTiragem)}</b><span>Tiragem</span></div>
      <div class="nota-caixa"><b>${v(t.avgVisual)}</b><span>Visual</span></div>
    </div>
    <div class="flex meio entre g10" style="margin-bottom:6px">
      <span class="muted" style="font-size:12.5px">
        ${t.ratingCount} ${t.ratingCount === 1 ? 'avaliação' : 'avaliações'}
        ${t.avgOverall !== null ? `· média <b style="color:var(--gold)">${t.avgOverall.toFixed(1)}</b>` : ''}
      </span>
      ${
        t.isMine
          ? '<span class="chip">é sua captura</span>'
          : `<button class="btn btn-pequeno ${t.myRating ? 'btn-fantasma' : 'btn-principal'}" data-avaliar>
               ${t.myRating ? '✓ avaliado — mudar nota' : '⭐ Avaliar'}
             </button>`
      }
    </div>
  `;
}

function blocoResposta(r, { donoDoTopico, podeModerar, meuId }) {
  const autor = { username: r.username, avatarPath: r.avatarPath, accent: r.accent, character: r.character };
  const podeApagar = r.userId === meuId || podeModerar;
  return `
    <div class="resposta${r.isAnswer ? ' melhor' : ''}" data-resposta="${r.id}">
      <button data-acao="perfil" data-user="${esc(r.username)}" style="background:none;border:none;padding:0">
        ${avatar(autor, 32)}
      </button>
      <div class="crescer">
        <div class="resposta-cabeca">
          <span class="nome">${esc(r.username)}</span>
          <span class="quando">${quando(r.createdAt)}</span>
          ${r.isAnswer ? '<span class="chip verde">✓ melhor resposta</span>' : ''}
        </div>
        <div class="resposta-texto">${textoRico(r.body)}</div>
        <div class="resposta-acoes">
          <button class="acao${r.liked ? ' curtido' : ''}" data-curtir-resposta="${r.id}">
            <span class="ic">${r.liked ? '❤️' : '🤍'}</span><span data-curtidas-resposta="${r.id}">${r.likeCount}</span>
          </button>
          ${donoDoTopico && !r.isAnswer ? `<button class="acao" data-melhor="${r.id}">✓ melhor resposta</button>` : ''}
          ${donoDoTopico && r.isAnswer ? `<button class="acao" data-melhor="">desmarcar</button>` : ''}
          ${podeApagar ? `<button class="acao" data-apagar-resposta="${r.id}">apagar</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

export async function render({ id }) {
  let dados;
  try {
    dados = await api.get(`/api/topicos/${id}`);
  } catch (err) {
    return {
      node: el(`<div class="conteudo">${vazio({ emoji: '🕳️', titulo: 'Tópico não encontrado', texto: err.message })}</div>`),
      titulo: 'Ops',
      voltar: true,
    };
  }

  let t = store.guardarTopico(dados.topico);
  let respostas = dados.respostas;
  const podeModerar = dados.podeModerar;
  const meuId = store.eu.id;
  const donoDoTopico = t.userId === meuId;
  const autor = { username: t.username, avatarPath: t.avatarPath, accent: t.accent, character: t.character };

  const node = el(`
    <div class="conteudo">
      <div class="topico-cabeca">
        <div class="flex meio g8" style="margin-bottom:10px">
          <span class="chip">${t.sectionEmoji} ${esc(t.sectionName)}</span>
          ${t.pinned ? '<span class="chip ouro">📌 fixado</span>' : ''}
          ${t.solved ? '<span class="chip verde">✓ resolvido</span>' : ''}
          <span style="margin-left:auto">
            <button class="icone-btn" data-menu title="Mais">⋯</button>
          </span>
        </div>
        <h1>${esc(t.title)}</h1>
        <div class="topico-autor">
          <button data-acao="perfil" data-user="${esc(t.username)}" style="background:none;border:none;padding:0">
            ${avatar(autor, 40)}
          </button>
          <div>
            <div class="nome">${esc(t.username)}</div>
            <div class="quando">${dataLonga(t.createdAt)} · ${t.viewCount} ${t.viewCount === 1 ? 'visualização' : 'visualizações'}</div>
          </div>
        </div>
      </div>

      ${t.body ? `<div class="topico-texto">${textoRico(t.body)}</div>` : ''}
      ${blocoMidia(t)}
      <div id="area-notas">${blocoNotas(t)}</div>

      <div class="flex g6" style="margin:14px 0 4px;margin-left:-11px">
        <button class="acao${t.liked ? ' curtido' : ''}" data-acao="curtir" data-id="${t.id}">
          <span class="ic">${t.liked ? '❤️' : '🤍'}</span>
          <span data-curtidas="${t.id}">${t.likeCount}</span> curtidas
        </button>
      </div>

      <div class="respostas-titulo" id="titulo-respostas">
        ${respostas.length} ${respostas.length === 1 ? 'resposta' : 'respostas'}
      </div>
      <div id="lista-respostas"></div>

      <form class="responder" id="form-resposta">
        <textarea placeholder="Escreve uma resposta..." maxlength="3000" rows="1"></textarea>
        <button type="submit" class="enviar" disabled>➤</button>
      </form>
    </div>
  `);

  const listaRespostas = node.querySelector('#lista-respostas');
  const tituloRespostas = node.querySelector('#titulo-respostas');
  const areaNotas = node.querySelector('#area-notas');

  function pintarRespostas() {
    tituloRespostas.textContent = `${respostas.length} ${respostas.length === 1 ? 'resposta' : 'respostas'}`;
    listaRespostas.innerHTML = respostas.length
      ? respostas.map((r) => blocoResposta(r, { donoDoTopico, podeModerar, meuId })).join('')
      : `<p class="muted" style="font-size:13.5px;padding:8px 0">Ninguém respondeu ainda. Manda a primeira.</p>`;
  }
  pintarRespostas();

  function pintarNotas() {
    areaNotas.innerHTML = blocoNotas(t);
  }

  // ---------- campo de resposta ----------
  const form = node.querySelector('#form-resposta');
  const campo = form.querySelector('textarea');
  const enviar = form.querySelector('.enviar');

  campo.addEventListener('input', () => {
    enviar.disabled = !campo.value.trim();
    campo.style.height = 'auto';
    campo.style.height = Math.min(campo.scrollHeight, 140) + 'px';
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const texto = campo.value.trim();
    if (!texto) return;
    enviar.disabled = true;
    try {
      const { resposta } = await api.post(`/api/topicos/${t.id}/respostas`, { body: texto });
      if (!respostas.some((r) => r.id === resposta.id)) respostas.push(resposta);
      campo.value = '';
      campo.style.height = 'auto';
      pintarRespostas();
    } catch (err) {
      aviso(err.message, 'erro');
      enviar.disabled = false;
    }
  };

  // ---------- ações dentro do tópico ----------
  node.addEventListener('click', async (e) => {
    const alvo = e.target.closest('[data-avaliar], [data-curtir-resposta], [data-melhor], [data-apagar-resposta], [data-menu]');
    if (!alvo) return;

    if (alvo.hasAttribute('data-avaliar')) {
      abrirAvaliacao();
      return;
    }

    if (alvo.hasAttribute('data-curtir-resposta')) {
      const rid = Number(alvo.dataset.curtirResposta);
      try {
        const r = await api.post(`/api/respostas/${rid}/curtir`);
        const resposta = respostas.find((x) => x.id === rid);
        if (resposta) {
          resposta.liked = r.curtiu;
          resposta.likeCount = r.total;
        }
        alvo.classList.toggle('curtido', r.curtiu);
        alvo.querySelector('.ic').textContent = r.curtiu ? '❤️' : '🤍';
        alvo.querySelector(`[data-curtidas-resposta="${rid}"]`).textContent = r.total;
      } catch (err) {
        aviso(err.message, 'erro');
      }
      return;
    }

    if (alvo.hasAttribute('data-melhor')) {
      const rid = alvo.dataset.melhor ? Number(alvo.dataset.melhor) : null;
      try {
        await api.post(`/api/topicos/${t.id}/resolver`, { replyId: rid });
        respostas = respostas.map((r) => ({ ...r, isAnswer: r.id === rid }));
        respostas.sort((a, b) => Number(b.isAnswer) - Number(a.isAnswer) || a.createdAt - b.createdAt);
        pintarRespostas();
        aviso(rid ? 'Marcada como melhor resposta!' : 'Desmarcada.', 'ok');
      } catch (err) {
        aviso(err.message, 'erro');
      }
      return;
    }

    if (alvo.hasAttribute('data-apagar-resposta')) {
      const rid = Number(alvo.dataset.apagarResposta);
      if (!(await confirmar({ titulo: 'Apagar resposta?', mensagem: 'Isso não tem volta.', botao: 'Apagar' }))) return;
      try {
        await api.del(`/api/respostas/${rid}`);
        respostas = respostas.filter((r) => r.id !== rid);
        pintarRespostas();
      } catch (err) {
        aviso(err.message, 'erro');
      }
      return;
    }

    if (alvo.hasAttribute('data-menu')) abrirMenu();
  });

  function abrirMenu() {
    const podeApagar = donoDoTopico || podeModerar;
    const corpo = el(`
      <div class="flex g8" style="flex-direction:column">
        <button class="btn btn-fantasma btn-largo" data-copiar>🔗 Copiar link do tópico</button>
        ${podeModerar ? `<button class="btn btn-fantasma btn-largo" data-fixar>${t.pinned ? '📌 Desafixar' : '📌 Fixar no topo'}</button>` : ''}
        ${podeApagar ? '<button class="btn btn-perigo btn-largo" data-apagar>🗑 Apagar tópico</button>' : ''}
      </div>
    `);
    const m = modal({ titulo: 'Opções do tópico', corpo });

    corpo.querySelector('[data-copiar]').onclick = async () => {
      const link = `${location.origin}/#/t/${t.id}`;
      try {
        await navigator.clipboard.writeText(link);
        aviso('Link copiado!', 'ok');
      } catch {
        aviso(link);
      }
      m.fechar();
    };
    corpo.querySelector('[data-fixar]')?.addEventListener('click', async () => {
      try {
        const r = await api.post(`/api/topicos/${t.id}/fixar`, { pinned: !t.pinned });
        t.pinned = r.pinned;
        aviso(r.pinned ? 'Fixado no topo.' : 'Desafixado.', 'ok');
        m.fechar();
        ir(`/t/${t.id}`);
      } catch (err) {
        aviso(err.message, 'erro');
      }
    });
    corpo.querySelector('[data-apagar]')?.addEventListener('click', async () => {
      m.fechar();
      if (!(await confirmar({ titulo: 'Apagar o tópico?', mensagem: 'Apaga junto todas as respostas. Não tem volta.', botao: 'Apagar tudo' }))) return;
      try {
        await api.del(`/api/topicos/${t.id}`);
        aviso('Tópico apagado.', 'ok');
        ir(`/s/${t.sectionSlug}`);
      } catch (err) {
        aviso(err.message, 'erro');
      }
    });
  }

  function abrirAvaliacao() {
    const rascunho = t.myRating ? { ...t.myRating } : { enrolacao: 0, tiragem: 0, visual: 0 };
    const criterios = [
      { chave: 'enrolacao', nome: 'Enrolação', desc: 'firmeza, formato, acabamento' },
      { chave: 'tiragem', nome: 'Tiragem', desc: 'como puxa, se queima parelho' },
      { chave: 'visual', nome: 'Visual', desc: 'se é bonito de ver' },
    ];

    const corpo = el(`
      <div>
        ${criterios
          .map(
            (c) => `
          <div class="nota-linha">
            <div><b>${c.nome}</b><div class="desc">${c.desc}</div></div>
            <div class="estrelas" data-criterio="${c.chave}"></div>
          </div>`
          )
          .join('')}
        <button class="btn btn-principal btn-largo" style="margin-top:16px" data-salvar>Salvar avaliação</button>
      </div>
    `);

    function pintarEstrelas() {
      corpo.querySelectorAll('.estrelas').forEach((linha) => {
        const chave = linha.dataset.criterio;
        linha.innerHTML = [1, 2, 3, 4, 5]
          .map((n) => `<button class="estrela ${n <= rascunho[chave] ? 'on' : ''}" data-v="${n}">★</button>`)
          .join('');
        linha.querySelectorAll('.estrela').forEach((s) => {
          s.onclick = () => {
            rascunho[chave] = Number(s.dataset.v);
            pintarEstrelas();
          };
        });
      });
    }
    pintarEstrelas();

    const m = modal({ titulo: `Avaliar "${t.title}"`, sub: 'De 1 a 5 em cada critério.', corpo });

    corpo.querySelector('[data-salvar]').onclick = async () => {
      if (!rascunho.enrolacao || !rascunho.tiragem || !rascunho.visual) {
        aviso('Dá nota nos três critérios.', 'erro');
        return;
      }
      try {
        const r = await api.post(`/api/topicos/${t.id}/avaliar`, rascunho);
        t = store.guardarTopico(r.topico);
        pintarNotas();
        m.fechar();
        aviso('Avaliação salva!', 'ok');
      } catch (err) {
        aviso(err.message, 'erro');
      }
    };
  }

  // ---------- ao vivo ----------
  ouvirNaTela('resposta_nova', (msg) => {
    if (msg.topicId !== t.id) return;
    if (respostas.some((r) => r.id === msg.resposta.id)) return;
    respostas.push(msg.resposta);
    pintarRespostas();
  });
  ouvirNaTela('nota_nova', (msg) => {
    if (msg.topico.id !== t.id) return;
    t = store.guardarTopico({ ...msg.topico, myRating: t.myRating, isMine: t.isMine });
    pintarNotas();
  });
  ouvirNaTela('resposta_apagada', (msg) => {
    if (msg.topicId !== t.id) return;
    respostas = respostas.filter((r) => r.id !== msg.replyId);
    pintarRespostas();
  });

  return { node, titulo: t.sectionName, voltar: true, aba: 'forum' };
}
