import { createHealthResponse } from '../src/mcp/app.mjs'

export default {
  fetch(): Response {
    return createHealthResponse()
  }
}
