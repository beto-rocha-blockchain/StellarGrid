const {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Keypair,
  Address,
  nativeToScVal,
  scValToNative
} = require('@stellar/stellar-sdk');
const logger = require('../utils/logger');

class StellarService {
  constructor() {
    this.contractId = process.env.CONTRACT_ID || 'CBEXN3HDQZQL4QDUDUPXKUIDL7IQP57IFIXCW5T5TSLSTMXJNP5SMNRC';
    this.networkPassphrase = Networks.TESTNET;
    this.server = new SorobanRpc.Server(
      process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'
    );
    this.contract = new Contract(this.contractId);
  }

  /**
   * Simula uma transação no contrato
   */
  async simulateTransaction(operation, sourceKeypair = null) {
    try {
      const sourceAccount = sourceKeypair 
        ? await this.server.getAccount(sourceKeypair.publicKey())
        : await this.server.getAccount(Keypair.random().publicKey());

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const result = await this.server.simulateTransaction(transaction);
      
      if (result.error) {
        throw new Error(`Erro na simulação: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Erro ao simular transação:', error);
      throw error;
    }
  }

  /**
   * Submete uma transação assinada
   */
  async submitTransaction(operation, sourceKeypair) {
    try {
      const sourceAccount = await this.server.getAccount(sourceKeypair.publicKey());

      let transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simular primeiro para obter o footprint
      const simResult = await this.server.simulateTransaction(transaction);
      
      if (simResult.error) {
        throw new Error(`Erro na simulação: ${simResult.error}`);
      }

      // Preparar transação com footprint
      transaction = TransactionBuilder.fromXDR(
        simResult.transactionData.build(),
        this.networkPassphrase
      );

      // Assinar transação
      transaction.sign(sourceKeypair);

      // Submeter
      const result = await this.server.sendTransaction(transaction);
      
      if (result.status === 'ERROR') {
        throw new Error(`Erro ao submeter transação: ${result.errorResultXdr}`);
      }

      return result;
    } catch (error) {
      logger.error('Erro ao submeter transação:', error);
      throw error;
    }
  }

  /**
   * Obter metadados do token
   */
  async getTokenMetadata() {
    try {
      const operation = this.contract.call('get_metadata');
      const result = await this.simulateTransaction(operation);
      
      if (result.result?.retval) {
        const metadata = scValToNative(result.result.retval);
        return {
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          totalSupply: metadata.total_supply
        };
      }
      
      throw new Error('Não foi possível obter metadados');
    } catch (error) {
      logger.error('Erro ao obter metadados:', error);
      throw error;
    }
  }

  /**
   * Registrar um novo gerador
   */
  async registerGenerator(generatorAddress, capacityKw, sourceKeypair) {
    try {
      const keypair = typeof sourceKeypair === 'string' 
        ? Keypair.fromSecret(sourceKeypair)
        : sourceKeypair;

      const operation = this.contract.call(
        'register_generator',
        new Address(generatorAddress).toScVal(),
        nativeToScVal(capacityKw, { type: 'u64' })
      );

      const result = await this.submitTransaction(operation, keypair);
      
      return {
        transactionHash: result.hash,
        generatorAddress,
        capacityKw,
        status: 'registered'
      };
    } catch (error) {
      logger.error('Erro ao registrar gerador:', error);
      throw error;
    }
  }

  /**
   * Obter dados de um gerador
   */
  async getGenerator(generatorAddress) {
    try {
      const operation = this.contract.call(
        'get_generator',
        new Address(generatorAddress).toScVal()
      );
      
      const result = await this.simulateTransaction(operation);
      
      if (result.result?.retval) {
        const generator = scValToNative(result.result.retval);
        return {
          address: generator.address,
          capacityKw: generator.capacity_kw,
          currentProduction: generator.current_production,
          isActive: generator.is_active,
          registrationDate: new Date(generator.registration_date * 1000).toISOString()
        };
      }
      
      throw new Error('Gerador não encontrado');
    } catch (error) {
      logger.error('Erro ao obter gerador:', error);
      throw error;
    }
  }

  /**
   * Mint tokens de energia
   */
  async mintEnergyTokens(generatorAddress, amountKwh, energyType, recipientAddress, sourceKeypair) {
    try {
      const keypair = typeof sourceKeypair === 'string' 
        ? Keypair.fromSecret(sourceKeypair)
        : sourceKeypair;

      const operation = this.contract.call(
        'mint_energy_tokens',
        new Address(generatorAddress).toScVal(),
        nativeToScVal(amountKwh, { type: 'u64' }),
        nativeToScVal(energyType, { type: 'string' }),
        new Address(recipientAddress).toScVal()
      );

      const result = await this.submitTransaction(operation, keypair);
      
      return {
        transactionHash: result.hash,
        generatorAddress,
        amountKwh,
        energyType,
        recipientAddress,
        tokensGenerated: amountKwh * 10000000, // 7 decimais
        status: 'minted'
      };
    } catch (error) {
      logger.error('Erro ao fazer mint de tokens:', error);
      throw error;
    }
  }

  /**
   * Transferir tokens
   */
  async transferTokens(fromAddress, toAddress, amount, sourceKeypair) {
    try {
      const keypair = typeof sourceKeypair === 'string' 
        ? Keypair.fromSecret(sourceKeypair)
        : sourceKeypair;

      const operation = this.contract.call(
        'transfer',
        new Address(fromAddress).toScVal(),
        new Address(toAddress).toScVal(),
        nativeToScVal(amount, { type: 'i128' })
      );

      const result = await this.submitTransaction(operation, keypair);
      
      return {
        transactionHash: result.hash,
        fromAddress,
        toAddress,
        amount,
        amountFormatted: `${(amount / 10000000).toFixed(7)} STRGRID`,
        status: 'transferred'
      };
    } catch (error) {
      logger.error('Erro ao transferir tokens:', error);
      throw error;
    }
  }

  /**
   * Obter saldo de uma conta
   */
  async getBalance(address) {
    try {
      const operation = this.contract.call(
        'balance_of',
        new Address(address).toScVal()
      );
      
      const result = await this.simulateTransaction(operation);
      
      if (result.result?.retval) {
        return scValToNative(result.result.retval);
      }
      
      return 0;
    } catch (error) {
      logger.error('Erro ao obter saldo:', error);
      throw error;
    }
  }

  /**
   * Burn tokens (simular consumo de energia)
   */
  async burnTokens(fromAddress, amount, sourceKeypair) {
    try {
      const keypair = typeof sourceKeypair === 'string' 
        ? Keypair.fromSecret(sourceKeypair)
        : sourceKeypair;

      // Implementar função de burn no contrato se necessário
      // Por enquanto, vamos simular com uma transferência para um endereço "burn"
      const burnAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
      
      return await this.transferTokens(fromAddress, burnAddress, amount, keypair);
    } catch (error) {
      logger.error('Erro ao queimar tokens:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas gerais
   */
  async getGeneralStats() {
    try {
      const metadata = await this.getTokenMetadata();
      
      return {
        contractId: this.contractId,
        tokenName: metadata.name,
        tokenSymbol: metadata.symbol,
        totalSupply: metadata.totalSupply,
        totalSupplyFormatted: `${(metadata.totalSupply / 10000000).toFixed(7)} STRGRID`,
        decimals: metadata.decimals,
        network: 'Testnet',
        explorerUrl: `https://stellar.expert/explorer/testnet/contract/${this.contractId}`
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Obter informações da rede
   */
  async getNetworkInfo() {
    try {
      const ledger = await this.server.getLatestLedger();
      
      return {
        network: 'Stellar Testnet',
        latestLedger: ledger.sequence,
        contractId: this.contractId,
        rpcUrl: this.server.serverURL.toString(),
        networkPassphrase: this.networkPassphrase
      };
    } catch (error) {
      logger.error('Erro ao obter informações da rede:', error);
      throw error;
    }
  }

  /**
   * Listar geradores (simulado - implementar paginação real se necessário)
   */
  async getAllGenerators(page = 1, limit = 10) {
    try {
      // Esta é uma implementação simulada
      // Em um cenário real, você precisaria de um mecanismo para rastrear todos os geradores
      return {
        generators: [],
        total: 0,
        page,
        limit,
        message: 'Funcionalidade de listagem completa requer implementação de eventos no contrato'
      };
    } catch (error) {
      logger.error('Erro ao listar geradores:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de transações (simulado)
   */
  async getTransactionHistory(address, page = 1, limit = 20) {
    try {
      // Esta é uma implementação simulada
      // Em um cenário real, você consultaria o histórico da blockchain
      return {
        transactions: [],
        total: 0,
        page,
        limit,
        message: 'Histórico de transações requer integração com Stellar Horizon API'
      };
    } catch (error) {
      logger.error('Erro ao obter histórico:', error);
      throw error;
    }
  }
}

module.exports = new StellarService();