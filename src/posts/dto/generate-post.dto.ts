import { IsString, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PostGenerationOptionsDto } from './create-post.dto';

export class GeneratePostDto {
  @IsString()
  postContext: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PostGenerationOptionsDto)
  options: PostGenerationOptionsDto;

  @IsString()
  @IsOptional()
  currentPostId: string | null;
}

