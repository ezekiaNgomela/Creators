import { MEDIA_BASE_URL } from "./config";

export type CreateStreamInput = {
  title: string;
  creatorId: string;
  visibility: "public" | "subscribers" | "private";
  scheduledFor?: string;
};

export async function createStream(input: CreateStreamInput) {
  return fetch(`${MEDIA_BASE_URL}/api/streams/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => r.json());
}

export async function uploadMedia(file: File, creatorId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("creatorId", creatorId);

  const res = await fetch(`${MEDIA_BASE_URL}/api/media/uploads`, {
    method: "POST",
    body: form,
  });

  return res.json();
}

export async function publishUploadedPost(params: {
  creatorId: string;
  assetKey: string;
  caption: string;
  mediaType: "video" | "image" | "audio";
}) {
  return fetch(`${MEDIA_BASE_URL}/api/media/posts/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).then((r) => r.json());
}
