/**
 * 🌍 CONFIGURAÇÃO DE AMBIENTE PARA TESTES
 * 
 * Variáveis de ambiente e configurações específicas para testes
 * StellarGrid Token Project
 */

// Configurações de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.API_PORT = '3001';
process.env.LOG_LEVEL = 'error';
process.env.STELLAR_NETWORK = 'testnet';

// Configurações do Stellar/Soroban para testes
process.env.STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org';
process.env.STELLAR_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
process.env.SOROBAN_CONTRACT_ID = 'test_contract_id';

// Configurações de segurança para testes
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.API_KEY = 'test_api_key_for_testing';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters';

// Configurações de rate limiting para testes (mais permissivo)
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minuto
process.env.RATE_LIMIT_MAX_REQUESTS = '1000'; // 1000 requests por minuto

// Configurações de cache para testes
process.env.CACHE_TTL = '300'; // 5 minutos
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Database 1 para testes

// Configurações de monitoramento para testes
process.env.MONITORING_ENABLED = 'true';
process.env.METRICS_COLLECTION_INTERVAL = '5000'; // 5 segundos
process.env.ALERT_THRESHOLD_ERROR_RATE = '10'; // 10%
process.env.ALERT_THRESHOLD_RESPONSE_TIME = '2000'; // 2 segundos

// Configurações de logging para testes
process.env.LOG_FILE_PATH = './tests/logs/test.log';
process.env.LOG_ERROR_FILE_PATH = './tests/logs/error.log';
process.env.LOG_MAX_SIZE = '10m';
process.env.LOG_MAX_FILES = '3';

// Configurações de desenvolvimento para testes
process.env.DEBUG_MODE = 'false';
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:3001';
process.env.TRUST_PROXY = 'false';

// Configurações de banco de dados para testes (se aplicável)
process.env.DATABASE_URL = 'sqlite://./tests/test.db';
process.env.DATABASE_POOL_MIN = '1';
process.env.DATABASE_POOL_MAX = '5';

// Configurações específicas para diferentes tipos de teste
if (process.env.TEST_TYPE === 'integration') {
  // Configurações específicas para testes de integração
  process.env.API_TIMEOUT = '30000';
  process.env.STELLAR_TIMEOUT = '20000';
  process.env.CONTRACT_CALL_TIMEOUT = '15000';
} else if (process.env.TEST_TYPE === 'e2e') {
  // Configurações específicas para testes E2E
  process.env.API_TIMEOUT = '60000';
  process.env.STELLAR_TIMEOUT = '45000';
  process.env.CONTRACT_CALL_TIMEOUT = '30000';
} else {
  // Configurações padrão para testes unitários
  process.env.API_TIMEOUT = '10000';
  process.env.STELLAR_TIMEOUT = '5000';
  process.env.CONTRACT_CALL_TIMEOUT = '5000';
}

// Configurações de mock para serviços externos
process.env.MOCK_STELLAR_SDK = 'true';
process.env.MOCK_EXTERNAL_APIS = 'true';
process.env.MOCK_BLOCKCHAIN_CALLS = 'true';

// Configurações de dados de teste
process.env.TEST_DATA_CLEANUP = 'true';
process.env.TEST_DATA_SEED = 'false';
process.env.TEST_PARALLEL_EXECUTION = 'true';

// Configurações de relatórios de teste
process.env.TEST_REPORT_FORMAT = 'json,html';
process.env.TEST_COVERAGE_THRESHOLD = '80';
process.env.TEST_VERBOSE_OUTPUT = 'false';

// Configurações de performance para testes
process.env.MAX_CONCURRENT_TESTS = '4';
process.env.TEST_MEMORY_LIMIT = '512';
process.env.TEST_CPU_LIMIT = '2';

// Configurações de retry para testes flaky
process.env.TEST_RETRY_COUNT = '2';
process.env.TEST_RETRY_DELAY = '1000';

// Configurações de notificação para testes
process.env.TEST_NOTIFICATIONS_ENABLED = 'false';
process.env.TEST_SLACK_WEBHOOK = '';
process.env.TEST_EMAIL_NOTIFICATIONS = 'false';

// Configurações de CI/CD para testes
if (process.env.CI) {
  process.env.TEST_PARALLEL_EXECUTION = 'true';
  process.env.TEST_VERBOSE_OUTPUT = 'true';
  process.env.TEST_COVERAGE_THRESHOLD = '85';
  process.env.TEST_TIMEOUT_MULTIPLIER = '2';
}

// Configurações de debug para testes
if (process.env.DEBUG_TESTS) {
  process.env.LOG_LEVEL = 'debug';
  process.env.TEST_VERBOSE_OUTPUT = 'true';
  process.env.MOCK_STELLAR_SDK = 'false';
  process.env.MOCK_EXTERNAL_APIS = 'false';
}

// Validação de configurações críticas
const requiredEnvVars = [
  'NODE_ENV',
  'API_PORT',
  'STELLAR_NETWORK',
  'STELLAR_RPC_URL',
  'JWT_SECRET'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`❌ Variável de ambiente obrigatória não definida: ${envVar}`);
  }
});

// Log das configurações de teste (apenas em modo debug)
if (process.env.DEBUG_TESTS) {
  console.log('🔧 Configurações de ambiente para testes:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   API_PORT: ${process.env.API_PORT}`);
  console.log(`   STELLAR_NETWORK: ${process.env.STELLAR_NETWORK}`);
  console.log(`   LOG_LEVEL: ${process.env.LOG_LEVEL}`);
  console.log(`   TEST_TYPE: ${process.env.TEST_TYPE || 'unit'}`);
  console.log(`   MOCK_STELLAR_SDK: ${process.env.MOCK_STELLAR_SDK}`);
  console.log(`   TEST_PARALLEL_EXECUTION: ${process.env.TEST_PARALLEL_EXECUTION}`);
}

// Exportar configurações para uso em outros arquivos
module.exports = {
  // Configurações de teste
  testConfig: {
    timeout: parseInt(process.env.API_TIMEOUT) || 10000,
    retries: parseInt(process.env.TEST_RETRY_COUNT) || 2,
    parallel: process.env.TEST_PARALLEL_EXECUTION === 'true',
    verbose: process.env.TEST_VERBOSE_OUTPUT === 'true',
    cleanup: process.env.TEST_DATA_CLEANUP === 'true'
  },
  
  // Configurações do Stellar
  stellarConfig: {
    network: process.env.STELLAR_NETWORK,
    rpcUrl: process.env.STELLAR_RPC_URL,
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE,
    contractId: process.env.SOROBAN_CONTRACT_ID,
    timeout: parseInt(process.env.STELLAR_TIMEOUT) || 5000
  },
  
  // Configurações de mock
  mockConfig: {
    stellarSdk: process.env.MOCK_STELLAR_SDK === 'true',
    externalApis: process.env.MOCK_EXTERNAL_APIS === 'true',
    blockchainCalls: process.env.MOCK_BLOCKCHAIN_CALLS === 'true'
  },
  
  // Configurações de API
  apiConfig: {
    port: parseInt(process.env.API_PORT) || 3001,
    timeout: parseInt(process.env.API_TIMEOUT) || 10000,
    baseUrl: `http://localhost:${process.env.API_PORT || 3001}`
  },
  
  // Utilitários de ambiente
  isCI: !!process.env.CI,
  isDebug: !!process.env.DEBUG_TESTS,
  testType: process.env.TEST_TYPE || 'unit'
};