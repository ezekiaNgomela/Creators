import { http } from "./http";

export type CreateStreamInput = {
  title: string;
  creatorId: string;
  visibility: "public" | "subscribers" | "private";
  scheduledFor?: string;
};

export async function createStream(input: CreateStreamInput) {
  return http.post("/streams/create", input).then((res) => res.data);
}

export async function uploadMedia(file: File, creatorId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("creatorId", creatorId);

  const res = await http.post("/media/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function publishUploadedPost(params: {
  creatorId: string;
  assetKey: string;
  caption: string;
  mediaType: "video" | "image" | "audio";
}) {
  return http.post("/media/posts/publish", params).then((res) => res.data);
}
