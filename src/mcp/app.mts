import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'wrighting-mcp',
    version: '0.0.1'
  })

  server.registerTool(
    'wrighting_status',
    {
      title: 'Wrighting Status',
      description: 'Return basic information about the Wrighting MCP server.'
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              app: 'wrighting',
              status: 'ok',
              transport: 'streamable-http'
            },
            null,
            2
          )
        }
      ]
    })
  )

  return server
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const server = createMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport()

  await server.connect(transport)

  return transport.handleRequest(request)
}

export function createHealthResponse(): Response {
  return Response.json({
    name: 'wrighting-mcp',
    ok: true,
    transport: 'streamable-http'
  })
}
