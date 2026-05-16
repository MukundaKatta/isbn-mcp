#!/usr/bin/env node
/**
 * isbn MCP server. Three tools: `validate`, `to_13`, `to_10`.
 *
 * Validates ISBN-10 (mod-11 with 'X') and ISBN-13 (EAN mod-10). Converts
 * between the two forms where possible.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const VERSION = '0.1.0';

function normalize(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

function isbn10Check(digits9: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (i + 1) * parseInt(digits9[i], 10);
  const r = sum % 11;
  return r === 10 ? 'X' : String(r);
}

function isbn13Check(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits12[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export interface ValidationResult {
  input: string;
  normalized: string;
  valid: boolean;
  type?: 'isbn-10' | 'isbn-13';
  reason?: string;
}

export function validate(input: string): ValidationResult {
  const n = normalize(input);
  if (n.length === 10) {
    if (!/^\d{9}[\dX]$/.test(n)) {
      return { input, normalized: n, valid: false, reason: 'ISBN-10 must be 9 digits + check digit (0-9 or X)' };
    }
    const expected = isbn10Check(n.slice(0, 9));
    if (n[9] !== expected) {
      return { input, normalized: n, valid: false, type: 'isbn-10', reason: 'checksum failed' };
    }
    return { input, normalized: n, valid: true, type: 'isbn-10' };
  }
  if (n.length === 13) {
    if (!/^\d{13}$/.test(n)) {
      return { input, normalized: n, valid: false, reason: 'ISBN-13 must be 13 digits' };
    }
    const expected = isbn13Check(n.slice(0, 12));
    if (n[12] !== expected) {
      return { input, normalized: n, valid: false, type: 'isbn-13', reason: 'checksum failed' };
    }
    return { input, normalized: n, valid: true, type: 'isbn-13' };
  }
  return { input, normalized: n, valid: false, reason: `expected 10 or 13 chars, got ${n.length}` };
}

export function to13(input: string): string {
  const v = validate(input);
  if (!v.valid) throw new Error('invalid ISBN: ' + (v.reason ?? 'unknown'));
  if (v.type === 'isbn-13') return v.normalized;
  const body = '978' + v.normalized.slice(0, 9);
  return body + isbn13Check(body);
}

export function to10(input: string): string {
  const v = validate(input);
  if (!v.valid) throw new Error('invalid ISBN: ' + (v.reason ?? 'unknown'));
  if (v.type === 'isbn-10') return v.normalized;
  if (!v.normalized.startsWith('978')) {
    throw new Error('ISBN-13 with prefix 979 has no ISBN-10 equivalent');
  }
  const body = v.normalized.slice(3, 12);
  return body + isbn10Check(body);
}

const server = new Server({ name: 'isbn', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'validate',
    description: 'Validate an ISBN-10 or ISBN-13. Spaces and dashes ignored.',
    inputSchema: {
      type: 'object',
      properties: { input: { type: 'string' } },
      required: ['input'],
    },
  },
  {
    name: 'to_13',
    description: 'Convert an ISBN-10 to ISBN-13 (978-prefixed).',
    inputSchema: {
      type: 'object',
      properties: { input: { type: 'string' } },
      required: ['input'],
    },
  },
  {
    name: 'to_10',
    description: 'Convert an ISBN-13 (978 prefix only) to ISBN-10. Errors for 979 prefix.',
    inputSchema: {
      type: 'object',
      properties: { input: { type: 'string' } },
      required: ['input'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    const a = args as unknown as { input: string };
    if (name === 'validate') return jsonResult(validate(a.input));
    if (name === 'to_13') return jsonResult({ isbn_13: to13(a.input) });
    if (name === 'to_10') return jsonResult({ isbn_10: to10(a.input) });
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('isbn failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`isbn MCP server v${VERSION} ready on stdio\n`);
}
