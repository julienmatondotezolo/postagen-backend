import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SupabaseService provides a clean connection to Supabase
 * Uses Supabase JS client for all database operations via REST API
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl) {
      throw new Error(
        'SUPABASE_URL is required. Please set it in your .env file.\n' +
          'Get it from: Supabase Dashboard -> Settings -> API -> Project URL',
      );
    }

    if (!supabaseKey) {
      throw new Error(
        'Supabase API key is required. Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in your .env file.\n' +
          'Get it from: Supabase Dashboard -> Settings -> API',
      );
    }

    // Create Supabase client with proper configuration for backend
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });

    this.logger.log(`Supabase client initialized for: ${supabaseUrl}`);
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Test the Supabase connection by querying the database
   * @throws Error if connection fails
   */
  async testConnection(): Promise<void> {
    try {
      this.logger.log('Testing Supabase connection...');

      // Test connection by querying the posts table
      // If table doesn't exist, we'll get a specific error code
      const { data, error } = await this.supabase
        .from('posts')
        .select('id')
        .limit(1);

      if (error) {
        // Handle different error scenarios
        if (error.code === 'PGRST116') {
          // Table doesn't exist - connection is working but table is missing
          this.logger.warn(
            'Connection successful, but posts table not found. This is okay if migrations haven\'t run yet.',
          );
          return;
        }

        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key')) {
          throw new Error(
            `Authentication failed: ${error.message}. Please check your SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.`,
          );
        }

        if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
          throw new Error(
            `Network error: ${error.message}. Please check your SUPABASE_URL and internet connection.`,
          );
        }

        // For other errors, connection might still be working
        // Just log and continue - the table might not exist yet
        this.logger.warn(`Connection test returned error: ${error.message}. This might be okay.`);
        return;
      }

      // Success - connection is working
      this.logger.log('✓ Supabase connection successful');
      if (data) {
        this.logger.debug(`Found ${data.length} post(s) in database`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw custom errors
        throw error;
      }
      throw new Error(`Failed to test Supabase connection: ${String(error)}`);
    }
  }
}
