# Exemplo de NGINX com Microsserviços: Cache e Compressão

Este projeto demonstra uma arquitetura simples utilizando NGINX como reverse proxy na frente de um microsserviço Node.js/Express. O NGINX é configurado para lidar com cache de respostas e compressão gzip, otimizando a entrega de dados do microsserviço.

## Funcionalidades Demonstradas

* **Reverse Proxy**: NGINX encaminhando requisições para um microsserviço backend.
* **Cache de Proxy**: NGINX armazenando em cache respostas do microsserviço para entregas mais rápidas em requisições subsequentes.
* **Compressão Gzip**: NGINX comprimindo as respostas antes de enviá-las ao cliente, economizando largura de banda.
* **ETags**: O microsserviço gera ETags, e o NGINX os utiliza para validação de cache, permitindo respostas `304 Not Modified`.
* **Orquestração com Docker Compose**: Facilidade para construir e executar todos os componentes (NGINX e microsserviço) com um único comando.
* **Health Check**: Endpoint de verificação de saúde para o microsserviço, acessível através do NGINX.

## Estrutura do Projeto


nginx-microservices-example/
├── data-microservice/         # Contém o código do microsserviço Node.js
│   ├── Dockerfile             # Define como construir a imagem Docker do microsserviço
│   ├── app.js                 # Lógica principal do servidor Express
│   ├── data.json              # Arquivo de dados de exemplo servido pelo microsserviço
│   └── package.json           # Dependências e scripts do Node.js
├── nginx/                     # Contém a configuração do NGINX
│   └── nginx.conf             # Arquivo de configuração principal do NGINX
└── docker-compose.yml         # Orquestra a execução dos containers


## Pré-requisitos

* **Docker**: [Instruções de instalação](https://docs.docker.com/get-docker/)
* **Docker Compose**: Geralmente incluído com a instalação do Docker Desktop. Para Linux, pode ser necessário instalar separadamente: [Instruções de instalação](https://docs.docker.com/compose/install/)

## Como Configurar e Rodar o Projeto

1.  **Clone ou Crie os Arquivos do Projeto**:
    Certifique-se de que você tem todos os arquivos e pastas conforme a estrutura descrita acima. Os arquivos principais são:
    * `nginx-microservices-example/docker-compose.yml`
    * `nginx-microservices-example/nginx/nginx.conf`
    * `nginx-microservices-example/data-microservice/Dockerfile`
    * `nginx-microservices-example/data-microservice/app.js`
    * `nginx-microservices-example/data-microservice/data.json`
    * `nginx-microservices-example/data-microservice/package.json`

2.  **Navegue até o Diretório Raiz do Projeto**:
    Abra seu terminal ou prompt de comando e navegue até a pasta `nginx-microservices-example/`.

    ```bash
    cd caminho/para/nginx-microservices-example
    ```

3.  **Construa as Imagens e Inicie os Containers**:
    Execute o seguinte comando:

    ```bash
    docker-compose up --build
    ```
    * `--build`: Força a reconstrução das imagens Docker. Útil na primeira vez ou se você fizer alterações nos Dockerfiles ou no código fonte dos serviços.
    * Este comando irá:
        * Construir a imagem Docker para o `data-microservice`.
        * Baixar a imagem oficial do NGINX.
        * Iniciar os containers para ambos os serviços.
        * Você verá os logs de ambos os containers no seu terminal.

## Como Testar

Após os containers estarem rodando (você verá logs como `Microsserviço de dados escutando na porta 3001` e logs do NGINX), você pode testar as funcionalidades. O NGINX estará acessível em `http://localhost:8080`.

### 1. Acessar a Raiz do NGINX

* Abra seu navegador e vá para: `http://localhost:8080/`
* **Resultado Esperado**: Você verá a mensagem: "Bem-vindo ao NGINX! Acesse http://localhost:8080/api/data para ver o microsserviço em ação."

### 2. Acessar o Endpoint de Dados (via NGINX)

* Abra seu navegador ou use uma ferramenta como `curl` ou Postman.
* Acesse: `http://localhost:8080/api/data`

#### Testando o Cache do NGINX:

* **Primeira Requisição**:
    * Abra as ferramentas de desenvolvedor do seu navegador (geralmente F12), vá para a aba "Rede" (Network).
    * Faça a requisição para `http://localhost:8080/api/data`.
    * Selecione a requisição na lista e observe os cabeçalhos de resposta (Response Headers).
    * **Resultado Esperado**:
        * Você verá o JSON completo de `data.json`.
        * O cabeçalho `X-Proxy-Cache` deve ter o valor `MISS` (indicando que a resposta não veio do cache do NGINX, mas sim do microsserviço).
        * O cabeçalho `ETag` estará presente.
        * O cabeçalho `Content-Encoding` pode estar `gzip` se seu navegador enviou `Accept-Encoding: gzip`.

* **Segunda Requisição (e subsequentes)**:
    * Atualize a página (`http://localhost:8080/api/data`) ou faça a requisição novamente.
    * **Resultado Esperado**:
        * Você verá o JSON completo.
        * O cabeçalho `X-Proxy-Cache` deve ter o valor `HIT` (indicando que a resposta veio do cache do NGINX).
        * O tempo de resposta deve ser significativamente menor.

#### Testando a Validação com ETag (304 Not Modified):

O NGINX e o microsserviço estão configurados para usar ETags. Para testar isso de forma mais controlada, você pode usar `curl`:

1.  **Primeira requisição com `curl` para obter o ETag**:
    ```bash
    curl -i http://localhost:8080/api/data
    ```
    Procure pelo header `ETag:` na resposta. Copie o valor do ETag (sem as aspas). Ex: `ETag: "umvalorhashlongo"`

2.  **Segunda requisição com `curl` enviando o ETag**:
    Substitua `SEU_ETAG_AQUI` pelo valor que você copiou.
    ```bash
    curl -i -H "If-None-Match: SEU_ETAG_AQUI" http://localhost:8080/api/data
    ```
    * **Resultado Esperado**:
        * Se o NGINX servir do cache e o ETag ainda for válido (ou se o microsserviço validar e o conteúdo não mudou), você deverá receber uma resposta `HTTP/1.1 304 Not Modified`.
        * O corpo da resposta estará vazio.
        * O header `X-Proxy-Cache` pode ser `HIT` ou `EXPIRED` (se o NGINX revalidou com o backend). Se for `EXPIRED`, o NGINX contatou o backend, que respondeu 304, e o NGINX então repassou o 304.

    *Nota: O cache do NGINX (`proxy_cache_valid 200 302 10m;`) tem um tempo de validade. Se o cache expirar, o NGINX fará uma requisição condicional ao backend usando o ETag. Se o backend responder 304, o NGINX atualiza seu cache e pode servir 200 (do cache atualizado) ou 304 ao cliente.*

#### Testando a Compressão Gzip:

* Use as ferramentas de desenvolvedor do navegador (aba Rede) ou `curl`.
* Faça uma requisição para `http://localhost:8080/api/data`.
* **Resultado Esperado**:
    * Nos cabeçalhos de resposta, procure por `Content-Encoding: gzip`.
    * O tamanho da resposta transferida ("Transferred" ou "Size" nas ferramentas de dev) deve ser menor que o tamanho real do conteúdo ("Content" ou "Uncompressed Size").
* Com `curl` (certifique-se de que seu `curl` envia `Accept-Encoding: gzip`, o que é comum):
    ```bash
    curl -i -H "Accept-Encoding: gzip" http://localhost:8080/api/data
    ```
    Se a resposta vier comprimida, ela pode parecer "lixo" no terminal a menos que você a descompacte ou use uma flag no `curl` para descompactar automaticamente (ex: `curl --compressed ...`). O importante é verificar o header `Content-Encoding`.

### 3. Acessar o Endpoint de Health Check

* Abra seu navegador ou use `curl`.
* Acesse: `http://localhost:8080/api/health`
* **Resultado Esperado**:
    * Você verá uma resposta JSON: `{"status":"UP"}`.
    * Nos cabeçalhos de resposta, o `X-Proxy-Cache` deve ser `BYPASS` ou não estar presente, pois este endpoint está configurado no NGINX para não ser cacheado.
    * O cabeçalho `X-Handled-By` deve ser `"NGINX Proxy (Health Check)"`.

## Parando os Containers

1.  No terminal onde o `docker-compose up` está rodando, pressione `Ctrl+C`. Isso irá parar os containers.

2.  Para remover os containers (e a rede criada), execute:
    ```bash
    docker-compose down
    ```

3.  Se você também quiser remover o volume de cache do NGINX (onde os dados cacheados são armazenados), execute:
    ```bash
    docker-compose down -v
    ```

## Entendendo os Componentes

* **`data-microservice`**:
    * Um servidor Express simples rodando na porta `3001` (interna à rede Docker).
    * Serve um arquivo JSON estático em `/api/data`.
    * Implementa a geração de `ETag` e define `Cache-Control` headers.
    * Possui um endpoint `/api/health` para verificações de saúde.

* **`nginx_proxy`**:
    * Container NGINX oficial.
    * Escuta na porta `8080` do seu host e encaminha para a porta `80` dentro do container.
    * **Reverse Proxy**: A configuração em `nginx/nginx.conf` define um `upstream` para o `data_service` e usa `proxy_pass` para encaminhar requisições de `/api/*` para ele.
    * **Compressão**: A diretiva `gzip on;` e outras `gzip_*` habilitam a compressão para tipos de conteúdo específicos (incluindo `application/json`).
    * **Cache**:
        * `proxy_cache_path` define uma área de armazenamento para o cache.
        * Na `location /api/data`, `proxy_cache data_cache_zone;` habilita o uso dessa zona de cache.
        * `proxy_cache_valid` define por quanto tempo diferentes códigos de status HTTP são considerados válidos no cache.
        * `proxy_cache_key` define como uma chave única é gerada para cada item cacheado.
        * `add_header X-Proxy-Cache $upstream_cache_status;` é um header customizado útil para depuração, mostrando se a resposta veio do cache (`HIT`, `MISS`, `EXPIRED`, `UPDATING`, `STALE`, `BYPASS`).
        * `proxy_cache_bypass $http_cache_control;` permite que o backend (microsserviço) influencie o cache do NGINX através de headers como `Cache-Control: no-cache`.

* **`docker-compose.yml`**:
    * Define os dois serviços (`data_service`, `nginx_proxy`).
    * Configura a construção da imagem para `data_service` usando seu `Dockerfile`.
    * Mapeia a porta `8080:80` para o NGINX.
    * Monta o `nginx.conf` local no container do NGINX.
    * Cria um volume nomeado (`nginx_cache_volume`) para persistir o cache do NGINX entre reinicializações dos containers (se você não usar `docker-compose down -v`).
    * Define uma rede (`app_network`) para que os containers possam se comunicar usando os nomes dos serviços (NGINX pode encontrar `data_service` pelo nome `data_service:3001`).
    * Usa `depends_on` para garantir que o `data_service` inicie antes do `nginx_proxy`.

---

Sinta-se à vontade para modificar e expandir este projeto!

