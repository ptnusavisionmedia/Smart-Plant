"use client";

import { useCallback, useState } from "react";
import { startWatering, ApiError } from "@/lib/api-client";
import { describeApiError, WATERING_STATE_LABEL, formatDateTime } from "@/lib/format";
import { useToast } from "@/lib/toast-context";
import { useWsEvent } from "@/lib/ws-context";
import { Button } from "@/components/ui/Button";
import styles from "./WateringControl.module.css";

type WateringState = "running" | "completed" | "stopped" | "rejected" | "timeout" | "pending";

export function WateringControl({
  deviceId,
  isOnline,
  blockedReason,
}: {
  deviceId: string;
  isOnline: boolean;
  blockedReason: string | null;
}) {
  const { showToast } = useToast();
  const [duration, setDuration] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [lastState, setLastState] = useState<WateringState | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  useWsEvent(
    useCallback(
      (event) => {
        if (event.type === "watering" && event.deviceId === deviceId) {
          setLastState(event.state);
          setEndsAt(event.endsAt);
        }
      },
      [deviceId],
    ),
  );

  async function handleWater() {
    setSubmitting(true);
    try {
      const res = await startWatering(deviceId, duration);
      setLastState(res.state as WateringState);
      if (res.accepted) {
        showToast(`Penyiraman ${duration} detik dimulai.`);
      } else {
        showToast(`Perintah siram ${WATERING_STATE_LABEL[res.state] ?? res.state}.`, "negative");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(describeApiError(err.code, err.message), "negative");
      } else {
        showToast("Gagal mengirim perintah siram.", "negative");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !isOnline || Boolean(blockedReason);

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <label className={styles.label} htmlFor="watering-duration">
          Durasi siram (detik)
        </label>
        <input
          id="watering-duration"
          type="number"
          min={1}
          max={60}
          className={styles.durationInput}
          value={duration}
          onChange={(e) => setDuration(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
          disabled={disabled}
        />
      </div>
      <Button onClick={handleWater} loading={submitting} disabled={disabled} fullWidth>
        {`Siram ${duration} detik`}
      </Button>
      {disabled && blockedReason && <p className={styles.reason}>{blockedReason}</p>}
      {disabled && !blockedReason && !isOnline && <p className={styles.reason}>Perangkat offline</p>}
      {lastState && (
        <p className={styles.state}>
          Status terakhir: {WATERING_STATE_LABEL[lastState] ?? lastState}
          {lastState === "running" && endsAt ? ` — berakhir ${formatDateTime(endsAt)}` : ""}
        </p>
      )}
    </div>
  );
}
