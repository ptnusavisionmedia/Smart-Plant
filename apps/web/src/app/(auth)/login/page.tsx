"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Email wajib diisi.");
      return;
    }
    if (!password) {
      setError("Kata sandi wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div>
        <h1 className={styles.title}>Masuk</h1>
        <p className={styles.subtitle}>Masuk untuk memantau tanaman Anda.</p>
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
        <Input
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={loading} fullWidth>
          Masuk
        </Button>
      </form>
      <p className={styles.footer}>
        <Link className={styles.link} href="/forgot-password">
          Lupa kata sandi?
        </Link>
      </p>
      <p className={styles.footer}>
        Belum punya akun?{" "}
        <Link className={styles.link} href="/register">
          Daftar
        </Link>
      </p>
    </>
  );
}
