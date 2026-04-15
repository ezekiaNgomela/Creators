import { http } from "./http";
import { mediaAdapter } from "./mediaGateway";

export type CreateStreamInput = {
  title: string;
  creatorId: string;
  visibility: "public" | "subscribers" | "private";
  scheduledFor?: string;
};

export type UploadAssetInput = {
  file: File;
  creatorId: string;
  mediaType: "video" | "image" | "audio";
};

export async function createStream(input: CreateStreamInput) {
  return http.post("/streams/create", input).then((res) => res.data);
}

export async function joinStreamCheck(streamId: string, userId: string) {
  return http.post("/streams/join-check", { streamId, userId }).then((res) => res.data);
}

export async function prepareMedia(input: UploadAssetInput) {
  await mediaAdapter.send({
    type: "encode",
    payload: {
      creatorId: input.creatorId,
      mediaType: input.mediaType,
      fileName: input.file.name,
      fileSize: input.file.size,
    },
  });

  return {
    uploadUrl: "/uploads/presigned/mock",
    assetKey: `${input.creatorId}/${Date.now()}-${input.file.name}`,
  };
}

export async function uploadMedia(file: File, uploadUrl: string) {
  // replace with S3/MinIO presigned PUT later
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { ok: true, uploadUrl, size: file.size };
}

export async function publishUploadedPost(params: {
  creatorId: string;
  assetKey: string;
  caption: string;
  mediaType: "video" | "image" | "audio";
}) {
  return {
    ok: true,
    postId: `post_${Date.now()}`,
    ...params,
  };
}
