// Roteador por hash (#/forum, #/t/12, #/u/arthur). Hash em vez de History API
// de propósito: assim o site funciona igual em qualquer hospedagem, sem
// precisar configurar redirecionamento no servidor.

const rotas = [];
let aoTrocar = null;

export function rota(padrao, tela) {
  const partes = padrao.split('/').filter(Boolean);
  rotas.push({ partes, tela, padrao });
}

export function aoNavegar(fn) {
  aoTrocar = fn;
}

export function ir(caminho, { substituir = false } = {}) {
  const alvo = '#' + (caminho.startsWith('/') ? caminho : '/' + caminho);
  if (location.hash === alvo) {
    resolver();
    return;
  }
  if (substituir) {
    // replaceState não dispara hashchange, então a tela é trocada na mão
    history.replaceState(null, '', alvo);
    resolver();
  } else {
    location.hash = alvo;
  }
}

export function voltar() {
  if (history.length > 1) history.back();
  else ir('/forum');
}

export function caminhoAtual() {
  return location.hash.replace(/^#/, '') || '/forum';
}

function casar(caminho) {
  const [semQuery, queryCrua = ''] = caminho.split('?');
  const partes = semQuery.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryCrua));

  for (const r of rotas) {
    if (r.partes.length !== partes.length) continue;
    const params = {};
    let bate = true;
    for (let i = 0; i < r.partes.length; i++) {
      const molde = r.partes[i];
      if (molde.startsWith(':')) params[molde.slice(1)] = decodeURIComponent(partes[i]);
      else if (molde !== partes[i]) { bate = false; break; }
    }
    if (bate) return { tela: r.tela, params, query, padrao: r.padrao };
  }
  return null;
}

let resolvendo = false;

export async function resolver() {
  if (resolvendo) return;
  resolvendo = true;
  try {
    const caminho = caminhoAtual();
    const achou = casar(caminho);
    if (aoTrocar) await aoTrocar(achou, caminho);
  } finally {
    resolvendo = false;
  }
}

let ligado = false;

// Pode ser chamado no boot (já logado) ou logo depois do login — nos dois
// casos o ouvinte de hashchange precisa existir, e só uma vez.
export function iniciar() {
  if (!ligado) {
    window.addEventListener('hashchange', resolver);
    ligado = true;
  }
  if (!location.hash || location.hash === '#') history.replaceState(null, '', '#/forum');
  return resolver();
}
