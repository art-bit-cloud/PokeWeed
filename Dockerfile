# Imagem do PokeWeed. Funciona em Fly.io, Railway, Render, Coolify, Dokploy,
# Portainer ou qualquer VPS com Docker.
#
#   docker build -t pokeweed .
#   docker run -p 8080:8080 -v pokeweed-dados:/dados pokeweed
#
# O volume em /dados é ESSENCIAL: é onde ficam as contas, as fotos e os vídeos.
# Sem ele, tudo se perde quando o container é recriado.

FROM node:22-alpine

WORKDIR /app

# Dependências primeiro, pra aproveitar o cache do Docker entre builds.
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev || npm install --omit=dev

COPY server ./server
COPY public ./public

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/dados

RUN mkdir -p /dados

# De propósito, sem instrução VOLUME aqui: plataformas como o Railway recusam
# o build se o Dockerfile declarar VOLUME (elas têm o próprio recurso de
# disco persistente — no Railway se chama "Volume" e é criado pelo painel,
# apontando pro mesmo caminho, /dados). Quem roda com `docker run -v`, como no
# exemplo lá em cima, continua funcionando normal — a instrução VOLUME nunca
# foi necessária pra isso, só uma declaração a mais.

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:8080/api/secoes > /dev/null || exit 1

WORKDIR /app/server
CMD ["node", "server.js"]
