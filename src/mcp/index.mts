import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { createHealthResponse, handleMcpRequest } from './app.mjs'

const EnvironmentSchema = z.object({
  MCP_ALLOWED_ORIGIN: z.string().min(1).default('*'),
  MCP_HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65535).default(8787)
})

const environment = EnvironmentSchema.parse({
  MCP_ALLOWED_ORIGIN: process.env.MCP_ALLOWED_ORIGIN,
  MCP_HOST: process.env.MCP_HOST,
  PORT: process.env.PORT
})

const app = new Hono()

app.use(
  '*',
  cors({
    allowHeaders: ['Content-Type', 'Last-Event-ID', 'mcp-protocol-version', 'mcp-session-id'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['mcp-protocol-version', 'mcp-session-id'],
    origin: environment.MCP_ALLOWED_ORIGIN
  })
)

app.get('/health', () => createHealthResponse())

app.all('/mcp', (context) => handleMcpRequest(context.req.raw))

serve(
  {
    fetch: app.fetch,
    hostname: environment.MCP_HOST,
    port: environment.PORT
  },
  (info) => {
    console.log(`wrighting MCP server listening on http://${info.address}:${info.port}/mcp`)
  }
)
