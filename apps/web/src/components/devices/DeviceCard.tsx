"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import type { DeviceSummary } from "@smart-plant/shared";
import { formatNumber, formatRelativeTime, describeApiError } from "@/lib/format";
import { startWatering, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type DisplayStatus } from "./StatusBadge";
import { MoistureRing } from "./MoistureRing";
import { MetricTile } from "./MetricTile";
import styles from "./DeviceCard.module.css";

export function DeviceCard({ device }: { device: DeviceSummary }) {
  const { showToast } = useToast();
  const [watering, setWatering] = useState(false);

  const displayStatus: DisplayStatus = !device.isOnline ? "OFFLINE" : device.status;

  async function handleWater(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWatering(true);
    try {
      const res = await startWatering(device.id, 10);
      showToast(res.accepted ? "Penyiraman 10 detik dimulai." : "Permintaan penyiraman ditolak.");
    } catch (error) {
      if (error instanceof ApiError) {
        showToast(describeApiError(error.code, error.message), "negative");
      } else {
        showToast("Gagal mengirim perintah siram.", "negative");
      }
    } finally {
      setWatering(false);
    }
  }

  return (
    <Link
      href={`/devices/${device.id}`}
      className={[styles.card, !device.isOnline ? styles.offline : ""].filter(Boolean).join(" ")}
    >
      <div className={styles.header}>
        <div>
          <h3 className={styles.name}>{device.name}</h3>
          {device.location && <p className={styles.location}>{device.location}</p>}
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      <div className={styles.body}>
        <MoistureRing value={device.latest?.soilMoisture ?? null} status={device.status} size={72} />
        <div className={styles.metrics}>
          <MetricTile label="Suhu" value={formatNumber(device.latest?.temperature ?? null)} unit="°C" />
          <MetricTile label="Kelembapan udara" value={formatNumber(device.latest?.humidity ?? null)} unit="%" />
          <MetricTile label="Air" value={formatNumber(device.latest?.waterLevel ?? null)} unit="%" />
          <MetricTile label="Pompa" value={device.latest?.pumpOn ? "Aktif" : "Mati"} />
        </div>
      </div>

      <div className={styles.footer}>
        <p className={styles.lastSeen}>
          {device.isOnline ? "Online" : `Terakhir terlihat ${formatRelativeTime(device.lastSeenAt)}`}
        </p>
        <Button
          variant="secondary"
          onClick={handleWater}
          disabled={!device.isOnline || device.emergencyLatched}
          loading={watering}
        >
          Siram
        </Button>
      </div>
    </Link>
  );
}
