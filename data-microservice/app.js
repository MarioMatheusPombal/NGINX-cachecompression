const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Para gerar ETags

const app = express();
const port = 3001; // O microsserviço rodará na porta 3001 internamente

// Carrega os dados do arquivo JSON
// Numa aplicação real, isso poderia vir de um banco de dados ou outra fonte.
let largeData;
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf-8');
    largeData = JSON.parse(rawData);
} catch (error) {
    console.error("Erro ao carregar data.json:", error);
    largeData = { error: "Falha ao carregar os dados." };
}

app.get('/api/data', (req, res) => {
  // Gerar um ETag baseado no conteúdo dos dados
  // Esta é uma forma simples de ETag; para dados dinâmicos, pode ser mais complexo.
  const dataString = JSON.stringify(largeData);
  const etag = crypto.createHash('sha1').update(dataString).digest('hex');

  // Verificar se o cliente enviou um ETag e se corresponde ao ETag atual
  if (req.headers['if-none-match'] === etag) {
    console.log('Dados não modificados, enviando 304 Not Modified');
    return res.status(304).end();
  }

  console.log('Enviando dados completos e ETag');
  // Definir cabeçalhos de cache e ETag
  // O NGINX pode sobrescrever ou adicionar a estes, mas é bom que o serviço também os defina.
  res.setHeader('Cache-Control', 'public, max-age=60'); // Cache por 60 segundos (NGINX pode ter um tempo maior)
  res.setHeader('ETag', etag);
  res.json(largeData);
});

app.get('/api/health', (req, res) => {
  // Endpoint simples para health check
  res.status(200).json({ status: 'UP' });
});

app.listen(port, () => {
  console.log(`Microsserviço de dados escutando na porta ${port}`);
});
