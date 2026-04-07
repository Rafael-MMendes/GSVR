# Development stage
FROM node:21-alpine

WORKDIR /usr/src/app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto do código
COPY . .

# Expor a porta do Vite
EXPOSE 5173

# Rodar o Vite exposto para a rede do container
CMD ["npm", "run", "dev", "--", "--host"]
