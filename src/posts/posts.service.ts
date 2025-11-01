import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GeneratePostDto } from './dto/generate-post.dto';
import { GeneratePostResponseDto, PostResponseDto } from './dto/post-response.dto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async createPost(createPostDto: CreatePostDto): Promise<PostResponseDto> {
    const supabase = this.supabaseService.getClient();

    // Default preview image URL from Supabase storage
    const DEFAULT_PREVIEW_IMAGE_URL =
      'https://yxekdnzfenlilaicxywu.supabase.co/storage/v1/object/public/preview-images/default-previewImage.png';

    const insertData: any = {
      post_context: createPostDto.postContext,
      generated_content: createPostDto.generatedContent,
      preview_image: createPostDto.previewImage || DEFAULT_PREVIEW_IMAGE_URL,
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

  async getAllPosts(): Promise<PostResponseDto[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error getting posts: ${error.message}`, error);
      throw new HttpException(
        `Failed to get posts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data.map((post) => this.mapToPostResponse(post));
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
        {
          errorCode: 'CONFIGURATION_ERROR',
          message: 'Failed to generate post: Generation service is not configured',
        },
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

      const { generatedContent, previewImage, generationStyle } = response.data;

      // Validate previewImage is present
      if (!previewImage) {
        throw new HttpException(
          {
            errorCode: 'INVALID_RESPONSE',
            message: `Failed to generate style with type: ${generatePostDto.options.actionButton}`,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Return generatedContent object as-is (with generatedPostText and/or generatedPostImage)
      // Normalize to ensure it's always an object
      let normalizedGeneratedContent: { generatedPostText?: string; generatedPostImage?: string } = {};
      
      if (generatedContent) {
        if (typeof generatedContent === 'string') {
          normalizedGeneratedContent = { generatedPostText: generatedContent };
        } else if (typeof generatedContent === 'object' && generatedContent !== null) {
          // Extract both generatedPostText and generatedPostImage if they exist
          normalizedGeneratedContent = {
            generatedPostText: 'generatedPostText' in generatedContent ? generatedContent.generatedPostText : undefined,
            generatedPostImage: 'generatedPostImage' in generatedContent ? generatedContent.generatedPostImage : undefined,
          };
        }
      }

      // Log successful generation
      const style = generationStyle || generatePostDto.options.actionButton || 'unknown';
      this.logger.log(`Successfully generated "${style}" style`);

      // If currentPostId is provided, update the post with previewImage only (don't save generatedContent)
      if (generatePostDto.currentPostId) {
        try {
          await this.updatePost(generatePostDto.currentPostId, {
            previewImage,
            // Don't save generatedContent - set it to null
            generatedContent: null,
          });
        } catch (updateError) {
          this.logger.warn(
            `Failed to update post ${generatePostDto.currentPostId} with preview image, but generation succeeded`,
            updateError,
          );
          // Don't fail the request if update fails, return the generated content anyway
        }
      }

      // Return generatedContent object with generatedPostText and/or generatedPostImage
      return {
        generatedContent: normalizedGeneratedContent,
        previewImage,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        // If it's already an HttpException, wrap it with error code and message
        const exceptionResponse = error.getResponse();
        const errorMessage = typeof exceptionResponse === 'string' 
          ? exceptionResponse 
          : (exceptionResponse as any)?.message || error.message;

        this.logger.error(errorMessage, error);
        
        throw new HttpException(
          {
            errorCode: 'GENERATION_FAILED',
            message: `Failed to generate style with type: ${generatePostDto.options.actionButton}`,
          },
          error.getStatus(),
        );
      }

      const axiosError = error as AxiosError;
      if (axiosError.response) {
        this.logger.error(
          `n8n webhook returned error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
          axiosError,
        );
        throw new HttpException(
          {
            errorCode: 'N8N_WEBHOOK_ERROR',
            message: `Failed to generate style with type: ${generatePostDto.options.actionButton}`,
          },
          HttpStatus.BAD_GATEWAY,
        );
      } else if (axiosError.request) {
        this.logger.error('No response received from n8n webhook', axiosError);
        throw new HttpException(
          {
            errorCode: 'N8N_TIMEOUT',
            message: 'Failed to generate post: No response received from generation service',
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      } else {
        this.logger.error(`Error calling n8n webhook: ${error.message}`, error);
        throw new HttpException(
          {
            errorCode: 'GENERATION_FAILED',
            message: `Failed to generate style with type: ${generatePostDto.options.actionButton}`,
          },
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

