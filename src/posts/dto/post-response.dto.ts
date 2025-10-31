export class PostResponseDto {
  id: string;
  postContext: string;
  generatedContent: string | null;
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
    generatedPostText: string;
  };
  previewImage: string;
}

