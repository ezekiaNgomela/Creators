import { useEffect, useState } from "react";
import {
  Room,
  RoomEvent,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from "livekit-client";
import { backendClient } from "../../services/local-service/backendClient";

export function GoLive({ streamId }: { streamId: string }) {
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    const start = async () => {
      // 1. get token (host mode)
      const res = await backendClient.post("/streams/livekit/token", {
        roomName: `stream_${streamId}`,
        userId: "creator-1",
        isHost: true,
      });

      const { token, url } = res.data;

      // 2. connect
      const r = new Room();
      await r.connect(url, token);

      // 3. get camera + mic
      const videoTrack = await createLocalVideoTrack();
      const audioTrack = await createLocalAudioTrack();

      // 4. publish tracks
      await r.localParticipant.publishTrack(videoTrack);
      await r.localParticipant.publishTrack(audioTrack);

      // 5. show preview
      const videoEl = videoTrack.attach();
      videoEl.style.width = "100%";
      document.getElementById("preview")?.appendChild(videoEl);

      setRoom(r);
    };

    start();

    return () => {
      room?.disconnect();
    };
  }, []);

  return (
    <div style={{ background: "black", height: "100vh" }}>
      <h2 style={{ color: "white" }}>🔴 LIVE</h2>
      <div id="preview" />
    </div>
  );
}
