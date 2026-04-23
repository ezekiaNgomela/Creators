declare module "react-emoji" {
  import type { ReactNode } from "react";

  type EmojiOptions = {
    attributes?: Record<string, unknown>;
    emojiType?: string;
    ext?: string;
    host?: string;
    path?: string;
    singleEmoji?: boolean;
    strict?: boolean;
    useEmoticon?: boolean;
  };

  const ReactEmoji: {
    emojify(text: string, options?: EmojiOptions): ReactNode;
  };

  export default ReactEmoji;
}
