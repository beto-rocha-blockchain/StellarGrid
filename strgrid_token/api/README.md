# 🌐 StellarGrid API

> **API REST para integração com o StellarGrid Token Smart Contract**

Esta API fornece endpoints RESTful para interagir com o smart contract StellarGrid Token na blockchain Stellar, facilitando a integração com aplicações frontend.

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 16+ 
- npm ou yarn
- Acesso à Stellar Testnet

### Instalação

```bash
# Navegar para o diretório da API
cd api

# Instalar dependências
npm install

# Copiar arquivo de configuração
cp .env.example .env

# Editar configurações (opcional)
nano .env

# Iniciar servidor de desenvolvimento
npm run dev
```

### Produção

```bash
# Instalar dependências de produção
npm install --production

# Iniciar servidor
npm start
```

## 📡 Endpoints da API

### Base URL
```
http://localhost:3001/api
```

### 🏥 Health Check

```http
GET /health
```

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### 📊 Token Metadata

```http
GET /api/token/metadata
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "name": "StellarGrid Token",
    "symbol": "STRGRID",
    "decimals": 7,
    "totalSupply": 0
  }
}
```

### 🏭 Geradores

#### Registrar Gerador

```http
POST /api/generators/register
Content-Type: application/json

{
  "generatorAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "capacityKw": 1000,
  "sourceKeypair": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

#### Obter Gerador

```http
GET /api/generators/{address}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "address": "GXXXXXXX...",
    "capacityKw": 1000,
    "currentProduction": 0,
    "isActive": true,
    "registrationDate": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Listar Geradores

```http
GET /api/generators?page=1&limit=10
```

### ⚡ Energia

#### Mint Tokens de Energia

```http
POST /api/energy/mint
Content-Type: application/json

{
  "generatorAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amountKwh": 500,
  "energyType": "Solar",
  "recipientAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "sourceKeypair": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

#### Burn Tokens (Consumo)

```http
POST /api/energy/burn
Content-Type: application/json

{
  "fromAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amount": 5000000,
  "sourceKeypair": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

### 💸 Tokens

#### Transferir Tokens

```http
POST /api/tokens/transfer
Content-Type: application/json

{
  "fromAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "toAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amount": 1000000,
  "sourceKeypair": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

#### Obter Saldo

```http
GET /api/accounts/{address}/balance
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "address": "GXXXXXXX...",
    "balance": 10000000,
    "balanceFormatted": "1.0000000 STRGRID"
  }
}
```

### 📈 Estatísticas

```http
GET /api/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "contractId": "CBEXN3HDQZQL4QDUDUPXKUIDL7IQP57IFIXCW5T5TSLSTMXJNP5SMNRC",
    "tokenName": "StellarGrid Token",
    "tokenSymbol": "STRGRID",
    "totalSupply": 0,
    "totalSupplyFormatted": "0.0000000 STRGRID",
    "decimals": 7,
    "network": "Testnet",
    "explorerUrl": "https://stellar.expert/explorer/testnet/contract/..."
  }
}
```

### 🌐 Informações da Rede

```http
GET /api/network/info
```

## 🔧 Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Servidor
PORT=3001
NODE_ENV=development

# Stellar
CONTRACT_ID=CBEXN3HDQZQL4QDUDUPXKUIDL7IQP57IFIXCW5T5TSLSTMXJNP5SMNRC
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Segurança
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15

# Logging
LOG_LEVEL=info
```

## 🛡️ Segurança

### Rate Limiting
- **Limite**: 100 requests por IP a cada 15 minutos
- **Headers**: `X-RateLimit-*` incluídos nas respostas

### Validação
- Validação rigorosa de endereços Stellar
- Sanitização de entrada
- Validação de tipos de energia

### Headers de Segurança
- Helmet.js configurado
- CORS restritivo
- Compressão habilitada

## 📝 Logging

### Níveis de Log
- `error`: Erros críticos
- `warn`: Avisos e problemas não críticos
- `info`: Informações gerais
- `http`: Requisições HTTP
- `debug`: Informações detalhadas (desenvolvimento)

### Arquivos de Log
- `logs/app.log`: Todos os logs
- `logs/error.log`: Apenas erros

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:3001/health
```

### Métricas
- Tempo de resposta
- Taxa de erro
- Uso de memória
- Transações Stellar

## 🔄 Integração com Frontend

### Exemplo React

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000
});

// Obter metadados do token
const getTokenMetadata = async () => {
  const response = await api.get('/token/metadata');
  return response.data;
};

// Registrar gerador
const registerGenerator = async (data) => {
  const response = await api.post('/generators/register', data);
  return response.data;
};

// Obter saldo
const getBalance = async (address) => {
  const response = await api.get(`/accounts/${address}/balance`);
  return response.data;
};
```

### Tratamento de Erros

```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.errors) {
      // Erros de validação
      console.error('Validation errors:', error.response.data.errors);
    } else if (error.response?.data?.message) {
      // Erro da API
      console.error('API error:', error.response.data.message);
    }
    return Promise.reject(error);
  }
);
```

## 🚀 Deploy

### Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start server.js --name stellargrid-api

# Monitorar
pm2 monit
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](../LICENSE) para detalhes.

---

**🌱 Construindo o futuro da energia renovável na blockchain!**