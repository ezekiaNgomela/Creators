import { Avatar, Button, IconButton, Paper } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import type { ChatUser } from "../../api";
import { profileImageFor } from "../../shared/helpers";
import type { DisplayPost } from "../../shared/types";

export function UserListModal({
  posts,
  type,
  users,
  onClose,
  onSelect,
}: {
  posts: DisplayPost[];
  type: "followers" | "following";
  users: ChatUser[];
  onClose: () => void;
  onSelect: (post: DisplayPost) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 400,
          borderRadius: "28px",
          background: "var(--panel-bg)",
          border: "1px solid var(--line-soft)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
        }}
      >
        <header className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="m-0 text-xl font-black capitalize">{type}</h2>
          <IconButton onClick={onClose} sx={{ color: "#fff" }}>
            <ArrowBackRounded />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto p-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition hover:bg-white/5"
              onClick={() => {
                const userPost = posts.find(p => p.author.id === u.id);
                if (userPost) {
                  onSelect(userPost);
                } else {
                  // Create a virtual post for navigation purposes
                  onSelect({
                    id: -(u.id),
                    author: { id: u.id, name: u.name, email: u.email, provider: 'seed', avatarUrl: profileImageFor(u.name), createdAt: new Date().toISOString() },
                    body: "This creator hasn't shared any posts yet.",
                    mood: "New Creator",
                    gallery: [],
                    comments: 0,
                    likes: 0,
                    promotionScore: 0,
                    tags: ["creator"],
                    createdAt: new Date().toISOString(),
                    mediaUrl: "",
                    mediaType: "image",
                    filterName: "Original",
                    overlayText: "",
                    sticker: "",
                    textColor: "#fff",
                    backgroundTone: "midnight",
                    aspectRatio: "4:5",
                    cropZoom: 1,
                    cropX: 50,
                    cropY: 50,
                    rotation: 0,
                    commentCount: 0,
                    likeCount: 0
                  });
                }
                onClose();
              }}
            >
              <Avatar src={profileImageFor(u.name)} sx={{ width: 44, height: 44 }} />
              <div className="min-w-0 flex-1">
                <p className="m-0 font-bold truncate">{u.name}</p>
                <p className="m-0 text-xs text-white/50 truncate">{u.headline}</p>
              </div>
              <Button
                size="small"
                variant="outlined"
                sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 900, borderColor: 'var(--line-soft)', color: '#fff' }}
              >
                View
              </Button>
            </div>
          ))}
          {!users.length && <p className="p-8 text-center text-white/40">No users found.</p>}
        </div>
      </Paper>
    </div>
  );
}
