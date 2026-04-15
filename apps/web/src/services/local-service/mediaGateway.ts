// MEDIA GATEWAY (LANGUAGE-AGNOSTIC DESIGN)
// This layer allows switching heavy media logic (e.g. to Rust) without breaking UI

export type MediaRequest = {
  type: "play" | "pause" | "seek" | "encode" | "stream";
  payload?: any;
};

export interface MediaAdapter {
  send(req: MediaRequest): Promise<any>;
}

// Default JS adapter (temporary)
export class JsMediaAdapter implements MediaAdapter {
  async send(req: MediaRequest) {
    console.log("JS Media Adapter:", req);
    return { ok: true };
  }
}

// Future Rust adapter (via API or WASM)
export class RustMediaAdapter implements MediaAdapter {
  async send(req: MediaRequest) {
    const res = await fetch("/media", {
      method: "POST",
      body: JSON.stringify(req),
    });
    return res.json();
  }
}

// Factory (switch backend easily)
export const mediaAdapter: MediaAdapter = new JsMediaAdapter();
