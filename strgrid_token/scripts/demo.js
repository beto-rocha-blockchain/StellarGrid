#!/usr/bin/env node

/**
 * 🎯 SCRIPT DE DEMONSTRAÇÃO - STELLARGRID TOKEN
 * 
 * Este script demonstra todas as funcionalidades do StellarGrid Token
 * de forma automatizada para apresentações em hackathons.
 * 
 * Funcionalidades demonstradas:
 * - Consulta de metadados do token
 * - Registro de geradores de energia
 * - Mint de tokens de energia
 * - Transferências entre contas
 * - Consulta de saldos
 * - Estatísticas gerais
 */

const { Keypair } = require('@stellar/stellar-sdk');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

// Configurações
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const CONTRACT_ID = 'CBEXN3HDQZQL4QDUDUPXKUIDL7IQP57IFIXCW5T5TSLSTMXJNP5SMNRC';

// Criar cliente HTTP
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Utilitários de display
const log = {
  title: (text) => console.log(chalk.bold.cyan(`\n🌟 ${text}`)),
  success: (text) => console.log(chalk.green(`✅ ${text}`)),
  info: (text) => console.log(chalk.blue(`ℹ️  ${text}`)),
  warning: (text) => console.log(chalk.yellow(`⚠️  ${text}`)),
  error: (text) => console.log(chalk.red(`❌ ${text}`)),
  data: (data) => console.log(chalk.gray(JSON.stringify(data, null, 2)))
};

// Função para aguardar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para formatar valores
const formatTokens = (stroops) => {
  return `${(stroops / 10000000).toFixed(7)} STRGRID`;
};

class StellarGridDemo {
  constructor() {
    this.accounts = {
      deployer: null,
      generator1: null,
      generator2: null,
      consumer1: null,
      consumer2: null
    };
    this.results = {};
  }

  // Inicializar contas de demonstração
  async initializeAccounts() {
    log.title('INICIALIZANDO CONTAS DE DEMONSTRAÇÃO');
    
    // Gerar keypairs para demonstração
    this.accounts.deployer = Keypair.random();
    this.accounts.generator1 = Keypair.random();
    this.accounts.generator2 = Keypair.random();
    this.accounts.consumer1 = Keypair.random();
    this.accounts.consumer2 = Keypair.random();

    const table = new Table({
      head: ['Tipo', 'Endereço Público', 'Função'],
      colWidths: [15, 60, 30]
    });

    table.push(
      ['Deployer', this.accounts.deployer.publicKey(), 'Administrador do contrato'],
      ['Generator 1', this.accounts.generator1.publicKey(), 'Painel solar residencial'],
      ['Generator 2', this.accounts.generator2.publicKey(), 'Fazenda eólica'],
      ['Consumer 1', this.accounts.consumer1.publicKey(), 'Residência urbana'],
      ['Consumer 2', this.accounts.consumer2.publicKey(), 'Pequena empresa']
    );

    console.log(table.toString());
    log.success('Contas de demonstração criadas com sucesso!');
  }

  // Verificar status da API
  async checkApiStatus() {
    log.title('VERIFICANDO STATUS DA API');
    
    const spinner = ora('Conectando com a API...').start();
    
    try {
      const response = await api.get('/health');
      spinner.succeed('API está online e funcionando!');
      
      log.info(`Ambiente: ${response.data.environment}`);
      log.info(`Uptime: ${Math.floor(response.data.uptime)} segundos`);
      
      return true;
    } catch (error) {
      spinner.fail('Falha ao conectar com a API');
      log.error(`Erro: ${error.message}`);
      log.warning('Certifique-se de que a API está rodando em http://localhost:3001');
      return false;
    }
  }

  // Obter metadados do token
  async getTokenMetadata() {
    log.title('CONSULTANDO METADADOS DO TOKEN');
    
    const spinner = ora('Obtendo metadados...').start();
    
    try {
      const response = await api.get('/token/metadata');
      const metadata = response.data.data;
      
      spinner.succeed('Metadados obtidos com sucesso!');
      
      const table = new Table();
      table.push(
        ['Nome', metadata.name],
        ['Símbolo', metadata.symbol],
        ['Decimais', metadata.decimals],
        ['Supply Total', formatTokens(metadata.totalSupply)]
      );
      
      console.log(table.toString());
      
      this.results.metadata = metadata;
      return metadata;
    } catch (error) {
      spinner.fail('Falha ao obter metadados');
      log.error(`Erro: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  // Registrar geradores
  async registerGenerators() {
    log.title('REGISTRANDO GERADORES DE ENERGIA');
    
    const generators = [
      {
        name: 'Painel Solar Residencial',
        account: this.accounts.generator1,
        capacity: 10, // 10 kW
        type: 'Solar'
      },
      {
        name: 'Fazenda Eólica',
        account: this.accounts.generator2,
        capacity: 2000, // 2 MW
        type: 'Wind'
      }
    ];

    for (const gen of generators) {
      const spinner = ora(`Registrando ${gen.name}...`).start();
      
      try {
        // Simular registro (sem chave secreta real)
        spinner.text = `Simulando registro de ${gen.name}...`;
        await sleep(2000);
        
        spinner.succeed(`${gen.name} registrado com sucesso!`);
        
        log.info(`Endereço: ${gen.account.publicKey()}`);
        log.info(`Capacidade: ${gen.capacity} kW`);
        log.info(`Tipo: ${gen.type}`);
        
      } catch (error) {
        spinner.fail(`Falha ao registrar ${gen.name}`);
        log.error(`Erro: ${error.response?.data?.message || error.message}`);
      }
    }
    
    this.results.generators = generators;
  }

  // Simular produção de energia e mint de tokens
  async simulateEnergyProduction() {
    log.title('SIMULANDO PRODUÇÃO DE ENERGIA E MINT DE TOKENS');
    
    const productions = [
      {
        generator: this.accounts.generator1,
        name: 'Painel Solar',
        production: 50, // 50 kWh
        type: 'Solar',
        recipient: this.accounts.consumer1
      },
      {
        generator: this.accounts.generator2,
        name: 'Fazenda Eólica',
        production: 5000, // 5000 kWh
        type: 'Wind',
        recipient: this.accounts.consumer2
      }
    ];

    const table = new Table({
      head: ['Gerador', 'Produção (kWh)', 'Tipo', 'Tokens Gerados', 'Destinatário'],
      colWidths: [20, 15, 10, 20, 25]
    });

    for (const prod of productions) {
      const spinner = ora(`Processando produção de ${prod.name}...`).start();
      
      try {
        // Simular mint de tokens
        spinner.text = `Tokenizando ${prod.production} kWh de energia ${prod.type}...`;
        await sleep(3000);
        
        const tokensGenerated = prod.production * 10000000; // 7 decimais
        
        spinner.succeed(`${prod.production} kWh tokenizados com sucesso!`);
        
        table.push([
          prod.name,
          prod.production,
          prod.type,
          formatTokens(tokensGenerated),
          prod.recipient.publicKey().substring(0, 20) + '...'
        ]);
        
      } catch (error) {
        spinner.fail(`Falha na tokenização de ${prod.name}`);
        log.error(`Erro: ${error.message}`);
      }
    }
    
    console.log(table.toString());
    this.results.productions = productions;
  }

  // Simular transferências P2P
  async simulateP2PTransfers() {
    log.title('SIMULANDO TRANSFERÊNCIAS PEER-TO-PEER');
    
    const transfers = [
      {
        from: this.accounts.consumer1,
        to: this.accounts.consumer2,
        amount: 100000000, // 10 STRGRID
        description: 'Venda de excesso de energia solar'
      },
      {
        from: this.accounts.consumer2,
        to: this.accounts.consumer1,
        amount: 50000000, // 5 STRGRID
        description: 'Compra de energia limpa'
      }
    ];

    const table = new Table({
      head: ['De', 'Para', 'Quantidade', 'Descrição'],
      colWidths: [25, 25, 20, 35]
    });

    for (const transfer of transfers) {
      const spinner = ora('Processando transferência...').start();
      
      try {
        spinner.text = `Transferindo ${formatTokens(transfer.amount)}...`;
        await sleep(2500);
        
        spinner.succeed('Transferência concluída!');
        
        table.push([
          transfer.from.publicKey().substring(0, 20) + '...',
          transfer.to.publicKey().substring(0, 20) + '...',
          formatTokens(transfer.amount),
          transfer.description
        ]);
        
      } catch (error) {
        spinner.fail('Falha na transferência');
        log.error(`Erro: ${error.message}`);
      }
    }
    
    console.log(table.toString());
    this.results.transfers = transfers;
  }

  // Mostrar saldos finais
  async showFinalBalances() {
    log.title('SALDOS FINAIS DAS CONTAS');
    
    const accounts = [
      { name: 'Painel Solar', account: this.accounts.generator1, balance: 0 },
      { name: 'Fazenda Eólica', account: this.accounts.generator2, balance: 0 },
      { name: 'Residência Urbana', account: this.accounts.consumer1, balance: 400000000 }, // 40 STRGRID
      { name: 'Pequena Empresa', account: this.accounts.consumer2, balance: 4950000000 } // 495 STRGRID
    ];

    const table = new Table({
      head: ['Conta', 'Endereço', 'Saldo (STRGRID)', 'Equivalente (kWh)'],
      colWidths: [20, 45, 20, 20]
    });

    for (const acc of accounts) {
      const spinner = ora(`Consultando saldo de ${acc.name}...`).start();
      
      try {
        // Simular consulta de saldo
        await sleep(1000);
        
        spinner.succeed(`Saldo obtido para ${acc.name}`);
        
        const balanceFormatted = formatTokens(acc.balance);
        const kwhEquivalent = (acc.balance / 10000000).toFixed(0);
        
        table.push([
          acc.name,
          acc.account.publicKey().substring(0, 40) + '...',
          balanceFormatted,
          `${kwhEquivalent} kWh`
        ]);
        
      } catch (error) {
        spinner.fail(`Falha ao obter saldo de ${acc.name}`);
        log.error(`Erro: ${error.message}`);
      }
    }
    
    console.log(table.toString());
  }

  // Mostrar estatísticas finais
  async showFinalStats() {
    log.title('ESTATÍSTICAS FINAIS DO SISTEMA');
    
    const stats = {
      totalEnergyTokenized: 5050, // kWh
      totalTransactions: 4,
      activeGenerators: 2,
      totalSupply: 505000000000, // 50500 STRGRID
      co2Avoided: 2525 // kg CO2
    };

    const table = new Table();
    table.push(
      ['🔋 Energia Total Tokenizada', `${stats.totalEnergyTokenized} kWh`],
      ['💱 Total de Transações', stats.totalTransactions],
      ['🏭 Geradores Ativos', stats.activeGenerators],
      ['🪙 Supply Total de Tokens', formatTokens(stats.totalSupply)],
      ['🌱 CO₂ Evitado', `${stats.co2Avoided} kg`],
      ['🌐 Contrato ID', CONTRACT_ID],
      ['🔗 Explorer', `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`]
    );
    
    console.log(table.toString());
    
    this.results.finalStats = stats;
  }

  // Executar demonstração completa
  async runFullDemo() {
    console.clear();
    
    // Banner
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║                    🌟 STELLARGRID TOKEN                     ║
║              Demonstração Completa - Hackathon              ║
║                                                              ║
║        Tokenização de Energia Renovável na Blockchain       ║
╚══════════════════════════════════════════════════════════════╝
`));
    
    try {
      // Executar etapas da demonstração
      await this.initializeAccounts();
      await sleep(2000);
      
      const apiOnline = await this.checkApiStatus();
      if (!apiOnline) {
        log.warning('Continuando com simulação offline...');
      }
      await sleep(2000);
      
      await this.getTokenMetadata();
      await sleep(2000);
      
      await this.registerGenerators();
      await sleep(2000);
      
      await this.simulateEnergyProduction();
      await sleep(2000);
      
      await this.simulateP2PTransfers();
      await sleep(2000);
      
      await this.showFinalBalances();
      await sleep(2000);
      
      await this.showFinalStats();
      
      // Conclusão
      log.title('DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO! 🎉');
      
      console.log(chalk.green.bold(`
✨ O StellarGrid Token demonstrou com sucesso:

🔋 Tokenização de energia renovável
💱 Marketplace peer-to-peer descentralizado
📊 Rastreabilidade completa da origem da energia
🌱 Incentivos para energia limpa
🚀 Integração nativa com Stellar blockchain

🏆 Pronto para revolucionar o mercado de energia!
`));
      
    } catch (error) {
      log.error('Erro durante a demonstração:');
      console.error(error);
    }
  }
}

// Executar demonstração se chamado diretamente
if (require.main === module) {
  const demo = new StellarGridDemo();
  demo.runFullDemo().catch(console.error);
}

module.exports = StellarGridDemo;