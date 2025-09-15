/**
 * 🔮 ROTAS DO ORACLE
 * 
 * Endpoints para acessar dados externos de energia, clima e mercado
 * StellarGrid Token Project
 */

const express = require('express');
const OracleService = require('../services/oracleService');
const { validateRequest, validateCoordinates, validatePagination } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const oracleService = new OracleService();

// Rate limiting específico para oracle (mais restritivo devido a APIs externas)
const oracleRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: {
    success: false,
    error: 'Muitas requisições para o oracle. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting a todas as rotas do oracle
router.use(oracleRateLimit);

/**
 * 🌤️ GET /api/oracle/weather
 * Obter dados climáticos para uma localização
 */
router.get('/weather', 
  validateCoordinates,
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query;
    
    logger.info('Requisição de dados climáticos', {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      ip: req.ip
    });
    
    const weatherData = await oracleService.getWeatherData(
      parseFloat(latitude),
      parseFloat(longitude)
    );
    
    res.json({
      success: true,
      data: weatherData,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        cached: weatherData.source === 'Cache'
      }
    });
  })
);

/**
 * ⚡ GET /api/oracle/energy-prices
 * Obter preços de energia em tempo real
 */
router.get('/energy-prices',
  asyncHandler(async (req, res) => {
    const { region = 'BR', type = 'renewable' } = req.query;
    
    // Validar parâmetros
    const validRegions = ['BR', 'US', 'EU', 'global'];
    const validTypes = ['renewable', 'conventional', 'mixed'];
    
    if (!validRegions.includes(region)) {
      return res.status(400).json({
        success: false,
        error: `Região inválida. Regiões válidas: ${validRegions.join(', ')}`,
        code: 'INVALID_REGION'
      });
    }
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de energia inválido. Tipos válidos: ${validTypes.join(', ')}`,
        code: 'INVALID_ENERGY_TYPE'
      });
    }
    
    logger.info('Requisição de preços de energia', {
      region,
      type,
      ip: req.ip
    });
    
    const priceData = await oracleService.getEnergyPrices(region, type);
    
    res.json({
      success: true,
      data: priceData,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        cached: priceData.source === 'Cache'
      }
    });
  })
);

/**
 * 🌱 GET /api/oracle/carbon-credits
 * Obter preços de créditos de carbono
 */
router.get('/carbon-credits',
  asyncHandler(async (req, res) => {
    const { market = 'voluntary' } = req.query;
    
    // Validar parâmetros
    const validMarkets = ['voluntary', 'compliance', 'offset'];
    
    if (!validMarkets.includes(market)) {
      return res.status(400).json({
        success: false,
        error: `Mercado inválido. Mercados válidos: ${validMarkets.join(', ')}`,
        code: 'INVALID_MARKET_TYPE'
      });
    }
    
    logger.info('Requisição de créditos de carbono', {
      market,
      ip: req.ip
    });
    
    const carbonData = await oracleService.getCarbonCredits(market);
    
    res.json({
      success: true,
      data: carbonData,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        cached: carbonData.source === 'Cache'
      }
    });
  })
);

/**
 * 📜 GET /api/oracle/verify-certification
 * Verificar certificação de energia renovável
 */
router.get('/verify-certification',
  asyncHandler(async (req, res) => {
    const { certificateId, issuer } = req.query;
    
    // Validar parâmetros obrigatórios
    if (!certificateId || !issuer) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: certificateId, issuer',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Validar formato do certificateId
    if (certificateId.length < 5 || certificateId.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'ID do certificado deve ter entre 5 e 50 caracteres',
        code: 'INVALID_CERTIFICATE_ID'
      });
    }
    
    logger.info('Requisição de verificação de certificação', {
      certificateId,
      issuer,
      ip: req.ip
    });
    
    const certData = await oracleService.verifyRenewableCertification(certificateId, issuer);
    
    res.json({
      success: true,
      data: certData,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        cached: certData.source === 'Cache'
      }
    });
  })
);

/**
 * 📊 GET /api/oracle/market-data
 * Obter dados agregados de mercado
 */
router.get('/market-data',
  asyncHandler(async (req, res) => {
    const { region = 'global' } = req.query;
    
    logger.info('Requisição de dados de mercado', {
      region,
      ip: req.ip
    });
    
    const marketData = await oracleService.getMarketData(region);
    
    res.json({
      success: true,
      data: marketData,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        dataPoints: {
          weather: !!marketData.weather,
          energy: !!marketData.energy,
          carbon: !!marketData.carbon,
          indicators: !!marketData.marketIndicators
        }
      }
    });
  })
);

/**
 * 🔄 POST /api/oracle/update
 * Forçar atualização de dados em tempo real
 */
router.post('/update',
  // Rate limiting mais restritivo para updates
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 5, // 5 updates por IP
    message: {
      success: false,
      error: 'Muitas atualizações solicitadas. Tente novamente em 5 minutos.',
      code: 'UPDATE_RATE_LIMIT_EXCEEDED'
    }
  }),
  asyncHandler(async (req, res) => {
    logger.info('Requisição de atualização forçada', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    const updateResults = await oracleService.updateRealTimeData();
    
    res.json({
      success: true,
      data: updateResults,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        updateCount: Object.keys(updateResults).filter(key => 
          key !== 'timestamp' && key !== 'errors' && updateResults[key] !== null
        ).length,
        errorCount: updateResults.errors?.length || 0
      }
    });
  })
);

/**
 * 🧹 DELETE /api/oracle/cache
 * Limpar cache do oracle
 */
router.delete('/cache',
  // Rate limiting para limpeza de cache
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // 3 limpezas por IP
    message: {
      success: false,
      error: 'Muitas limpezas de cache solicitadas. Tente novamente em 15 minutos.',
      code: 'CACHE_CLEAR_RATE_LIMIT_EXCEEDED'
    }
  }),
  asyncHandler(async (req, res) => {
    logger.info('Requisição de limpeza de cache', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    oracleService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache do oracle limpo com sucesso',
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * 📈 GET /api/oracle/status
 * Status e estatísticas do oracle
 */
router.get('/status',
  asyncHandler(async (req, res) => {
    const cacheStats = {
      size: oracleService.cache.size,
      entries: Array.from(oracleService.cache.keys())
    };
    
    const apiStatus = {
      openWeather: !!oracleService.apiKeys.openWeather,
      energyMarket: !!oracleService.apiKeys.energyMarket,
      carbonMarket: !!oracleService.apiKeys.carbonMarket,
      renewableCerts: !!oracleService.apiKeys.renewableCerts
    };
    
    const status = {
      service: 'Oracle Service',
      status: 'operational',
      version: '1.0.0',
      cache: cacheStats,
      apis: apiStatus,
      endpoints: {
        weather: '/api/oracle/weather',
        energyPrices: '/api/oracle/energy-prices',
        carbonCredits: '/api/oracle/carbon-credits',
        verifyCertification: '/api/oracle/verify-certification',
        marketData: '/api/oracle/market-data',
        update: '/api/oracle/update',
        clearCache: '/api/oracle/cache'
      },
      rateLimit: {
        window: '15 minutes',
        maxRequests: 100,
        updateWindow: '5 minutes',
        maxUpdates: 5
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: status,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * 📋 GET /api/oracle/supported-regions
 * Listar regiões suportadas
 */
router.get('/supported-regions',
  asyncHandler(async (req, res) => {
    const regions = [
      {
        code: 'BR',
        name: 'Brasil',
        currency: 'BRL',
        energyTypes: ['renewable', 'conventional', 'mixed'],
        carbonMarkets: ['voluntary', 'compliance']
      },
      {
        code: 'US',
        name: 'Estados Unidos',
        currency: 'USD',
        energyTypes: ['renewable', 'conventional', 'mixed'],
        carbonMarkets: ['voluntary', 'compliance', 'offset']
      },
      {
        code: 'EU',
        name: 'União Europeia',
        currency: 'EUR',
        energyTypes: ['renewable', 'conventional', 'mixed'],
        carbonMarkets: ['compliance', 'voluntary']
      },
      {
        code: 'global',
        name: 'Global',
        currency: 'USD',
        energyTypes: ['renewable', 'conventional', 'mixed'],
        carbonMarkets: ['voluntary', 'compliance', 'offset']
      }
    ];
    
    res.json({
      success: true,
      data: {
        regions,
        total: regions.length,
        defaultRegion: 'BR',
        defaultEnergyType: 'renewable',
        defaultCarbonMarket: 'voluntary'
      },
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// Middleware de tratamento de erros específico para oracle
router.use((error, req, res, next) => {
  logger.error('Erro nas rotas do oracle', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Erros específicos de APIs externas
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Serviço temporariamente indisponível. Dados simulados sendo utilizados.',
      code: 'SERVICE_UNAVAILABLE',
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Erros de timeout
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return res.status(408).json({
      success: false,
      error: 'Timeout na requisição para APIs externas',
      code: 'REQUEST_TIMEOUT',
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Erro genérico
  res.status(500).json({
    success: false,
    error: 'Erro interno do oracle',
    code: 'ORACLE_ERROR',
    metadata: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;