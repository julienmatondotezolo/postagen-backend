# Postagen Backend

NestJS backend API for Postagen, integrated with Supabase for data storage.

## Features

- **POST /api/posts** - Create/upload a post to the database
- **POST /api/posts/generate** - Generate post content via n8n webhook
- **GET /api/posts/:id** - Get a post by ID
- **PUT /api/posts/:id** - Update a post
- **DELETE /api/posts/:id** - Delete a post

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase project with posts table

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory (copy from `env.template`):
   ```bash
   cp env.template .env
   ```

   Then edit `.env` and replace the values:
   ```env
   # Database Connection String
   # IMPORTANT: Replace [YOUR_PASSWORD] with your actual Supabase database password
   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.yxekdnzfenlilaicxywu.supabase.co:5432/postgres

   # Supabase Configuration
   SUPABASE_URL=https://dxxtxdyrovawugvvrhah.supabase.co

   # Supabase Service Role Key (get from Supabase Dashboard -> Settings -> API)
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # N8N Webhook URL
   N8N_WEBHOOK_URL=your_n8n_webhook_url_here

   # Server Port
   PORT=5000
   ```

3. **Where to replace `[YOUR_PASSWORD]`:**
   - Open the `.env` file you just created
   - Find the line: `DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.yxekdnzfenlilaicxywu.supabase.co:5432/postgres`
   - Replace `[YOUR_PASSWORD]` with your actual Supabase database password
   - Example: If your password is `mypassword123`, it should look like:
     ```
     DATABASE_URL=postgresql://postgres:mypassword123@db.yxekdnzfenlilaicxywu.supabase.co:5432/postgres
     ```

4. Get your Supabase Service Role Key from your Supabase project settings.

5. Set your n8n webhook URL in `N8N_WEBHOOK_URL`.

### Running the Application

Development mode:
```bash
npm run start:dev
```

Production mode:
```bash
npm run build
npm run start:prod
```

The API will be available at `http://localhost:5000`
All routes are prefixed with `/api`, so the base URL for all endpoints is `http://localhost:5000/api`

## API Endpoints

All endpoints are prefixed with `/api`. For example:
- `POST /api/posts` instead of `POST /posts`
- `GET /api/posts/:id` instead of `GET /posts/:id`

### POST /api/posts

Create a new post in the database.

**Request Body:**
```json
{
  "id": "uuid-string",
  "postContext": "Your post context here",
  "generatedContent": null,
  "previewImage": null,
  "options": {
    "postType": "minimalist",
    "visualType": "illustration",
    "imageType": "infographic",
    "illustrationType": "flat-illustration",
    "backgroundType": "pattern",
    "layoutType": "text-left-illustration-right",
    "linkedInFormat": "square",
    "actionButton": null
  }
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "postContext": "Your post context here",
  "generatedContent": null,
  "previewImage": null,
  "options": { ... },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/posts/generate

Generate post content by calling the n8n webhook.

**Request Body:**
```json
{
  "postContext": "Your post context here",
  "options": {
    "postType": "minimalist",
    "visualType": "illustration",
    "imageType": "infographic",
    "illustrationType": "flat-illustration",
    "backgroundType": "pattern",
    "layoutType": "text-left-illustration-right",
    "linkedInFormat": "square",
    "actionButton": null
  },
  "currentPostId": "uuid-string-or-null"
}
```

**Response:**
```json
{
  "generatedContent": "Generated post content...",
  "previewImage": "base64-encoded-image-data"
}
```

**Note:** If `currentPostId` is provided, the post will be automatically updated with the generated content and preview image.

### GET /api/posts/:id

Get a post by its ID.

**Response:**
```json
{
  "id": "uuid-string",
  "postContext": "Your post context here",
  "generatedContent": "Generated content...",
  "previewImage": "base64-encoded-image-data",
  "options": { ... },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### PUT /api/posts/:id

Update an existing post.

**Request Body:**
```json
{
  "postContext": "Updated post context",
  "generatedContent": "Updated generated content",
  "previewImage": "base64-encoded-image-data",
  "options": { ... }
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "postContext": "Updated post context",
  "generatedContent": "Updated generated content",
  "previewImage": "base64-encoded-image-data",
  "options": { ... },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

### DELETE /api/posts/:id

Delete a post by its ID.

**Response:** `204 No Content`

## CORS Configuration

The API is configured to only accept requests from `http://localhost:3002` to protect the endpoints.

## Security Notes

- The backend uses Supabase's Service Role Key for database access, which bypasses Row Level Security (RLS)
- CORS is configured to only allow requests from `http://localhost:3002`
- For production, consider:
  - Enabling RLS on the `posts` table and creating appropriate policies
  - Implementing authentication/authorization
  - Using environment-specific CORS origins

## Database Schema

The `posts` table should have the following structure:
- `id` (uuid, primary key)
- `post_context` (text)
- `generated_content` (text, nullable)
- `preview_image` (text, nullable)
- `options` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── supabase/
│   ├── supabase.module.ts # Supabase module
│   └── supabase.service.ts # Supabase client service
└── posts/
    ├── posts.module.ts    # Posts module
    ├── posts.controller.ts # Posts controller
    ├── posts.service.ts   # Posts service
    └── dto/
        ├── create-post.dto.ts
        ├── generate-post.dto.ts
        └── post-response.dto.ts
```

