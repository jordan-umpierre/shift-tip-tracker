import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import nacl from "tweetnacl";
import type { WorkSegment } from "./domain";

const KEY = "shift-tip-tracker.backup-key";
async function key(): Promise<Uint8Array> {
  let value = await SecureStore.getItemAsync(KEY);
  if (!value) { value = Array.from(Crypto.getRandomBytes(32), byte => byte.toString(16).padStart(2, "0")).join(""); await SecureStore.setItemAsync(KEY, value); }
  return new Uint8Array(value.match(/../g)!.map(pair => Number.parseInt(pair, 16)));
}

export async function exportEncryptedBackup(payload: unknown) {
  const secret = await key();
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = nacl.secretbox(body, nonce, secret);
  const file = new File(Paths.cache, "shift-tip-tracker.backup");
  file.write(JSON.stringify({ version: 1, nonce: Array.from(nonce), box: Array.from(encrypted) }));
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
  return file.uri;
}

async function decryptBackup(text: string): Promise<unknown> {
  const parsed = JSON.parse(text) as { version: number; nonce: number[]; box: number[] };
  if (parsed.version !== 1) throw new Error("Unsupported backup version");
  const plain = nacl.secretbox.open(new Uint8Array(parsed.box), new Uint8Array(parsed.nonce), await key());
  if (!plain) throw new Error("Backup authentication failed");
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function readBackup(uri: string): Promise<WorkSegment[]> {
  const data = await decryptBackup(await new File(uri).text()) as { segments?: WorkSegment[] };
  if (!Array.isArray(data.segments) || data.segments.some(segment => !segment.role || !segment.startedAt || !segment.endedAt)) throw new Error("Backup data is invalid");
  return data.segments;
}
