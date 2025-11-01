// Generated content type - can be empty object or contain generatedPostText and/or generatedPostImage
export type GeneratedContentDto = {
  generatedPostText?: string;
  generatedPostImage?: string;
} | Record<string, never>;

export class PostResponseDto {
  id: string;
  postContext: string;
  generatedContent: GeneratedContentDto | null;
  previewImage: string | null;
  options: {
    postType: string;
    visualType: string;
    imageType: string;
    illustrationType: string;
    backgroundType: string;
    layoutType: string;
    linkedInFormat: string;
    actionButton: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class GeneratePostResponseDto {
  generatedContent: {
    generatedPostText?: string;
    generatedPostImage?: string;
  };
  previewImage: string;
}

