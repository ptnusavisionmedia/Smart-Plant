import { createDb, resolveDatabaseFile, backupDatabase } from "@smart-plant/db";

/**
 * One-shot DB backup CLI (T-54), run from `infra/scripts/backup.sh`:
 *   tsx src/tools/backup-db.ts <destFile>
 * Prints the destination path on success so the calling shell script can
 * pick it up for encryption/upload.
 */
async function main() {
  const destFile = process.argv[2];
  if (!destFile) {
    console.error("Usage: tsx src/tools/backup-db.ts <destFile>");
    process.exit(1);
  }

  const { sqlite } = createDb({ file: resolveDatabaseFile() });
  try {
    await backupDatabase(sqlite, destFile);
    console.log(destFile);
  } finally {
    sqlite.close();
  }
}

main().catch((err) => {
  console.error("[backup-db] failed:", err);
  process.exit(1);
});
