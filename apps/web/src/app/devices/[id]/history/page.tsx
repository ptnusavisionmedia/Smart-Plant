"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getReadings, ApiError } from "@/lib/api-client";
import type { ReadingsResponse } from "@smart-plant/shared";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LineChart } from "@/components/charts/LineChart";
import { formatDateTime, formatNumber } from "@/lib/format";
import { toCsv, downloadCsv } from "@/lib/csv";
import styles from "./history.module.css";

type RangeOption = "24h" | "7d" | "30d";

const RANGE_CONFIG: Record<RangeOption, { label: string; interval: "raw" | "hour" | "day"; days: number }> = {
  "24h": { label: "24 jam", interval: "raw", days: 1 },
  "7d": { label: "7 hari", interval: "hour", days: 7 },
  "30d": { label: "30 hari", interval: "day", days: 30 },
};

export default function DeviceHistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}

function HistoryContent() {
  const params = useParams<{ id: string }>();
  const deviceId = params.id;
  const [range, setRange] = useState<RangeOption>("24h");
  const [data, setData] = useState<ReadingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    const config = RANGE_CONFIG[range];
    const to = new Date();
    const from = new Date(to.getTime() - config.days * 24 * 60 * 60 * 1000);
    getReadings(deviceId, { interval: config.interval, from: from.toISOString(), to: to.toISOString() })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat riwayat."));
  }, [deviceId, range]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const chartPoints = useMemo(() => {
    if (!data) return null;
    const labelFormatter = (iso: string) =>
      new Date(iso).toLocaleString("id-ID", range === "24h" ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" });
    return {
      soil: data.points.map((p) => ({ label: labelFormatter(p.bucket), value: p.soilMoisture })),
      temp: data.points.map((p) => ({ label: labelFormatter(p.bucket), value: p.temperature })),
      humidity: data.points.map((p) => ({ label: labelFormatter(p.bucket), value: p.humidity })),
      water: data.points.map((p) => ({ label: labelFormatter(p.bucket), value: p.waterLevel })),
    };
  }, [data, range]);

  const summary = useMemo(() => {
    if (!data || data.points.length < 2) return null;
    const soilValues = data.points.map((p) => p.soilMoisture).filter((v): v is number => v !== null);
    if (soilValues.length < 2) return null;
    const first = soilValues[0]!;
    const last = soilValues[soilValues.length - 1]!;
    const delta = Math.round(last - first);
    const direction = delta > 0 ? "naik" : delta < 0 ? "turun" : "stabil";
    return `Kelembapan tanah ${direction} ${Math.abs(delta)}% selama ${RANGE_CONFIG[range].label.toLowerCase()} terakhir.`;
  }, [data, range]);

  function handleExportCsv() {
    if (!data) return;
    const csv = toCsv(
      ["Waktu", "Kelembapan tanah (%)", "Suhu (°C)", "Kelembapan udara (%)", "Level air (%)"],
      data.points.map((p) => [
        formatDateTime(p.bucket),
        p.soilMoisture,
        p.temperature,
        p.humidity,
        p.waterLevel,
      ]),
    );
    downloadCsv(`riwayat-${deviceId}-${range}.csv`, csv);
  }

  return (
    <div className={styles.page}>
      <Link href={`/devices/${deviceId}`} className={styles.backLink}>
        ← Kembali ke detail perangkat
      </Link>

      <div className={styles.header}>
        <h1 className="sp-h1">Riwayat & grafik</h1>
        <div className={styles.headerActions}>
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={(Object.keys(RANGE_CONFIG) as RangeOption[]).map((key) => ({
              value: key,
              label: RANGE_CONFIG[key].label,
            }))}
          />
          <Button variant="secondary" onClick={handleExportCsv} disabled={!data}>
            Unduh CSV
          </Button>
        </div>
      </div>

      {error && <ErrorState body={error} action={<Button onClick={load}>Coba lagi</Button>} />}

      {!data && !error && <LoadingState label="Memuat riwayat..." />}

      {data && chartPoints && (
        <>
          {summary && <p className={styles.summary}>{summary}</p>}

          <div className={styles.charts}>
            <LineChart title="Kelembapan tanah" unit="%" color="var(--sp-chart-soil)" points={chartPoints.soil} />
            <LineChart title="Suhu" unit="°C" color="var(--sp-chart-temperature)" points={chartPoints.temp} />
            <LineChart
              title="Kelembapan udara"
              unit="%"
              color="var(--sp-chart-humidity)"
              points={chartPoints.humidity}
            />
            <LineChart title="Level air" unit="%" color="var(--sp-chart-water)" points={chartPoints.water} />
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th className={styles.numeric}>Tanah (%)</th>
                  <th className={styles.numeric}>Suhu (°C)</th>
                  <th className={styles.numeric}>Udara (%)</th>
                  <th className={styles.numeric}>Air (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.points.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyCell}>
                      Tidak ada data pada rentang ini.
                    </td>
                  </tr>
                ) : (
                  data.points.map((p) => (
                    <tr key={p.bucket}>
                      <td>{formatDateTime(p.bucket)}</td>
                      <td className={`sp-tabular ${styles.numeric}`}>{formatNumber(p.soilMoisture)}</td>
                      <td className={`sp-tabular ${styles.numeric}`}>{formatNumber(p.temperature)}</td>
                      <td className={`sp-tabular ${styles.numeric}`}>{formatNumber(p.humidity)}</td>
                      <td className={`sp-tabular ${styles.numeric}`}>{formatNumber(p.waterLevel)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
