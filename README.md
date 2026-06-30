# 🌟 StellarGrid Token (STRGRID)

> Tokenização de energia renovável na **Stellar / Soroban** — `1 token = 1 kWh`.

![Stellar](https://img.shields.io/badge/Stellar-Soroban-7D00FF?style=flat&logo=stellar&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=DEA584)
![Deploy](https://img.shields.io/badge/Deploy-Testnet-39D353?style=flat)
![License](https://img.shields.io/badge/License-MIT-22D3EE?style=flat)

## Visão geral

O **StellarGrid Token** transforma energia renovável em tokens digitais verificáveis: produtores registram seus geradores, fazem o *mint* de tokens proporcionais à energia limpa gerada e a comercializam em um marketplace peer-to-peer — com rastreabilidade completa da origem (`1 token = 1 kWh`).

## O que há neste repositório

Todo o projeto vive na pasta [`strgrid_token/`](strgrid_token/):

| Caminho | O que é |
|---|---|
| [`strgrid_token/contracts/token`](strgrid_token/contracts/token) | Smart contract **Soroban (Rust)** — `initialize`, `register_generator`, `mint_energy_tokens`, `transfer`, `balance_of`, com testes unitários e snapshots |
| [`strgrid_token/api`](strgrid_token/api) | **API REST (Node.js)** — serviço de oracle, integração com a Stellar, middleware de validação/monitoramento e `dashboard.html` |
| [`strgrid_token/README.md`](strgrid_token/README.md) | Documentação técnica completa (build, deploy, referência de funções) |
| [`strgrid_token/PITCH_DECK.md`](strgrid_token/PITCH_DECK.md) | Pitch deck — problema, mercado (TAM/SAM/SOM), modelo de negócio e roadmap |
| [`strgrid_token/SECURITY_AUDIT.md`](strgrid_token/SECURITY_AUDIT.md) | Auditoria de segurança do contrato |

## Contrato na testnet

```
CBEXN3HDQZQL4QDUDUPXKUIDL7IQP57IFIXCW5T5TSLSTMXJNP5SMNRC
```

🔍 [Ver na Stellar Expert (testnet)](https://stellar.expert/explorer/testnet/contract/CBEXN3HDQZQL4QDUDUPXKUIDL7IQP57IFIXCW5T5TSLSTMXJNP5SMNRC)

## Começando

```bash
cd strgrid_token

# Build do contrato (WASM)
cargo build --target wasm32-unknown-unknown --release

# Testes
cargo test
```

O passo a passo de deploy e invocação está no [README técnico](strgrid_token/README.md).

---

Protótipo de tokenização de energia na Stellar — parte da linha de trabalho da [**EnergyPay**](https://github.com/beto-rocha-blockchain/energypay-protocol). Licença MIT.
