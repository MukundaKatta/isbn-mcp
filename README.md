# isbn-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/isbn-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/isbn-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: validate ISBN-10 / ISBN-13 and convert between the two forms.
No deps.

## Tools

- `validate` — `{ input: "0-306-40615-2" }` → `{ valid: true, type: "isbn-10" }`
- `to_13` — convert ISBN-10 → ISBN-13 (978-prefixed)
- `to_10` — convert ISBN-13 → ISBN-10 (works only for 978-prefixed)

## Configure

```json
{ "mcpServers": { "isbn": { "command": "npx", "args": ["-y", "@mukundakatta/isbn-mcp"] } } }
```

## License

MIT.
