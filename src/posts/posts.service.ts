import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GeneratePostDto } from './dto/generate-post.dto';
import { PostResponseDto, GeneratePostResponseDto } from './dto/post-response.dto';
import axios, { AxiosError } from 'axios';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async createPost(createPostDto: CreatePostDto): Promise<PostResponseDto> {
    const supabase = this.supabaseService.getClient();

    const insertData: any = {
      post_context: createPostDto.postContext,
      generated_content: createPostDto.generatedContent,
      preview_image: createPostDto.previewImage,
      options: createPostDto.options,
    };

    // Only include id if provided (otherwise database will generate it)
    if (createPostDto.id) {
      insertData.id = createPostDto.id;
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating post: ${error.message}`, error);
      throw new HttpException(
        `Failed to create post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.mapToPostResponse(data);
  }

  async getPost(postId: string): Promise<PostResponseDto> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      this.logger.error(`Error getting post: ${error.message}`, error);
      throw new HttpException(
        `Failed to get post: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!data) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }

    return this.mapToPostResponse(data);
  }

  async updatePost(postId: string, updates: Partial<CreatePostDto>): Promise<PostResponseDto> {
    const supabase = this.supabaseService.getClient();

    const updateData: any = {};
    if (updates.postContext !== undefined) updateData.post_context = updates.postContext;
    if (updates.generatedContent !== undefined) updateData.generated_content = updates.generatedContent;
    if (updates.previewImage !== undefined) updateData.preview_image = updates.previewImage;
    if (updates.options !== undefined) updateData.options = updates.options;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating post: ${error.message}`, error);
      throw new HttpException(
        `Failed to update post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.mapToPostResponse(data);
  }

  async deletePost(postId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      this.logger.error(`Error deleting post: ${error.message}`, error);
      throw new HttpException(
        `Failed to delete post: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generatePost(generatePostDto: GeneratePostDto): Promise<GeneratePostResponseDto> {
    const n8nWebhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');

    if (!n8nWebhookUrl) {
      throw new HttpException(
        'N8N_WEBHOOK_URL is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`Calling n8n webhook for post generation: ${generatePostDto.currentPostId || 'new post'}`);

    try {
      // Call n8n webhook
      const response = await axios.post(
        n8nWebhookUrl,
        {
          postContext: generatePostDto.postContext,
          options: generatePostDto.options,
          currentPostId: generatePostDto.currentPostId,
        },
        {
          timeout: 300000, // 5 minutes timeout for generation
        },
      );

      const { generatedContent, previewImage } = response.data;

      if (!generatedContent || !previewImage) {
        throw new HttpException(
          'Invalid response from n8n webhook: missing generatedContent or previewImage',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // If currentPostId is provided, update the post with generated content
      if (generatePostDto.currentPostId) {
        try {
          await this.updatePost(generatePostDto.currentPostId, {
            generatedContent,
            previewImage,
          });
        } catch (updateError) {
          this.logger.warn(
            `Failed to update post ${generatePostDto.currentPostId} with generated content, but generation succeeded`,
            updateError,
          );
          // Don't fail the request if update fails, return the generated content anyway
        }
      }

      return {
        generatedContent,
        previewImage,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const axiosError = error as AxiosError;
      if (axiosError.response) {
        this.logger.error(
          `n8n webhook returned error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
          axiosError,
        );
        throw new HttpException(
          `n8n webhook error: ${axiosError.response.status} ${axiosError.response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      } else if (axiosError.request) {
        this.logger.error('No response received from n8n webhook', axiosError);
        throw new HttpException(
          'No response received from n8n webhook',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      } else {
        this.logger.error(`Error calling n8n webhook: ${error.message}`, error);
        throw new HttpException(
          `Failed to generate post: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  private mapToPostResponse(data: any): PostResponseDto {
    return {
      id: data.id,
      postContext: data.post_context,
      generatedContent: data.generated_content,
      previewImage: data.preview_image,
      options: data.options,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

