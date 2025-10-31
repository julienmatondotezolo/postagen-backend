import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      throw new Error(
        'SUPABASE_URL is missing. Please add it to your .env file.\n' +
        'Get it from: Supabase Dashboard -> Settings -> API -> Project URL',
      );
    }

    if (!supabaseKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is missing. Please add it to your .env file.\n' +
        'How to find it:\n' +
        '1. Go to https://supabase.com/dashboard\n' +
        '2. Select your project\n' +
        '3. Go to Settings -> API\n' +
        '4. Look for "service_role" key (it\'s the secret one, starts with "eyJ...")\n' +
        '5. Copy it and add to .env as SUPABASE_SERVICE_ROLE_KEY=your_key_here',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Test the Supabase connection by performing a simple query
   * @throws Error if connection fails
   */
  async testConnection(): Promise<void> {
    try {
      // Try to query a simple table to verify connection
      // Using the posts table since that's what we use
      const { error } = await this.supabase
        .from('posts')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(
          `Supabase connection test failed: ${error.message}\n` +
          `Code: ${error.code || 'N/A'}\n` +
          `Details: ${error.details || 'N/A'}\n` +
          `Hint: ${error.hint || 'N/A'}`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Supabase connection test failed: ${String(error)}`);
    }
  }
}

