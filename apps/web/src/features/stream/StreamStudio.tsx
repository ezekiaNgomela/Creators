import { useState } from "react";
import { createStream, prepareMedia, uploadMedia, publishUploadedPost } from "../../services/local-service/streamPipeline";

export function StreamStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Preparing media...");

    const prep = await prepareMedia({
      file,
      creatorId: "creator-1",
      mediaType: "video",
    });

    setStatus("Uploading...");
    await uploadMedia(file, prep.uploadUrl);

    setStatus("Publishing...");
    await publishUploadedPost({
      creatorId: "creator-1",
      assetKey: prep.assetKey,
      caption: "New upload",
      mediaType: "video",
    });

    setStatus("Done");
  };

  const handleCreateStream = async () => {
    setStatus("Creating live stream...");
    const res = await createStream({
      title: "Live Session",
      creatorId: "creator-1",
      visibility: "public",
    });

    setStatus(`Stream ready: ${res?.id || "ok"}`);
  };

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>Stream Studio</h2>

      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />

      <div style={{ marginTop: 10 }}>
        <button onClick={handleUpload}>Upload Video</button>
        <button onClick={handleCreateStream} style={{ marginLeft: 10 }}>
          Go Live
        </button>
      </div>

      <p>{status}</p>
    </div>
  );
}
