// Abrir um tópico. A tela muda conforme a seção: texto normal, ou vídeo
// (arquivo do celular ou link do YouTube).

import { api } from '../core/api.js';
import { el, esc, aviso, vazio, capaDoVideo } from '../core/ui.js';
import { store } from '../core/store.js';
import { ir } from '../core/router.js';

export async function render({ slug }) {
  if (!store.secoes.length) {
    const { secoes, categorias } = await api.get('/api/secoes');
    store.secoes = secoes;
    store.categorias = categorias;
  }

  const secao = store.secaoPorSlug(slug);
  if (!secao) {
    return {
      node: el(`<div class="conteudo">${vazio({ emoji: '🤔', titulo: 'Seção não encontrada' })}</div>`),
      titulo: 'Ops',
      voltar: true,
    };
  }
  if (secao.kind === 'captura') {
    ir('/capturar', { substituir: true });
    return { node: el('<div class="conteudo"></div>'), titulo: 'Capturar', voltar: true };
  }

  const ehVideo = secao.kind === 'video';
  const { videoMB } = await api.get('/api/midia/limites').catch(() => ({ videoMB: 40 }));

  const node = el(`
    <div class="conteudo">
      <div class="flex meio g10" style="margin-bottom:18px">
        <span style="font-size:26px">${secao.emoji}</span>
        <div>
          <h1 style="font-size:18px">${ehVideo ? 'Postar um vídeo' : 'Abrir tópico'}</h1>
          <p class="muted" style="font-size:12.5px">em ${esc(secao.name)}</p>
        </div>
      </div>

      <form id="form-novo">
        <div class="campo">
          <label>Título</label>
          <input class="entrada" id="in-titulo" maxlength="120" required
                 placeholder="${ehVideo ? 'ex: Como enrolar sem babar no papel' : 'ex: Qual papel vocês usam?'}" />
          <div class="contador"><span id="c-titulo">0</span>/120</div>
        </div>

        ${
          ehVideo
            ? `
        <div class="campo">
          <label>O vídeo</label>
          <button type="button" class="enviar-video-caixa" id="area-video" style="width:100%">
            <div class="emoji">🎬</div>
            <p><b style="color:var(--text)">Toca pra escolher um vídeo</b><br />MP4, WEBM ou MOV — até ${videoMB}MB</p>
          </button>
          <input type="file" id="in-video" accept="video/mp4,video/webm,video/quicktime" class="oculto" />
          <div class="progresso oculto" id="barra"><i style="width:0%"></i></div>
        </div>

        <div class="divisor">ou</div>

        <div class="campo">
          <label>Link do YouTube</label>
          <input class="entrada" id="in-link" type="url" placeholder="https://youtube.com/watch?v=..." />
          <div class="ajuda">Vídeo grande demais? Sobe no YouTube (pode ser "não listado") e cola o link aqui.</div>
        </div>`
            : ''
        }

        <div class="campo">
          <label>${ehVideo ? 'Descrição (opcional)' : 'Texto'}</label>
          <textarea class="area" id="in-corpo" maxlength="5000"
                    placeholder="${ehVideo ? 'Conta o que tem no vídeo...' : 'Escreve aí...'}"></textarea>
        </div>

        <button type="submit" class="btn btn-principal btn-largo" id="bt-publicar">Publicar</button>
      </form>
    </div>
  `);

  const titulo = node.querySelector('#in-titulo');
  const corpo = node.querySelector('#in-corpo');
  const botao = node.querySelector('#bt-publicar');

  titulo.addEventListener('input', () => {
    node.querySelector('#c-titulo').textContent = titulo.value.length;
  });

  let arquivoVideo = null;
  let capaGerada = null;
  if (ehVideo) {
    const area = node.querySelector('#area-video');
    const input = node.querySelector('#in-video');
    area.onclick = () => input.click();
    input.onchange = () => {
      arquivoVideo = input.files[0] || null;
      if (!arquivoVideo) return;
      const mb = (arquivoVideo.size / 1024 / 1024).toFixed(1);
      if (arquivoVideo.size > videoMB * 1024 * 1024) {
        aviso(`Esse vídeo tem ${mb}MB — o limite é ${videoMB}MB. Manda o link do YouTube.`, 'erro');
        arquivoVideo = null;
        input.value = '';
        return;
      }
      area.classList.add('tem-arquivo');
      area.innerHTML = `
        <div class="emoji">✅</div>
        <p><b style="color:var(--text)">${esc(arquivoVideo.name)}</b><br />${mb}MB — toca pra trocar</p>
      `;

      // capa do vídeo, pra ele não aparecer como um quadrado preto na lista
      capaDoVideo(arquivoVideo).then((capa) => {
        if (!capa || input.files[0] !== arquivoVideo) return;
        capaGerada = capa;
        area.innerHTML = `
          <img src="${capa}" alt="" style="border-radius:10px;margin:0 auto 10px;max-height:120px" />
          <p><b style="color:var(--text)">${esc(arquivoVideo.name)}</b><br />${mb}MB — toca pra trocar</p>
        `;
      });
    };
  }

  node.querySelector('#form-novo').onsubmit = async (e) => {
    e.preventDefault();
    const dados = {
      secao: slug,
      title: titulo.value.trim(),
      body: corpo.value.trim(),
    };

    if (!dados.title) {
      aviso('Falta o título.', 'erro');
      return;
    }

    botao.disabled = true;
    try {
      if (ehVideo) {
        const link = node.querySelector('#in-link').value.trim();
        if (!arquivoVideo && !link) {
          aviso('Escolhe um vídeo ou cola um link do YouTube.', 'erro');
          botao.disabled = false;
          return;
        }
        if (arquivoVideo) {
          const barra = node.querySelector('#barra');
          barra.classList.remove('oculto');
          botao.textContent = 'Enviando o vídeo...';
          const { videoPath } = await api.enviarVideo(arquivoVideo, (p) => {
            barra.querySelector('i').style.width = `${Math.round(p * 100)}%`;
            botao.textContent = `Enviando o vídeo... ${Math.round(p * 100)}%`;
          });
          dados.videoPath = videoPath;
          if (capaGerada) dados.thumbDataUrl = capaGerada;
        } else {
          dados.videoUrl = link;
        }
      }

      botao.textContent = 'Publicando...';
      const { topico } = await api.post('/api/topicos', dados);
      store.guardarTopico(topico);
      aviso('Publicado!', 'ok');
      ir(`/t/${topico.id}`, { substituir: true });
    } catch (err) {
      aviso(err.message, 'erro');
      botao.disabled = false;
      botao.textContent = 'Publicar';
      node.querySelector('#barra')?.classList.add('oculto');
    }
  };

  return { node, titulo: ehVideo ? 'Novo vídeo' : 'Novo tópico', voltar: true, aba: 'forum' };
}
