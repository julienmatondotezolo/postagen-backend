import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SupabaseService } from './supabase/supabase.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Test Supabase connection before starting the server
  console.log('Testing Supabase connection...');
  try {
    const supabaseService = app.get(SupabaseService);
    await supabaseService.testConnection();
  } catch (error) {
    console.error('✗ Supabase connection failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\nPlease check your .env file configuration:');
    console.error('- SUPABASE_URL (required)');
    console.error('  Example: https://yxekdnzfenlilaicxywu.supabase.co');
    console.error('- SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY (fallback)');
    console.error('  Get from: Supabase Dashboard -> Settings -> API');
    process.exit(1);
  }

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS only for localhost:3002
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_URL || "http://localhost:3002",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 5001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API routes are available at: http://localhost:${port}/api`);
}
bootstrap();

