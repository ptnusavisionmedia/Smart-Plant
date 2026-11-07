"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { forgotPassword, ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Format email tidak valid.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
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
        <h1 className={styles.title}>Periksa email Anda</h1>
        <p className={styles.formSuccess}>
          Jika email tersebut terdaftar, tautan reset kata sandi telah dikirim. Tautan berlaku selama 30 menit.
        </p>
        <Link className={styles.link} href="/login">
          Kembali ke halaman masuk
        </Link>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className={styles.title}>Lupa kata sandi</h1>
        <p className={styles.subtitle}>Masukkan email Anda, kami akan mengirimkan tautan reset kata sandi.</p>
      </div>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" loading={loading} fullWidth>
          Kirim tautan reset
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
