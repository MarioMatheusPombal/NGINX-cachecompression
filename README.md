# NGINX com Microsserviços: Cache e Compressão 🚀

Este projeto demonstra uma arquitetura simples utilizando NGINX como **reverse proxy** na frente de um microsserviço Node.js/Express. O NGINX é configurado para lidar com cache de respostas e compressão gzip, otimizando a entrega de dados do microsserviço.

---

## 🔍 Funcionalidades Demonstradas

- **🔄 Reverse Proxy**: NGINX encaminha requisições do cliente para o microsserviço backend.
- **💾 Cache de Proxy**: NGINX armazena em cache respostas do microsserviço, acelerando requisições subsequentes.
- **🗜️ Compressão Gzip**: NGINX comprime respostas antes de enviá-las ao cliente, economizando largura de banda.
- **🏷️ ETags**: O microsserviço gera ETags, e o NGINX usa essas etiquetas para validação de cache, permitindo respostas `304 Not Modified`.
- **🐳 Orquestração com Docker Compose**: Facilita a construção e execução de todos os componentes (NGINX e microsserviço) com um único comando.
- **❤️ Health Check**: Endpoint de verificação de saúde para o microsserviço, acessível pelo NGINX.

---

## 📁 Estrutura do Projeto

```bash
nginx-microservices-example/
├── data-microservice/         # Código do microsserviço Node.js
│   ├── Dockerfile             # Instruções para construir a imagem Docker
│   ├── app.js                 # Servidor Express principal
│   ├── data.json              # Arquivo de dados de exemplo (JSON)
│   └── package.json           # Dependências e scripts do Node.js
├── nginx/                     # Configuração do NGINX
│   └── nginx.conf             # Arquivo de configuração principal do NGINX
└── docker-compose.yml         # Orquestração dos containers
```

---

## 🛠️ Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Docker**: [Guia de instalação](https://docs.docker.com/get-docker/)  
- **Docker Compose**: Geralmente incluído com Docker Desktop. Para Linux, siga [estas instruções](https://docs.docker.com/compose/install/).

---

## 📦 Como Configurar e Rodar o Projeto

1. **Clone ou Crie a Pasta do Projeto**  
   Garanta que você tenha a estrutura de arquivos conforme descrito acima.

2. **Acesse o Diretório Raiz do Projeto**  
   ```bash
   cd caminho/para/nginx-microservices-example
   ```

3. **Construa as Imagens e Inicie os Containers**  
   ```bash
   docker-compose up --build
   ```
   - `--build`: Força a reconstrução das imagens Docker.  
   - Este comando irá:
     - Construir a imagem Docker para o microsserviço (`data-microservice`).
     - Baixar a imagem oficial do NGINX.
     - Iniciar os containers para ambos os serviços.
     - Exibir os logs de ambos os containers no terminal.

---

## 🧪 Como Testar

Após os containers estarem rodando (você verá mensagens como `Microsserviço de dados escutando na porta 3001` e logs do NGINX), faça os testes abaixo. O NGINX ficará acessível em `http://localhost:8080`.

### 1. Acessar a Raiz do NGINX

- Abra seu navegador e vá para:  
  ```
  http://localhost:8080/
  ```
- **Resultado Esperado**:  
  Exibirá a mensagem:  
  > "Bem-vindo ao NGINX! Acesse http://localhost:8080/api/data para ver o microsserviço em ação."

---

### 2. Acessar o Endpoint de Dados (via NGINX)

- Abra seu navegador ou use `curl` / Postman.  
- Acesse:
  ```
  http://localhost:8080/api/data
  ```

#### 🗂️ Testando o Cache do NGINX

1. **Primeira Requisição**  
   - No painel de desenvolvedor do navegador (F12 → Aba Rede/Network), faça a requisição para `/api/data`.  
   - **Verificações**:
     - O header `X-Proxy-Cache` deve estar `MISS` (resultado não veio do cache).
     - O header `ETag` deverá estar presente.
     - Se o navegador enviar `Accept-Encoding: gzip`, o header `Content-Encoding` pode ser `gzip`.

2. **Segunda Requisição (e subsequentes)**  
   - Atualize a página ou refaça a requisição para `/api/data`.  
   - **Verificações**:
     - Agora, `X-Proxy-Cache` deve estar `HIT` (resposta veio do cache).
     - Tempo de resposta significativamente menor.

---

#### 🔖 Testando a Validação com ETag (304 Not Modified)

Para um teste mais controlado, use `curl`:

1. **Obter o ETag**  
   ```bash
   curl -i http://localhost:8080/api/data
   ```
   - Copie o valor do header `ETag:` (sem as aspas).

2. **Enviar ETag para Validação**  
   Substitua `SEU_ETAG` pelo valor copiado:
   ```bash
   curl -i -H "If-None-Match: SEU_ETAG" http://localhost:8080/api/data
   ```
   - **Resultado Esperado**:
     - `HTTP/1.1 304 Not Modified` se o conteúdo não mudou.
     - O corpo da resposta estará vazio.
     - `X-Proxy-Cache` pode aparecer como `HIT` ou `EXPIRED` (se o cache expirou e o NGINX revalidou junto ao backend).

> ⚠️ **Observação**: O cache do NGINX (`proxy_cache_valid 200 302 10m;`) tem validade definida. Se expirar, o NGINX faz requisição condicional ao backend usando ETag.

---

#### 🗜️ Testando a Compressão Gzip

- No navegador (F12 → Aba Rede) ou em `curl` (que geralmente envia `Accept-Encoding: gzip` por padrão):
  ```bash
  curl -i -H "Accept-Encoding: gzip" http://localhost:8080/api/data
  ```
- **Verificações**:
  - Header `Content-Encoding: gzip` deve estar presente.
  - Tamanho transferido ("Transferred" ou "Size") menor que o tamanho real ("Content" ou "Uncompressed Size").

---

### 3. Acessar o Endpoint de Health Check

- Navegador ou `curl`:
  ```bash
  http://localhost:8080/api/health
  ```
- **Resultado Esperado**:
  ```json
  {"status":"UP"}
  ```
  - `X-Proxy-Cache` deve estar ausente ou `BYPASS` (não cacheado).
  - Header `X-Handled-By` será `"NGINX Proxy (Health Check)"`.

---

## 🛑 Parando os Containers

1. No terminal onde o `docker-compose up` está rodando, pressione `Ctrl+C`.  
   → Isso interrompe os containers em execução.

2. Para remover containers e redes:
   ```bash
   docker-compose down
   ```

3. Para remover também o volume de cache do NGINX:
   ```bash
   docker-compose down -v
   ```

---

## 📚 Entendendo os Componentes

### 1. `data-microservice` (Node.js/Express)
- Roda na porta **3001** (dentro da rede Docker).
- Serve dados estáticos de `data.json` em `/api/data`.
- Gera **ETag** e define cabeçalhos `Cache-Control`.
- Disponibiliza endpoint `/api/health` retornando `{"status":"UP"}`.

### 2. `nginx_proxy` (NGINX)
- Image oficial do NGINX, escuta na porta **8080** do host e encaminha para porta 80 do container.
- **Reverse Proxy**: Configuração em `nginx/nginx.conf` aponta para `data_service:3001`.
- **Compressão**: Diretrizes `gzip on; gzip_types application/json;` etc., habilitam a compressão das respostas JSON.
- **Cache**:
  - `proxy_cache_path`: Define onde o cache é armazenado.
  - Em `location /api/data`: `proxy_cache data_cache_zone;` ativa cache.
  - `proxy_cache_valid 200 302 10m;` define validade do cache.
  - `proxy_cache_key $scheme$proxy_host$request_uri;` gera chave única.
  - `add_header X-Proxy-Cache $upstream_cache_status;` mostra se resposta veio do cache.
  - `proxy_cache_bypass $http_cache_control;` permite que backend informe `no-cache`.

### 3. `docker-compose.yml`
- Define dois serviços: **data_service** (constrói a partir de `data-microservice/Dockerfile`) e **nginx_proxy** (usa image oficial do NGINX).
- Mapeia porta `8080:80` para o NGINX no host.
- Monta `nginx/nginx.conf` local no container.
- Cria volume nomeado `nginx_cache_volume` para persistência do cache.
- Configura rede `app_network` para comunicação entre containers (`nginx_proxy` pode resolver `data_service:3001`).
- `depends_on`: Garante que o `data_service` suba antes do NGINX.

---

🎉 **Pronto!** Agora você tem uma arquitetura básica com NGINX como reverse proxy, cache, compressão gzip e um microsserviço Node.js/Express.  
Sinta-se à vontade para modificar, testar e expandir conforme suas necessidades.  
