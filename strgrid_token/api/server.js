const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const stellarService = require('./services/stellarService');
const { validateRequest } = require('./middleware/validation');
const { errorHandler } = require('./middleware/errorHandler');

// Importar rotas
const oracleRoutes = require('./routes/oracle');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
});
app.use('/api/', limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== ROTAS DA API ====================

// Rotas do oracle
app.use('/api/oracle', oracleRoutes);

// 📊 Obter metadados do token
app.get('/api/token/metadata', async (req, res, next) => {
  try {
    const metadata = await stellarService.getTokenMetadata();
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    next(error);
  }
});

// 🏭 Registrar novo gerador
app.post('/api/generators/register', validateRequest('registerGenerator'), async (req, res, next) => {
  try {
    const { generatorAddress, capacityKw, sourceKeypair } = req.body;
    
    const result = await stellarService.registerGenerator(
      generatorAddress,
      capacityKw,
      sourceKeypair
    );
    
    res.json({
      success: true,
      data: result,
      message: 'Gerador registrado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// 🔍 Obter dados de um gerador
app.get('/api/generators/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    const generator = await stellarService.getGenerator(address);
    
    res.json({
      success: true,
      data: generator
    });
  } catch (error) {
    next(error);
  }
});

// 📋 Listar todos os geradores
app.get('/api/generators', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const generators = await stellarService.getAllGenerators(page, limit);
    
    res.json({
      success: true,
      data: generators,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// ⚡ Mint tokens de energia
app.post('/api/energy/mint', validateRequest('mintEnergyTokens'), async (req, res, next) => {
  try {
    const { generatorAddress, amountKwh, energyType, recipientAddress, sourceKeypair } = req.body;
    
    const result = await stellarService.mintEnergyTokens(
      generatorAddress,
      amountKwh,
      energyType,
      recipientAddress,
      sourceKeypair
    );
    
    res.json({
      success: true,
      data: result,
      message: `${amountKwh} kWh de energia ${energyType} tokenizada com sucesso`
    });
  } catch (error) {
    next(error);
  }
});

// 💸 Transferir tokens
app.post('/api/tokens/transfer', validateRequest('transferTokens'), async (req, res, next) => {
  try {
    const { fromAddress, toAddress, amount, sourceKeypair } = req.body;
    
    const result = await stellarService.transferTokens(
      fromAddress,
      toAddress,
      amount,
      sourceKeypair
    );
    
    res.json({
      success: true,
      data: result,
      message: 'Transferência realizada com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// 💰 Obter saldo de uma conta
app.get('/api/accounts/:address/balance', async (req, res, next) => {
  try {
    const { address } = req.params;
    const balance = await stellarService.getBalance(address);
    
    res.json({
      success: true,
      data: {
        address,
        balance,
        balanceFormatted: `${(balance / 10000000).toFixed(7)} STRGRID`
      }
    });
  } catch (error) {
    next(error);
  }
});

// 📈 Estatísticas gerais
app.get('/api/stats', async (req, res, next) => {
  try {
    const stats = await stellarService.getGeneralStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// 🔥 Burn tokens de energia (consumo)
app.post('/api/energy/burn', validateRequest('burnEnergyTokens'), async (req, res, next) => {
  try {
    const { fromAddress, amount, sourceKeypair } = req.body;
    
    const result = await stellarService.burnTokens(
      fromAddress,
      amount,
      sourceKeypair
    );
    
    res.json({
      success: true,
      data: result,
      message: `${amount / 10000000} STRGRID tokens queimados (energia consumida)`
    });
  } catch (error) {
    next(error);
  }
});

// 📊 Histórico de transações
app.get('/api/transactions/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const transactions = await stellarService.getTransactionHistory(
      address,
      page,
      limit
    );
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// 🌐 Informações da rede
app.get('/api/network/info', async (req, res, next) => {
  try {
    const networkInfo = await stellarService.getNetworkInfo();
    
    res.json({
      success: true,
      data: networkInfo
    });
  } catch (error) {
    next(error);
  }
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.originalUrl
  });
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚀 StellarGrid API rodando na porta ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📖 Documentação: http://localhost:${PORT}/api/docs`);
  logger.info(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor...');
  process.exit(0);
});

module.exports = app;