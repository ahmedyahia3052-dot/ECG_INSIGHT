export const StreamingRenderer = {
  chunkContent(content: string, chunkSize = 18): string[] {
    const chunks = content.match(new RegExp(`.{1,${chunkSize}}(\\s|$)`, "g")) ?? [content];
    return chunks.length ? chunks : [content];
  },

  streamToWriter(content: string, write: (event: string, data: unknown) => void, cancelled: () => boolean) {
    for (const token of StreamingRenderer.chunkContent(content)) {
      if (cancelled()) return;
      write("token", { token });
    }
  },
};
