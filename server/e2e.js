// Teste de ponta a ponta num Chromium de verdade, com dois usuários ao mesmo
// tempo e uma câmera falsa. Cobre o fórum inteiro, a captura, a comunidade
// (vídeo por arquivo e por link), o perfil e a edição de perfil.

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 8099;
const BASE = `http://localhost:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-e2e-'));

const ok = [];
const fail = [];
function check(nome, cond, extra = '') {
  (cond ? ok : fail).push(nome + (extra ? ` — ${extra}` : ''));
  console.log(`${cond ? '  OK  ' : ' FALHOU '} ${nome}${extra ? ' — ' + extra : ''}`);
}

function subirServidor() {
  return new Promise((resolve) => {
    const p = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(PORT), POKEWEED_DATA: DATA },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let saida = '';
    p.stdout.on('data', (d) => { saida += d; if (saida.includes('rodando')) resolve(p); });
    p.stderr.on('data', (d) => { const s = String(d); if (!s.includes('Experimental')) process.stderr.write('[srv] ' + s); });
    setTimeout(() => resolve(p), 3000);
  });
}

async function entrar(page, usuario, senha) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.login', { timeout: 10000 });
  await page.click('.aba[data-modo="criar"]');
  await page.fill('#in-user', usuario);
  await page.fill('#in-senha', senha);
  await page.click('#bt-auth');
  await page.waitForSelector('#app', { timeout: 10000 });
  await page.waitForSelector('.hero', { timeout: 10000 });
}

async function capturar(page, apelido) {
  await page.click('.barra-capturar');
  await page.waitForSelector('.camera-tela', { timeout: 10000 });
  await page.waitForFunction(() => {
    const v = document.getElementById('cam');
    return v && v.readyState >= 2 && !v.paused;
  }, { timeout: 15000 });
  await page.click('#bt-foto');
  await page.waitForSelector('#form-area:not(.oculto)', { timeout: 10000 });
  await page.fill('#in-apelido', apelido);
  await page.fill('#in-qtd', '2g');
  await page.fill('#in-obs', 'saiu redondo demais');
  await page.click('#bt-registrar');
  await page.waitForSelector('.topico-cabeca', { timeout: 12000 });
}

// O Chromium usado nos testes é a build open source, que NÃO traz o codec
// H.264 (o do mp4 de celular). Por isso o vídeo de teste é WEBM/VP8, que ele
// consegue tocar — assim a checagem "o vídeo abre no player" mede o servidor
// e o player, não o codec que falta no navegador de teste.
function fazerVideoDeTeste() {
  const destino = path.join(DATA, 'teste.webm');
  try {
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=10',
      '-c:v', 'libvpx', '-pix_fmt', 'yuv420p', destino,
    ], { stdio: 'ignore' });
    return destino;
  } catch {
    return null;
  }
}

(async () => {
  const srv = await subirServidor();
  const browser = await chromium.launch({
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });

  try {
    const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
    const A = await ctxA.newPage();
    A.on('pageerror', (e) => check('erro de JS na tela do A', false, e.message));
    A.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) console.log('   [console A]', m.text()); });

    // ---------- 1) entrar ----------
    await entrar(A, 'arthur', 'senha123');
    check('cadastro entra direto no fórum', await A.isVisible('.hero'));
    check('as 5 seções aparecem', (await A.locator('.secao-card').count()) === 5);
    check('barra de baixo tem as 4 abas + capturar', (await A.locator('.barra-item').count()) === 4 && (await A.locator('.barra-capturar').count()) === 1);

    // ---------- 2) tópico de texto ----------
    await A.click('.secao-card:has-text("Papo geral")');
    await A.waitForSelector('.filtros');
    check('a seção abre com o botão de novo tópico', await A.isVisible('button:has-text("Abrir tópico")'));
    await A.click('button:has-text("Abrir tópico")');
    await A.waitForSelector('#form-novo');
    await A.fill('#in-titulo', 'Qual seda vocês usam?');
    await A.fill('#in-corpo', 'Tô cansado de seda que queima torto. Recomendem aí.');
    await A.click('#bt-publicar');
    await A.waitForSelector('.topico-cabeca', { timeout: 10000 });
    check('tópico de texto criado e aberto', (await A.textContent('.topico-cabeca h1')) === 'Qual seda vocês usam?');
    const urlTopico = A.url();
    const idTopico = urlTopico.split('/t/')[1];

    // ---------- 3) captura com a câmera ----------
    await capturar(A, 'Fininho de sexta');
    check('captura registrada e aberta', (await A.textContent('.topico-cabeca h1')) === 'Fininho de sexta');
    check('a foto da captura aparece', await A.isVisible('.topico-foto img'));
    check('o bloco de notas aparece na captura', await A.isVisible('.notas-resumo'));
    check('não dá pra avaliar a própria captura', await A.isVisible('.chip:has-text("é sua captura")'));
    const idCaptura = A.url().split('/t/')[1];

    // ---------- 4) vídeo por link do YouTube ----------
    await A.goto(`${BASE}/#/novo/tutoriais`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('#form-novo');
    await A.fill('#in-titulo', 'Como enrolar sem babar o papel');
    await A.fill('#in-link', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await A.fill('#in-corpo', 'Passo a passo em 3 minutos.');
    await A.click('#bt-publicar');
    await A.waitForSelector('.topico-cabeca', { timeout: 10000 });
    check('vídeo por link do YouTube publicado', await A.isVisible('.topico-video iframe'));
    const srcIframe = await A.getAttribute('.topico-video iframe', 'src');
    check('o link virou embed do YouTube', srcIframe.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ'), srcIframe);

    // ---------- 5) vídeo por arquivo ----------
    const arquivoVideo = fazerVideoDeTeste();
    if (arquivoVideo) {
      await A.goto(`${BASE}/#/novo/tutoriais`, { waitUntil: 'domcontentloaded' });
      await A.waitForSelector('#form-novo');
      await A.fill('#in-titulo', 'Vídeo enviado do celular');
      await A.setInputFiles('#in-video', arquivoVideo);
      await A.waitForSelector('.enviar-video-caixa.tem-arquivo');
      check('o arquivo escolhido aparece na caixa', (await A.textContent('#area-video')).includes('teste.webm'));
      await A.click('#bt-publicar');
      await A.waitForSelector('.topico-video video', { timeout: 20000 });
      check('vídeo enviado e tocando na página', await A.isVisible('.topico-video video'));
      const srcVideo = await A.getAttribute('.topico-video video', 'src');
      check('o vídeo foi salvo na pasta de dados', fs.existsSync(path.join(DATA, 'midia', 'videos', path.basename(srcVideo))), srcVideo);
      const tocavel = await A.evaluate(async () => {
        const v = document.querySelector('.topico-video video');
        if (v.readyState >= 1) return v.duration > 0;
        return await new Promise((r) => { v.onloadedmetadata = () => r(v.duration > 0); v.onerror = () => r(false); setTimeout(() => r(false), 5000); });
      });
      check('o vídeo enviado abre de verdade no player', tocavel);

      // o "arrastar a barrinha" do vídeo depende do servidor responder Range
      const aceitaRange = await A.evaluate(async (src) => {
        const r = await fetch(src, { headers: { Range: 'bytes=0-99' } });
        return { status: r.status, tipo: r.headers.get('content-type') };
      }, srcVideo);
      check('o servidor responde Range (dá pra arrastar a barrinha do vídeo)',
        aceitaRange.status === 206, `HTTP ${aceitaRange.status}, ${aceitaRange.tipo}`);
    } else {
      console.log('   (ffmpeg não disponível — pulei o teste de upload de arquivo)');
    }

    // ---------- 6) segundo usuário ----------
    const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
    const B = await ctxB.newPage();
    B.on('pageerror', (e) => check('erro de JS na tela do B', false, e.message));
    await entrar(B, 'zé da esquina', 'senha123');
    check('nome com espaço e acento é aceito', await B.isVisible('.hero'));

    // A fica no tópico de texto pra ver a resposta chegar ao vivo
    await A.goto(`${BASE}/#/t/${idTopico}`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('.topico-cabeca');

    await B.goto(`${BASE}/#/t/${idTopico}`, { waitUntil: 'domcontentloaded' });
    await B.waitForSelector('#form-resposta');
    await B.fill('#form-resposta textarea', 'Uso a marrom, nunca me deixou na mão');
    await B.click('#form-resposta .enviar');
    await B.waitForSelector('.resposta', { timeout: 10000 });
    check('resposta enviada', (await B.locator('.resposta').count()) === 1);

    await A.waitForFunction(() => document.querySelectorAll('.resposta').length === 1, null, { timeout: 8000 });
    check('a resposta chegou AO VIVO na tela do A', (await A.locator('.resposta').count()) === 1);

    // ---------- 7) melhor resposta ----------
    await A.click('.resposta [data-melhor]');
    await A.waitForSelector('.resposta.melhor', { timeout: 8000 });
    check('dono do tópico marca a melhor resposta', await A.isVisible('.chip:has-text("melhor resposta")'));

    // ---------- 8) curtidas ----------
    const curtidasAntes = await B.textContent(`[data-curtidas="${idTopico}"]`);
    await B.click(`[data-acao="curtir"][data-id="${idTopico}"]`);
    await B.waitForFunction((id) => document.querySelector(`[data-curtidas="${id}"]`).textContent === '1', idTopico, { timeout: 8000 });
    check('curtir funciona', (await B.textContent(`[data-curtidas="${idTopico}"]`)) === '1', `antes: ${curtidasAntes}`);
    check('o coração fica preenchido', await B.isVisible(`[data-acao="curtir"][data-id="${idTopico}"].curtido`));
    await B.click(`[data-acao="curtir"][data-id="${idTopico}"]`);
    await B.waitForFunction((id) => document.querySelector(`[data-curtidas="${id}"]`).textContent === '0', idTopico, { timeout: 8000 });
    check('descurtir também funciona', (await B.textContent(`[data-curtidas="${idTopico}"]`)) === '0');

    // ---------- 9) avaliar a captura do outro ----------
    await B.goto(`${BASE}/#/t/${idCaptura}`, { waitUntil: 'domcontentloaded' });
    await B.waitForSelector('.notas-resumo');
    await B.click('[data-avaliar]');
    await B.waitForSelector('.modal');
    for (const criterio of ['enrolacao', 'tiragem', 'visual']) {
      await B.click(`.estrelas[data-criterio="${criterio}"] .estrela[data-v="5"]`);
    }
    await B.click('[data-salvar]');
    await B.waitForSelector('.modal', { state: 'detached', timeout: 8000 });
    check('avaliação salva', (await B.textContent('.notas-resumo')).includes('5.0'));

    await A.goto(`${BASE}/#/t/${idCaptura}`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('.notas-resumo');
    check('a nota aparece pro dono da captura', (await A.textContent('#area-notas')).includes('5.0'));

    // ---------- 10) perfil do outro ----------
    await A.goto(`${BASE}/#/u/${encodeURIComponent('zé da esquina')}`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('.perfil-nome', { timeout: 10000 });
    check('dá pra ver o perfil de outra pessoa', (await A.textContent('.perfil-nome')) === 'zé da esquina');
    check('o perfil do outro NÃO mostra o botão de editar', !(await A.isVisible('[data-para="/perfil/editar"]')));
    check('o perfil mostra os números', await A.isVisible('.perfil-numeros'));

    // ---------- 11) editar o próprio perfil ----------
    await A.goto(`${BASE}/#/perfil/editar`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('#bt-salvar', { timeout: 10000 });
    await A.fill('#in-status', 'enrolador oficial do bonde');
    await A.fill('#in-bio', 'Tô aqui só pela zoeira e pelas cotas boas.');
    await A.click('.cor[data-cor="#a78bfa"]');
    await A.fill('#in-musica', 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
    await A.fill('#in-musica-nome', 'Never Gonna Give You Up');

    // foto de perfil e capa
    const png = path.join(DATA, 'foto.png');
    fs.writeFileSync(png, Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAKUlEQVR42u3NMQEAAAgDoK1/aM3g4QcpsE1yGgoKCgoKCgoKCgoKCr4KHzMBAWZm1BsAAAAASUVORK5CYII=',
      'base64'
    ));
    await A.setInputFiles('#in-avatar', png);
    await A.waitForTimeout(500);
    await A.setInputFiles('#in-banner', png);
    await A.waitForTimeout(500);
    await A.click('#bt-salvar');
    await A.waitForSelector('.perfil-nome', { timeout: 12000 });

    check('a frase do perfil salvou', (await A.textContent('.perfil-status')) === 'enrolador oficial do bonde');
    check('a bio salvou', (await A.textContent('.perfil-bio')).includes('zoeira'));
    check('a foto de perfil salvou', await A.isVisible('.perfil-avatar-caixa img.avatar'));
    const estiloBanner = await A.getAttribute('.perfil-banner', 'style');
    check('a capa salvou', estiloBanner.includes('/midia/banners/'), estiloBanner.slice(0, 60));
    const corUsada = await A.evaluate(() => getComputedStyle(document.querySelector('.perfil-status')).color);
    check('a cor escolhida pintou o perfil', corUsada.includes('167, 139, 250'), corUsada);
    check('o tocador de música aparece', await A.isVisible('.musica'));
    check('mostra o nome da música', (await A.textContent('.musica .nome')) === 'Never Gonna Give You Up');

    // o player só entra depois do toque (regra de navegador de celular)
    check('o player NÃO carrega sozinho', !(await A.isVisible('#frame-musica iframe')));
    await A.click('#bt-tocar');
    await A.waitForSelector('#frame-musica iframe', { timeout: 8000 });
    const srcMusica = await A.getAttribute('#frame-musica iframe', 'src');
    check('o toque no play carrega o Spotify', srcMusica.includes('open.spotify.com/embed/track/') && srcMusica.includes('autoplay=1'), srcMusica.slice(0, 70));

    // o outro usuário vê o perfil personalizado
    await B.goto(`${BASE}/#/u/arthur`, { waitUntil: 'domcontentloaded' });
    await B.waitForSelector('.perfil-nome', { timeout: 10000 });
    check('o outro vê a personalização do perfil', (await B.textContent('.perfil-status')) === 'enrolador oficial do bonde');
    check('o outro vê a música do perfil', await B.isVisible('.musica'));

    // ---------- 12) comunidade ----------
    await B.goto(`${BASE}/#/comunidade`, { waitUntil: 'domcontentloaded' });
    await B.waitForSelector('.comunidade-destaque', { timeout: 10000 });
    await B.waitForFunction(() => document.querySelectorAll('.topico-card').length > 0, null, { timeout: 8000 });
    check('a aba Comunidade lista os vídeos', (await B.locator('.topico-card').count()) >= 1);
    await B.click('.aba[data-aba="duvidas"]');
    await B.waitForTimeout(700);
    check('a aba de dúvidas troca a lista', await B.isVisible('.vazio, .topico-card'));

    // ---------- 13) pokédex ----------
    await A.goto(`${BASE}/#/forum`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('[data-dex]', { timeout: 10000 });
    await A.click('[data-dex]');
    await A.waitForSelector('.dex-fundo.aberta', { timeout: 5000 });
    check('a Pokédex abre', await A.isVisible('.dex-fundo'));
    check('mostra o boot antes da lista', await A.isVisible('#dex-boot'));
    await A.waitForSelector('#dex-conteudo:not(.oculto)', { timeout: 8000 });
    check('a Pokédex lista a captura do dono', (await A.locator('.dex-item').count()) === 1);
    check('mostra os números do inventário', (await A.textContent('.dex-numeros')).includes('001'));
    await A.click('#dex-fechar');
    await A.waitForTimeout(450);
    check('o botão vermelho fecha a Pokédex', !(await A.isVisible('.dex-fundo')));

    // ---------- 14) busca ----------
    await A.click('[data-para="/busca"]');
    await A.waitForSelector('#in-busca', { timeout: 8000 });
    await A.fill('#in-busca', 'seda');
    await A.waitForFunction(() => document.querySelectorAll('.topico-card').length > 0, null, { timeout: 8000 });
    check('a busca acha tópico pelo título', (await A.textContent('#resultado')).includes('Qual seda'));
    await A.fill('#in-busca', 'zé');
    await A.waitForFunction(() => document.querySelector('#resultado')?.textContent.includes('zé da esquina'), null, { timeout: 8000 });
    check('a busca acha pessoa pelo nome', (await A.textContent('#resultado')).includes('zé da esquina'));

    // ---------- 15) moderação: só o dono do fórum fixa ----------
    await B.goto(`${BASE}/#/t/${idTopico}`, { waitUntil: 'domcontentloaded' });
    await B.waitForSelector('[data-menu]');
    await B.click('[data-menu]');
    await B.waitForSelector('.modal');
    check('quem não é dono do fórum não vê "fixar"', !(await B.isVisible('[data-fixar]')));
    await B.keyboard.press('Escape');

    await A.goto(`${BASE}/#/t/${idTopico}`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('[data-menu]');
    await A.click('[data-menu]');
    await A.waitForSelector('.modal');
    check('o dono do fórum vê "fixar"', await A.isVisible('[data-fixar]'));
    await A.click('[data-fixar]');
    await A.waitForSelector('.chip:has-text("fixado")', { timeout: 8000 });
    check('fixar funciona', await A.isVisible('.chip:has-text("fixado")'));

    // ---------- 16) sobrevive ao restart ----------
    srv.kill();
    await new Promise((r) => setTimeout(r, 1000));
    const srv2 = await subirServidor();
    await A.goto(`${BASE}/#/forum`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('.hero', { timeout: 12000 });
    check('continua logado depois de reiniciar o servidor', await A.isVisible('.hero'));
    await A.waitForFunction(() => document.querySelectorAll('.topico-card').length >= 3, null, { timeout: 8000 });
    check('os tópicos continuam lá', (await A.locator('.topico-card').count()) >= 3);
    srv2.kill();

    // ---------- prints ----------
    const srv3 = await subirServidor();
    for (const [nome, rota] of [
      ['forum', '/#/forum'],
      ['secao', '/#/s/capturas'],
      ['topico', `/#/t/${idCaptura}`],
      ['comunidade', '/#/comunidade'],
      ['perfil', '/#/u/arthur'],
      ['editar', '/#/perfil/editar'],
      ['ranking', '/#/ranking'],
    ]) {
      await A.goto(BASE + rota, { waitUntil: 'domcontentloaded' });
      await A.waitForTimeout(1400);
      await A.screenshot({ path: `/tmp/tela-${nome}.png` });
    }
    await A.goto(`${BASE}/#/forum`, { waitUntil: 'domcontentloaded' });
    await A.waitForSelector('[data-dex]');
    await A.click('[data-dex]');
    await A.waitForTimeout(1900);
    await A.screenshot({ path: '/tmp/tela-pokedex.png' });
    srv3.kill();

    await ctxA.close();
    await ctxB.close();
  } catch (err) {
    check('o teste rodou até o fim', false, err.message);
    console.error(err);
  } finally {
    await browser.close();
    try { srv.kill(); } catch {}
    fs.rmSync(DATA, { recursive: true, force: true });
  }

  console.log(`\n===== ${ok.length} passaram, ${fail.length} falharam =====`);
  if (fail.length) { fail.forEach((f) => console.log('  X ' + f)); process.exit(1); }
})();
