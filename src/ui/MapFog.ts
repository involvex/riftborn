/** Pack/unpack hub fog for character saves (bit → base64). */

export function packExplored(explored: boolean[]): string {
  const bytes = new Uint8Array(Math.ceil(explored.length / 8));
  for (let i = 0; i < explored.length; i++) {
    if (explored[i]) bytes[i >> 3]! |= 1 << (i & 7);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin);
}

export function unpackExplored(b64: string, length: number): boolean[] {
  const out = new Array<boolean>(length).fill(false);
  try {
    const bin = atob(b64);
    for (let i = 0; i < length; i++) {
      const byte = bin.charCodeAt(i >> 3) || 0;
      out[i] = (byte & (1 << (i & 7))) !== 0;
    }
  } catch {
    /* corrupt / missing */
  }
  return out;
}

export function mergeExplored(
  into: boolean[],
  from: boolean[] | null | undefined,
): boolean {
  if (!from || from.length !== into.length) return false;
  let changed = false;
  for (let i = 0; i < into.length; i++) {
    if (from[i] && !into[i]) {
      into[i] = true;
      changed = true;
    }
  }
  return changed;
}
