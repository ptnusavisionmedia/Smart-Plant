"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Nama minimal 2 karakter.";
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Format email tidak valid.";
    if (password.length < 8) errors.password = "Kata sandi minimal 8 karakter.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ name: name.trim(), email, password });
      setDone(true);
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

  if (done) {
    return (
      <>
        <h1 className={styles.title}>Pendaftaran berhasil</h1>
        <p className={styles.formSuccess}>
          Akun Anda telah dibuat. Periksa email Anda untuk tautan verifikasi, lalu masuk dengan akun baru Anda.
        </p>
        <Button fullWidth onClick={() => router.replace("/login")}>
          Ke halaman masuk
        </Button>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className={styles.title}>Buat akun</h1>
        <p className={styles.subtitle}>Daftar untuk mulai memantau tanaman Anda.</p>
      </div>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Nama"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          errorText={fieldErrors.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          errorText={fieldErrors.email}
        />
        <Input
          label="Kata sandi"
          type="password"
          autoComplete="new-password"
          required
          helperText="Minimal 8 karakter."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          errorText={fieldErrors.password}
        />
        <Button type="submit" loading={loading} fullWidth>
          Daftar
        </Button>
      </form>
      <p className={styles.footer}>
        Sudah punya akun?{" "}
        <Link className={styles.link} href="/login">
          Masuk
        </Link>
      </p>
    </>
  );
}
