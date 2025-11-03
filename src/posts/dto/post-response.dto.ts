// Generated content type - can be empty object or contain generatedPostText and/or generatedPostImage
export type GeneratedContentDto = {
  generatedPostText?: string;
  generatedPostImage?: string;
} | Record<string, never>;

export class PostVariantDto {
  id: string;
  variantNumber: number;
  postId: string;
  text: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  variants?: PostVariantDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class GeneratePostResponseDto {
  generatedContent: {
    variant1?: {
      generatedPostText?: string;
      generatedPostImage?: string;
    };
    variant2?: {
      generatedPostText?: string;
      generatedPostImage?: string;
    };
    variant3?: {
      generatedPostText?: string;
      generatedPostImage?: string;
    };
  };
  generationStyle?: string;
  previewImage: string;
  actionButton: string | null;
}

