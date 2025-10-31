import { Controller, Post, Get, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GeneratePostDto } from './dto/generate-post.dto';
import { PostResponseDto, GeneratePostResponseDto } from './dto/post-response.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Body() createPostDto: CreatePostDto): Promise<PostResponseDto> {
    return this.postsService.createPost(createPostDto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generatePost(@Body() generatePostDto: GeneratePostDto): Promise<GeneratePostResponseDto> {
    return this.postsService.generatePost(generatePostDto);
  }

  @Get()
  async getAllPosts(): Promise<PostResponseDto[]> {
    return this.postsService.getAllPosts();
  }

  @Get(':id')
  async getPost(@Param('id') id: string): Promise<PostResponseDto> {
    return this.postsService.getPost(id);
  }

  @Put(':id')
  async updatePost(
    @Param('id') id: string,
    @Body() updatePostDto: Partial<CreatePostDto>,
  ): Promise<PostResponseDto> {
    return this.postsService.updatePost(id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Param('id') id: string): Promise<void> {
    return this.postsService.deletePost(id);
  }
}

