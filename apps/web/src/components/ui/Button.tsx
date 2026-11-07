"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "emergency" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading = false, fullWidth = false, disabled, className, children, ...rest }, ref) => {
    const classNames = [styles.button, styles[variant], fullWidth ? styles.fullWidth : "", className]
      .filter(Boolean)
      .join(" ");
    return (
      <button ref={ref} className={classNames} disabled={disabled || loading} {...rest}>
        {loading && <Spinner size={16} inverted={variant === "primary" || variant === "emergency"} />}
        <span>{children}</span>
      </button>
    );
  },
);
Button.displayName = "Button";
