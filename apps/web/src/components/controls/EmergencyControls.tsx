"use client";

import { useState } from "react";
import { emergencyStop, emergencyReset, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button";
import styles from "./EmergencyControls.module.css";

export function EmergencyControls({
  deviceId,
  isOnline,
  emergencyLatched,
  onChanged,
}: {
  deviceId: string;
  isOnline: boolean;
  emergencyLatched: boolean;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [stopping, setStopping] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleStop() {
    setStopping(true);
    try {
      await emergencyStop(deviceId);
      showToast("Pompa dihentikan.");
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal menghentikan pompa.", "negative");
    } finally {
      setStopping(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await emergencyReset(deviceId, false);
      showToast("Mode emergency direset.");
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal mereset mode emergency.", "negative");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Button variant="emergency" onClick={handleStop} loading={stopping} disabled={!isOnline} fullWidth>
        Hentikan pompa
      </Button>
      {!isOnline && <p className={styles.reason}>Perangkat offline</p>}
      {emergencyLatched && (
        <>
          <p className={styles.latchNotice}>Perangkat sedang dalam mode emergency stop.</p>
          <Button variant="secondary" onClick={handleReset} loading={resetting} fullWidth>
            Reset mode emergency
          </Button>
        </>
      )}
    </div>
  );
}
