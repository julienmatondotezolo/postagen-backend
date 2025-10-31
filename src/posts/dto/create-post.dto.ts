import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PostGenerationOptionsDto {
  @IsString()
  postType: string;

  @IsString()
  visualType: string;

  @IsString()
  imageType: string;

  @IsString()
  illustrationType: string;

  @IsString()
  backgroundType: string;

  @IsString()
  layoutType: string;

  @IsString()
  linkedInFormat: string;

  @IsString()
  @IsOptional()
  actionButton: string | null;
}

export class CreatePostDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  postContext: string;

  @IsString()
  @IsOptional()
  generatedContent: string | null;

  @IsString()
  @IsOptional()
  previewImage: string | null;

  @IsObject()
  @ValidateNested()
  @Type(() => PostGenerationOptionsDto)
  options: PostGenerationOptionsDto;
}

