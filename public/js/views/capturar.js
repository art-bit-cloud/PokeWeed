// Captura: câmera em tela cheia, pokébola pra fotografar, animação com as
// folhinhas e aí o formulário do registro.

import { api } from '../core/api.js';
import { el, esc, aviso } from '../core/ui.js';
import { store } from '../core/store.js';
import { ir, voltar } from '../core/router.js';
import * as camera from '../core/camera.js';

export async function render() {
  if (!store.categorias.length) {
    const { secoes, categorias } = await api.get('/api/secoes');
    store.secoes = secoes;
    store.categorias = categorias;
  }

  const node = el(`
    <div class="tela-cheia camera-tela">
      <div class="camera-topo">
        <button class="topo-voltar" data-sair title="Sair">←</button>
        <b style="font-size:15px">Capturar</b>
        <span style="margin-left:auto">
          <button class="icone-btn" data-virar title="Virar a câmera" style="color:#fff">🔄</button>
        </span>
      </div>

      <div class="camera-palco" id="palco">
        <video id="cam" autoplay playsinline muted></video>
        <img class="previa oculto" id="previa" alt="Foto capturada" />
        <div class="camera-dica" id="dica">Aponta pro beck/cota e toca na pokébola</div>
      </div>

      <div class="camera-baixo" id="baixo">
        <button class="pokebola" id="bt-foto" title="Capturar">
          <svg class="pokebola-folha" viewBox="0 0 64 64"><g transform="translate(32 46)" fill="#5ede7c"><use href="#folha-maconha" /></g></svg>
        </button>
      </div>

      <div class="conteudo oculto" id="form-area" style="overflow-y:auto;padding-top:18px">
        <h2 style="margin-bottom:14px">Registra a captura</h2>
        <form id="form-captura">
          <div class="campo">
            <label>Apelido</label>
            <input class="entrada" id="in-apelido" maxlength="120" required placeholder='ex: "Fininho de sexta"' />
          </div>
          <div class="campo">
            <label>Tipo</label>
            <select class="entrada" id="in-tipo"></select>
          </div>
          <div class="campo">
            <label>Quantidade <span class="muted" style="text-transform:none">(opcional)</span></label>
            <input class="entrada" id="in-qtd" maxlength="30" placeholder='ex: "2g", "1 unidade"' />
          </div>
          <div class="campo">
            <label>Comentário <span class="muted" style="text-transform:none">(opcional)</span></label>
            <textarea class="area" id="in-obs" maxlength="5000" style="min-height:80px"
                      placeholder="Como ficou? De onde veio?"></textarea>
          </div>
          <div class="flex g8">
            <button type="button" class="btn btn-fantasma" id="bt-refazer">↺ Refazer</button>
            <button type="submit" class="btn btn-principal crescer" id="bt-registrar">Registrar no fórum</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const video = node.querySelector('#cam');
  const previa = node.querySelector('#previa');
  const palco = node.querySelector('#palco');
  const dica = node.querySelector('#dica');
  const baixo = node.querySelector('#baixo');
  const formArea = node.querySelector('#form-area');
  const btFoto = node.querySelector('#bt-foto');

  node.querySelector('#in-tipo').innerHTML = store.categorias
    .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
    .join('');

  let foto = null;
  let ligada = false;

  async function ligarCamera() {
    try {
      await camera.ligar(video);
      ligada = true;
      dica.textContent = 'Aponta pro beck/cota e toca na pokébola';
    } catch {
      ligada = false;
      dica.innerHTML = 'Não consegui abrir a câmera.<br />Confere a permissão do navegador — e lembra que a câmera só funciona em HTTPS.';
    }
  }

  node.querySelector('[data-virar]').onclick = async () => {
    if (!ligada) return;
    try {
      await camera.virar(video);
    } catch {
      aviso('Só achei uma câmera nesse aparelho.', 'erro');
    }
  };

  node.querySelector('[data-sair]').onclick = () => {
    camera.desligar();
    voltar();
  };

  btFoto.onclick = async () => {
    // se a pessoa for rápida e tocar antes da câmera abrir, tenta abrir na hora
    if (!ligada) {
      await ligarCamera();
      if (!ligada) {
        aviso('A câmera ainda não abriu. Confere a permissão.', 'erro');
        return;
      }
    }

    btFoto.classList.add('girando');
    foto = camera.tirarFoto(video);
    previa.src = foto;
    previa.classList.remove('oculto');
    video.classList.add('oculto');
    dica.classList.add('oculto');

    await camera.animarCaptura(palco);

    btFoto.classList.remove('girando');
    camera.desligar();
    ligada = false;
    baixo.classList.add('oculto');
    palco.style.flex = '0 0 auto';
    palco.style.height = '38vh';
    formArea.classList.remove('oculto');
    node.querySelector('#in-apelido').focus();
  };

  node.querySelector('#bt-refazer').onclick = async () => {
    foto = null;
    previa.classList.add('oculto');
    video.classList.remove('oculto');
    dica.classList.remove('oculto');
    formArea.classList.add('oculto');
    baixo.classList.remove('oculto');
    palco.style.flex = '1';
    palco.style.height = '';
    await ligarCamera();
  };

  node.querySelector('#form-captura').onsubmit = async (e) => {
    e.preventDefault();
    if (!foto) return;
    const botao = node.querySelector('#bt-registrar');
    botao.disabled = true;
    botao.textContent = 'Registrando...';
    try {
      const { topico } = await api.post('/api/topicos', {
        secao: 'capturas',
        title: node.querySelector('#in-apelido').value.trim(),
        body: node.querySelector('#in-obs').value.trim(),
        category: node.querySelector('#in-tipo').value,
        quantity: node.querySelector('#in-qtd').value.trim(),
        photoDataUrl: foto,
      });
      store.guardarTopico(topico);
      aviso('Capturado! Já tá no fórum.', 'ok');
      ir(`/t/${topico.id}`, { substituir: true });
    } catch (err) {
      aviso(err.message, 'erro');
      botao.disabled = false;
      botao.textContent = 'Registrar no fórum';
    }
  };

  return {
    node,
    semCasca: true,
    aoMontar: ligarCamera,
    aoSair: () => camera.desligar(),
  };
}
