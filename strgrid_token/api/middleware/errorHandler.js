const logger = require('../utils/logger');

/**
 * Classe para erros customizados da API
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erros específicos do Stellar/Soroban
 */
class StellarError extends ApiError {
  constructor(message, originalError = null) {
    super(message, 400);
    this.originalError = originalError;
    this.type = 'STELLAR_ERROR';
  }
}

class ContractError extends ApiError {
  constructor(message, originalError = null) {
    super(message, 422);
    this.originalError = originalError;
    this.type = 'CONTRACT_ERROR';
  }
}

class ValidationError extends ApiError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.type = 'VALIDATION_ERROR';
  }
}

/**
 * Middleware principal de tratamento de erros
 */
const errorHandler = (error, req, res, next) => {
  let err = { ...error };
  err.message = error.message;

  // Log do erro
  logger.error('Erro na API:', {
    message: err.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Erro de validação do Joi
  if (error.isJoi) {
    const message = 'Dados de entrada inválidos';
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  // Erros do Stellar SDK
  if (error.name === 'NetworkError') {
    err = new StellarError('Erro de conexão com a rede Stellar', error);
  }
  
  if (error.name === 'BadRequestError') {
    err = new StellarError('Requisição inválida para a rede Stellar', error);
  }
  
  if (error.name === 'NotFoundError') {
    err = new StellarError('Recurso não encontrado na rede Stellar', error);
  }

  // Erros específicos do Soroban
  if (error.message && error.message.includes('contract')) {
    if (error.message.includes('not found')) {
      err = new ContractError('Contrato não encontrado ou não inicializado');
    } else if (error.message.includes('insufficient')) {
      err = new ContractError('Saldo insuficiente para realizar a operação');
    } else if (error.message.includes('unauthorized')) {
      err = new ContractError('Não autorizado a realizar esta operação');
    } else if (error.message.includes('invalid')) {
      err = new ContractError('Parâmetros inválidos para o contrato');
    }
  }

  // Erros de timeout
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    err = new ApiError('Timeout na operação - tente novamente', 408);
  }

  // Erros de rate limiting
  if (error.message && error.message.includes('rate limit')) {
    err = new ApiError('Muitas requisições - tente novamente mais tarde', 429);
  }

  // Erro de JSON malformado
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    err = new ValidationError('JSON malformado na requisição');
  }

  // Resposta padrão para erros operacionais
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      type: err.type || 'API_ERROR',
      ...(err.errors && { errors: err.errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Erro interno do servidor (não operacional)
  logger.error('Erro interno não tratado:', {
    error: err,
    stack: error.stack
  });

  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    type: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      originalMessage: err.message,
      stack: err.stack
    })
  });
};

/**
 * Middleware para capturar erros assíncronos
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para tratar rotas não encontradas
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(`Rota ${req.originalUrl} não encontrada`, 404);
  next(error);
};

/**
 * Handler para erros não capturados
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Exceção não capturada:', error);
    process.exit(1);
  });
};

/**
 * Handler para promises rejeitadas não tratadas
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promise rejeitada não tratada:', {
      reason,
      promise
    });
    process.exit(1);
  });
};

/**
 * Inicializar handlers globais
 */
const initializeErrorHandlers = () => {
  handleUncaughtException();
  handleUnhandledRejection();
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  initializeErrorHandlers,
  ApiError,
  StellarError,
  ContractError,
  ValidationError
};