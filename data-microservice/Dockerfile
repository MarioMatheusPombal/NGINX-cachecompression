# data-microservice/Dockerfile

# Use uma imagem base oficial do Node.js.
# Escolha uma versão LTS (Long Term Support) ou a que melhor se adequar ao seu projeto.
FROM node:18-alpine

# Define o diretório de trabalho dentro do container.
WORKDIR /usr/src/app

# Copia os arquivos package.json e package-lock.json (se existir) para o diretório de trabalho.
# Isso aproveita o cache de camadas do Docker: se esses arquivos não mudarem,
# o 'npm install' não precisará ser executado novamente em builds subsequentes.
COPY package*.json ./

# Instala as dependências do projeto.
# Para um ambiente de produção, você poderia usar 'npm ci --only=production'
# para uma instalação mais limpa e rápida baseada no package-lock.json.
RUN npm install

# Copia o restante dos arquivos da aplicação para o diretório de trabalho.
COPY . .

# Expõe a porta em que a aplicação Node.js rodará dentro do container.
# Esta porta é para comunicação interna na rede Docker; o NGINX se conectará a ela.
EXPOSE 3001

# Comando para executar a aplicação quando o container iniciar.
CMD [ "node", "app.js" ]
