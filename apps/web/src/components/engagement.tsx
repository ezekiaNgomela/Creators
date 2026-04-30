import { FormEvent, ReactNode, useState } from "react";
import ReactEmoji from "react-emoji";
import { Button, Chip, IconButton, InputBase, Paper } from "@mui/material";
import EmojiEmotionsRounded from "@mui/icons-material/EmojiEmotionsRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import PersonRemoveRounded from "@mui/icons-material/PersonRemoveRounded";
import SendRounded from "@mui/icons-material/SendRounded";

const quickEmoji = [":sparkles:", ":fire:", ":heart:", ":raised_hands:", ":zap:"];

export function EmojiText({ className, text }: { className?: string; text: string }) {
  return <span className={className}>{ReactEmoji.emojify(text, { attributes: { width: "18px", height: "18px" } }) as ReactNode}</span>;
}

export function FollowPill({ following, onClick }: { following: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      size="small"
      startIcon={following ? <PersonRemoveRounded /> : <PersonAddAlt1Rounded />}
      sx={{
        borderRadius: "999px",
        px: 1.5,
        py: 0.5,
        fontWeight: 800,
        color: "#fff",
        background: following ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg, var(--accent), var(--accent-2))",
        border: following ? "1px solid rgba(255,255,255,0.22)" : "none",
        backdropFilter: "blur(12px)",
      }}
      variant="contained"
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}

export function EmojiComposer({
  onSubmit,
  placeholder,
}: {
  onSubmit: (value: string) => Promise<void> | void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }
    await onSubmit(value);
    setValue("");
  }

  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          py: 0.5,
          borderRadius: "18px",
          background: "color-mix(in srgb, var(--surface-2) 76%, transparent)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <EmojiEmotionsRounded sx={{ color: "var(--accent)", fontSize: 20 }} />
        <InputBase
          placeholder={placeholder}
          sx={{ color: "var(--text-1)", flex: 1, fontSize: 14 }}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <IconButton sx={{ color: "var(--accent)" }} type="submit">
          <SendRounded fontSize="small" />
        </IconButton>
      </Paper>
      <div className="flex flex-wrap gap-2">
        {quickEmoji.map((emoji) => (
          <Chip
            key={emoji}
            label={<EmojiText text={emoji} />}
            onClick={() => setValue((current) => `${current}${current ? " " : ""}${emoji}`)}
            size="small"
            sx={{
              color: "var(--text-2)",
              background: "var(--chip-bg)",
              border: "1px solid var(--line-soft)",
              borderRadius: "999px",
            }}
            variant="outlined"
          />
        ))}
      </div>
    </form>
  );
}
