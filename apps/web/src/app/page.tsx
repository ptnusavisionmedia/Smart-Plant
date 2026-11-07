"use client";

import { useCallback, useEffect, useState } from "react";
import type { DeviceSummary } from "@smart-plant/shared";
import { listDevices, ApiError } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { ClaimDeviceDialog } from "@/components/devices/ClaimDeviceDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useWsEvent } from "@/lib/ws-context";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const [devices, setDevices] = useState<DeviceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);

  const load = useCallback(() => {
    setError(null);
    listDevices()
      .then((res) => setDevices(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat perangkat."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useWsEvent(
    useCallback((event) => {
      setDevices((prev) => {
        if (!prev) return prev;
        if (event.type === "reading") {
          return prev.map((d) => (d.id === event.deviceId ? { ...d, latest: event.data } : d));
        }
        if (event.type === "status") {
          return prev.map((d) =>
            d.id === event.deviceId ? { ...d, status: event.status, reasons: event.reasons } : d,
          );
        }
        if (event.type === "device_presence") {
          return prev.map((d) =>
            d.id === event.deviceId ? { ...d, isOnline: event.online, lastSeenAt: event.lastSeenAt } : d,
          );
        }
        return prev;
      });
    }, []),
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className="sp-h1">Ringkasan</h1>
          <p className={styles.subtitle}>Status dan pembacaan terbaru seluruh perangkat Anda.</p>
        </div>
        <Button onClick={() => setClaimOpen(true)}>Klaim perangkat</Button>
      </div>

      {devices === null && !error && <LoadingState label="Memuat perangkat..." />}

      {error && (
        <ErrorState body={error} action={<Button onClick={load}>Coba lagi</Button>} />
      )}

      {devices !== null && devices.length === 0 && !error && (
        <EmptyState
          title="Belum ada perangkat"
          body="Klaim perangkat pertama Anda untuk mulai memantau tanaman."
          action={<Button onClick={() => setClaimOpen(true)}>Klaim perangkat pertama Anda</Button>}
        />
      )}

      {devices !== null && devices.length > 0 && (
        <div className={styles.grid}>
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}

      <ClaimDeviceDialog open={claimOpen} onClose={() => setClaimOpen(false)} onClaimed={load} />
    </div>
  );
}
