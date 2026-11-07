import { tmpdir } from "node:os";
import { join } from "node:path";

export const E2E_WEB_PORT = 3190;
export const E2E_API_PORT = 3191;
export const E2E_CLAIM_CODE = "SP-E2E1-TEST";
export const E2E_DEVICE_UID = "e2e-seed-device";
export const E2E_DB_FILE = join(tmpdir(), "smart-plant-e2e", "e2e.db");
