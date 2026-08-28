// Tela de entrada. Só usuário e senha — é um fórum fechado entre amigos.

import { api } from '../core/api.js';
import { el, $ } from '../core/ui.js';

export function telaLogin(aoEntrar) {
  const node = el(`
    <div class="login">
      <div class="login-caixa">
        <div class="login-marca">
          <div class="bola-logo"><span>🍁</span></div>
          <h1>Poke<em>Weed</em></h1>
          <p>O fórum do bonde. Capture, mostre, ensine, avalie.</p>
        </div>

        <div class="login-abas">
          <button class="aba ativa" data-modo="entrar">Entrar</button>
          <button class="aba" data-modo="criar">Criar conta</button>
        </div>

        <form id="form-auth" autocomplete="on">
          <div class="campo">
            <input class="entrada" type="text" name="username" id="in-user"
                   placeholder="seu nome no fórum" autocomplete="username" required />
          </div>
          <div class="campo">
            <input class="entrada" type="password" name="password" id="in-senha"
                   placeholder="senha" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-principal btn-largo" id="bt-auth">Entrar</button>
        </form>

        <div class="login-erro" id="auth-erro"></div>
        <p class="login-nota">Sem e-mail, sem confirmação, sem enrolação.<br />Escolha qualquer nome — o que a galera te chama.</p>
      </div>
    </div>
  `);

  let modo = 'entrar';
  const erro = $('#auth-erro', node);
  const botao = $('#bt-auth', node);
  const senha = $('#in-senha', node);

  node.querySelectorAll('.aba').forEach((aba) => {
    aba.onclick = () => {
      modo = aba.dataset.modo;
      node.querySelectorAll('.aba').forEach((a) => a.classList.toggle('ativa', a === aba));
      botao.textContent = modo === 'entrar' ? 'Entrar' : 'Criar minha conta';
      senha.setAttribute('autocomplete', modo === 'entrar' ? 'current-password' : 'new-password');
      senha.placeholder = modo === 'entrar' ? 'senha' : 'senha (mín. 4 caracteres)';
      erro.textContent = '';
    };
  });

  $('#form-auth', node).onsubmit = async (e) => {
    e.preventDefault();
    erro.textContent = '';
    botao.disabled = true;
    botao.textContent = 'Aguenta aí...';
    try {
      const rota = modo === 'entrar' ? '/api/entrar' : '/api/registrar';
      const eu = await api.post(rota, {
        username: $('#in-user', node).value,
        password: senha.value,
      });
      aoEntrar(eu);
    } catch (err) {
      erro.textContent = err.message;
      botao.disabled = false;
      botao.textContent = modo === 'entrar' ? 'Entrar' : 'Criar minha conta';
    }
  };

  return node;
}
