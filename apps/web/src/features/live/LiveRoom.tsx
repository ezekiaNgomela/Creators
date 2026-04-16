import { useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { backendClient } from "../../services/local-service/backendClient";

export function LiveRoom({ streamId }: { streamId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const init = async () => {
      const res = await backendClient.post("/streams/livekit/token", {
        roomName: `stream_${streamId}`,
        userId: "viewer-1",
        isHost: false,
      });

      const { token, url } = res.data;

      const r = new Room();
      await r.connect(url, token);

      r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "video") {
          const el = track.attach();
          el.style.width = "100%";
          document.getElementById("video-container")?.appendChild(el);
        }
      });

      setRoom(r);
      setConnected(true);
    };

    init();

    return () => {
      room?.disconnect();
    };
  }, []);

  return (
    <div style={{ background: "black", height: "100vh" }}>
      <div id="video-container" />
      {!connected && <p style={{ color: "white" }}>Connecting...</p>}
    </div>
  );
}
