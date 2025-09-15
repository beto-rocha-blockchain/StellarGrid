/**
 * 🔧 SETUP GLOBAL PARA TESTES
 * 
 * Configurações globais e utilitários para todos os testes
 * StellarGrid Token Project
 */

const { TextEncoder, TextDecoder } = require('util');

// Polyfills para Node.js
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Configurações globais de timeout
jest.setTimeout(30000);

// Configurações de console para testes
const originalConsole = global.console;

// Suprimir logs durante testes (exceto erros)
if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TESTS) {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: originalConsole.error // Manter erros visíveis
  };
}

// Configurações de fetch mock (se necessário)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Utilitários globais para testes
global.testUtils = {
  // Aguardar um tempo específico
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Gerar string aleatória
  randomString: (length = 8) => {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  // Gerar número aleatório
  randomNumber: (min = 1, max = 1000) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // Validar estrutura de resposta da API
  validateApiResponse: (response, expectedProperties = []) => {
    expect(response).toHaveProperty('body');
    expect(response.body).toHaveProperty('success');
    
    if (response.body.success) {
      expect(response.body).toHaveProperty('data');
      
      expectedProperties.forEach(prop => {
        expect(response.body.data).toHaveProperty(prop);
      });
    } else {
      expect(response.body).toHaveProperty('error');
    }
  },
  
  // Validar estrutura de erro da API
  validateApiError: (response, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  },
  
  // Criar dados de teste para gerador
  createTestGenerator: (overrides = {}) => ({
    name: `Test Generator ${global.testUtils.randomString()}`,
    type: 'solar',
    capacity: global.testUtils.randomNumber(100, 5000),
    location: `Test Location ${global.testUtils.randomString(5)}`,
    coordinates: {
      latitude: -23.5505 + (Math.random() - 0.5) * 0.1,
      longitude: -46.6333 + (Math.random() - 0.5) * 0.1
    },
    certifications: ['ISO 14001'],
    ...overrides
  }),
  
  // Criar dados de teste para energia
  createTestEnergyData: (overrides = {}) => ({
    timestamp: new Date().toISOString(),
    kwhProduced: global.testUtils.randomNumber(100, 2000),
    efficiency: Math.round((Math.random() * 20 + 80) * 100) / 100, // 80-100%
    weatherConditions: ['sunny', 'cloudy', 'windy'][Math.floor(Math.random() * 3)],
    temperature: Math.round((Math.random() * 20 + 20) * 100) / 100, // 20-40°C
    ...overrides
  }),
  
  // Limpar dados de teste
  cleanup: async () => {
    // Implementar limpeza se necessário
    console.log('🧹 Limpando dados de teste...');
  }
};

// Configurações de matchers customizados
expect.extend({
  // Matcher para validar endereços Stellar
  toBeValidStellarAddress(received) {
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    const pass = stellarAddressRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Stellar address`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Stellar address`,
        pass: false
      };
    }
  },
  
  // Matcher para validar hash de transação
  toBeValidTransactionHash(received) {
    const hashRegex = /^[a-f0-9]{64}$/i;
    const pass = typeof received === 'string' && hashRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid transaction hash`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid transaction hash`,
        pass: false
      };
    }
  },
  
  // Matcher para validar timestamp ISO
  toBeValidISOTimestamp(received) {
    const pass = !isNaN(Date.parse(received));
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO timestamp`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO timestamp`,
        pass: false
      };
    }
  },
  
  // Matcher para validar estrutura de resposta da API
  toHaveApiStructure(received, expectedProperties = []) {
    const hasSuccess = received.hasOwnProperty('success');
    const hasData = received.success ? received.hasOwnProperty('data') : true;
    const hasError = !received.success ? received.hasOwnProperty('error') : true;
    
    let hasExpectedProps = true;
    if (received.success && received.data) {
      hasExpectedProps = expectedProperties.every(prop => 
        received.data.hasOwnProperty(prop)
      );
    }
    
    const pass = hasSuccess && hasData && hasError && hasExpectedProps;
    
    if (pass) {
      return {
        message: () => `expected response not to have valid API structure`,
        pass: true
      };
    } else {
      return {
        message: () => {
          const missing = [];
          if (!hasSuccess) missing.push('success');
          if (!hasData) missing.push('data');
          if (!hasError) missing.push('error');
          if (!hasExpectedProps) missing.push(`properties: ${expectedProperties.join(', ')}`);
          return `expected response to have valid API structure, missing: ${missing.join(', ')}`;
        },
        pass: false
      };
    }
  }
});

// Configurações de hooks globais
beforeAll(async () => {
  console.log('🚀 Iniciando suite de testes StellarGrid Token');
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Versão Node.js: ${process.version}`);
});

afterAll(async () => {
  console.log('✅ Suite de testes concluída');
  await global.testUtils.cleanup();
});

// Configurações de tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// Configurações de timeout para operações assíncronas
const originalSetTimeout = global.setTimeout;
global.setTimeout = (fn, delay) => {
  if (delay > 30000) {
    console.warn(`⚠️ Timeout muito longo detectado: ${delay}ms`);
  }
  return originalSetTimeout(fn, delay);
};

// Configurações de mock para módulos externos
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Exportar configurações para uso em outros arquivos de teste
module.exports = {
  testUtils: global.testUtils,
  originalConsole
};