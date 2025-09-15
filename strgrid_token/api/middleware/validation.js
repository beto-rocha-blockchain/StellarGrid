const Joi = require('joi');
const logger = require('../utils/logger');

// Schemas de validação
const schemas = {
  registerGenerator: Joi.object({
    generatorAddress: Joi.string()
      .pattern(/^G[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Endereço do gerador deve ser um endereço Stellar válido (começando com G)',
        'any.required': 'Endereço do gerador é obrigatório'
      }),
    capacityKw: Joi.number()
      .integer()
      .min(1)
      .max(1000000)
      .required()
      .messages({
        'number.min': 'Capacidade deve ser pelo menos 1 kW',
        'number.max': 'Capacidade não pode exceder 1.000.000 kW',
        'any.required': 'Capacidade em kW é obrigatória'
      }),
    sourceKeypair: Joi.string()
      .pattern(/^S[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Chave secreta deve ser uma chave Stellar válida (começando com S)',
        'any.required': 'Chave secreta é obrigatória para assinar a transação'
      })
  }),

  mintEnergyTokens: Joi.object({
    generatorAddress: Joi.string()
      .pattern(/^G[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Endereço do gerador deve ser um endereço Stellar válido',
        'any.required': 'Endereço do gerador é obrigatório'
      }),
    amountKwh: Joi.number()
      .integer()
      .min(1)
      .max(1000000)
      .required()
      .messages({
        'number.min': 'Quantidade deve ser pelo menos 1 kWh',
        'number.max': 'Quantidade não pode exceder 1.000.000 kWh',
        'any.required': 'Quantidade em kWh é obrigatória'
      }),
    energyType: Joi.string()
      .valid('Solar', 'Wind', 'Hydro', 'Geothermal', 'Biomass', 'Nuclear')
      .required()
      .messages({
        'any.only': 'Tipo de energia deve ser: Solar, Wind, Hydro, Geothermal, Biomass ou Nuclear',
        'any.required': 'Tipo de energia é obrigatório'
      }),
    recipientAddress: Joi.string()
      .pattern(/^G[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Endereço do destinatário deve ser um endereço Stellar válido',
        'any.required': 'Endereço do destinatário é obrigatório'
      }),
    sourceKeypair: Joi.string()
      .pattern(/^S[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Chave secreta deve ser uma chave Stellar válida',
        'any.required': 'Chave secreta é obrigatória para assinar a transação'
      })
  }),

  transferTokens: Joi.object({
    fromAddress: Joi.string()
      .pattern(/^G[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Endereço de origem deve ser um endereço Stellar válido',
        'any.required': 'Endereço de origem é obrigatório'
      }),
    toAddress: Joi.string()
      .pattern(/^G[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Endereço de destino deve ser um endereço Stellar válido',
        'any.required': 'Endereço de destino é obrigatório'
      }),
    amount: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.min': 'Quantidade deve ser pelo menos 1 stroop (0.0000001 STRGRID)',
        'any.required': 'Quantidade é obrigatória'
      }),
    sourceKeypair: Joi.string()
      .pattern(/^S[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Chave secreta deve ser uma chave Stellar válida',
        'any.required': 'Chave secreta é obrigatória para assinar a transação'
      })
  }),

  burnEnergyTokens: Joi.object({
    fromAddress: Joi.string()
      .pattern(/^G[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Endereço deve ser um endereço Stellar válido',
        'any.required': 'Endereço é obrigatório'
      }),
    amount: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.min': 'Quantidade deve ser pelo menos 1 stroop',
        'any.required': 'Quantidade é obrigatória'
      }),
    sourceKeypair: Joi.string()
      .pattern(/^S[A-Z0-9]{55}$/)
      .required()
      .messages({
        'string.pattern.base': 'Chave secreta deve ser uma chave Stellar válida',
        'any.required': 'Chave secreta é obrigatória para assinar a transação'
      })
  })
};

/**
 * Middleware de validação
 */
const validateRequest = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Schema de validação '${schemaName}' não encontrado`);
      return res.status(500).json({
        success: false,
        message: 'Erro interno de validação'
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Erro de validação:', {
        endpoint: req.path,
        errors,
        body: req.body
      });

      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors
      });
    }

    // Substituir req.body pelos dados validados e limpos
    req.body = value;
    next();
  };
};

/**
 * Validação de parâmetros de URL
 */
const validateStellarAddress = (req, res, next) => {
  const { address } = req.params;
  
  if (!address || !/^G[A-Z0-9]{55}$/.test(address)) {
    return res.status(400).json({
      success: false,
      message: 'Endereço Stellar inválido',
      details: 'O endereço deve começar com G e ter 56 caracteres'
    });
  }
  
  next();
};

/**
 * Validação de parâmetros de paginação
 */
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      message: 'Parâmetro "page" deve ser um número inteiro maior que 0'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'Parâmetro "limit" deve ser um número entre 1 e 100'
    });
  }
  
  req.query.page = pageNum;
  req.query.limit = limitNum;
  
  next();
};

/**
 * Sanitização de entrada
 */
const sanitizeInput = (req, res, next) => {
  // Remover propriedades potencialmente perigosas
  const dangerousProps = ['__proto__', 'constructor', 'prototype'];
  
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (const prop of dangerousProps) {
      delete obj[prop];
    }
    
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  next();
};

module.exports = {
  validateRequest,
  validateStellarAddress,
  validatePagination,
  sanitizeInput,
  schemas
};