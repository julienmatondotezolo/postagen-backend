import { IsString, IsOptional, IsObject, ValidateNested, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

// Generated content type - can be empty object or contain generatedPostText and/or generatedPostImage
export type GeneratedContentDto =
  | {
      generatedPostText?: string;
      generatedPostImage?: string;
    }
  | Record<string, never>;

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

  @ValidateIf((o) => o.generatedContent !== null && o.generatedContent !== undefined)
  @IsObject()
  @IsOptional()
  generatedContent: GeneratedContentDto | null;

  @IsString()
  @IsOptional()
  previewImage: string | null;

  @IsObject()
  @ValidateNested()
  @Type(() => PostGenerationOptionsDto)
  options: PostGenerationOptionsDto;
}
