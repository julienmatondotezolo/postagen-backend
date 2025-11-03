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
  private readonly VARIANT_IMAGES_BUCKET = 'post-variants';
  private readonly supabaseUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
  }

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

    // Fetch post with variants in a single query
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        post_variants (
          id,
          variant_number,
          post_id,
          generated_post_text,
          generated_post_image,
          created_at,
          updated_at
        )
      `)
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

    // First, get all variants with their images before deleting
    const { data: variants, error: fetchError } = await supabase
      .from('post_variants')
      .select('id, generated_post_image')
      .eq('post_id', postId);

    if (fetchError) {
      this.logger.warn(`Error fetching variants for post ${postId}: ${fetchError.message}`, fetchError);
    } else if (variants && variants.length > 0) {
      // Delete images from storage bucket
      const imagePaths = variants
        .map((v) => v.generated_post_image)
        .filter((img): img is string => {
          if (!img) return false;
          // Only delete images that are in our bucket (not external URLs)
          return img.includes(`${this.supabaseUrl}/storage/v1/object/public/${this.VARIANT_IMAGES_BUCKET}/`);
        })
        .map((img) => {
          // Extract path from full URL
          const urlMatch = img.match(new RegExp(`/${this.VARIANT_IMAGES_BUCKET}/(.+)$`));
          return urlMatch ? urlMatch[1] : null;
        })
        .filter((path): path is string => path !== null);

      if (imagePaths.length > 0) {
        const { error: deleteStorageError } = await supabase.storage
          .from(this.VARIANT_IMAGES_BUCKET)
          .remove(imagePaths);

        if (deleteStorageError) {
          this.logger.warn(
            `Error deleting variant images from storage for post ${postId}: ${deleteStorageError.message}`,
            deleteStorageError,
          );
        } else {
          this.logger.log(`Deleted ${imagePaths.length} variant images from storage for post ${postId}`);
        }
      }
    }

    // Delete all variants for this post
    const { error: variantsError } = await supabase
      .from('post_variants')
      .delete()
      .eq('post_id', postId);

    if (variantsError) {
      this.logger.warn(`Error deleting variants for post ${postId}: ${variantsError.message}`, variantsError);
      // Continue with post deletion even if variant deletion fails
    } else {
      this.logger.log(`Deleted variants for post ${postId}`);
    }

    // Then delete the post itself
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

  async getPostVariants(postId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('post_variants')
      .select('*')
      .eq('post_id', postId)
      .order('variant_number', { ascending: true });

    if (error) {
      this.logger.error(`Error getting variants: ${error.message}`, error);
      throw new HttpException(
        `Failed to get variants: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Return empty array if no variants found (normal for older posts)
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((variant) => ({
      id: variant.id,
      variantNumber: variant.variant_number,
      postId: variant.post_id,
      text: variant.generated_post_text,
      image: variant.generated_post_image,
      createdAt: variant.created_at,
      updatedAt: variant.updated_at,
    }));
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

      // Return generatedContent object as-is (with variants structure)
      // The webhook sends variants in the format: { variant1: {...}, variant2: {...}, variant3: {...} }
      let normalizedGeneratedContent: {
        variant1?: { generatedPostText?: string; generatedPostImage?: string };
        variant2?: { generatedPostText?: string; generatedPostImage?: string };
        variant3?: { generatedPostText?: string; generatedPostImage?: string };
      } = {};
      
      if (generatedContent && typeof generatedContent === 'object' && generatedContent !== null) {
        // Pass through the variants structure unchanged
        normalizedGeneratedContent = generatedContent as any;
      }

      // Log successful generation
      const style = generationStyle || generatePostDto.options.actionButton || 'unknown';
      this.logger.log(`Successfully generated "${style}" style with variants`);

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

      // Save variants to database if currentPostId is provided
      if (generatePostDto.currentPostId && normalizedGeneratedContent) {
        try {
          const supabase = this.supabaseService.getClient();
          const variants = [
            { variantNumber: 1, data: normalizedGeneratedContent.variant1 },
            { variantNumber: 2, data: normalizedGeneratedContent.variant2 },
            { variantNumber: 3, data: normalizedGeneratedContent.variant3 },
          ];

          // Get the next variant number for this post
          const { data: existingVariants } = await supabase
            .from('post_variants')
            .select('variant_number')
            .eq('post_id', generatePostDto.currentPostId)
            .order('variant_number', { ascending: false })
            .limit(1);

          const nextVariantNumber = existingVariants && existingVariants.length > 0
            ? existingVariants[0].variant_number + 1
            : 1;

          // Process variants: download and upload images to Supabase storage
          const processedVariants = await Promise.all(
            variants
              .filter((v) => v.data) // Only process variants that have data
              .map(async (v, index) => {
                let imageUrl = v.data?.generatedPostImage || null;

                // If variant has an image URL, check if it's already in our bucket
                if (imageUrl && v.data?.generatedPostImage) {
                  // Skip upload if image is already in our Supabase bucket
                  const isAlreadyInBucket = imageUrl.includes(
                    `${this.supabaseUrl}/storage/v1/object/public/${this.VARIANT_IMAGES_BUCKET}/`,
                  );

                  if (!isAlreadyInBucket) {
                    try {
                      const uploadedUrl = await this.uploadVariantImageToStorage(
                        v.data.generatedPostImage,
                        generatePostDto.currentPostId,
                        nextVariantNumber + index,
                      );
                      imageUrl = uploadedUrl;
                    } catch (uploadError) {
                      this.logger.warn(
                        `Failed to upload variant image for variant ${nextVariantNumber + index}: ${uploadError.message}`,
                        uploadError,
                      );
                      // Keep original URL if upload fails
                    }
                  } else {
                    this.logger.log(
                      `Variant ${nextVariantNumber + index} image already in bucket, skipping upload`,
                    );
                  }
                }

                return {
                  post_id: generatePostDto.currentPostId,
                  variant_number: nextVariantNumber + index,
                  generated_post_text: v.data?.generatedPostText || null,
                  generated_post_image: imageUrl,
                };
              }),
          );

          if (processedVariants.length > 0) {
            const { error: insertError } = await supabase
              .from('post_variants')
              .insert(processedVariants);

            if (insertError) {
              this.logger.warn(
                `Failed to save variants for post ${generatePostDto.currentPostId}, but generation succeeded`,
                insertError,
              );
            } else {
              this.logger.log(`Saved ${processedVariants.length} variants for post ${generatePostDto.currentPostId}`);
            }

            // Update normalizedGeneratedContent with the new bucket URLs for the response
            processedVariants.forEach((variant, index) => {
              const variantKey = `variant${index + 1}` as keyof typeof normalizedGeneratedContent;
              if (normalizedGeneratedContent[variantKey] && variant.generated_post_image) {
                normalizedGeneratedContent[variantKey]!.generatedPostImage = variant.generated_post_image;
              }
            });
          }
        } catch (variantError) {
          this.logger.warn(
            `Failed to save variants for post ${generatePostDto.currentPostId}, but generation succeeded`,
            variantError,
          );
          // Don't fail the request if variant save fails
        }
      }

      // Return generatedContent object with updated bucket URLs
      return {
        generatedContent: normalizedGeneratedContent,
        generationStyle,
        previewImage,
        actionButton: generatePostDto.options.actionButton || null,
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

  /**
   * Downloads an image from a URL and uploads it to Supabase storage bucket
   * @param imageUrl The URL of the image to download
   * @param postId The post ID
   * @param variantNumber The variant number
   * @returns The public URL of the uploaded image
   */
  private async uploadVariantImageToStorage(
    imageUrl: string,
    postId: string,
    variantNumber: number,
  ): Promise<string> {
    const supabase = this.supabaseService.getClient();

    try {
      // Download the image
      this.logger.log(`Downloading image from ${imageUrl}`);
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
      });

      // Determine file extension from URL or content type
      const contentType = imageResponse.headers['content-type'] || 'image/png';
      const extension = contentType.includes('jpeg') || contentType.includes('jpg')
        ? 'jpg'
        : contentType.includes('png')
          ? 'png'
          : contentType.includes('webp')
            ? 'webp'
            : 'png'; // default to png

      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `${postId}/${variantNumber}-${timestamp}.${extension}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.VARIANT_IMAGES_BUCKET)
        .upload(filename, imageResponse.data, {
          contentType,
          upsert: false, // Don't overwrite existing files
        });

      if (uploadError) {
        throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.VARIANT_IMAGES_BUCKET)
        .getPublicUrl(filename);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      this.logger.log(`Successfully uploaded variant image to ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`Error uploading variant image: ${error.message}`, error);
      throw error;
    }
  }

  private mapToPostResponse(data: any): PostResponseDto {
    // Map variants if they exist
    const variants = data.post_variants && Array.isArray(data.post_variants) && data.post_variants.length > 0
      ? data.post_variants.map((variant: any) => ({
          id: variant.id,
          variantNumber: variant.variant_number,
          postId: variant.post_id,
          text: variant.generated_post_text,
          image: variant.generated_post_image,
          createdAt: new Date(variant.created_at),
          updatedAt: new Date(variant.updated_at),
        }))
      : undefined;

    return {
      id: data.id,
      postContext: data.post_context,
      generatedContent: data.generated_content,
      previewImage: data.preview_image,
      options: data.options,
      variants,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

