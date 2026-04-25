#!/bin/bash
# Start BridgeAI backend with correct LLM configuration
# Usage: ./scripts/start-backend.sh

cd "$(dirname "$0")/.."

# Unset proxy vars to avoid Clash Verge intercepting localhost calls
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy HOMEBREW_PROXY

# Set LLM config
export CLAUDE_API_KEY='sk-proxy-local-llm-router'
export CLAUDE_API_URL='http://localhost:4000/v1'
export OPENAI_API_KEY=''

exec node --import ./node_modules/tsx/dist/loader.mjs --require ./node_modules/tsx/dist/preflight.cjs apps/server/src/index.ts
