export type EmbedWorkerRequest =
  | { readonly type: "init"; readonly modelsDir: string; readonly modelName: string; readonly threads: number }
  | { readonly type: "embed"; readonly id: number; readonly texts: ReadonlyArray<string> };

export type EmbedWorkerResponse =
  | { readonly type: "ready"; readonly dims: number }
  | { readonly type: "result"; readonly id: number; readonly vectors: ReadonlyArray<Float32Array> }
  | { readonly type: "error"; readonly id?: number; readonly message: string };
