/**
 * 🔮 SERVIÇO DE ORACLE PARA DADOS DE ENERGIA
 * 
 * Integração com APIs externas para obter dados reais de:
 * - Preços de energia
 * - Condições climáticas
 * - Dados de mercado de carbono
 * - Certificações de energia renovável
 * 
 * StellarGrid Token Project
 */

const axios = require('axios');
const logger = require('../utils/logger');

class OracleService {
  constructor() {
    this.apiKeys = {
      openWeather: process.env.OPENWEATHER_API_KEY,
      energyMarket: process.env.ENERGY_MARKET_API_KEY,
      carbonMarket: process.env.CARBON_MARKET_API_KEY,
      renewableCerts: process.env.RENEWABLE_CERTS_API_KEY
    };
    
    this.baseUrls = {
      openWeather: 'https://api.openweathermap.org/data/2.5',
      energyMarket: 'https://api.energymarket.com/v1',
      carbonMarket: 'https://api.carbonmarket.org/v2',
      renewableCerts: 'https://api.renewablecerts.org/v1'
    };
    
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }
  
  /**
   * 🌤️ Obter dados climáticos para uma localização
   */
  async getWeatherData(latitude, longitude) {
    try {
      const cacheKey = `weather_${latitude}_${longitude}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        logger.info('Dados climáticos obtidos do cache', { latitude, longitude });
        return cached;
      }
      
      if (!this.apiKeys.openWeather) {
        // Retornar dados simulados se não houver API key
        return this.generateMockWeatherData(latitude, longitude);
      }
      
      const response = await axios.get(`${this.baseUrls.openWeather}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKeys.openWeather,
          units: 'metric'
        },
        timeout: 10000
      });
      
      const weatherData = {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        windSpeed: response.data.wind?.speed || 0,
        windDirection: response.data.wind?.deg || 0,
        cloudCover: response.data.clouds?.all || 0,
        visibility: response.data.visibility || 10000,
        uvIndex: response.data.uvi || 0,
        condition: response.data.weather[0]?.main || 'Clear',
        description: response.data.weather[0]?.description || 'clear sky',
        sunrise: new Date(response.data.sys.sunrise * 1000).toISOString(),
        sunset: new Date(response.data.sys.sunset * 1000).toISOString(),
        timestamp: new Date().toISOString(),
        source: 'OpenWeatherMap'
      };
      
      this.setCache(cacheKey, weatherData);
      
      logger.info('Dados climáticos obtidos com sucesso', {
        latitude,
        longitude,
        temperature: weatherData.temperature,
        condition: weatherData.condition
      });
      
      return weatherData;
      
    } catch (error) {
      logger.error('Erro ao obter dados climáticos', {
        error: error.message,
        latitude,
        longitude
      });
      
      // Retornar dados simulados em caso de erro
      return this.generateMockWeatherData(latitude, longitude);
    }
  }
  
  /**
   * ⚡ Obter preços de energia em tempo real
   */
  async getEnergyPrices(region = 'BR', energyType = 'renewable') {
    try {
      const cacheKey = `energy_prices_${region}_${energyType}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        logger.info('Preços de energia obtidos do cache', { region, energyType });
        return cached;
      }
      
      if (!this.apiKeys.energyMarket) {
        // Retornar dados simulados se não houver API key
        return this.generateMockEnergyPrices(region, energyType);
      }
      
      const response = await axios.get(`${this.baseUrls.energyMarket}/prices`, {
        params: {
          region,
          type: energyType,
          apikey: this.apiKeys.energyMarket
        },
        timeout: 10000
      });
      
      const priceData = {
        region,
        energyType,
        currentPrice: response.data.current_price || 0.15, // USD/kWh
        currency: response.data.currency || 'USD',
        priceChange24h: response.data.change_24h || 0,
        priceChangePercent: response.data.change_percent || 0,
        marketCap: response.data.market_cap || 0,
        volume24h: response.data.volume_24h || 0,
        high24h: response.data.high_24h || 0,
        low24h: response.data.low_24h || 0,
        timestamp: new Date().toISOString(),
        source: 'EnergyMarket API'
      };
      
      this.setCache(cacheKey, priceData);
      
      logger.info('Preços de energia obtidos com sucesso', {
        region,
        energyType,
        currentPrice: priceData.currentPrice
      });
      
      return priceData;
      
    } catch (error) {
      logger.error('Erro ao obter preços de energia', {
        error: error.message,
        region,
        energyType
      });
      
      // Retornar dados simulados em caso de erro
      return this.generateMockEnergyPrices(region, energyType);
    }
  }
  
  /**
   * 🌱 Obter preços de créditos de carbono
   */
  async getCarbonCredits(marketType = 'voluntary') {
    try {
      const cacheKey = `carbon_credits_${marketType}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        logger.info('Preços de carbono obtidos do cache', { marketType });
        return cached;
      }
      
      if (!this.apiKeys.carbonMarket) {
        // Retornar dados simulados se não houver API key
        return this.generateMockCarbonCredits(marketType);
      }
      
      const response = await axios.get(`${this.baseUrls.carbonMarket}/credits`, {
        params: {
          market: marketType,
          apikey: this.apiKeys.carbonMarket
        },
        timeout: 10000
      });
      
      const carbonData = {
        marketType,
        currentPrice: response.data.price || 25.50, // USD/tCO2
        currency: response.data.currency || 'USD',
        priceChange24h: response.data.change_24h || 0,
        volume: response.data.volume || 0,
        marketCap: response.data.market_cap || 0,
        availableCredits: response.data.available || 0,
        retiredCredits: response.data.retired || 0,
        averageVintage: response.data.avg_vintage || new Date().getFullYear(),
        topProjects: response.data.top_projects || [],
        timestamp: new Date().toISOString(),
        source: 'CarbonMarket API'
      };
      
      this.setCache(cacheKey, carbonData);
      
      logger.info('Preços de carbono obtidos com sucesso', {
        marketType,
        currentPrice: carbonData.currentPrice
      });
      
      return carbonData;
      
    } catch (error) {
      logger.error('Erro ao obter preços de carbono', {
        error: error.message,
        marketType
      });
      
      // Retornar dados simulados em caso de erro
      return this.generateMockCarbonCredits(marketType);
    }
  }
  
  /**
   * 📜 Verificar certificações de energia renovável
   */
  async verifyRenewableCertification(certificateId, issuer) {
    try {
      const cacheKey = `cert_${certificateId}_${issuer}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        logger.info('Certificação obtida do cache', { certificateId, issuer });
        return cached;
      }
      
      if (!this.apiKeys.renewableCerts) {
        // Retornar dados simulados se não houver API key
        return this.generateMockCertification(certificateId, issuer);
      }
      
      const response = await axios.get(`${this.baseUrls.renewableCerts}/verify`, {
        params: {
          certificate_id: certificateId,
          issuer,
          apikey: this.apiKeys.renewableCerts
        },
        timeout: 10000
      });
      
      const certData = {
        certificateId,
        issuer,
        isValid: response.data.valid || false,
        status: response.data.status || 'unknown',
        issuedDate: response.data.issued_date,
        expiryDate: response.data.expiry_date,
        energySource: response.data.energy_source,
        capacity: response.data.capacity,
        location: response.data.location,
        owner: response.data.owner,
        verificationHash: response.data.verification_hash,
        lastUpdated: response.data.last_updated,
        timestamp: new Date().toISOString(),
        source: 'RenewableCerts API'
      };
      
      // Cache por mais tempo para certificações (1 hora)
      this.setCache(cacheKey, certData, 60 * 60 * 1000);
      
      logger.info('Certificação verificada com sucesso', {
        certificateId,
        issuer,
        isValid: certData.isValid,
        status: certData.status
      });
      
      return certData;
      
    } catch (error) {
      logger.error('Erro ao verificar certificação', {
        error: error.message,
        certificateId,
        issuer
      });
      
      // Retornar dados simulados em caso de erro
      return this.generateMockCertification(certificateId, issuer);
    }
  }
  
  /**
   * 📊 Obter dados agregados de mercado
   */
  async getMarketData(region = 'global') {
    try {
      const [weather, energy, carbon] = await Promise.all([
        this.getWeatherData(-23.5505, -46.6333), // São Paulo como referência
        this.getEnergyPrices(region),
        this.getCarbonCredits()
      ]);
      
      const marketData = {
        region,
        weather: {
          temperature: weather.temperature,
          condition: weather.condition,
          windSpeed: weather.windSpeed,
          cloudCover: weather.cloudCover
        },
        energy: {
          price: energy.currentPrice,
          currency: energy.currency,
          change24h: energy.priceChangePercent
        },
        carbon: {
          price: carbon.currentPrice,
          currency: carbon.currency,
          change24h: carbon.priceChange24h
        },
        marketIndicators: {
          renewableIndex: this.calculateRenewableIndex(weather, energy),
          carbonIntensity: this.calculateCarbonIntensity(energy, carbon),
          sustainabilityScore: this.calculateSustainabilityScore(weather, energy, carbon)
        },
        timestamp: new Date().toISOString()
      };
      
      logger.info('Dados de mercado agregados obtidos', {
        region,
        renewableIndex: marketData.marketIndicators.renewableIndex,
        sustainabilityScore: marketData.marketIndicators.sustainabilityScore
      });
      
      return marketData;
      
    } catch (error) {
      logger.error('Erro ao obter dados de mercado', {
        error: error.message,
        region
      });
      
      throw new Error(`Falha ao obter dados de mercado: ${error.message}`);
    }
  }
  
  /**
   * 🔄 Atualizar dados em tempo real
   */
  async updateRealTimeData() {
    try {
      logger.info('Iniciando atualização de dados em tempo real');
      
      const updates = await Promise.allSettled([
        this.getWeatherData(-23.5505, -46.6333),
        this.getEnergyPrices('BR'),
        this.getCarbonCredits('voluntary')
      ]);
      
      const results = {
        weather: updates[0].status === 'fulfilled' ? updates[0].value : null,
        energy: updates[1].status === 'fulfilled' ? updates[1].value : null,
        carbon: updates[2].status === 'fulfilled' ? updates[2].value : null,
        timestamp: new Date().toISOString(),
        errors: updates.filter(u => u.status === 'rejected').map(u => u.reason?.message)
      };
      
      logger.info('Atualização de dados em tempo real concluída', {
        successCount: updates.filter(u => u.status === 'fulfilled').length,
        errorCount: updates.filter(u => u.status === 'rejected').length
      });
      
      return results;
      
    } catch (error) {
      logger.error('Erro na atualização de dados em tempo real', {
        error: error.message
      });
      
      throw error;
    }
  }
  
  // Métodos auxiliares
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  setCache(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout
    });
  }
  
  clearCache() {
    this.cache.clear();
    logger.info('Cache do oracle limpo');
  }
  
  // Geradores de dados simulados
  
  generateMockWeatherData(latitude, longitude) {
    const conditions = ['Clear', 'Clouds', 'Rain', 'Snow', 'Mist'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: Math.round((Math.random() * 30 + 10) * 100) / 100,
      humidity: Math.round(Math.random() * 100),
      pressure: Math.round((Math.random() * 100 + 1000) * 100) / 100,
      windSpeed: Math.round((Math.random() * 20) * 100) / 100,
      windDirection: Math.round(Math.random() * 360),
      cloudCover: Math.round(Math.random() * 100),
      visibility: Math.round((Math.random() * 10000 + 1000)),
      uvIndex: Math.round(Math.random() * 11),
      condition,
      description: condition.toLowerCase(),
      sunrise: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      sunset: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString(),
      source: 'Mock Data'
    };
  }
  
  generateMockEnergyPrices(region, energyType) {
    const basePrice = energyType === 'renewable' ? 0.12 : 0.15;
    const variation = (Math.random() - 0.5) * 0.04;
    
    return {
      region,
      energyType,
      currentPrice: Math.round((basePrice + variation) * 10000) / 10000,
      currency: 'USD',
      priceChange24h: Math.round((Math.random() - 0.5) * 0.02 * 10000) / 10000,
      priceChangePercent: Math.round((Math.random() - 0.5) * 10 * 100) / 100,
      marketCap: Math.round(Math.random() * 1000000000),
      volume24h: Math.round(Math.random() * 10000000),
      high24h: Math.round((basePrice + Math.abs(variation) + 0.01) * 10000) / 10000,
      low24h: Math.round((basePrice - Math.abs(variation) - 0.01) * 10000) / 10000,
      timestamp: new Date().toISOString(),
      source: 'Mock Data'
    };
  }
  
  generateMockCarbonCredits(marketType) {
    const basePrice = 25.50;
    const variation = (Math.random() - 0.5) * 5;
    
    return {
      marketType,
      currentPrice: Math.round((basePrice + variation) * 100) / 100,
      currency: 'USD',
      priceChange24h: Math.round((Math.random() - 0.5) * 2 * 100) / 100,
      volume: Math.round(Math.random() * 1000000),
      marketCap: Math.round(Math.random() * 100000000),
      availableCredits: Math.round(Math.random() * 10000000),
      retiredCredits: Math.round(Math.random() * 5000000),
      averageVintage: new Date().getFullYear() - Math.floor(Math.random() * 5),
      topProjects: ['Forest Conservation', 'Solar Farm', 'Wind Energy'],
      timestamp: new Date().toISOString(),
      source: 'Mock Data'
    };
  }
  
  generateMockCertification(certificateId, issuer) {
    return {
      certificateId,
      issuer,
      isValid: Math.random() > 0.1, // 90% válidos
      status: Math.random() > 0.1 ? 'active' : 'expired',
      issuedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      energySource: ['solar', 'wind', 'hydro'][Math.floor(Math.random() * 3)],
      capacity: Math.round(Math.random() * 5000 + 100),
      location: 'Mock Location',
      owner: 'Mock Owner',
      verificationHash: Math.random().toString(36).substring(2, 15),
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      source: 'Mock Data'
    };
  }
  
  // Calculadores de índices
  
  calculateRenewableIndex(weather, energy) {
    let index = 50; // Base
    
    // Fatores climáticos
    if (weather.condition === 'Clear') index += 20;
    if (weather.windSpeed > 5) index += 15;
    if (weather.cloudCover < 30) index += 10;
    
    // Fatores de preço
    if (energy.currentPrice < 0.15) index += 15;
    if (energy.priceChangePercent < 0) index += 10;
    
    return Math.min(100, Math.max(0, Math.round(index)));
  }
  
  calculateCarbonIntensity(energy, carbon) {
    // Intensidade de carbono baseada no preço da energia e créditos de carbono
    const baseIntensity = 500; // gCO2/kWh
    const energyFactor = (0.15 - energy.currentPrice) * 1000;
    const carbonFactor = (carbon.currentPrice - 25) * 10;
    
    const intensity = baseIntensity + energyFactor + carbonFactor;
    return Math.max(0, Math.round(intensity));
  }
  
  calculateSustainabilityScore(weather, energy, carbon) {
    const renewableIndex = this.calculateRenewableIndex(weather, energy);
    const carbonIntensity = this.calculateCarbonIntensity(energy, carbon);
    
    // Score baseado no índice renovável e intensidade de carbono
    const score = (renewableIndex * 0.6) + ((1000 - carbonIntensity) / 1000 * 100 * 0.4);
    return Math.min(100, Math.max(0, Math.round(score)));
  }
}

module.exports = OracleService;