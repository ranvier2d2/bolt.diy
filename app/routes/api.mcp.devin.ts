import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.mcp.devin');

const DEVIN_API_BASE_URL = 'https://api.devin.ai/v1';

interface DevinSession {
  session_id: string;
  status: string;
  title?: string;
  url?: string;
  structured_output?: Record<string, unknown>;
}

interface DevinSessionResponse {
  session_id: string;
  status_enum: string;
  title?: string;
  url?: string;
  structured_output?: Record<string, unknown>;
}

async function createDevinSession(
  apiKey: string,
  prompt: string,
  options?: { title?: string; tags?: string[] },
): Promise<DevinSession> {
  const response = await fetch(`${DEVIN_API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      title: options?.title,
      tags: options?.tags,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Devin session: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as DevinSessionResponse;

  return {
    session_id: data.session_id,
    status: data.status_enum,
    title: data.title,
    url: data.url,
    structured_output: data.structured_output,
  };
}

async function getDevinSessionStatus(apiKey: string, sessionId: string): Promise<DevinSession> {
  const response = await fetch(`${DEVIN_API_BASE_URL}/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Devin session status: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as DevinSessionResponse;

  return {
    session_id: data.session_id,
    status: data.status_enum,
    title: data.title,
    url: data.url,
    structured_output: data.structured_output,
  };
}

async function sendDevinMessage(apiKey: string, sessionId: string, message: string): Promise<DevinSession> {
  const response = await fetch(`${DEVIN_API_BASE_URL}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message to Devin session: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as DevinSessionResponse;

  return {
    session_id: data.session_id,
    status: data.status_enum,
    title: data.title,
    url: data.url,
    structured_output: data.structured_output,
  };
}

function createDevinMcpServer(apiKey: string): McpServer {
  const server = new McpServer(
    {
      name: 'devin-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.tool(
    'devin_create_session',
    'Create a new Devin session with a prompt. Devin is an AI software engineer that can help with coding tasks, debugging, and building features.',
    {
      prompt: z.string().describe('The task or prompt for Devin to work on'),
      title: z.string().optional().describe('Optional title for the session'),
      tags: z.array(z.string()).optional().describe('Optional tags for organizing sessions'),
    },
    async ({ prompt, title, tags }) => {
      try {
        const session = await createDevinSession(apiKey, prompt, { title, tags });

        const resultText = [
          `Devin session created successfully!`,
          ``,
          `Session ID: ${session.session_id}`,
          `Status: ${session.status}`,
          session.title ? `Title: ${session.title}` : null,
          session.url ? `Session URL: ${session.url}` : null,
          ``,
          `You can monitor the session progress using the devin_get_status tool or send follow-up messages using devin_send_message.`,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: resultText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error creating Devin session:', error);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to create Devin session: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'devin_send_message',
    'Send a follow-up message to an active Devin session. Use this to provide additional context, clarifications, or new instructions.',
    {
      sessionId: z.string().describe('The ID of the Devin session to send the message to'),
      message: z.string().describe('The message to send to Devin'),
    },
    async ({ sessionId, message }) => {
      try {
        const session = await sendDevinMessage(apiKey, sessionId, message);

        const resultText = [
          `Message sent to Devin session successfully!`,
          ``,
          `Session ID: ${session.session_id}`,
          `Status: ${session.status}`,
          session.url ? `Session URL: ${session.url}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: resultText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error sending message to Devin session:', error);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to send message to Devin session: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'devin_get_status',
    'Get the current status of a Devin session, including any structured output or results.',
    {
      sessionId: z.string().describe('The ID of the Devin session to check'),
    },
    async ({ sessionId }) => {
      try {
        const session = await getDevinSessionStatus(apiKey, sessionId);

        const resultText = [
          `Devin Session Status`,
          ``,
          `Session ID: ${session.session_id}`,
          `Status: ${session.status}`,
          session.title ? `Title: ${session.title}` : null,
          session.url ? `Session URL: ${session.url}` : null,
          session.structured_output
            ? `\nStructured Output:\n${JSON.stringify(session.structured_output, null, 2)}`
            : null,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: resultText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error getting Devin session status:', error);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to get Devin session status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

export async function action({ context, request }: ActionFunctionArgs) {
  const env = context.cloudflare?.env as Env | undefined;
  const apiKey = env?.DEVIN_API_KEY;

  if (!apiKey) {
    logger.error('DEVIN_API_KEY not configured');

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Devin API key not configured. Please set DEVIN_API_KEY in your environment.',
        },
        id: null,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const server = createDevinMcpServer(apiKey);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    const body = await request.json();

    const nodeRequest = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      on: () => nodeRequest,
      removeListener: () => nodeRequest,
    } as unknown as import('node:http').IncomingMessage;

    let responseBody = '';
    let responseStatus = 200;
    let responseHeaders: Record<string, string> = {};

    const nodeResponse = {
      writeHead: (status: number, headers?: Record<string, string>) => {
        responseStatus = status;

        if (headers) {
          responseHeaders = { ...responseHeaders, ...headers };
        }

        return nodeResponse;
      },
      setHeader: (name: string, value: string) => {
        responseHeaders[name] = value;
      },
      getHeader: (name: string) => responseHeaders[name],
      write: (chunk: string | Buffer) => {
        responseBody += typeof chunk === 'string' ? chunk : chunk.toString();

        return true;
      },
      end: (chunk?: string | Buffer) => {
        if (chunk) {
          responseBody += typeof chunk === 'string' ? chunk : chunk.toString();
        }
      },
      on: () => nodeResponse,
      once: () => nodeResponse,
      emit: () => false,
    } as unknown as import('node:http').ServerResponse;

    await transport.handleRequest(nodeRequest, nodeResponse, body);

    await transport.close();
    await server.close();

    return new Response(responseBody, {
      status: responseStatus,
      headers: {
        'Content-Type': 'application/json',
        ...responseHeaders,
      },
    });
  } catch (error) {
    logger.error('Error handling Devin MCP request:', error);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare?.env as Env | undefined;
  const apiKey = env?.DEVIN_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Devin API key not configured',
        },
        id: null,
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed. Use POST for MCP requests.',
      },
      id: null,
    }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
