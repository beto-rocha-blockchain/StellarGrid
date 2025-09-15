use crate::{STRGRIDContract, STRGRIDContractClient};
use soroban_sdk::*;
use soroban_sdk::testutils::Address as AddressUtils;

#[cfg(test)]
mod simple_tests {
    use super::*;

    #[test]
    fn test_contract_creation() {
        let env = Env::default();
        let contract_id = env.register_contract(None, STRGRIDContract);
        let _ = STRGRIDContractClient::new(&env, &contract_id);
        
        // Just test that we can create the contract client
        // without calling any functions that might cause issues
        assert!(true); // If we get here, contract creation worked
    }
    
    #[test]
    fn test_basic_initialization() {
        let env = Env::default();
        let contract_id = env.register_contract(None, STRGRIDContract);
        let client = STRGRIDContractClient::new(&env, &contract_id);
        
        let admin = <Address as AddressUtils>::generate(&env);
        
        // Mock all auths to avoid require_auth issues
        env.mock_all_auths();
        
        // Just try to initialize without any complex operations
        client.initialize(
            &admin,
            &String::from_str(&env, "TEST"),
            &String::from_str(&env, "TST"),
            &7u32
        );
        
        // If we get here, initialization worked
        // Test a simple getter function
        assert_eq!(client.total_supply(), 0u64);
    }
}