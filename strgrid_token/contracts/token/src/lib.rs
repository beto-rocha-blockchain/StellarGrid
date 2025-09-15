#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, 
    BytesN, panic_with_error, Symbol
};

// Símbolos para armazenamento de dados
const BALANCE: Symbol = symbol_short!("BALANCE");
const ALLOWANCE: Symbol = symbol_short!("ALLOW");
const ADMIN: Symbol = symbol_short!("ADMIN");
const GENERATOR: Symbol = symbol_short!("GEN");
const TOTAL_SUPPLY: Symbol = symbol_short!("TOTAL");
const METADATA: Symbol = symbol_short!("META");
const ENERGY_DATA: Symbol = symbol_short!("ENERGY");

// Estruturas de dados
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EnergyGenerator {
    pub address: Address,
    pub capacity_kw: u64,
    pub current_production: u64,
    pub is_active: bool,
    pub registration_date: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EnergyToken {
    pub id: u64,
    pub generator_id: Address,
    pub amount_kwh: u64,
    pub creation_timestamp: u64,
    pub expiry_timestamp: u64,
    pub is_consumed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub total_supply: u64,
}

// Erros customizados
#[soroban_sdk::contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum STRGRIDError {
    NotAuthorized = 1,
    InvalidAmount = 2,
    InsufficientBalance = 3,
    GeneratorNotFound = 4,
    GeneratorInactive = 5,
    InsufficientCapacity = 6,
    TokenNotFound = 7,
    InsufficientAllowance = 8,
    AlreadyBurned = 9,
}

#[contract]
pub struct STRGRIDContract;

#[contractimpl]

impl STRGRIDContract {
    /// Inicializa o contrato com metadados do token
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
    ) {
        if env.storage().instance().has(&ADMIN) {
            panic_with_error!(&env, STRGRIDError::NotAuthorized);
        }
        
        admin.require_auth();
        
        let metadata = TokenMetadata {
            name,
            symbol,
            decimals,
            total_supply: 0,
        };
        
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&METADATA, &metadata);
        env.storage().instance().set(&TOTAL_SUPPLY, &0u64);
    }
    
    /// Registra uma nova fonte geradora de energia
    pub fn register_generator(
        env: Env,
        generator: Address,
        capacity_kw: u64,
    ) {
        let admin: Address = env.storage().instance().get(&ADMIN)
            .expect("Not authorized");
        admin.require_auth();
        
        if capacity_kw == 0 {
            panic_with_error!(&env, STRGRIDError::InvalidAmount);
        }
        
        let energy_generator = EnergyGenerator {
            address: generator.clone(),
            capacity_kw,
            current_production: 0,
            is_active: true,
            registration_date: env.ledger().timestamp(),
        };
        
        env.storage().persistent().set(&(GENERATOR, generator), &energy_generator);
    }
    
    /// Mint de tokens de energia por fontes geradoras com suporte a oracle proof
    pub fn mint_energy_tokens(
        env: Env,
        generator: Address,
        energy_amount_kwh: u64,
        expiry_hours: u64,
        oracle_proof: Option<BytesN<32>>,
    ) -> u64 {
        generator.require_auth();
        
        // Future integration: Validate with oracle proof from CCEE
        if let Some(_proof) = oracle_proof {
            // TODO: Implement oracle proof validation for CCEE PLD data
            // This will validate energy pricing against official CCEE rates
        }
        
        // Pre-compute storage keys to avoid repeated cloning
        let generator_key = (GENERATOR, generator.clone());
        let balance_key = (BALANCE, generator.clone());
        
        // Verifica se o gerador está registrado e ativo
        let mut energy_generator: EnergyGenerator = env.storage()
            .persistent()
            .get(&generator_key)
            .expect("Generator not found");
            
        if !energy_generator.is_active {
            panic_with_error!(&env, STRGRIDError::GeneratorInactive);
        }
        
        // Verifica capacidade disponível
        if energy_generator.current_production + energy_amount_kwh > energy_generator.capacity_kw {
            panic_with_error!(&env, STRGRIDError::InsufficientCapacity);
        }
        
        // Gera ID único para o token e obtém timestamp uma vez
        let current_time = env.ledger().timestamp();
        let token_id = current_time;
        let expiry_timestamp = current_time + (expiry_hours * 3600);
        
        let energy_token = EnergyToken {
            id: token_id,
            generator_id: generator.clone(),
            amount_kwh: energy_amount_kwh,
            creation_timestamp: current_time,
            expiry_timestamp,
            is_consumed: false,
        };
        
        // Atualiza produção atual do gerador
        energy_generator.current_production += energy_amount_kwh;
        
        // Obtém valores atuais
        let current_balance = env.storage().persistent().get(&balance_key).unwrap_or(0u64);
        let total_supply: u64 = env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0);
        
        // Batch storage updates com chaves pré-computadas
        env.storage().persistent().set(&generator_key, &energy_generator);
        env.storage().persistent().set(&(ENERGY_DATA, token_id), &energy_token);
        env.storage().persistent().set(&balance_key, &(current_balance + energy_amount_kwh));
        env.storage().instance().set(&TOTAL_SUPPLY, &(total_supply + energy_amount_kwh));
        
        token_id
    }
    
    /// Queima tokens quando energia é consumida (otimizado)
    pub fn burn_energy_tokens(
        env: Env,
        consumer: Address,
        token_id: u64,
        amount: u64,
    ) {
        consumer.require_auth();
        
        // Verifica se o token existe e obtém dados
        let energy_token_key = (ENERGY_DATA, token_id);
        let mut energy_token: EnergyToken = env.storage()
            .persistent()
            .get(&energy_token_key)
            .expect("Token not found");
            
        // Verifica se o token não expirou
        if env.ledger().timestamp() > energy_token.expiry_timestamp {
            panic_with_error!(&env, STRGRIDError::TokenNotFound);
        }
        
        // Verifica se já foi consumido
        if energy_token.is_consumed {
            panic_with_error!(&env, STRGRIDError::AlreadyBurned);
        }
        
        // Verifica saldo do consumidor (otimizado)
        let consumer_balance_key = (BALANCE, consumer.clone());
        let consumer_balance = env.storage().persistent().get(&consumer_balance_key).unwrap_or(0u64);
        if consumer_balance < amount {
            panic_with_error!(&env, STRGRIDError::InsufficientBalance);
        }
        
        // Obtém e atualiza dados do gerador (otimizado)
        let generator_key = (GENERATOR, energy_token.generator_id.clone());
        let mut generator_data: EnergyGenerator = env.storage()
            .persistent()
            .get(&generator_key)
            .expect("Generator not found");
        generator_data.current_production -= amount;
        
        // Marca token como consumido
        energy_token.is_consumed = true;
        
        // Batch de atualizações para otimizar storage
        env.storage().persistent().set(&energy_token_key, &energy_token);
        env.storage().persistent().set(&consumer_balance_key, &(consumer_balance - amount));
        env.storage().persistent().set(&generator_key, &generator_data);
        
        // Atualiza supply total
        let total_supply: u64 = env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0);
        env.storage().instance().set(&TOTAL_SUPPLY, &(total_supply - amount));
    }
    
    /// Transfere tokens entre endereços
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: u64,
    ) {
        from.require_auth();
        
        if amount == 0 {
            panic_with_error!(&env, STRGRIDError::InvalidAmount);
        }
        
        // Otimizado - pre-compute keys to avoid repeated cloning
        let from_key = (BALANCE, from.clone());
        let to_key = (BALANCE, to.clone());
        
        let from_balance = env.storage().persistent().get(&from_key).unwrap_or(0u64);
        if from_balance < amount {
            panic_with_error!(&env, STRGRIDError::InsufficientBalance);
        }
        
        let to_balance = env.storage().persistent().get(&to_key).unwrap_or(0u64);
        
        // Batch storage updates with pre-computed keys
        env.storage().persistent().set(&from_key, &(from_balance - amount));
        env.storage().persistent().set(&to_key, &(to_balance + amount));
    }
    
    /// Aprova um endereço para gastar tokens em nome do proprietário (ERC-20 like)
    pub fn approve(
        env: Env,
        owner: Address,
        spender: Address,
        amount: u64,
    ) {
        owner.require_auth();
        
        let allowance_key = (ALLOWANCE, owner, spender);
        env.storage().persistent().set(&allowance_key, &amount);
    }
    
    /// Transfere tokens usando allowance (ERC-20 like)
    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: u64,
    ) {
        spender.require_auth();
        
        if amount == 0 {
            panic_with_error!(&env, STRGRIDError::InvalidAmount);
        }
        
        // Pre-compute storage keys para evitar clonagem repetida
        let allowance_key = (ALLOWANCE, from.clone(), spender.clone());
        let from_key = (BALANCE, from.clone());
        let to_key = (BALANCE, to.clone());
        
        // Verifica allowance
        let current_allowance = env.storage().persistent().get(&allowance_key).unwrap_or(0u64);
        if current_allowance < amount {
            panic_with_error!(&env, STRGRIDError::InsufficientAllowance);
        }
        
        // Verifica saldo do from
        let from_balance = env.storage().persistent().get(&from_key).unwrap_or(0u64);
        if from_balance < amount {
            panic_with_error!(&env, STRGRIDError::InsufficientBalance);
        }
        
        // Obtém saldo do destinatário
        let to_balance = env.storage().persistent().get(&to_key).unwrap_or(0u64);
        
        // Batch de atualizações com chaves pré-computadas
        env.storage().persistent().set(&from_key, &(from_balance - amount));
        env.storage().persistent().set(&to_key, &(to_balance + amount));
        env.storage().persistent().set(&allowance_key, &(current_allowance - amount));
    }
    
    /// Consulta allowance entre owner e spender
    pub fn allowance(env: Env, owner: Address, spender: Address) -> u64 {
        env.storage().persistent().get(&(ALLOWANCE, owner, spender)).unwrap_or(0)
    }
    
    /// Consulta saldo de um endereço
    pub fn balance_of(env: Env, address: Address) -> u64 {
        env.storage().persistent().get(&(BALANCE, address)).unwrap_or(0)
    }
    
    /// Consulta supply total
    pub fn total_supply(env: Env) -> u64 {
        env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0)
    }
    
    /// Consulta metadados do token
    pub fn get_metadata(env: Env) -> TokenMetadata {
        env.storage().instance().get(&METADATA).unwrap()
    }
    
    /// Consulta dados de um gerador
    pub fn get_generator(env: Env, generator: Address) -> EnergyGenerator {
        env.storage()
            .persistent()
            .get(&(GENERATOR, generator))
            .unwrap_or_else(|| panic_with_error!(&env, STRGRIDError::GeneratorNotFound))
    }
    
    /// Consulta dados de um token de energia
    pub fn get_energy_token(env: Env, token_id: u64) -> EnergyToken {
        env.storage()
            .persistent()
            .get(&(ENERGY_DATA, token_id))
            .unwrap_or_else(|| panic_with_error!(&env, STRGRIDError::TokenNotFound))
    }
    
    /// Ativa/desativa um gerador (apenas admin)
    pub fn set_generator_status(
        env: Env,
        generator: Address,
        is_active: bool,
    ) {
        let admin: Address = env.storage().instance().get(&ADMIN)
            .expect("Not authorized");
        admin.require_auth();
        
        let generator_key = (GENERATOR, generator.clone());
        let mut energy_generator: EnergyGenerator = env
            .storage()
            .persistent()
            .get(&generator_key)
            .expect("Generator not found");
            
        energy_generator.is_active = is_active;
        env.storage().persistent().set(&generator_key, &energy_generator);
    }
    
    /// Atualiza capacidade de um gerador (apenas admin)
    pub fn update_generator_capacity(
        env: Env,
        generator: Address,
        new_capacity_kw: u64,
    ) {
        let admin: Address = env.storage().instance().get(&ADMIN)
            .expect("Not authorized");
        admin.require_auth();
        
        let generator_key = (GENERATOR, generator.clone());
        let mut energy_generator: EnergyGenerator = env
            .storage()
            .persistent()
            .get(&generator_key)
            .expect("Generator not found");
            
        energy_generator.capacity_kw = new_capacity_kw;
        env.storage().persistent().set(&generator_key, &energy_generator);
    }
}

#[cfg(test)]
mod test;
#[cfg(test)]
mod simple_test;
#[cfg(test)]
mod debug_test;
