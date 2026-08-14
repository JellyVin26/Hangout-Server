import { Injectable, OnModuleInit } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostHogService implements OnModuleInit {
  private client: PostHog | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('POSTHOG_API_KEY');
    const host = this.config.get<string>('POSTHOG_HOST') ?? 'https://eu.i.posthog.com';
    if (apiKey) {
      this.client = new PostHog(apiKey, { host, flushAt: 20, flushInterval: 5000 });
    }
  }

  /** Capture a server-side event (called from other services). */
  capture(distinctId: string, event: string, properties?: Record<string, any>) {
    if (!this.client) return;
    this.client.capture({ distinctId, event, properties });
  }

  /** Identify / set user properties. */
  identify(distinctId: string, properties?: Record<string, any>) {
    if (!this.client) return;
    this.client.identify({ distinctId, properties });
  }

  /** Alias one id to another (e.g. anonymous -> identified). */
  alias(distinctId: string, alias: string) {
    if (!this.client) return;
    this.client.alias({ distinctId, alias });
  }

  /** Shutdown flush (for graceful shutdown). */
  async shutdown() {
    if (this.client) await this.client.shutdown();
  }
}