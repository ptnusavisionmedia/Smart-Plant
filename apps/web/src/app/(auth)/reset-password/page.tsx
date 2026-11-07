"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword, ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "../auth.module.css";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Tautan reset tidak valid. Minta tautan baru.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className={styles.title}>Kata sandi diperbarui</h1>
        <p className={styles.formSuccess}>Kata sandi Anda telah diperbarui. Silakan masuk dengan kata sandi baru.</p>
        <Button fullWidth onClick={() => router.replace("/login")}>
          Ke halaman masuk
        </Button>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className={styles.title}>Atur ulang kata sandi</h1>
        <p className={styles.subtitle}>Masukkan kata sandi baru Anda.</p>
      </div>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      {!token && (
        <p className={styles.formError} role="alert">
          Token reset tidak ditemukan pada tautan ini.
        </p>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Kata sandi baru"
          type="password"
          autoComplete="new-password"
          required
          helperText="Minimal 8 karakter."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Konfirmasi kata sandi"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" loading={loading} fullWidth>
          Simpan kata sandi baru
        </Button>
      </form>
      <p className={styles.footer}>
        <Link className={styles.link} href="/login">
          Kembali ke halaman masuk
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
