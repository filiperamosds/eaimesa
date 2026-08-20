"use client";

import { formatBrlMasked, formatBrlTyping, formatPhoneInput, reaisToCents } from "@eaimesa/shared";
import { useEffect, useState, type InputHTMLAttributes } from "react";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

export function PhoneField({
  value,
  onValueChange,
  className = "field",
  ...rest
}: FieldProps & {
  value: string;
  onValueChange: (masked: string) => void;
}) {
  return (
    <input
      {...rest}
      className={className}
      type="tel"
      inputMode="tel"
      autoComplete={rest.autoComplete ?? "tel"}
      placeholder={rest.placeholder ?? "(11) 98888-7777"}
      maxLength={15}
      value={value}
      onChange={(e) => onValueChange(formatPhoneInput(e.target.value))}
    />
  );
}

export function MoneyField({
  cents,
  onCentsChange,
  className = "field",
  ...rest
}: FieldProps & {
  cents: number | null;
  onCentsChange: (cents: number | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => (cents == null ? "" : formatBrlMasked(cents)));

  useEffect(() => {
    if (!focused) setText(cents == null ? "" : formatBrlMasked(cents));
  }, [cents, focused]);

  function commit(next: string) {
    setText(next);
    if (!next.trim()) {
      onCentsChange(null);
      return;
    }
    const parsed = reaisToCents(next);
    if (parsed !== null) onCentsChange(parsed);
  }

  return (
    <input
      {...rest}
      className={className}
      inputMode="decimal"
      autoComplete="off"
      placeholder={rest.placeholder ?? "R$ 0,00"}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => commit(formatBrlTyping(e.target.value))}
      onBlur={() => {
        setFocused(false);
        if (!text.trim()) {
          onCentsChange(null);
          setText("");
          return;
        }
        const parsed = reaisToCents(text);
        if (parsed !== null) {
          onCentsChange(parsed);
          setText(formatBrlMasked(parsed));
        }
      }}
    />
  );
}
