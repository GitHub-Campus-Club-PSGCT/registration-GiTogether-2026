import { DurableObject } from 'cloudflare:workers';
import mongoose from 'mongoose';
import { createTeam, parseTeamPayload } from './teamRegistration.js';

export class MongoDBConnection extends DurableObject {
  connectionPromise = null;

  constructor(ctx, env) {
    super(ctx, env);
  }

  async health() {
    await this.connect();
    await mongoose.connection.db.admin().ping();
    return { status: 'connected' };
  }

  async connect() {
    if (mongoose.connection.readyState === 1) return;

    if (!this.connectionPromise) {
      this.connectionPromise = mongoose.connect(this.env.MONGODB_URI)
        .finally(() => {
          this.connectionPromise = null;
        });
    }

    await this.connectionPromise;
  }

  async register(body) {
    const payload = parseTeamPayload(body);

    if (payload.error) return { status: 400, data: payload };

    await this.connect();

    const result = await createTeam(payload);

    if (result.error) return { status: 409, data: result };

    return { status: 201, data: result };
  }
}