
import { MongoDBConnection } from './MongoDBConnection.js';

const ALLOWED_ORIGINS = [
  'https://registration-git26.pages.dev',
  'http://localhost:5173'
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {})
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const pathname = new URL(request.url).pathname;

    if (request.method === 'GET' && pathname === '/api/health') {
      try {
        const id = env.MONGODB_CONNECTION.idFromName('gitogether26-database');
        const connection = env.MONGODB_CONNECTION.get(id);
        const result = await connection.health();

        return Response.json(result, { headers });
      } catch (error) {
        console.error(error);
        return Response.json(
          { status: 'database connection failed' },
          { status: 500, headers }
        );
      }
    }

    if (!allowedOrigin) {
      return Response.json({ error: 'Origin not allowed.' }, { status: 403 });
    }

    if (request.method !== 'POST' || pathname !== '/api/register') {
      return Response.json({ error: 'Not found.' }, { status: 404, headers });
    }

    try {
      const body = await request.json();
      const id = env.MONGODB_CONNECTION.idFromName('gitogether26-database');
      const connection = env.MONGODB_CONNECTION.get(id);
      const result = await connection.register(body);

      return Response.json(result.data, {
        status: result.status,
        headers
      });
    } catch (error) {
      console.error(error);
      return Response.json(
        { error: 'Something went wrong on our side. Please try again.' },
        { status: 500, headers }
      );
    }
  }
};

export { MongoDBConnection };
