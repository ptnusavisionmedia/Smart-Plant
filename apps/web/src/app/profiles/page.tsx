"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlantProfile } from "@smart-plant/shared";
import {
  listPlantProfiles,
  createPlantProfile,
  updatePlantProfile,
  deletePlantProfile,
  ApiError,
} from "@/lib/api-client";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { PlantProfileForm } from "@/components/profiles/PlantProfileForm";
import { useToast } from "@/lib/toast-context";
import styles from "./profiles.module.css";

export default function PlantProfilesPage() {
  return (
    <ProtectedRoute>
      <ProfilesContent />
    </ProtectedRoute>
  );
}

function ProfilesContent() {
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<PlantProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PlantProfile | null>(null);

  const load = useCallback(() => {
    setError(null);
    listPlantProfiles()
      .then((res) => setProfiles(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat profil tanaman."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(profile: PlantProfile) {
    if (!window.confirm(`Hapus profil "${profile.name}"?`)) return;
    try {
      await deletePlantProfile(profile.id);
      showToast("Profil tanaman dihapus.");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal menghapus profil.", "negative");
    }
  }

  if (error) {
    return <ErrorState body={error} action={<Button onClick={load}>Coba lagi</Button>} />;
  }
  if (!profiles) {
    return <LoadingState label="Memuat profil tanaman..." />;
  }

  const systemProfiles = profiles.filter((p) => p.isSystem);
  const customProfiles = profiles.filter((p) => !p.isSystem);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className="sp-h1">Profil tanaman</h1>
          <p className={styles.subtitle}>
            Gunakan profil siap pakai atau buat profil kustom dengan ambang batas Anda sendiri. Terapkan profil
            saat mengklaim perangkat atau mengubah pengaturan perangkat.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Buat profil kustom</Button>
      </div>

      <section className={styles.section}>
        <h2 className="sp-h3">Profil sistem</h2>
        <div className={styles.grid}>
          {systemProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} readOnly />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="sp-h3">Profil kustom Anda</h2>
        {customProfiles.length === 0 ? (
          <p className={styles.subtitle}>Belum ada profil kustom.</p>
        ) : (
          <div className={styles.grid}>
            {customProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => setEditing(profile)}
                onDelete={() => handleDelete(profile)}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Buat profil kustom">
        <PlantProfileForm
          submitLabel="Buat profil"
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (name, thresholds) => {
            await createPlantProfile({ name, thresholds });
            showToast("Profil tanaman dibuat.");
            setCreateOpen(false);
            load();
          }}
        />
      </Dialog>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title="Ubah profil">
        {editing && (
          <PlantProfileForm
            submitLabel="Simpan perubahan"
            initialName={editing.name}
            initialThresholds={editing.thresholds}
            onCancel={() => setEditing(null)}
            onSubmit={async (name, thresholds) => {
              await updatePlantProfile(editing.id, { name, thresholds });
              showToast("Profil tanaman diperbarui.");
              setEditing(null);
              load();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function ProfileCard({
  profile,
  readOnly,
  onEdit,
  onDelete,
}: {
  profile: PlantProfile;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{profile.name}</h3>
        {readOnly && <span className={styles.readOnlyBadge}>Sistem</span>}
      </div>
      <dl className={styles.thresholdList}>
        <div>
          <dt>Tanah</dt>
          <dd>
            {profile.thresholds.soil.warningLow}–{profile.thresholds.soil.warningHigh}%
          </dd>
        </div>
        <div>
          <dt>Suhu</dt>
          <dd>
            {profile.thresholds.temp.warningLow}–{profile.thresholds.temp.warningHigh}°C
          </dd>
        </div>
        <div>
          <dt>Udara</dt>
          <dd>
            {profile.thresholds.humidity.warningLow}–{profile.thresholds.humidity.warningHigh}%
          </dd>
        </div>
        <div>
          <dt>Air (kritis)</dt>
          <dd>{profile.thresholds.water.criticalLow}%</dd>
        </div>
      </dl>
      {!readOnly && (
        <div className={styles.cardActions}>
          <Button variant="secondary" onClick={onEdit}>
            Ubah
          </Button>
          <Button variant="secondary" onClick={onDelete}>
            Hapus
          </Button>
        </div>
      )}
    </div>
  );
}
