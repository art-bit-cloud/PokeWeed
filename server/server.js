// PokeWeed — fórum do bonde.
//
// Monta o Express, as rotas e o WebSocket. A lógica de verdade fica em
// rotas/ (o que cada endereço faz), db/ (acesso ao banco) e lib/ (as peças
// soltas: senha, sessão, mídia, embed, certificado).

const express = require('express');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const dados = require('./dados');
const sessao = require('./lib/sessao');
const realtime = require('./lib/realtime');
const { getOrCreateCert, getLocalIPv4Addresses } = require('./lib/https-cert');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const usaHttps = process.env.HTTPS === '1';

const app = express();
app.set('trust proxy', 1);

// Quem está logado — precisa vir antes de qualquer rota.
app.use(sessao.anexarUsuario);

// O upload de vídeo tem que vir ANTES do express.json, senão o corpo do
// arquivo seria consumido como se fosse JSON.
app.use('/api/midia', require('./rotas/midia'));

app.use(express.json({ limit: '12mb' }));

// Arquivos enviados pela galera (fotos, avatares, banners, vídeos). O
// express.static já responde Range, que é o que permite arrastar a barrinha
// do vídeo sem baixar tudo.
app.use(
  '/midia',
  express.static(dados.MEDIA_DIR, {
    maxAge: '30d',
    immutable: true,
    fallthrough: false,
  })
);

app.use('/api', require('./rotas/auth'));
app.use('/api', require('./rotas/forum'));
app.use('/api', require('./rotas/perfil'));
app.use('/api', require('./rotas/ranking'));
app.use('/api', require('./rotas/personagem'));

// O site em si.
app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }));

// Qualquer rota do app (que não seja /api nem /midia) devolve o index — o
// roteamento acontece no navegador.
app.get(/^(?!\/api|\/midia).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, _req, res, _next) => {
  if (err && err.status === 404) return res.status(404).json({ error: 'Arquivo não encontrado.' });
  console.error('[erro]', err);
  res.status(500).json({ error: 'Deu ruim aqui no servidor.' });
});

async function iniciar() {
  const servidor = usaHttps
    ? https.createServer(await getOrCreateCert(), app)
    : http.createServer(app);

  realtime.conectar(servidor);

  // Backup do banco de 6 em 6 horas enquanto estiver no ar (o de ligar já foi
  // feito pelo dados.js).
  setInterval(() => dados.fazerBackup(), 6 * 60 * 60 * 1000).unref();

  servidor.listen(PORT, () => {
    const esquema = usaHttps ? 'https' : 'http';
    console.log(`\nPokeWeed rodando em ${esquema}://localhost:${PORT}`);
    console.log(`\nSeus dados ficam em:\n  ${dados.DATA_DIR}`);
    console.log('Essa pasta fica FORA do app de propósito: trocar a pasta do PokeWeed não mexe nos dados.');

    if (dados.migracao) {
      console.log(`\n>> Achei um PokeWeed antigo e trouxe os dados (${dados.migracao.fotos} foto(s)).`);
    }

    if (usaHttps) {
      const ips = getLocalIPv4Addresses();
      if (ips.length) {
        console.log('\nPra abrir no celular (mesma Wi-Fi do PC):');
        ips.forEach((ip) => console.log(`  https://${ip}:${PORT}`));
        console.log(
          '\nO navegador vai avisar que o certificado não é confiável na primeira vez — é esperado.\n' +
            'Toca em "Avançado" e depois em "Continuar mesmo assim". Só precisa fazer isso uma vez por celular.'
        );
      }
    }
  });
}

iniciar().catch((err) => {
  console.error('Não consegui subir o servidor:', err);
  process.exit(1);
});
