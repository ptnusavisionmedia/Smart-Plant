"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { PlantProfile } from "@smart-plant/shared";
import { claimDevice, listPlantProfiles, ApiError } from "@/lib/api-client";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "./ClaimDeviceDialog.module.css";

export function ClaimDeviceDialog({
  open,
  onClose,
  onClaimed,
}: {
  open: boolean;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const [claimCode, setClaimCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [plantProfileId, setPlantProfileId] = useState("");
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    listPlantProfiles()
      .then((res) => setProfiles(res.items))
      .catch(() => undefined);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!claimCode.trim() || !name.trim()) {
      setError("Kode klaim dan nama perangkat wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await claimDevice({
        claimCode: claimCode.trim(),
        name: name.trim(),
        location: location.trim() || undefined,
        plantProfileId: plantProfileId || undefined,
      });
      setClaimCode("");
      setName("");
      setLocation("");
      setPlantProfileId("");
      onClaimed();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Klaim perangkat">
      {error && <p className={styles.error}>{error}</p>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Kode klaim"
          required
          placeholder="SP-7F3K-92QD"
          value={claimCode}
          onChange={(e) => setClaimCode(e.target.value)}
          helperText="Kode klaim tercetak pada perangkat atau kemasannya."
        />
        <Input
          label="Nama tanaman / perangkat"
          required
          placeholder="Monstera Ruang Tamu"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Lokasi"
          placeholder="Ruang Tamu"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="plant-profile">
            Profil tanaman
          </label>
          <select
            id="plant-profile"
            className={styles.select}
            value={plantProfileId}
            onChange={(e) => setPlantProfileId(e.target.value)}
          >
            <option value="">Gunakan default sistem</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
                {profile.isSystem ? "" : " (kustom)"}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={loading}>
            Klaim perangkat
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
