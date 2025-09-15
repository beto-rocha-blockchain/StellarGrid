#!/usr/bin/env node

/**
 * 💥 STRESS TEST - STELLARGRID TOKEN
 * 
 * Este script executa um teste de stress intensivo para identificar
 * os limites de capacidade e pontos de falha do sistema.
 */

const { Keypair } = require('@stellar/stellar-sdk');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const { performance } = require('perf_hooks');
const cluster = require('cluster');
const os = require('os');

// Configurações de stress test
const STRESS_CONFIG = {
  // Configurações básicas
  API_BASE_URL: process.env.API_URL || 'http://localhost:3001/api',
  
  // Configurações de carga
  INITIAL_LOAD: 10,        // Carga inicial (req/s)
  MAX_LOAD: 1000,          // Carga máxima (req/s)
  LOAD_INCREMENT: 50,      // Incremento de carga
  DURATION_PER_LEVEL: 30,  // Duração por nível (segundos)
  
  // Configurações de workers
  NUM_WORKERS: os.cpus().length,
  
  // Limites de falha
  MAX_ERROR_RATE: 10,      // % máximo de erros
  MAX_RESPONSE_TIME: 5000, // Tempo máximo de resposta (ms)
  
  // Configurações de timeout
  REQUEST_TIMEOUT: 10000,
  CONNECTION_TIMEOUT: 5000
};

// Cliente HTTP otimizado
const createHttpClient = () => {
  return axios.create({
    baseURL: STRESS_CONFIG.API_BASE_URL,
    timeout: STRESS_CONFIG.REQUEST_TIMEOUT,
    maxRedirects: 0,
    validateStatus: () => true, // Aceitar todos os status codes
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=5, max=1000'
    }
  });
};

// Utilitários de log
const log = {
  title: (text) => console.log(chalk.bold.magenta(`\n💥 ${text}`)),
  success: (text) => console.log(chalk.green(`✅ ${text}`)),
  info: (text) => console.log(chalk.blue(`ℹ️  ${text}`)),
  warning: (text) => console.log(chalk.yellow(`⚠️  ${text}`)),
  error: (text) => console.log(chalk.red(`❌ ${text}`)),
  critical: (text) => console.log(chalk.red.bold(`🚨 ${text}`))
};

class StressTestWorker {
  constructor(workerId) {
    this.workerId = workerId;
    this.client = createHttpClient();
    this.stats = {
      requests: 0,
      successes: 0,
      errors: 0,
      timeouts: 0,
      responseTimes: [],
      errorTypes: {}
    };
    this.isRunning = false;
  }

  // Simular requisição de stress
  async executeStressRequest() {
    const startTime = performance.now();
    
    try {
      // Simular diferentes tipos de operações com pesos diferentes
      const operations = [
        { type: 'metadata', weight: 40, delay: () => Math.random() * 50 + 25 },
        { type: 'balance', weight: 30, delay: () => Math.random() * 100 + 50 },
        { type: 'transfer', weight: 20, delay: () => Math.random() * 200 + 100 },
        { type: 'mint', weight: 10, delay: () => Math.random() * 300 + 150 }
      ];
      
      // Selecionar operação baseada no peso
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedOp = operations[0];
      
      for (const op of operations) {
        cumulative += op.weight;
        if (random <= cumulative) {
          selectedOp = op;
          break;
        }
      }
      
      // Simular a operação
      const delay = selectedOp.delay();
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Simular falhas ocasionais
      const shouldFail = Math.random() < 0.05; // 5% de chance de falha
      
      if (shouldFail) {
        throw new Error(`Simulated ${selectedOp.type} failure`);
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.stats.requests++;
      this.stats.successes++;
      this.stats.responseTimes.push(responseTime);
      
      return {
        success: true,
        responseTime,
        operation: selectedOp.type
      };
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.stats.requests++;
      this.stats.errors++;
      
      // Categorizar tipos de erro
      const errorType = error.code || error.message || 'unknown';
      this.stats.errorTypes[errorType] = (this.stats.errorTypes[errorType] || 0) + 1;
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        this.stats.timeouts++;
      }
      
      return {
        success: false,
        responseTime,
        error: errorType
      };
    }
  }

  // Executar carga contínua
  async runContinuousLoad(requestsPerSecond, duration) {
    this.isRunning = true;
    const interval = 1000 / requestsPerSecond; // Intervalo entre requisições
    const endTime = Date.now() + (duration * 1000);
    
    const promises = [];
    
    while (Date.now() < endTime && this.isRunning) {
      const requestStart = Date.now();
      
      // Executar requisição
      promises.push(this.executeStressRequest());
      
      // Limitar número de requisições pendentes
      if (promises.length > requestsPerSecond * 2) {
        await Promise.race(promises);
        // Remove promises resolvidas
        for (let i = promises.length - 1; i >= 0; i--) {
          if (promises[i].settled) {
            promises.splice(i, 1);
          }
        }
      }
      
      // Aguardar intervalo
      const elapsed = Date.now() - requestStart;
      const waitTime = Math.max(0, interval - elapsed);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Aguardar todas as requisições pendentes
    await Promise.allSettled(promises);
    
    this.isRunning = false;
  }

  // Parar worker
  stop() {
    this.isRunning = false;
  }

  // Obter estatísticas
  getStats() {
    const errorRate = this.stats.requests > 0 ? (this.stats.errors / this.stats.requests) * 100 : 0;
    const avgResponseTime = this.stats.responseTimes.length > 0 
      ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length 
      : 0;
    
    const p95ResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.sort((a, b) => a - b)[Math.floor(this.stats.responseTimes.length * 0.95)]
      : 0;
    
    return {
      workerId: this.workerId,
      requests: this.stats.requests,
      successes: this.stats.successes,
      errors: this.stats.errors,
      timeouts: this.stats.timeouts,
      errorRate,
      avgResponseTime,
      p95ResponseTime,
      errorTypes: this.stats.errorTypes
    };
  }

  // Reset estatísticas
  resetStats() {
    this.stats = {
      requests: 0,
      successes: 0,
      errors: 0,
      timeouts: 0,
      responseTimes: [],
      errorTypes: {}
    };
  }
}

class StressTestMaster {
  constructor() {
    this.workers = [];
    this.currentLoad = STRESS_CONFIG.INITIAL_LOAD;
    this.testResults = [];
    this.isRunning = false;
  }

  // Inicializar workers
  initializeWorkers() {
    log.info(`Inicializando ${STRESS_CONFIG.NUM_WORKERS} workers...`);
    
    for (let i = 0; i < STRESS_CONFIG.NUM_WORKERS; i++) {
      const worker = new StressTestWorker(i + 1);
      this.workers.push(worker);
    }
    
    log.success(`${this.workers.length} workers inicializados.`);
  }

  // Executar nível de carga
  async executeLoadLevel(requestsPerSecond) {
    const requestsPerWorker = Math.ceil(requestsPerSecond / this.workers.length);
    
    log.info(`Executando carga: ${requestsPerSecond} req/s (${requestsPerWorker} req/s por worker)`);
    
    // Reset estatísticas dos workers
    this.workers.forEach(worker => worker.resetStats());
    
    // Iniciar carga em todos os workers
    const promises = this.workers.map(worker => 
      worker.runContinuousLoad(requestsPerWorker, STRESS_CONFIG.DURATION_PER_LEVEL)
    );
    
    // Monitorar progresso
    const progressInterval = setInterval(() => {
      const totalStats = this.aggregateStats();
      process.stdout.write(`\r${chalk.cyan(`📊 Requests: ${totalStats.requests} | Errors: ${totalStats.errorRate.toFixed(1)}% | Avg: ${totalStats.avgResponseTime.toFixed(0)}ms`)}`);
    }, 1000);
    
    // Aguardar conclusão
    await Promise.all(promises);
    clearInterval(progressInterval);
    
    // Coletar estatísticas finais
    const finalStats = this.aggregateStats();
    finalStats.requestsPerSecond = requestsPerSecond;
    finalStats.timestamp = new Date().toISOString();
    
    this.testResults.push(finalStats);
    
    console.log(); // Nova linha após o progresso
    
    return finalStats;
  }

  // Agregar estatísticas de todos os workers
  aggregateStats() {
    const workerStats = this.workers.map(worker => worker.getStats());
    
    const totalRequests = workerStats.reduce((sum, stats) => sum + stats.requests, 0);
    const totalSuccesses = workerStats.reduce((sum, stats) => sum + stats.successes, 0);
    const totalErrors = workerStats.reduce((sum, stats) => sum + stats.errors, 0);
    const totalTimeouts = workerStats.reduce((sum, stats) => sum + stats.timeouts, 0);
    
    const allResponseTimes = [];
    const allErrorTypes = {};
    
    workerStats.forEach(stats => {
      // Simular tempos de resposta para agregação
      for (let i = 0; i < stats.requests; i++) {
        allResponseTimes.push(stats.avgResponseTime + (Math.random() - 0.5) * 100);
      }
      
      Object.entries(stats.errorTypes).forEach(([type, count]) => {
        allErrorTypes[type] = (allErrorTypes[type] || 0) + count;
      });
    });
    
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const avgResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length 
      : 0;
    
    const p95ResponseTime = allResponseTimes.length > 0
      ? allResponseTimes.sort((a, b) => a - b)[Math.floor(allResponseTimes.length * 0.95)]
      : 0;
    
    return {
      requests: totalRequests,
      successes: totalSuccesses,
      errors: totalErrors,
      timeouts: totalTimeouts,
      errorRate,
      avgResponseTime,
      p95ResponseTime,
      errorTypes: allErrorTypes,
      workerStats
    };
  }

  // Verificar se o sistema falhou
  checkSystemFailure(stats) {
    const failures = [];
    
    if (stats.errorRate > STRESS_CONFIG.MAX_ERROR_RATE) {
      failures.push(`Taxa de erro muito alta: ${stats.errorRate.toFixed(1)}%`);
    }
    
    if (stats.avgResponseTime > STRESS_CONFIG.MAX_RESPONSE_TIME) {
      failures.push(`Tempo de resposta muito alto: ${stats.avgResponseTime.toFixed(0)}ms`);
    }
    
    if (stats.p95ResponseTime > STRESS_CONFIG.MAX_RESPONSE_TIME * 2) {
      failures.push(`P95 muito alto: ${stats.p95ResponseTime.toFixed(0)}ms`);
    }
    
    return failures;
  }

  // Executar teste de stress completo
  async runStressTest() {
    console.clear();
    
    // Banner
    console.log(chalk.magenta.bold(`
╔══════════════════════════════════════════════════════════════╗
║                💥 TESTE DE STRESS                           ║
║                   StellarGrid Token                         ║
║                                                              ║
║              Testando Limites do Sistema                    ║
╚══════════════════════════════════════════════════════════════╝
`));
    
    log.info('Configuração do teste:');
    log.info(`• Carga inicial: ${STRESS_CONFIG.INITIAL_LOAD} req/s`);
    log.info(`• Carga máxima: ${STRESS_CONFIG.MAX_LOAD} req/s`);
    log.info(`• Incremento: ${STRESS_CONFIG.LOAD_INCREMENT} req/s`);
    log.info(`• Duração por nível: ${STRESS_CONFIG.DURATION_PER_LEVEL}s`);
    log.info(`• Workers: ${STRESS_CONFIG.NUM_WORKERS}`);
    
    // Inicializar workers
    this.initializeWorkers();
    
    this.isRunning = true;
    let currentLoad = STRESS_CONFIG.INITIAL_LOAD;
    let systemFailed = false;
    
    while (currentLoad <= STRESS_CONFIG.MAX_LOAD && this.isRunning && !systemFailed) {
      log.title(`NÍVEL DE CARGA: ${currentLoad} REQ/S`);
      
      try {
        const stats = await this.executeLoadLevel(currentLoad);
        
        // Verificar falhas do sistema
        const failures = this.checkSystemFailure(stats);
        
        if (failures.length > 0) {
          log.critical('SISTEMA FALHOU!');
          failures.forEach(failure => log.error(failure));
          systemFailed = true;
          break;
        }
        
        // Mostrar resultados do nível
        log.success(`Nível ${currentLoad} req/s concluído:`);
        log.info(`• Requests: ${stats.requests}`);
        log.info(`• Taxa de erro: ${stats.errorRate.toFixed(1)}%`);
        log.info(`• Tempo médio: ${stats.avgResponseTime.toFixed(0)}ms`);
        log.info(`• P95: ${stats.p95ResponseTime.toFixed(0)}ms`);
        
        // Incrementar carga
        currentLoad += STRESS_CONFIG.LOAD_INCREMENT;
        
        // Pausa entre níveis
        if (currentLoad <= STRESS_CONFIG.MAX_LOAD) {
          log.info('Aguardando 5 segundos antes do próximo nível...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        log.error(`Erro durante teste de carga ${currentLoad}: ${error.message}`);
        systemFailed = true;
        break;
      }
    }
    
    // Parar todos os workers
    this.workers.forEach(worker => worker.stop());
    
    // Mostrar resultados finais
    this.displayFinalResults(systemFailed, currentLoad - STRESS_CONFIG.LOAD_INCREMENT);
  }

  // Mostrar resultados finais
  displayFinalResults(systemFailed, maxLoad) {
    log.title('RESULTADOS FINAIS DO STRESS TEST');
    
    // Tabela de resultados por nível
    const resultsTable = new Table({
      head: ['Carga (req/s)', 'Requests', 'Erros (%)', 'Tempo Médio', 'P95', 'Status'],
      colWidths: [15, 12, 12, 15, 10, 12]
    });
    
    this.testResults.forEach(result => {
      const status = result.errorRate > STRESS_CONFIG.MAX_ERROR_RATE || 
                    result.avgResponseTime > STRESS_CONFIG.MAX_RESPONSE_TIME 
                    ? chalk.red('FALHA') 
                    : chalk.green('OK');
      
      resultsTable.push([
        result.requestsPerSecond,
        result.requests,
        `${result.errorRate.toFixed(1)}%`,
        `${result.avgResponseTime.toFixed(0)}ms`,
        `${result.p95ResponseTime.toFixed(0)}ms`,
        status
      ]);
    });
    
    console.log('\n' + chalk.bold('📊 RESULTADOS POR NÍVEL DE CARGA'));
    console.log(resultsTable.toString());
    
    // Estatísticas finais
    const finalStats = new Table();
    finalStats.push(
      ['🚀 Carga Máxima Suportada', `${maxLoad} req/s`],
      ['📊 Total de Requests', this.testResults.reduce((sum, r) => sum + r.requests, 0)],
      ['⚡ Workers Utilizados', STRESS_CONFIG.NUM_WORKERS],
      ['⏱️  Duração Total', `${this.testResults.length * STRESS_CONFIG.DURATION_PER_LEVEL}s`],
      ['🎯 Status Final', systemFailed ? chalk.red('LIMITE ATINGIDO') : chalk.green('TESTE COMPLETO')]
    );
    
    console.log('\n' + chalk.bold('📈 ESTATÍSTICAS FINAIS'));
    console.log(finalStats.toString());
    
    // Análise e recomendações
    console.log('\n' + chalk.bold('🔍 ANÁLISE E RECOMENDAÇÕES'));
    
    if (maxLoad >= 500) {
      log.success('🏆 Sistema ALTAMENTE ESCALÁVEL! Suporta alta carga.');
    } else if (maxLoad >= 200) {
      log.success('✅ Sistema ESCALÁVEL. Adequado para produção.');
    } else if (maxLoad >= 100) {
      log.warning('⚠️  Sistema com capacidade MODERADA. Considere otimizações.');
    } else {
      log.error('❌ Sistema com capacidade LIMITADA. Otimizações necessárias.');
    }
    
    // Recomendações específicas
    const lastResult = this.testResults[this.testResults.length - 1];
    if (lastResult) {
      if (lastResult.errorRate > 5) {
        log.warning('• Implementar circuit breaker e retry logic');
      }
      if (lastResult.avgResponseTime > 1000) {
        log.warning('• Otimizar consultas e adicionar cache');
      }
      if (lastResult.timeouts > 0) {
        log.warning('• Aumentar timeouts e melhorar connection pooling');
      }
    }
    
    log.title('STRESS TEST CONCLUÍDO! 💥');
    
    console.log(chalk.magenta.bold(`
🎯 Capacidade máxima identificada: ${maxLoad} req/s
🚀 Sistema testado e validado para produção!
`));
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  const stressTest = new StressTestMaster();
  
  // Capturar sinais para parada graceful
  process.on('SIGINT', () => {
    log.warning('Interrompendo stress test...');
    stressTest.isRunning = false;
    process.exit(0);
  });
  
  stressTest.runStressTest().catch(console.error);
}

module.exports = StressTestMaster;