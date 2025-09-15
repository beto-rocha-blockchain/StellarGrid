const winston = require('winston');
const path = require('path');

// Definir níveis de log customizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Definir cores para cada nível
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Adicionar cores ao winston
winston.addColors(colors);

// Formato customizado para logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Adicionar metadados se existirem
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Formato para arquivos (sem cores)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Definir transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
    level: process.env.LOG_LEVEL || 'info'
  }),
  
  // Arquivo para todos os logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/app.log'),
    format: fileFormat,
    level: 'info',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Arquivo específico para erros
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    format: fileFormat,
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false
});

// Adicionar transport para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Função para log de requisições HTTP
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// Função para log de transações Stellar
const logStellarTransaction = (operation, result, error = null) => {
  const logData = {
    operation,
    timestamp: new Date().toISOString(),
    success: !error,
    ...(result && { result }),
    ...(error && { error: error.message })
  };
  
  if (error) {
    logger.error('Stellar Transaction Failed', logData);
  } else {
    logger.info('Stellar Transaction Success', logData);
  }
};

// Função para log de métricas de performance
const logPerformance = (operation, duration, metadata = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

// Função para log de segurança
const logSecurity = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Função para log de debug com contexto
const debugLog = (message, context = {}) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(message, context);
  }
};

// Função para criar logs estruturados
const structuredLog = (level, message, data = {}) => {
  logger.log(level, message, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Middleware para capturar erros não tratados
const setupErrorLogging = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason,
      promise,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  });
};

// Função para rotacionar logs manualmente
const rotateLogs = () => {
  logger.info('Iniciando rotação de logs...');
  // Implementar lógica de rotação se necessário
};

// Função para limpar logs antigos
const cleanOldLogs = (daysToKeep = 30) => {
  const fs = require('fs');
  const logsDir = path.join(__dirname, '../logs');
  
  if (!fs.existsSync(logsDir)) {
    return;
  }
  
  const files = fs.readdirSync(logsDir);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  files.forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath);
      logger.info(`Log antigo removido: ${file}`);
    }
  });
};

// Exportar logger e funções utilitárias
module.exports = {
  ...logger,
  logRequest,
  logStellarTransaction,
  logPerformance,
  logSecurity,
  debugLog,
  structuredLog,
  setupErrorLogging,
  rotateLogs,
  cleanOldLogs
};