"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, errorText, required, id, type, className, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [visible, setVisible] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword && visible ? "text" : type;

    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label} {required && <span className={styles.required}>Wajib</span>}
        </label>
        <div className={styles.inputWrap}>
          <input
            id={inputId}
            ref={ref}
            type={resolvedType}
            className={[styles.input, errorText ? styles.inputError : "", className].filter(Boolean).join(" ")}
            aria-invalid={errorText ? true : undefined}
            aria-describedby={errorText ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {visible ? "Sembunyikan" : "Tampilkan"}
            </button>
          )}
        </div>
        {errorText ? (
          <p id={`${inputId}-error`} className={styles.error}>
            {errorText}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className={styles.helper}>
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
