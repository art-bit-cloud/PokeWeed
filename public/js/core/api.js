// Conversa com o servidor. Toda chamada passa por aqui, então erro de rede e
// erro do servidor chegam nas telas do mesmo jeito.

async function pedir(caminho, { metodo = 'GET', corpo, cru } = {}) {
  const opcoes = {
    method: metodo,
    credentials: 'same-origin',
    headers: {},
  };

  if (cru) {
    opcoes.body = cru.arquivo;
    opcoes.headers['Content-Type'] = cru.tipo;
  } else if (corpo !== undefined) {
    opcoes.body = JSON.stringify(corpo);
    opcoes.headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(caminho, opcoes);
  } catch {
    throw new Error('Sem conexão com o servidor.');
  }

  const texto = await res.text();
  let dados = {};
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = {};
    }
  }

  if (!res.ok) {
    const erro = new Error(dados.error || `Deu erro (${res.status}).`);
    erro.status = res.status;
    throw erro;
  }
  return dados;
}

export const api = {
  get: (c) => pedir(c),
  post: (c, corpo) => pedir(c, { metodo: 'POST', corpo }),
  put: (c, corpo) => pedir(c, { metodo: 'PUT', corpo }),
  del: (c) => pedir(c, { metodo: 'DELETE' }),

  // Envio de vídeo com barra de progresso (fetch não reporta progresso de
  // upload, então aqui é XHR mesmo).
  enviarVideo(arquivo, aoProgredir) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/midia/video');
      xhr.setRequestHeader('Content-Type', arquivo.type || 'video/mp4');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && aoProgredir) aoProgredir(e.loaded / e.total);
      };
      xhr.onload = () => {
        let dados = {};
        try {
          dados = JSON.parse(xhr.responseText);
        } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(dados);
        else reject(new Error(dados.error || 'Não consegui enviar o vídeo.'));
      };
      xhr.onerror = () => reject(new Error('A conexão caiu durante o envio.'));
      xhr.send(arquivo);
    });
  },
};
