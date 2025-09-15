# 🧪 Testes - StellarGrid Token

Suite completa de testes para o projeto StellarGrid Token, incluindo testes unitários, de integração e end-to-end.

## 📋 Estrutura dos Testes

```
tests/
├── integration/           # Testes de integração
│   └── api.test.js       # Testes da API REST
├── unit/                 # Testes unitários (a implementar)
├── e2e/                  # Testes end-to-end (a implementar)
├── jest.config.js        # Configuração do Jest
├── setup.js              # Setup global dos testes
├── env.setup.js          # Configuração de ambiente
├── package.json          # Dependências dos testes
└── README.md            # Este arquivo
```

## 🚀 Como Executar

### Pré-requisitos

```bash
# Instalar dependências
cd tests
npm install

# Configurar variáveis de ambiente (opcional)
cp ../api/.env.example .env
```

### Comandos de Teste

```bash
# Executar todos os testes
npm test

# Executar apenas testes unitários
npm run test:unit

# Executar apenas testes de integração
npm run test:integration

# Executar testes end-to-end
npm run test:e2e

# Executar testes com cobertura
npm run test:coverage

# Executar testes em modo watch
npm run test:watch

# Executar testes para CI/CD
npm run test:ci

# Executar testes em modo debug
npm run test:debug
```

### Testes Específicos

```bash
# Testar apenas a API
npm run test:api

# Testar performance
npm run test:performance

# Testar segurança
npm run test:security
```

## 📊 Cobertura de Testes

Os testes cobrem:

### ✅ Implementado

- **Health Check e Monitoramento**
  - Status da API
  - Métricas detalhadas
  - Sistema de alertas

- **Metadados do Contrato**
  - Informações do token
  - Estatísticas do sistema

- **Gerenciamento de Geradores**
  - Registro de geradores
  - Consulta e listagem
  - Validação de dados
  - Paginação

- **Operações de Tokens**
  - Mint de tokens
  - Transferências
  - Consulta de saldos
  - Queima de tokens

- **Histórico e Transações**
  - Histórico completo
  - Detalhes de transações
  - Paginação de resultados

- **Validação e Segurança**
  - Validação de endereços Stellar
  - Rate limiting
  - Sanitização de dados
  - Tratamento de erros

- **Fluxos Completos**
  - Registro → Mint → Transferência → Consulta
  - Cenários de erro

- **Performance e Carga**
  - Testes de carga moderada
  - Consistência em operações concorrentes

### 🔄 A Implementar

- **Testes Unitários**
  - Serviços individuais
  - Middlewares
  - Utilitários

- **Testes E2E**
  - Fluxos completos de usuário
  - Integração com frontend

- **Testes de Segurança**
  - Penetration testing
  - Validação de autenticação

## 🔧 Configuração

### Variáveis de Ambiente

Os testes utilizam as seguintes variáveis de ambiente:

```env
# Ambiente
NODE_ENV=test
API_PORT=3001
LOG_LEVEL=error

# Stellar/Soroban
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROBAN_CONTRACT_ID=test_contract_id

# Segurança
JWT_SECRET=test_jwt_secret_key_for_testing_only
API_KEY=test_api_key_for_testing

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Mocks
MOCK_STELLAR_SDK=true
MOCK_EXTERNAL_APIS=true
MOCK_BLOCKCHAIN_CALLS=true
```

### Configuração do Jest

O Jest está configurado com:

- **Ambiente**: Node.js
- **Timeout**: 30 segundos
- **Cobertura**: Habilitada com limites mínimos
- **Relatórios**: HTML, LCOV, JSON
- **Projetos**: Separados por tipo de teste

## 📈 Métricas de Qualidade

### Limites de Cobertura

- **Global**: 80% (linhas, statements, branches, functions)
- **Serviços**: 90% (linhas, statements, branches, functions)
- **Middlewares**: 85% (linhas, statements, branches, functions)

### Padrões de Qualidade

- **ESLint**: Configurado com regras do Standard
- **Prettier**: Formatação automática
- **Jest**: Regras específicas para testes

## 🛠️ Utilitários de Teste

### Matchers Customizados

```javascript
// Validar endereços Stellar
expect(address).toBeValidStellarAddress();

// Validar hash de transação
expect(hash).toBeValidTransactionHash();

// Validar timestamp ISO
expect(timestamp).toBeValidISOTimestamp();

// Validar estrutura da API
expect(response.body).toHaveApiStructure(['property1', 'property2']);
```

### Utilitários Globais

```javascript
// Aguardar tempo específico
await testUtils.sleep(1000);

// Gerar dados de teste
const generator = testUtils.createTestGenerator();
const energyData = testUtils.createTestEnergyData();

// Validar resposta da API
testUtils.validateApiResponse(response, ['expectedProperty']);

// Validar erro da API
testUtils.validateApiError(response, 400);
```

## 🐛 Debugging

### Executar em Modo Debug

```bash
# Habilitar logs detalhados
DEBUG_TESTS=true npm test

# Executar teste específico
npm test -- --testNamePattern="nome do teste"

# Executar com verbose
npm test -- --verbose
```

### Logs de Teste

Os logs são salvos em:

- `tests/logs/test.log` - Logs gerais
- `tests/logs/error.log` - Logs de erro
- `coverage/` - Relatórios de cobertura

## 🔄 CI/CD

### GitHub Actions

```yaml
# Exemplo de workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tests && npm ci
      - run: cd tests && npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          file: ./tests/coverage/lcov.info
```

### Scripts de CI

```bash
# Executar todos os checks
npm run pretest  # Lint
npm run test:ci  # Testes com cobertura
npm run posttest # Formatação
```

## 📚 Recursos Adicionais

### Documentação

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Stellar SDK Testing](https://stellar.github.io/js-stellar-sdk/)

### Exemplos

```javascript
// Exemplo de teste de integração
describe('API Integration', () => {
  test('should register generator and mint tokens', async () => {
    // 1. Registrar gerador
    const registerResponse = await request(app)
      .post('/api/generators/register')
      .send(testData.generator)
      .expect(201);
    
    // 2. Fazer mint
    const mintResponse = await request(app)
      .post('/api/tokens/mint')
      .send({
        generatorId: registerResponse.body.data.generatorId,
        amount: 1000
      })
      .expect(201);
    
    // 3. Verificar resultado
    expect(mintResponse.body).toHaveApiStructure(['transactionHash', 'amount']);
  });
});
```

## 🤝 Contribuindo

1. **Adicionar Novos Testes**
   - Seguir padrões existentes
   - Incluir documentação
   - Manter cobertura mínima

2. **Executar Testes Localmente**
   - Sempre antes de commit
   - Verificar cobertura
   - Corrigir falhas

3. **Reportar Issues**
   - Incluir logs de erro
   - Descrever cenário
   - Sugerir correções

---

**StellarGrid Token** - Democratizando o acesso à energia renovável através da blockchain 🌱⚡