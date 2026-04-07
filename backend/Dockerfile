FROM node:21-alpine

WORKDIR /usr/src/app

# Instalar dependências primeiro para aproveitar o cache
COPY package*.json ./
RUN npm install

# Copiar o resto dos arquivos
COPY . .

# Criar usuário e dar permissão à pasta de trabalho
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/src/app

USER appuser

ENV NODE_ENV=development
EXPOSE 3001

CMD ["node", "server.js"]
