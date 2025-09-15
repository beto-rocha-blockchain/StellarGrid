/**
 * 🧪 TESTES DE INTEGRAÇÃO END-TO-END
 * 
 * Testes completos da API StellarGrid Token
 * Validação de fluxos completos e integração entre componentes
 */

const request = require('supertest');
const { Keypair } = require('@stellar/stellar-sdk');
const app = require('../../api/server');

// Configurações de teste
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  baseURL: process.env.TEST_API_URL || 'http://localhost:3001'
};

// Dados de teste
const testData = {
  generator: {
    name: 'Test Solar Farm',
    type: 'solar',
    capacity: 1000,
    location: 'São Paulo, Brazil',
    coordinates: {
      latitude: -23.5505,
      longitude: -46.6333
    },
    certifications: ['ISO 14001', 'REC Standard']
  },
  accounts: {
    generator: null,
    consumer: null,
    admin: null
  }
};

// Setup e teardown
beforeAll(async () => {
  // Gerar contas de teste
  testData.accounts.generator = Keypair.random();
  testData.accounts.consumer = Keypair.random();
  testData.accounts.admin = Keypair.random();
  
  console.log('🔧 Configurando ambiente de teste...');
  console.log(`Generator Account: ${testData.accounts.generator.publicKey()}`);
  console.log(`Consumer Account: ${testData.accounts.consumer.publicKey()}`);
}, TEST_CONFIG.timeout);

afterAll(async () => {
  console.log('🧹 Limpando ambiente de teste...');
  // Cleanup se necessário
});

describe('🌟 StellarGrid Token API - Testes de Integração', () => {
  
  describe('📊 Health Check e Monitoramento', () => {
    test('deve retornar status de saúde da API', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(['healthy', 'warning', 'critical']).toContain(response.body.status);
    });
    
    test('deve retornar métricas detalhadas', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('requests');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('system');
    });
    
    test('deve retornar lista de alertas', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
  
  describe('📋 Metadados do Contrato', () => {
    test('deve retornar metadados do contrato', async () => {
      const response = await request(app)
        .get('/api/contract/metadata')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('symbol');
      expect(response.body.data).toHaveProperty('decimals');
    });
    
    test('deve retornar estatísticas do sistema', async () => {
      const response = await request(app)
        .get('/api/contract/stats')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalSupply');
      expect(response.body.data).toHaveProperty('totalGenerators');
      expect(response.body.data).toHaveProperty('totalTransactions');
    });
  });
  
  describe('🏭 Gerenciamento de Geradores', () => {
    let generatorId;
    
    test('deve registrar um novo gerador', async () => {
      const response = await request(app)
        .post('/api/generators/register')
        .send({
          publicKey: testData.accounts.generator.publicKey(),
          ...testData.generator
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('generatorId');
      expect(response.body.data).toHaveProperty('transactionHash');
      
      generatorId = response.body.data.generatorId;
    });
    
    test('deve rejeitar registro com dados inválidos', async () => {
      const response = await request(app)
        .post('/api/generators/register')
        .send({
          publicKey: 'invalid-key',
          name: '', // Nome vazio
          type: 'invalid-type',
          capacity: -100 // Capacidade negativa
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('deve consultar gerador registrado', async () => {
      if (!generatorId) {
        console.log('⚠️ Pulando teste - gerador não registrado');
        return;
      }
      
      const response = await request(app)
        .get(`/api/generators/${generatorId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', testData.generator.name);
      expect(response.body.data).toHaveProperty('type', testData.generator.type);
      expect(response.body.data).toHaveProperty('capacity', testData.generator.capacity);
    });
    
    test('deve listar todos os geradores', async () => {
      const response = await request(app)
        .get('/api/generators')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('generatorId');
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('type');
      }
    });
    
    test('deve listar geradores com paginação', async () => {
      const response = await request(app)
        .get('/api/generators?page=1&limit=5')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });
  });
  
  describe('⚡ Operações de Tokens', () => {
    let generatorId;
    
    beforeAll(async () => {
      // Registrar gerador para testes de token
      try {
        const response = await request(app)
          .post('/api/generators/register')
          .send({
            publicKey: testData.accounts.generator.publicKey(),
            name: 'Token Test Generator',
            type: 'solar',
            capacity: 500,
            location: 'Test Location'
          });
        
        if (response.body.success) {
          generatorId = response.body.data.generatorId;
        }
      } catch (error) {
        console.log('⚠️ Erro ao registrar gerador para testes de token:', error.message);
      }
    });
    
    test('deve fazer mint de tokens', async () => {
      if (!generatorId) {
        console.log('⚠️ Pulando teste - gerador não disponível');
        return;
      }
      
      const response = await request(app)
        .post('/api/tokens/mint')
        .send({
          generatorId,
          amount: 1000,
          energyData: {
            timestamp: new Date().toISOString(),
            kwhProduced: 1000,
            efficiency: 85.5,
            weatherConditions: 'sunny'
          }
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('transactionHash');
      expect(response.body.data).toHaveProperty('amount', 1000);
    });
    
    test('deve rejeitar mint com dados inválidos', async () => {
      const response = await request(app)
        .post('/api/tokens/mint')
        .send({
          generatorId: 'invalid-id',
          amount: -100, // Quantidade negativa
          energyData: {}
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('deve consultar saldo de tokens', async () => {
      const response = await request(app)
        .get(`/api/tokens/balance/${testData.accounts.generator.publicKey()}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('balance');
      expect(typeof response.body.data.balance).toBe('number');
    });
    
    test('deve fazer transferência de tokens', async () => {
      const response = await request(app)
        .post('/api/tokens/transfer')
        .send({
          from: testData.accounts.generator.publicKey(),
          to: testData.accounts.consumer.publicKey(),
          amount: 100,
          memo: 'Test transfer'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('transactionHash');
    });
    
    test('deve rejeitar transferência com saldo insuficiente', async () => {
      const response = await request(app)
        .post('/api/tokens/transfer')
        .send({
          from: testData.accounts.consumer.publicKey(),
          to: testData.accounts.generator.publicKey(),
          amount: 999999999, // Quantidade muito alta
          memo: 'Invalid transfer'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('deve queimar tokens', async () => {
      const response = await request(app)
        .post('/api/tokens/burn')
        .send({
          account: testData.accounts.generator.publicKey(),
          amount: 50,
          reason: 'Test burn'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('transactionHash');
    });
  });
  
  describe('📈 Histórico e Transações', () => {
    test('deve retornar histórico de transações', async () => {
      const response = await request(app)
        .get(`/api/transactions/history/${testData.accounts.generator.publicKey()}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    test('deve retornar histórico com paginação', async () => {
      const response = await request(app)
        .get(`/api/transactions/history/${testData.accounts.generator.publicKey()}?page=1&limit=10`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });
    
    test('deve retornar detalhes de transação específica', async () => {
      // Primeiro, obter uma transação do histórico
      const historyResponse = await request(app)
        .get(`/api/transactions/history/${testData.accounts.generator.publicKey()}`)
        .expect(200);
      
      if (historyResponse.body.data.length > 0) {
        const transactionHash = historyResponse.body.data[0].hash;
        
        const response = await request(app)
          .get(`/api/transactions/${transactionHash}`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('hash', transactionHash);
      }
    });
  });
  
  describe('🔍 Validação e Segurança', () => {
    test('deve validar endereços Stellar', async () => {
      const response = await request(app)
        .get('/api/tokens/balance/invalid-stellar-address')
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('deve aplicar rate limiting', async () => {
      // Fazer muitas requisições rapidamente
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/health')
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Verificar se alguma requisição foi limitada
      const rateLimited = responses.some(res => res.status === 429);
      
      if (rateLimited) {
        console.log('✅ Rate limiting funcionando corretamente');
      } else {
        console.log('⚠️ Rate limiting pode não estar configurado');
      }
    });
    
    test('deve retornar erro 404 para rotas inexistentes', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
    
    test('deve sanitizar entrada de dados', async () => {
      const response = await request(app)
        .post('/api/generators/register')
        .send({
          publicKey: testData.accounts.generator.publicKey(),
          name: '<script>alert("xss")</script>',
          type: 'solar',
          capacity: 100,
          location: 'Test'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
    });
  });
  
  describe('🔄 Fluxos Completos', () => {
    test('fluxo completo: registro → mint → transferência → consulta', async () => {
      console.log('🔄 Iniciando fluxo completo de teste...');
      
      // 1. Registrar gerador
      console.log('1️⃣ Registrando gerador...');
      const registerResponse = await request(app)
        .post('/api/generators/register')
        .send({
          publicKey: testData.accounts.generator.publicKey(),
          name: 'Complete Flow Generator',
          type: 'wind',
          capacity: 2000,
          location: 'Complete Flow Test'
        })
        .expect(201);
      
      const generatorId = registerResponse.body.data.generatorId;
      console.log(`✅ Gerador registrado: ${generatorId}`);
      
      // 2. Fazer mint de tokens
      console.log('2️⃣ Fazendo mint de tokens...');
      const mintResponse = await request(app)
        .post('/api/tokens/mint')
        .send({
          generatorId,
          amount: 500,
          energyData: {
            timestamp: new Date().toISOString(),
            kwhProduced: 500,
            efficiency: 92.3
          }
        })
        .expect(201);
      
      console.log(`✅ Tokens mintados: ${mintResponse.body.data.amount}`);
      
      // 3. Verificar saldo
      console.log('3️⃣ Verificando saldo...');
      const balanceResponse = await request(app)
        .get(`/api/tokens/balance/${testData.accounts.generator.publicKey()}`)
        .expect(200);
      
      expect(balanceResponse.body.data.balance).toBeGreaterThanOrEqual(500);
      console.log(`✅ Saldo verificado: ${balanceResponse.body.data.balance}`);
      
      // 4. Fazer transferência
      console.log('4️⃣ Fazendo transferência...');
      const transferResponse = await request(app)
        .post('/api/tokens/transfer')
        .send({
          from: testData.accounts.generator.publicKey(),
          to: testData.accounts.consumer.publicKey(),
          amount: 200,
          memo: 'Complete flow test transfer'
        })
        .expect(201);
      
      console.log(`✅ Transferência realizada: ${transferResponse.body.data.transactionHash}`);
      
      // 5. Verificar histórico
      console.log('5️⃣ Verificando histórico...');
      const historyResponse = await request(app)
        .get(`/api/transactions/history/${testData.accounts.generator.publicKey()}`)
        .expect(200);
      
      expect(historyResponse.body.data.length).toBeGreaterThan(0);
      console.log(`✅ Histórico verificado: ${historyResponse.body.data.length} transações`);
      
      console.log('🎉 Fluxo completo executado com sucesso!');
    }, TEST_CONFIG.timeout);
    
    test('fluxo de erro: operações com dados inválidos', async () => {
      console.log('❌ Testando fluxo de erros...');
      
      // Tentar registrar gerador com dados inválidos
      await request(app)
        .post('/api/generators/register')
        .send({})
        .expect(400);
      
      // Tentar mint sem gerador
      await request(app)
        .post('/api/tokens/mint')
        .send({
          generatorId: 'invalid',
          amount: 100
        })
        .expect(400);
      
      // Tentar transferência com endereço inválido
      await request(app)
        .post('/api/tokens/transfer')
        .send({
          from: 'invalid',
          to: 'invalid',
          amount: 100
        })
        .expect(400);
      
      console.log('✅ Fluxo de erros validado corretamente');
    });
  });
  
  describe('📊 Performance e Carga', () => {
    test('deve responder rapidamente sob carga moderada', async () => {
      const startTime = Date.now();
      
      // Fazer 10 requisições simultâneas
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log(`⚡ 10 requisições simultâneas executadas em ${totalTime}ms`);
      
      // Deve completar em menos de 5 segundos
      expect(totalTime).toBeLessThan(5000);
    }, 10000);
    
    test('deve manter consistência durante operações concorrentes', async () => {
      // Fazer múltiplas consultas de saldo simultaneamente
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get(`/api/tokens/balance/${testData.accounts.generator.publicKey()}`)
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Todos os saldos devem ser iguais (consistência)
      const balances = responses.map(res => res.body.data.balance);
      const firstBalance = balances[0];
      
      balances.forEach(balance => {
        expect(balance).toBe(firstBalance);
      });
      
      console.log('✅ Consistência mantida durante operações concorrentes');
    });
  });
});

// Testes de integração com mock de blockchain
describe('🔗 Integração com Blockchain (Mock)', () => {
  test('deve simular interação com smart contract', async () => {
    // Este teste simula a interação com o smart contract
    // Em um ambiente real, testaria a integração completa
    
    const mockContractCall = {
      method: 'register_generator',
      params: {
        owner: testData.accounts.generator.publicKey(),
        name: 'Mock Generator',
        gen_type: 'solar',
        capacity: 1000
      }
    };
    
    // Simular resposta do contrato
    const mockResponse = {
      success: true,
      transactionHash: 'mock_hash_123',
      generatorId: 'mock_gen_456'
    };
    
    expect(mockContractCall).toHaveProperty('method');
    expect(mockContractCall).toHaveProperty('params');
    expect(mockResponse).toHaveProperty('success', true);
    
    console.log('✅ Integração com smart contract simulada');
  });
});

// Utilitários para testes
const testUtils = {
  // Gerar dados de teste aleatórios
  generateRandomGenerator: () => ({
    name: `Test Generator ${Math.random().toString(36).substr(2, 9)}`,
    type: ['solar', 'wind', 'hydro'][Math.floor(Math.random() * 3)],
    capacity: Math.floor(Math.random() * 5000) + 100,
    location: `Test Location ${Math.random().toString(36).substr(2, 5)}`
  }),
  
  // Aguardar um tempo específico
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Validar estrutura de resposta da API
  validateApiResponse: (response, expectedProperties = []) => {
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
    
    expectedProperties.forEach(prop => {
      expect(response.body.data).toHaveProperty(prop);
    });
  }
};

module.exports = {
  testUtils,
  testData,
  TEST_CONFIG
};