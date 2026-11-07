"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getDevice,
  updateDevice,
  updateDeviceConfig,
  deleteDevice,
  listPlantProfiles,
  ApiError,
} from "@/lib/api-client";
import type { PlantProfile, UpdateDeviceConfigRequest } from "@smart-plant/shared";
import type { DeviceDetail } from "@/lib/types";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge, type DisplayStatus } from "@/components/devices/StatusBadge";
import { MoistureRing } from "@/components/devices/MoistureRing";
import { TankLevel } from "@/components/devices/TankLevel";
import { MetricTile } from "@/components/devices/MetricTile";
import { LiveIndicator } from "@/components/devices/LiveIndicator";
import { WateringControl } from "@/components/controls/WateringControl";
import { EmergencyControls } from "@/components/controls/EmergencyControls";
import { DeviceConfigForm } from "@/components/devices/DeviceConfigForm";
import { useWsEvent } from "@/lib/ws-context";
import { useToast } from "@/lib/toast-context";
import { formatNumber, isWithinLiveWindow, STATUS_REASON_LABEL } from "@/lib/format";
import styles from "./device-detail.module.css";

export default function DeviceDetailPage() {
  return (
    <ProtectedRoute>
      <DeviceDetailContent />
    </ProtectedRoute>
  );
}

function DeviceDetailContent() {
  const params = useParams<{ id: string }>();
  const deviceId = params.id;
  const router = useRouter();
  const { showToast } = useToast();

  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    getDevice(deviceId)
      .then((res) => {
        setDevice(res);
        setNameDraft(res.name);
        setLocationDraft(res.location ?? "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat perangkat."));
  }, [deviceId]);

  useEffect(() => {
    load();
    listPlantProfiles()
      .then((res) => setProfiles(res.items))
      .catch(() => undefined);
  }, [load]);

  useWsEvent(
    useCallback(
      (event) => {
        if (!("deviceId" in event) || event.deviceId !== deviceId) return;
        setDevice((prev) => {
          if (!prev) return prev;
          if (event.type === "reading") return { ...prev, latest: event.data };
          if (event.type === "status") return { ...prev, status: event.status, reasons: event.reasons };
          if (event.type === "device_presence")
            return { ...prev, isOnline: event.online, lastSeenAt: event.lastSeenAt };
          return prev;
        });
      },
      [deviceId],
    ),
  );

  if (error) {
    return <ErrorState body={error} action={<Button onClick={load}>Coba lagi</Button>} />;
  }
  if (!device) {
    return <LoadingState label="Memuat perangkat..." />;
  }

  const deviceName = device.name;
  const displayStatus: DisplayStatus = !device.isOnline ? "OFFLINE" : device.status;
  const isLive = isWithinLiveWindow(device.latest?.ts ?? null, device.config.telemetryIntervalSeconds);
  const blockedReason =
    device.status === "WATER_LOW"
      ? "Tangki air rendah, penyiraman diblokir."
      : device.emergencyLatched
        ? "Perangkat dalam mode emergency stop."
        : null;

  async function handleSaveDetails() {
    setSavingDetails(true);
    try {
      await updateDevice(deviceId, { name: nameDraft.trim(), location: locationDraft.trim() || undefined });
      setEditingName(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal menyimpan perubahan.", "negative");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleSaveConfig(body: UpdateDeviceConfigRequest) {
    await updateDeviceConfig(deviceId, body);
    showToast("Pengaturan perangkat disimpan.");
    load();
  }

  async function handleDelete() {
    if (!window.confirm(`Hapus ikatan perangkat "${deviceName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteDevice(deviceId);
      showToast("Perangkat dihapus.");
      router.replace("/");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal menghapus perangkat.", "negative");
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← Kembali ke ringkasan
      </Link>

      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {editingName ? (
            <div className={styles.editForm}>
              <Input label="Nama" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
              <Input label="Lokasi" value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} />
              <div className={styles.editActions}>
                <Button variant="secondary" onClick={() => setEditingName(false)}>
                  Batal
                </Button>
                <Button onClick={handleSaveDetails} loading={savingDetails}>
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="sp-h1">{device.name}</h1>
              {device.location && <p className={styles.location}>{device.location}</p>}
              <button type="button" className={styles.editLink} onClick={() => setEditingName(true)}>
                Ubah nama &amp; lokasi
              </button>
            </>
          )}
        </div>
        <div className={styles.headerMeta}>
          <StatusBadge status={displayStatus} />
          <LiveIndicator lastSeenAt={device.latest?.ts ?? device.lastSeenAt} isLive={isLive && device.isOnline} />
        </div>
      </div>

      {device.reasons.length > 0 && (
        <ul className={styles.reasons}>
          {device.reasons.map((reason) => (
            <li key={reason}>{STATUS_REASON_LABEL[reason]}</li>
          ))}
        </ul>
      )}

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.heroCard}>
            <MoistureRing value={device.latest?.soilMoisture ?? null} status={device.status} size={120} />
            <div className={styles.metrics}>
              <MetricTile label="Suhu" value={formatNumber(device.latest?.temperature ?? null)} unit="°C" />
              <MetricTile label="Kelembapan udara" value={formatNumber(device.latest?.humidity ?? null)} unit="%" />
              <MetricTile label="Pompa" value={device.latest?.pumpOn ? "Aktif" : "Mati"} />
              <MetricTile label="Mode otomatis" value={device.autoMode ? "Aktif" : "Nonaktif"} />
            </div>
          </div>

          <div className={styles.tankCard}>
            <h3 className="sp-h3">Level air tangki</h3>
            <TankLevel percent={device.latest?.waterLevel ?? null} height={200} />
          </div>

          <Link href={`/devices/${deviceId}/history`} className={styles.historyLink}>
            Lihat riwayat & grafik →
          </Link>
        </div>

        <div className={styles.rail}>
          <div className={styles.card}>
            <h3 className="sp-h3">Siram manual</h3>
            <WateringControl deviceId={deviceId} isOnline={device.isOnline} blockedReason={blockedReason} />
          </div>
          <div className={styles.card}>
            <h3 className="sp-h3">Darurat</h3>
            <EmergencyControls
              deviceId={deviceId}
              isOnline={device.isOnline}
              emergencyLatched={device.emergencyLatched}
              onChanged={load}
            />
          </div>
        </div>
      </div>

      <section className={styles.configSection}>
        <h2 className="sp-h2">Pengaturan ambang batas & penyiraman</h2>
        {profiles.length > 0 && (
          <p className={styles.profileHint}>
            Terapkan profil tanaman dari halaman{" "}
            <Link className={styles.profileLink} href="/profiles">
              Profil tanaman
            </Link>{" "}
            lalu simpan ambang batas di sini.
          </p>
        )}
        <DeviceConfigForm config={device.config} onSave={handleSaveConfig} />
      </section>

      <section className={styles.dangerZone}>
        <h2 className="sp-h2">Hapus perangkat</h2>
        <p className={styles.dangerBody}>
          Menghapus ikatan perangkat akan melepaskan perangkat ini dari akun Anda. Data historis tidak akan
          dihapus secara otomatis.
        </p>
        <Button variant="secondary" onClick={handleDelete} loading={deleting}>
          Hapus ikatan perangkat
        </Button>
      </section>
    </div>
  );
}
