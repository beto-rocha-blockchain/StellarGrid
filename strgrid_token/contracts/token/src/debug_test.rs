#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_simple_transfer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, STRGRIDContract);
    let client = STRGRIDContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let generator = Address::generate(&env);
    let user1 = Address::generate(&env);
    
    // Setup
    env.mock_all_auths();
    client.initialize(
        &admin,
        &String::from_str(&env, "STRGRID"),
        &String::from_str(&env, "STRGRID"),
        &7u32
    );
    
    // Register generator and mint some tokens
    client.register_generator(&generator, &1000u64);
    client.mint_energy_tokens(&generator, &500u64, &24u64, &None);
    
    // Check initial balance
    let initial_balance = client.balance_of(&generator);
    assert_eq!(initial_balance, 500u64);
    
    // Try a simple transfer
    client.transfer(&generator, &user1, &100u64);
    
    // Check balances after transfer
    assert_eq!(client.balance_of(&generator), 400u64);
    assert_eq!(client.balance_of(&user1), 100u64);
}

#[test]
fn test_double_transfer_debug() {
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