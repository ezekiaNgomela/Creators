import { useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { backendClient } from "../../services/local-service/backendClient";
import { useSession } from "../../hooks/useSession";

export function LiveRoom({ streamId, onBack }: { streamId: string; onBack: () => void }) {
  const { user } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const init = async () => {
      const res = await backendClient.post("/streams/livekit/token", {
        roomName: `stream_${streamId}`,
        userId: user?.id,
        isHost: false,
      });

      const { token, url } = res.data;

      const r = new Room();
      await r.connect(url, token);

      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "video") {
          const el = track.attach();
          el.style.width = "100%";
          document.getElementById("video-container")?.appendChild(el);
        }
      });

      setRoom(r);
      setConnected(true);
    };

    if (user) init();

    return () => {
      room?.disconnect();
    };
  }, [user]);

  return (
    <div style={{ background: "black", height: "100vh" }}>
      <button onClick={onBack} style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>← Back</button>
      <div id="video-container" />
      {!connected && <p style={{ color: "white" }}>Connecting...</p>}
    </div>
  );
}
