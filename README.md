# apix

> Turn any OpenAPI spec into an AI-ready MCP server, typed client, and mock backend — in 30 seconds.

`apix` is a zero-config CLI that takes an OpenAPI 3.x specification and emits:

- A **TypeScript client** with full types, retry logic, and typed errors
- An **MCP server** (Model Context Protocol) that lets Claude, Cursor, and other LLM clients call your API as tools
- A **mock server** that serves realistic fake data for local development
- A **Python client** (requests-based) with typed request/response helpers

## Install

```bash
npm install -g apix-mcp
```

Or run directly with `npx`:

```bash
npx apix init https://api.example.com/openapi.json
```

## Quick start

```bash
# From a URL
apix init https://petstore.swagger.io/v2/swagger.json

# From a local file
apix init ./openapi.yaml --output ./generated

# Auto-discover from a domain (tries /openapi.json, /.well-known/openapi.json, etc.)
apix init api.example.com
```

This creates a project directory containing:

```
generated/
├── client.ts          # Typed TypeScript client
├── mcp-server.ts      # MCP server exposing each endpoint as a tool
├── apix.config.json   # Base URL, auth type, spec path
└── ...
```

## Commands

### `apix init <spec>`

Scaffold a new project from an OpenAPI spec (URL, file path, or bare domain).

```bash
apix init <spec> [--output <dir>] [--tags <tag1,tag2>]
```

### `apix generate [target]`

Regenerate a specific artifact in an existing project. Targets: `client`, `mcp`, `python`.

```bash
apix generate client
apix generate mcp --tags pets,users
```

### `apix serve`

Start the generated MCP server over stdio, ready to plug into Claude Desktop or any MCP client.

```bash
apix serve
```

### `apix mock`

Boot a mock HTTP server backed by your OpenAPI spec. Returns realistic fake data for every endpoint.

```bash
apix mock --port 4010 --seed 42
```

### `apix discover <domain>`

Probe a domain for a published OpenAPI spec at well-known locations.

```bash
apix discover api.example.com
```

## MCP integration (Claude Desktop)

Add the generated server to your Claude Desktop config:

```json
{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": ["tsx", "/path/to/generated/mcp-server.ts"],
      "env": {
        "APIX_API_KEY": "sk-..."
      }
    }
  }
}
```

Every endpoint in your spec becomes a callable tool with typed input validation.

## Configuration

`apix.config.json` is written by `apix init` and read by `apix generate`, `apix serve`, and `apix mock`:

```json
{
  "specPath": "./openapi.yaml",
  "baseUrl": "https://api.example.com/v1",
  "authType": "apiKey",
  "authEnvVar": "APIX_API_KEY",
  "tags": []
}
```

Set `APIX_API_KEY` (or whichever env var your spec's security scheme maps to) before running `serve` or invoking the generated client.

## Development

```bash
npm install
npm run build         # tsc
npm test              # vitest run
npm run test:watch    # vitest
npm run lint          # tsc --noEmit
```

Repo layout:

```
src/
├── cli/              # Commander-based CLI entry + commands
├── discovery/        # Spec fetching, resolving, well-known probes
├── shared/           # OpenAPI types, naming, error classes, auth detection
├── codegen/
│   ├── typescript/   # TS client + types generators
│   └── python/       # Python requests client generator
├── mcp/              # MCP server generator + runtime
└── mock/             # Express mock server + json-schema-faker
tests/                # Vitest suites mirroring src/ layout
```

## License

MIT
