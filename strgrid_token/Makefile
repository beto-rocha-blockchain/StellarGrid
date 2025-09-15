# Makefile para build otimizado de contratos Soroban

# Variáveis
CONTRACT_NAME = strgrid-token
CONTRACT_DIR = contracts/token
TARGET_DIR = target/wasm32-unknown-unknown/release
OUTPUT_DIR = target/wasm

# Comandos
CARGO = cargo
SOROBAN = soroban
WASM_OPT = wasm-opt

# Targets principais
.PHONY: all build optimize deploy clean test fmt clippy

all: build optimize

# Build do contrato
build:
	@echo "Building Soroban contract..."
	$(CARGO) build --target wasm32-unknown-unknown --release --package $(CONTRACT_NAME)
	@mkdir -p $(OUTPUT_DIR)
	@cp $(TARGET_DIR)/$(CONTRACT_NAME).wasm $(OUTPUT_DIR)/$(CONTRACT_NAME).wasm

# Otimização com wasm-opt
optimize: build
	@echo "Optimizing WASM with wasm-opt..."
	$(WASM_OPT) -Oz --enable-bulk-memory $(OUTPUT_DIR)/$(CONTRACT_NAME).wasm -o $(OUTPUT_DIR)/$(CONTRACT_NAME)_optimized.wasm
	@echo "Original size: $$(wc -c < $(OUTPUT_DIR)/$(CONTRACT_NAME).wasm) bytes"
	@echo "Optimized size: $$(wc -c < $(OUTPUT_DIR)/$(CONTRACT_NAME)_optimized.wasm) bytes"

# Deploy do contrato (requer configuração da rede)
deploy: optimize
	@echo "Deploying contract..."
	$(SOROBAN) contract deploy --wasm $(OUTPUT_DIR)/$(CONTRACT_NAME)_optimized.wasm --source account --network testnet

# Testes
test:
	@echo "Running tests..."
	$(CARGO) test

# Formatação do código
fmt:
	@echo "Formatting code..."
	$(CARGO) fmt

# Linting com clippy
clippy:
	@echo "Running clippy..."
	$(CARGO) clippy --all-targets --all-features -- -D warnings

# Limpeza dos arquivos de build
clean:
	@echo "Cleaning build artifacts..."
	$(CARGO) clean
	@rm -rf $(OUTPUT_DIR)

# Verificação completa (fmt + clippy + test + build)
check: fmt clippy test build

# Build para desenvolvimento (sem otimização)
dev-build:
	$(CARGO) build --target wasm32-unknown-unknown --package $(CONTRACT_NAME)

# Instalação de dependências necessárias
install-deps:
	@echo "Installing required tools..."
	@echo "Installing wasm-opt (binaryen)..."
	@echo "Please install binaryen manually: https://github.com/WebAssembly/binaryen/releases"
	@echo "Installing soroban CLI..."
	cargo install --locked soroban-cli
	@echo "Adding wasm32 target..."
	rustup target add wasm32-unknown-unknown

# Informações sobre o projeto
info:
	@echo "Contract Name: $(CONTRACT_NAME)"
	@echo "Contract Directory: $(CONTRACT_DIR)"
	@echo "Target Directory: $(TARGET_DIR)"
	@echo "Output Directory: $(OUTPUT_DIR)"
	@echo "Cargo Version: $$($(CARGO) --version)"
	@echo "Soroban Version: $$($(SOROBAN) --version 2>/dev/null || echo 'Not installed')"
	@echo "wasm-opt Version: $$($(WASM_OPT) --version 2>/dev/null || echo 'Not installed')"

# Help
help:
	@echo "Available targets:"
	@echo "  all          - Build and optimize (default)"
	@echo "  build        - Build the contract"
	@echo "  optimize     - Build and optimize with wasm-opt"
	@echo "  deploy       - Deploy the optimized contract"
	@echo "  test         - Run tests"
	@echo "  fmt          - Format code"
	@echo "  clippy       - Run clippy linter"
	@echo "  clean        - Clean build artifacts"
	@echo "  check        - Run all checks (fmt + clippy + test + build)"
	@echo "  dev-build    - Build without optimization"
	@echo "  install-deps - Install required dependencies"
	@echo "  info         - Show project information"
	@echo "  help         - Show this help message"