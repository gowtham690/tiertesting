import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = (request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '')) as string | undefined;

  if (!apiKey) {
    return reply.status(401).send({ error: 'Missing API key in X-API-Key or Authorization header' });
  }

  const isBot = apiKey === config.botApiKey;
  const isPlugin = apiKey === config.pluginApiKey;

  if (!isBot && !isPlugin) {
    return reply.status(403).send({ error: 'Invalid API key' });
  }

  (request as any).clientRole = isBot ? 'bot' : 'plugin';
}
