function bytesToBinaryString(bytes: Uint8Array): string {
  let binaryString = "";
  const chunkSize = 5000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binaryString += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return binaryString;
}

function base64Encode(binaryString: string): string {
  if (typeof btoa !== "undefined") return btoa(binaryString);
  return Buffer.from(binaryString, "binary").toString("base64");
}

function base64Decode(encoded: string): string {
  if (typeof atob !== "undefined") return atob(encoded);
  return Buffer.from(encoded, "base64").toString("binary");
}

export const TextEncoding = {
  async toBase64(string: string, options: { gzip: boolean }): Promise<string> {
    let bytes = new TextEncoder().encode(string);

    if (options.gzip) {
      if (typeof CompressionStream !== "undefined") {
        const cs = new CompressionStream("gzip");
        const writer = cs.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const compAb = await new Response(cs.readable).arrayBuffer();
        bytes = new Uint8Array(compAb);
      } else {
        const { gzip } = await import("pako");
        bytes = gzip(string);
      }
    }

    return base64Encode(bytesToBinaryString(bytes));
  },

  async fromBase64(encoded: string, options: { gzip: boolean }): Promise<string> {
    const binaryString = base64Decode(encoded);
    const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));

    if (options.gzip) {
      const { ungzip } = await import("pako");
      return ungzip(bytes, { to: "string" }) as string;
    }
    return new TextDecoder().decode(bytes);
  },
};
