#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, BytesN};

#[test]
fn test_initialize_contract() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let name = String::from_str(&env, "StellarGrid Energy Token");
    let symbol = String::from_str(&env, "STRGRID");
    let decimals = 7u32;
    
    env.mock_all_auths();
    client.initialize(&admin, &name, &symbol, &decimals);
    
    let metadata = client.get_metadata();
    assert_eq!(metadata.name, name);
    assert_eq!(metadata.symbol, symbol);
    assert_eq!(metadata.decimals, decimals);
    assert_eq!(client.total_supply(), 0);
}

#[test]
fn test_register_generator() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let capacity_kw = 1000u64;
    
    // Initialize contract
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    
    // Register generator
    client.register_generator(&generator, &capacity_kw);
    
    let generator_data = client.get_generator(&generator);
    assert_eq!(generator_data.address, generator);
    assert_eq!(generator_data.capacity_kw, capacity_kw);
    assert_eq!(generator_data.current_production, 0);
    assert_eq!(generator_data.is_active, true);
}

#[test]
fn test_mint_energy_tokens() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let capacity_kw = 1000u64;
    let energy_amount = 500u64;
    let expiry_hours = 24u64;
    
    // Setup
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &capacity_kw);
    
    // Mint tokens without oracle proof
    let token_id = client.mint_energy_tokens(
        &generator,
        &energy_amount,
        &expiry_hours,
        &None
    );
    
    // Verify token creation
    let energy_token = client.get_energy_token(&token_id);
    assert_eq!(energy_token.generator_id, generator);
    assert_eq!(energy_token.amount_kwh, energy_amount);
    assert_eq!(energy_token.is_consumed, false);
    
    // Verify balance and supply
    assert_eq!(client.balance_of(&generator), energy_amount);
    assert_eq!(client.total_supply(), energy_amount);
    
    // Verify generator production update
    let generator_data = client.get_generator(&generator);
    assert_eq!(generator_data.current_production, energy_amount);
}

#[test]
fn test_mint_with_oracle_proof() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let capacity_kw = 1000u64;
    let energy_amount = 300u64;
    let expiry_hours = 48u64;
    
    // Create mock oracle proof
    let oracle_proof = BytesN::from_array(&env, &[1u8; 32]);
    
    // Setup
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &capacity_kw);
    
    // Mint tokens with oracle proof
    let token_id = client.mint_energy_tokens(
        &generator,
        &energy_amount,
        &expiry_hours,
        &Some(oracle_proof)
    );
    
    // Verify token creation with oracle proof
    let energy_token = client.get_energy_token(&token_id);
    assert_eq!(energy_token.generator_id, generator);
    assert_eq!(energy_token.amount_kwh, energy_amount);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let capacity_kw = 1000u64;
    let energy_amount = 500u64;
    let transfer_amount = 200u64;
    
    // Setup and mint tokens
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &capacity_kw);
    client.mint_energy_tokens(&generator, &energy_amount, &24u64, &None);
    
    // Transfer from generator to user1
    client.transfer(&generator, &user1, &transfer_amount);
    
    // Verify balances after first transfer
    assert_eq!(client.balance_of(&generator), energy_amount - transfer_amount);
    assert_eq!(client.balance_of(&user1), transfer_amount);
    assert_eq!(client.balance_of(&user2), 0);
    
    // Transfer from user1 to user2
    client.transfer(&user1, &user2, &100u64);
    
    // Verify final balances
    assert_eq!(client.balance_of(&user1), transfer_amount - 100);
    assert_eq!(client.balance_of(&user2), 100);
}

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let capacity_kw = 1000u64;
    let energy_amount = 500u64;
    let approve_amount = 200u64;
    let transfer_amount = 150u64;
    
    // Setup and mint tokens
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &capacity_kw);
    client.mint_energy_tokens(&generator, &energy_amount, &24u64, &None);
    
    // Transfer tokens to owner
    client.transfer(&generator, &owner, &energy_amount);
    
    // Approve spender
    client.approve(&owner, &spender, &approve_amount);
    
    // Verify allowance
    assert_eq!(client.allowance(&owner, &spender), approve_amount);
    
    // Transfer from owner to recipient using allowance
    client.transfer_from(&spender, &owner, &recipient, &transfer_amount);
    
    // Verify balances and allowance
    assert_eq!(client.balance_of(&owner), energy_amount - transfer_amount);
    assert_eq!(client.balance_of(&recipient), transfer_amount);
    assert_eq!(client.allowance(&owner, &spender), approve_amount - transfer_amount);
}

#[test]
fn test_burn_energy_tokens() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let consumer = Address::generate(&env);
    let capacity_kw = 1000u64;
    let energy_amount = 500u64;
    let burn_amount = 200u64;
    
    // Setup and mint tokens
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &capacity_kw);
    let token_id = client.mint_energy_tokens(&generator, &energy_amount, &24u64, &None);
    
    // Transfer tokens to consumer
    client.transfer(&generator, &consumer, &energy_amount);
    
    // Burn tokens
    client.burn_energy_tokens(&consumer, &token_id, &burn_amount);
    
    // Verify token is consumed
    let energy_token = client.get_energy_token(&token_id);
    assert_eq!(energy_token.is_consumed, true);
    
    // Verify balance and supply reduction
    assert_eq!(client.balance_of(&consumer), energy_amount - burn_amount);
    assert_eq!(client.total_supply(), energy_amount - burn_amount);
    
    // Verify generator production reduction
    let generator_data = client.get_generator(&generator);
    assert_eq!(generator_data.current_production, energy_amount - burn_amount);
}

#[test]
fn test_generator_management() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let initial_capacity = 1000u64;
    let new_capacity = 1500u64;
    
    // Setup
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &initial_capacity);
    
    // Test deactivating generator
    client.set_generator_status(&generator, &false);
    let generator_data = client.get_generator(&generator);
    assert_eq!(generator_data.is_active, false);
    
    // Test reactivating generator
    client.set_generator_status(&generator, &true);
    let generator_data = client.get_generator(&generator);
    assert_eq!(generator_data.is_active, true);
    
    // Test updating capacity
    client.update_generator_capacity(&generator, &new_capacity);
    let generator_data = client.get_generator(&generator);
    assert_eq!(generator_data.capacity_kw, new_capacity);
}

#[test]
#[should_panic(expected = "InsufficientCapacity")]
fn test_mint_exceeds_capacity() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let capacity_kw = 100u64;
    let excessive_amount = 200u64;
    
    // Setup
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &capacity_kw);
    
    // This should panic
    client.mint_energy_tokens(&generator, &excessive_amount, &24u64, &None);
}

#[test]
#[should_panic(expected = "InsufficientAllowance")]
fn test_transfer_from_insufficient_allowance() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Setup
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &1000u64);
    client.mint_energy_tokens(&generator, &500u64, &24u64, &None);
    client.transfer(&generator, &owner, &500u64);
    
    // Approve only 100 tokens
    client.approve(&owner, &spender, &100u64);
    
    // Try to transfer 200 tokens (should panic)
    client.transfer_from(&spender, &owner, &recipient, &200u64);
}

#[test]
#[should_panic(expected = "TokenAlreadyConsumed")]
fn test_double_burn() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let consumer = Address::generate(&env);
    
    // Setup
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    client.register_generator(&generator, &1000u64);
    let token_id = client.mint_energy_tokens(&generator, &500u64, &24u64, &None);
    client.transfer(&generator, &consumer, &500u64);
    
    // First burn should succeed
    client.burn_energy_tokens(&consumer, &token_id, &200u64);
    
    // Second burn should panic
    client.burn_energy_tokens(&consumer, &token_id, &100u64);
}
