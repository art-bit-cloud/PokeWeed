// Gera (e guarda) um certificado HTTPS autoassinado válido pro localhost e pra
// todos os IPs da rede local. É o que permite testar a câmera no celular sem
// depender de ngrok nem de host externa — getUserMedia só funciona em HTTPS.
//
// Em produção isso não é usado: a hospedagem cuida do HTTPS na frente.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CERT_DIR = path.join(__dirname, '..', 'certs');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');

function getLocalIPv4Addresses() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

async function gerar() {
  const selfsigned = require('selfsigned');
  const ips = getLocalIPv4Addresses();

  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    ...ips.map((ip) => ({ type: 7, ip })),
  ];

  const agora = new Date();
  const daqui2anos = new Date(agora.getTime() + 730 * 24 * 60 * 60 * 1000);

  const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    keySize: 2048,
    algorithm: 'sha256',
    notBeforeDate: agora,
    notAfterDate: daqui2anos,
    extensions: [{ name: 'subjectAltName', altNames }],
  });

  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(CERT_FILE, pems.cert);
  fs.writeFileSync(KEY_FILE, pems.private);
  return { cert: pems.cert, key: pems.private };
}

async function getOrCreateCert() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    return { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) };
  }
  return gerar();
}

module.exports = { getOrCreateCert, getLocalIPv4Addresses };
