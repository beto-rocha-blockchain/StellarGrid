/**
 * 🧪 CONFIGURAÇÃO DO JEST
 * 
 * Configurações para testes unitários e de integração
 * StellarGrid Token Project
 */

module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Diretórios de teste
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Ignorar arquivos
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ],
  
  // Configuração de cobertura
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Arquivos para análise de cobertura
  collectCoverageFrom: [
    'api/**/*.js',
    'scripts/**/*.js',
    '!api/node_modules/**',
    '!api/coverage/**',
    '!api/public/**',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  
  // Limites de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './api/services/': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    './api/middleware/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  
  // Setup e teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout para testes
  testTimeout: 30000,
  
  // Configurações de módulos
  moduleFileExtensions: ['js', 'json'],
  
  // Transformações
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Variáveis de ambiente para testes
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  
  // Configurações específicas por tipo de teste
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['**/tests/unit/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['**/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 60000
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['**/tests/e2e/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 120000
    }
  ],
  
  // Configurações de relatórios
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'StellarGrid Token - Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // Configurações de mock
  clearMocks: true,
  restoreMocks: true,
  
  // Configurações de verbose
  verbose: true,
  
  // Configurações de cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Configurações de watch
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/build/',
    '/dist/'
  ],
  
  // Configurações globais
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      API_PORT: '3001',
      LOG_LEVEL: 'error',
      STELLAR_NETWORK: 'testnet'
    }
  },
  
  // Configurações de notificação
  notify: true,
  notifyMode: 'failure-change',
  
  // Configurações de bail
  bail: false,
  
  // Configurações de força de saída
  forceExit: true,
  
  // Configurações de detecção de handles abertos
  detectOpenHandles: true,
  
  // Configurações de detecção de leaks de memória
  detectLeaks: false,
  
  // Configurações de máximo de workers
  maxWorkers: '50%',
  
  // Configurações de retry
  retry: 2,
  
  // Configurações de silent
  silent: false
};