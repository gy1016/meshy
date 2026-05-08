export interface TextTo3DChatAction {
  type: "text_to_3d_generate";
  prompt: string;
}

export type ChatAction = TextTo3DChatAction;

