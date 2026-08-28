// Editar o próprio perfil: banner, foto, frase, bio, cor de destaque e a
// música que toca quando alguém entra na sua página.

import { api } from '../core/api.js';
import { el, esc, avatar, aviso, imagemParaDataUrl, confirmar } from '../core/ui.js';
import { store } from '../core/store.js';
import { ir } from '../core/router.js';

const CORES = ['#57e08a', '#f0555a', '#5aa9f8', '#f3c24d', '#a78bfa', '#fb923c', '#f472b6', '#2dd4bf'];

export async function render() {
  const { perfil: p } = await api.get(`/api/perfil/${encodeURIComponent(store.eu.username)}`);
  const estado = {
    accent: p.accent || CORES[0],
    avatarDataUrl: null,
    bannerDataUrl: null,
    removerBanner: false,
  };

  const node = el(`
    <div class="conteudo">
      <div class="editor-banner" id="banner"
           style="${p.bannerPath ? `background-image:url('${esc(p.bannerPath)}')` : ''}">
        <div class="sobrepor"><span style="font-size:22px">🖼️</span><span>Trocar capa</span></div>
      </div>
      <input type="file" id="in-banner" accept="image/*" class="oculto" />

      <div class="editor-avatar-linha">
        <button id="bt-avatar" style="background:none;border:none;padding:0;position:relative">
          <span id="slot-avatar">${avatar(p, 88, { classe: 'editor-avatar' })}</span>
          <span style="position:absolute;right:0;bottom:2px;width:28px;height:28px;border-radius:999px;
                       background:var(--surface-3);border:2px solid var(--bg);display:grid;place-items:center;font-size:13px">📷</span>
        </button>
        <div>
          <div style="font-weight:750;font-size:16px">${esc(p.username)}</div>
          <div class="muted" style="font-size:12.5px">toca pra trocar a foto</div>
        </div>
      </div>
      <input type="file" id="in-avatar" accept="image/*" class="oculto" />

      <div class="campo">
        <label>Frase do perfil</label>
        <input class="entrada" id="in-status" maxlength="80" placeholder="ex: enrolador oficial do bonde"
               value="${esc(p.status || '')}" />
      </div>

      <div class="campo">
        <label>Sobre você</label>
        <textarea class="area" id="in-bio" maxlength="400" placeholder="Conta um pouco...">${esc(p.bio || '')}</textarea>
        <div class="contador"><span id="c-bio">${(p.bio || '').length}</span>/400</div>
      </div>

      <div class="campo">
        <label>Cor do seu perfil</label>
        <div class="cores" id="cores">
          ${CORES.map((c) => `<button type="button" class="cor" data-cor="${c}" style="background:${c}"></button>`).join('')}
        </div>
        <div class="ajuda">Pinta o seu banner, os números e os destaques da sua página.</div>
      </div>

      <div class="campo">
        <label>Música do perfil</label>
        <input class="entrada" id="in-musica" type="url" placeholder="link do YouTube ou Spotify"
               value="${esc(p.musicUrl || '')}" />
        <input class="entrada" id="in-musica-nome" maxlength="120" style="margin-top:8px"
               placeholder="nome da música (opcional)" value="${esc(p.musicTitle || '')}" />
        <div class="ajuda">
          Quem entrar no seu perfil vê o tocador e dá play. Celular não deixa tocar som sozinho —
          é regra do navegador, não tem como fugir.
        </div>
      </div>

      <div class="flex g8" style="margin-top:22px">
        <button class="btn btn-fantasma" id="bt-cancelar">Cancelar</button>
        <button class="btn btn-principal crescer" id="bt-salvar">Salvar perfil</button>
      </div>

      ${p.bannerPath ? '<button class="btn btn-perigo btn-largo" style="margin-top:10px" id="bt-tirar-capa">Tirar a capa</button>' : ''}

      <div style="margin-top:34px;padding-top:20px;border-top:1px solid var(--line-soft)">
        <button class="btn btn-fantasma btn-largo" id="bt-sair">⏻ Sair da conta</button>
      </div>
    </div>
  `);

  const banner = node.querySelector('#banner');
  const bio = node.querySelector('#in-bio');

  function pintarCor() {
    node.style.setProperty('--accent', estado.accent);
    node.querySelectorAll('.cor').forEach((b) => b.classList.toggle('ativa', b.dataset.cor === estado.accent));
    if (!estado.bannerDataUrl && (!p.bannerPath || estado.removerBanner)) {
      banner.style.backgroundImage = '';
      banner.style.background = `linear-gradient(140deg, ${estado.accent}, #1a241f)`;
    }
  }
  pintarCor();

  node.querySelectorAll('.cor').forEach((b) => {
    b.onclick = () => {
      estado.accent = b.dataset.cor;
      pintarCor();
    };
  });

  bio.addEventListener('input', () => {
    node.querySelector('#c-bio').textContent = bio.value.length;
  });

  // ---------- imagens ----------
  const inBanner = node.querySelector('#in-banner');
  banner.onclick = () => inBanner.click();
  inBanner.onchange = async () => {
    const arquivo = inBanner.files[0];
    inBanner.value = '';
    if (!arquivo) return;
    try {
      estado.bannerDataUrl = await imagemParaDataUrl(arquivo, { largura: 1200, proporcao: 3, qualidade: 0.82 });
      estado.removerBanner = false;
      banner.style.background = '';
      banner.style.backgroundImage = `url('${estado.bannerDataUrl}')`;
      banner.style.backgroundSize = 'cover';
      banner.style.backgroundPosition = 'center';
    } catch (err) {
      aviso(err.message, 'erro');
    }
  };

  const inAvatar = node.querySelector('#in-avatar');
  node.querySelector('#bt-avatar').onclick = () => inAvatar.click();
  inAvatar.onchange = async () => {
    const arquivo = inAvatar.files[0];
    inAvatar.value = '';
    if (!arquivo) return;
    try {
      estado.avatarDataUrl = await imagemParaDataUrl(arquivo, { largura: 420, proporcao: 1 });
      node.querySelector('#slot-avatar').innerHTML =
        `<img class="avatar av-88 editor-avatar" src="${estado.avatarDataUrl}" alt="sua foto" />`;
    } catch (err) {
      aviso(err.message, 'erro');
    }
  };

  node.querySelector('#bt-tirar-capa')?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: 'Tirar a capa?', mensagem: 'O banner volta pra cor lisa.', botao: 'Tirar' }))) return;
    estado.removerBanner = true;
    estado.bannerDataUrl = null;
    banner.style.backgroundImage = '';
    pintarCor();
    aviso('Vai sair quando você salvar.');
  });

  node.querySelector('#bt-sair').onclick = async () => {
    if (!(await confirmar({ titulo: 'Sair da conta?', mensagem: 'Você vai precisar entrar de novo com usuário e senha.', botao: 'Sair', perigo: false }))) return;
    window.pokeweedSair();
  };

  // ---------- salvar ----------
  node.querySelector('#bt-cancelar').onclick = () => ir(`/u/${store.eu.username}`);

  node.querySelector('#bt-salvar').onclick = async () => {
    const botao = node.querySelector('#bt-salvar');
    botao.disabled = true;
    botao.textContent = 'Salvando...';
    try {
      const { perfil } = await api.put('/api/perfil', {
        status: node.querySelector('#in-status').value,
        bio: bio.value,
        accent: estado.accent,
        musicUrl: node.querySelector('#in-musica').value,
        musicTitle: node.querySelector('#in-musica-nome').value,
        avatarDataUrl: estado.avatarDataUrl || undefined,
        bannerDataUrl: estado.bannerDataUrl || undefined,
        removerBanner: estado.removerBanner || undefined,
      });
      Object.assign(store.eu, perfil);
      aviso('Perfil salvo!', 'ok');
      ir(`/u/${store.eu.username}`, { substituir: true });
    } catch (err) {
      aviso(err.message, 'erro');
      botao.disabled = false;
      botao.textContent = 'Salvar perfil';
    }
  };

  return { node, titulo: 'Editar perfil', voltar: true, aba: 'perfil' };
}
