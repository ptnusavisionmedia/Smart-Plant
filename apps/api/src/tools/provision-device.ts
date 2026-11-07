import { createDb, createRepositories, resolveDatabaseFile } from "@smart-plant/db";
import { createDeviceService } from "../services/device.service.js";

/**
 * One-off provisioning CLI (T-19/T-31 support): creates an unclaimed device
 * row with a pairing claim code and an MQTT secret. Run with:
 *   pnpm --filter @smart-plant/api exec tsx src/tools/provision-device.ts <deviceUid>
 * The printed claimCode is used in the app's "Klaim Perangkat" flow; the
 * mqttSecret is flashed into the firmware (or set in the Wokwi sketch/env).
 */
function main() {
  const deviceUid = process.argv[2];
  if (!deviceUid) {
    console.error("Usage: tsx src/tools/provision-device.ts <deviceUid>");
    process.exit(1);
  }

  const { db, sqlite } = createDb({ file: resolveDatabaseFile() });
  const repos = createRepositories(db);
  const deviceService = createDeviceService(repos);

  const existing = repos.devices.findByDeviceUid(deviceUid);
  if (existing) {
    console.error(`Device ${deviceUid} is already provisioned (id=${existing.id}).`);
    sqlite.close();
    process.exit(1);
  }

  const { device, claimCode, mqttSecret } = deviceService.provisionDevice(deviceUid);

  console.log(JSON.stringify({ deviceId: device.id, deviceUid: device.deviceUid, claimCode, mqttSecret }, null, 2));
  sqlite.close();
}

main();
