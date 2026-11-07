/**
 * Generates a UUIDv7 (RFC 9562): a 48-bit millisecond timestamp followed by
 * random bits, so IDs sort chronologically while staying globally unique —
 * used for every primary key (Tech Spec §2 "Konvensi tipe SQLite").
 *
 * Uses the standard Web Crypto API (`globalThis.crypto`, available in both
 * Node 22+ and every browser) instead of `node:crypto`, since this module
 * is also imported client-side by apps/web via @smart-plant/shared's barrel.
 */
export function uuidv7(): string {
  const unixTsMs = BigInt(Date.now());
  const bytes = new Uint8Array(16);

  bytes[0] = Number((unixTsMs >> 40n) & 0xffn);
  bytes[1] = Number((unixTsMs >> 32n) & 0xffn);
  bytes[2] = Number((unixTsMs >> 24n) & 0xffn);
  bytes[3] = Number((unixTsMs >> 16n) & 0xffn);
  bytes[4] = Number((unixTsMs >> 8n) & 0xffn);
  bytes[5] = Number(unixTsMs & 0xffn);

  const rand = new Uint8Array(10);
  globalThis.crypto.getRandomValues(rand);
  bytes.set(rand, 6);

  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
