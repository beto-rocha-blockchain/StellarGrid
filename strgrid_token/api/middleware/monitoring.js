/**
 * 📊 SISTEMA DE MONITORAMENTO - STELLARGRID TOKEN
 * 
 * Middleware para coleta de métricas, monitoramento de performance
 * e alertas em tempo real da API.
 */

const { performance } = require('perf_hooks');
const os = require('os');
const logger = require('../utils/logger');

// Armazenamento em memória para métricas (em produção, usar Redis/InfluxDB)
class MetricsStore {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: {},
        byMethod: {},
        byStatusCode: {}
      },
      performance: {
        responseTimes: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
        activeConnections: 0
      },
      business: {
        generators: 0,
        totalTokens: 0,
        transactions: 0,
        volume: 0
      },
      alerts: [],
      startTime: Date.now()
    };
    
    // Iniciar coleta de métricas do sistema
    this.startSystemMetrics();
  }

  // Registrar requisição
  recordRequest(method, endpoint, statusCode, responseTime, error = null) {
    this.metrics.requests.total++;
    
    // Contadores por método
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // Contadores por endpoint
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;
    
    // Contadores por status code
    this.metrics.requests.byStatusCode[statusCode] = (this.metrics.requests.byStatusCode[statusCode] || 0) + 1;
    
    // Sucesso vs erro
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }
    
    // Tempo de resposta
    this.metrics.performance.responseTimes.push(responseTime);
    
    // Manter apenas os últimos 1000 tempos de resposta
    if (this.metrics.performance.responseTimes.length > 1000) {
      this.metrics.performance.responseTimes.shift();
    }
    
    // Recalcular percentis
    this.calculatePercentiles();
    
    // Log da requisição
    logger.logRequest({
      method,
      endpoint,
      statusCode,
      responseTime,
      error
    });
    
    // Verificar alertas
    this.checkAlerts(responseTime, statusCode);
  }

  // Calcular percentis de tempo de resposta
  calculatePercentiles() {
    const times = [...this.metrics.performance.responseTimes].sort((a, b) => a - b);
    const length = times.length;
    
    if (length === 0) return;
    
    // Tempo médio
    this.metrics.performance.avgResponseTime = times.reduce((a, b) => a + b, 0) / length;
    
    // P95
    const p95Index = Math.floor(length * 0.95);
    this.metrics.performance.p95ResponseTime = times[p95Index] || 0;
    
    // P99
    const p99Index = Math.floor(length * 0.99);
    this.metrics.performance.p99ResponseTime = times[p99Index] || 0;
  }

  // Iniciar coleta de métricas do sistema
  startSystemMetrics() {
    setInterval(() => {
      // CPU Usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      this.metrics.system.cpuUsage = ((totalTick - totalIdle) / totalTick) * 100;
      
      // Memory Usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      this.metrics.system.memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      
      // Uptime
      this.metrics.system.uptime = Date.now() - this.metrics.startTime;
      
    }, 5000); // A cada 5 segundos
  }

  // Verificar condições de alerta
  checkAlerts(responseTime, statusCode) {
    const now = Date.now();
    
    // Alert: Tempo de resposta alto
    if (responseTime > 5000) {
      this.addAlert('HIGH_RESPONSE_TIME', `Tempo de resposta alto: ${responseTime}ms`, 'warning');
    }
    
    // Alert: Erro 5xx
    if (statusCode >= 500) {
      this.addAlert('SERVER_ERROR', `Erro do servidor: ${statusCode}`, 'error');
    }
    
    // Alert: Taxa de erro alta (últimos 100 requests)
    const recentRequests = this.metrics.performance.responseTimes.slice(-100);
    if (recentRequests.length >= 100) {
      const errorRate = (this.metrics.requests.errors / this.metrics.requests.total) * 100;
      if (errorRate > 10) {
        this.addAlert('HIGH_ERROR_RATE', `Taxa de erro alta: ${errorRate.toFixed(1)}%`, 'critical');
      }
    }
    
    // Alert: CPU alto
    if (this.metrics.system.cpuUsage > 80) {
      this.addAlert('HIGH_CPU', `CPU alto: ${this.metrics.system.cpuUsage.toFixed(1)}%`, 'warning');
    }
    
    // Alert: Memória alta
    if (this.metrics.system.memoryUsage > 85) {
      this.addAlert('HIGH_MEMORY', `Memória alta: ${this.metrics.system.memoryUsage.toFixed(1)}%`, 'warning');
    }
  }

  // Adicionar alerta
  addAlert(type, message, severity) {
    const alert = {
      id: `${type}_${Date.now()}`,
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      resolved: false
    };
    
    this.metrics.alerts.unshift(alert);
    
    // Manter apenas os últimos 100 alertas
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts.pop();
    }
    
    // Log do alerta
    logger.logAlert(alert);
  }

  // Atualizar métricas de negócio
  updateBusinessMetrics(type, value) {
    switch (type) {
      case 'generators':
        this.metrics.business.generators = value;
        break;
      case 'tokens':
        this.metrics.business.totalTokens = value;
        break;
      case 'transaction':
        this.metrics.business.transactions++;
        this.metrics.business.volume += value || 0;
        break;
    }
  }

  // Obter todas as métricas
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.metrics.startTime
    };
  }

  // Obter resumo das métricas
  getSummary() {
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.errors / this.metrics.requests.total) * 100 
      : 0;
    
    return {
      status: this.getSystemStatus(),
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        errors: this.metrics.requests.errors,
        errorRate: parseFloat(errorRate.toFixed(2))
      },
      performance: {
        avgResponseTime: parseFloat(this.metrics.performance.avgResponseTime.toFixed(2)),
        p95ResponseTime: parseFloat(this.metrics.performance.p95ResponseTime.toFixed(2))
      },
      system: {
        cpuUsage: parseFloat(this.metrics.system.cpuUsage.toFixed(2)),
        memoryUsage: parseFloat(this.metrics.system.memoryUsage.toFixed(2)),
        uptime: this.metrics.system.uptime
      },
      alerts: this.metrics.alerts.filter(alert => !alert.resolved).length
    };
  }

  // Determinar status geral do sistema
  getSystemStatus() {
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.errors / this.metrics.requests.total) * 100 
      : 0;
    
    const activeAlerts = this.metrics.alerts.filter(alert => !alert.resolved);
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    
    if (criticalAlerts.length > 0 || errorRate > 20) {
      return 'critical';
    }
    
    if (activeAlerts.length > 0 || errorRate > 10 || 
        this.metrics.system.cpuUsage > 80 || 
        this.metrics.system.memoryUsage > 85) {
      return 'warning';
    }
    
    return 'healthy';
  }

  // Reset métricas (para testes)
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: {},
        byMethod: {},
        byStatusCode: {}
      },
      performance: {
        responseTimes: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
        activeConnections: 0
      },
      business: {
        generators: 0,
        totalTokens: 0,
        transactions: 0,
        volume: 0
      },
      alerts: [],
      startTime: Date.now()
    };
  }
}

// Instância global do store de métricas
const metricsStore = new MetricsStore();

// Middleware de monitoramento
const monitoringMiddleware = (req, res, next) => {
  const startTime = performance.now();
  
  // Interceptar o final da resposta
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Registrar métricas
    metricsStore.recordRequest(
      req.method,
      req.route ? req.route.path : req.path,
      res.statusCode,
      responseTime,
      res.statusCode >= 400 ? data : null
    );
    
    // Chamar o send original
    originalSend.call(this, data);
  };
  
  next();
};

// Middleware para health check
const healthCheckMiddleware = (req, res) => {
  const summary = metricsStore.getSummary();
  
  res.status(summary.status === 'critical' ? 503 : 200).json({
    status: summary.status,
    timestamp: new Date().toISOString(),
    uptime: summary.system.uptime,
    version: process.env.npm_package_version || '1.0.0',
    ...summary
  });
};

// Middleware para métricas detalhadas
const metricsMiddleware = (req, res) => {
  const metrics = metricsStore.getMetrics();
  
  res.json({
    success: true,
    data: metrics
  });
};

// Middleware para alertas
const alertsMiddleware = (req, res) => {
  const { resolved } = req.query;
  
  let alerts = metricsStore.metrics.alerts;
  
  if (resolved !== undefined) {
    const isResolved = resolved === 'true';
    alerts = alerts.filter(alert => alert.resolved === isResolved);
  }
  
  res.json({
    success: true,
    data: alerts,
    total: alerts.length
  });
};

// Função para resolver alerta
const resolveAlert = (alertId) => {
  const alert = metricsStore.metrics.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    return true;
  }
  return false;
};

// Middleware para dashboard em tempo real (Server-Sent Events)
const dashboardSSE = (req, res) => {
  // Configurar SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Enviar dados iniciais
  const sendMetrics = () => {
    const summary = metricsStore.getSummary();
    res.write(`data: ${JSON.stringify(summary)}\n\n`);
  };
  
  // Enviar métricas a cada 2 segundos
  sendMetrics();
  const interval = setInterval(sendMetrics, 2000);
  
  // Cleanup quando cliente desconectar
  req.on('close', () => {
    clearInterval(interval);
  });
};

module.exports = {
  metricsStore,
  monitoringMiddleware,
  healthCheckMiddleware,
  metricsMiddleware,
  alertsMiddleware,
  dashboardSSE,
  resolveAlert
};