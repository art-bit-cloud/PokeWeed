# PokeWeed 🍁

O fórum do bonde. Você captura seu beck/cota com a câmera do celular (com a
pokébola e as folhinhas voando), a galera avalia, e do lado tem um fórum de
verdade pra ensinar, perguntar e zoar.

Feito **pensando no celular primeiro** — é onde vocês vão usar 100% do tempo.
No PC funciona igual, só mais largo.

---

## O que tem

**Fórum de verdade.** Cinco seções (Capturas, Tutoriais, Dúvidas, Papo geral,
Zoeira), cada uma com tópicos e respostas em thread. Dá pra curtir tópico e
resposta, marcar a melhor resposta (quem abriu o tópico decide, e aí ele fica
com selo de resolvido), fixar tópico no topo, apagar o que é seu, ordenar por
movimento/novos/bombando, e buscar por tópico ou por pessoa.

**Capturar.** O botão do meio da barra de baixo abre a câmera em tela cheia.
Toca na pokébola, a animação roda com as folhinhas, e aí você dá um apelido,
escolhe o tipo e registra. Vira um tópico na seção Capturas, onde os outros
avaliam em Enrolação, Tiragem e Visual (1 a 5 cada). Ninguém avalia a própria.

**Comunidade.** Vídeos e dúvidas num lugar só. No vídeo dá pra **enviar o
arquivo do celular** (até 40MB, e o app tira uma capa do próprio vídeo
sozinho) **ou colar um link do YouTube**, que vira player embutido. Vídeo
enviado toca direto na página e dá pra arrastar a barrinha normalmente.

**Perfis.** Dá pra abrir o perfil de qualquer pessoa tocando no nome ou no
avatar em qualquer lugar. Cada um monta o seu: **capa (banner), foto de
perfil, frase, bio, cor de destaque** (que pinta o perfil inteiro) e **uma
música** — cola o link do YouTube ou do Spotify e o tocador aparece na sua
página. As abas do perfil mostram suas capturas em grade, seus tópicos e suas
respostas.

> Sobre a música tocar sozinha: **não dá, e não é limitação do app.** Navegador
> de celular (Chrome, Safari, todos) bloqueia som automático em página que
> acabou de abrir — é regra deles, pra ninguém levar susto. Por isso o perfil
> mostra um tocador bonito com o botão de play: um toque e a música começa.

**Pokédex.** O ícone da Pokédex no topo abre seu inventário pessoal em tela
cheia: o aparelho abre girando, as luzinhas piscam, a tela liga tipo TV de
tubo e lista só as **suas** capturas, numeradas, com seus números (registros,
média, avaliações).

**Ranking.** Top capturadores, melhor avaliados e mais curtidos.

**Tudo ao vivo.** Tópico novo, resposta, curtida e avaliação aparecem na tela
de quem estiver com o app aberto, sem refresh.

---

## 🔒 Onde ficam suas contas e posts (leia isso)

**Seus dados não ficam dentro da pasta do PokeWeed.** Ficam separados:

| Sistema | Pasta |
| --- | --- |
| Windows | `C:\Users\<você>\AppData\Local\PokeWeed` (cole `%LOCALAPPDATA%\PokeWeed` no Explorer) |
| macOS | `~/Library/Application Support/PokeWeed` |
| Linux | `~/.pokeweed` |
| Hospedagem | o que estiver em `DATA_DIR` (ex: `/dados`) |

Lá dentro: `pokeweed.db` (contas, tópicos, respostas, notas), `midia/` (fotos,
avatares, banners, vídeos) e `backups/`.

Isso é de propósito: **atualizar o PokeWeed não encosta nos dados.** Baixar uma
versão nova e trocar a pasta é seguro. Além disso, toda vez que o servidor liga
(e de 6 em 6 horas enquanto estiver no ar) ele guarda uma cópia do banco em
`backups/`, mantendo as 20 mais recentes.

Pra ver o que está guardado, entra na pasta `server` e roda `npm run dados`.

### Perdi as contas — como volto?

Se você tiver um `pokeweed.db` antigo em algum lugar (pasta velha, Lixeira,
pendrive, backup):

- **Windows, jeito fácil:** duplo-clique em `server\restaurar.bat`, arrasta o
  arquivo pra janela e dá Enter. Ele também pede a pasta de mídia antiga.
- **Linha de comando:** `cd server` e depois
  `npm run restaurar -- "/caminho/do/pokeweed.db" "/caminho/da/midia"`
- **Automático:** põe o `pokeweed.db` antigo em `server/pokeweed.db` e liga o
  app — ele adota esse banco sozinho na primeira vez, e mantém o arquivo antigo
  como reserva.

O `restaurar` confere que o arquivo é mesmo um banco do PokeWeed, mostra o que
tem dentro antes de mexer, e guarda o banco atual nos backups. Se você apontar
pra um arquivo que não é banco, ele recusa em vez de estragar o que está
valendo.

---

## Rodar no seu PC

**Windows, sem digitar comando:** duplo-clique em `server\iniciar.bat`. Ele
instala na primeira vez e abre o navegador sozinho. Só precisa ter o
[Node.js](https://nodejs.org) (versão LTS) instalado antes.

**Mac/Linux:**
```bash
cd server
npm install
npm start
```

> Não adianta abrir o `public/index.html` no navegador direto. O app tem login,
> banco e arquivos — precisa do servidor rodando por trás.

### Testar no celular (com a câmera funcionando)

A câmera do navegador só funciona em HTTPS ou em `localhost`. O `iniciar.bat`
já sobe com HTTPS usando um certificado gerado na hora. Na janela preta vai
aparecer:

```
Pra abrir no celular (mesma Wi-Fi do PC):
  https://192.168.x.x:8080
```

Digita esse endereço no celular (mesma Wi-Fi). O navegador vai dizer que a
conexão "não é privada" — é esperado, é o certificado local. Toca em
"Avançado" → "Continuar mesmo assim". Uma vez por celular.

No Mac/Linux é `HTTPS=1 npm start`.

---

## Colocar num host de verdade

**Regra número um:** precisa ser hospedagem que roda **Node.js**. Netlify,
Vercel (modo estático), GitHub Pages e hospedagem compartilhada de PHP
(Hostinger, cPanel) **não servem** — elas só entregam arquivo parado e nunca
ligam o `server.js`. A página até abre, mas nada funciona.

**Regra número dois:** precisa de **disco persistente**, apontado por
`DATA_DIR`. Sem isso, todo deploy zera contas, fotos e vídeos.

### Opção 1 — Render (mais fácil)

1. Joga o projeto num repositório do GitHub.
2. No [render.com](https://render.com): **New → Blueprint**, aponta pro repo.
   O `render.yaml` que já está aqui cria o serviço e o disco sozinho.
3. Espera o deploy e pronto — HTTPS já vem de graça.

O plano gratuito do Render **não tem disco persistente**, então pro PokeWeed
precisa do plano pago mais barato (o `starter` do `render.yaml`). Sem disco,
funciona, mas apaga tudo a cada deploy.

### Opção 2 — VPS com Docker (mais barato a longo prazo)

Numa VPS (Contabo, Hetzner, Oracle Free Tier) com Docker:

```bash
docker build -t pokeweed .
docker run -d --name pokeweed --restart unless-stopped \
  -p 8080:8080 -v pokeweed-dados:/dados pokeweed
```

O `-v pokeweed-dados:/dados` é o que salva seus dados. Pra ter HTTPS com
domínio, põe um [Caddy](https://caddyserver.com) na frente — ele cuida do
certificado sozinho:

```
seu-dominio.com {
    reverse_proxy localhost:8080
}
```

### Opção 3 — Railway / Fly.io

Os dois leem o `Dockerfile` direto.

No **Railway**: crie o serviço a partir do repositório, abre a aba **Volumes**
e cria um volume montado em `/dados`, depois em **Variables** define
`DATA_DIR=/dados`. (O Dockerfile já assume `/dados` por padrão, mas definir a
variável explicitamente evita depender disso.)

No **Fly.io**: `fly volumes create pokeweed_dados` e monta em `/dados` no
`fly.toml`, com `DATA_DIR=/dados` nas variáveis do app.

### Variáveis

Estão explicadas em `.env.exemplo`. As que importam: `PORT`, `DATA_DIR`,
`MAX_VIDEO_MB`, `MAX_IMAGE_MB`. (`POKEWEED_DATA` é o nome antigo da mesma
variável — ainda funciona, é o que o `render.yaml` usa pro Render.)

**Quanto de disco?** Foto de captura fica em ~150KB. Vídeo de 40MB é o teto.
5GB seguram tranquilamente uns 100 vídeos e milhares de fotos. Se apertar,
peça pra galera usar link do YouTube nos vídeos longos.

---

## Como é feito por dentro

Sem framework, sem build, sem passo de compilação. Você edita um arquivo,
recarrega a página, funciona.

```
pokeweed/
  Dockerfile            imagem pronta pra qualquer host com Docker
  render.yaml           configuração pronta do Render
  .env.exemplo          as variáveis explicadas

  server/
    server.js           monta o Express, as rotas e o WebSocket
    dados.js            DECIDE ONDE FICAM os dados (fora do app) + backups
    rotas/
      auth.js           entrar, criar conta, sair
      forum.js          seções, tópicos, respostas, curtidas, notas, busca
      perfil.js         ver perfil dos outros e editar o seu
      midia.js          envio de vídeo
      ranking.js
    db/
      index.js          conexão, schema e as seções iniciais
      users.js  sections.js  topics.js  replies.js  likes.js  ratings.js
    lib/
      auth.js           senha com scrypt
      sessao.js         cookie de sessão
      midia.js          salvar foto e vídeo, com limites
      embed.js          link do YouTube/Spotify -> player embutido
      realtime.js       WebSocket
      https-cert.js     certificado local pra testar a câmera no celular
    iniciar.bat  restaurar.bat  restaurar.js  onde-estao-os-dados.js
    e2e.js              o teste de ponta a ponta (roda com: npm i -D playwright && node e2e.js)

  public/
    index.html
    css/  base.css  layout.css  components.css  views.css
    js/
      app.js            junta tudo: casca, rotas, cliques globais
      core/  api.js  ui.js  store.js  router.js  realtime.js  cards.js  camera.js
      views/ auth  forum  secao  topico  novo  capturar  comunidade
             perfil  editar  ranking  busca  pokedex
```

- **Banco**: `node:sqlite`, que já vem dentro do Node — sem instalar banco
  nenhum, sem compilar nada.
- **Senha**: `scrypt` com sal por usuário. Sessão em cookie `httpOnly` guardado
  no banco, nada de token exposto no JavaScript.
- **Vídeo**: sobe em pedaços direto pro disco (nunca segura 40MB na memória) e
  é servido com suporte a Range, que é o que faz a barrinha do player arrastar.
- **Frontend**: módulos ES nativos do navegador. Nada de bundler.
- **Moderação**: a **primeira conta criada** é a dona do fórum e pode fixar e
  apagar qualquer coisa. Todo mundo pode apagar o que é seu. Então crie a sua
  conta primeiro.

---

## Testado antes de te mandar

Um teste de ponta a ponta num Chromium de verdade (Playwright), com **dois
usuários ao mesmo tempo** e uma câmera simulada — **53 checagens, todas
passando**:

- Cadastro com nome que tem espaço e acento, fórum abrindo, as 5 seções.
- Tópico de texto criado, aberto e listado.
- Captura pela câmera: foto tirada, animação, registro virando tópico.
- Vídeo por link do YouTube virando embed certo, e vídeo por **arquivo**
  enviado, salvo na pasta de dados, abrindo no player e com Range respondendo
  206 (a barrinha arrasta).
- Resposta de um usuário aparecendo **ao vivo** na tela do outro.
- Melhor resposta, curtir e descurtir, avaliação em 3 critérios chegando ao
  vivo pro dono da captura.
- Ver o perfil do outro; o botão de editar não aparece no perfil alheio.
- Editar perfil: frase, bio, cor (conferida no CSS aplicado), foto, capa e
  música — e o outro usuário vendo tudo isso.
- O player de música **não** carregando sozinho e carregando após o toque.
- Comunidade, Pokédex (com boot e inventário), busca por tópico e por pessoa.
- Moderação: quem não é dono não vê "fixar"; o dono vê e consegue fixar.
- Servidor reiniciado no meio: sessão e posts continuam lá.

Três bugs de verdade apareceram nesses testes e foram corrigidos: o roteador
não ligava o `hashchange` depois do login (a navegação travava), o
`history.replaceState` não dispara `hashchange` (publicar um tópico não abria
ele), e o `video.play()` ficava pendurado pra sempre quando a tela da câmera
ainda não estava montada.

**O que eu não consigo testar aqui:** o Chromium do meu ambiente não tem o
codec H.264 (o do MP4 que o celular grava) — testei com WEBM, que ele toca. Em
celular e navegador normal o MP4 funciona. E câmera de verdade com imagem de
verdade também não dá pra simular, então vale conferir a animação da captura
assim que abrir no celular.
