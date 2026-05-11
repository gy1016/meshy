export interface TextTo3DChatAction {
  type: "text_to_3d_generate";
  prompt: string;
}

export interface ImageTo3DChatAction {
  type: "image_to_3d_generate";
}

export type ChatAction = TextTo3DChatAction | ImageTo3DChatAction;

