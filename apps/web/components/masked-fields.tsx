"use client";

import { formatBrlMasked, formatPhoneInput, shiftMoneyCents } from "@eaimesa/shared";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

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
  const centsRef = useRef(cents);
  centsRef.current = cents;

  useEffect(() => {
    if (!focused) setText(cents == null ? "" : formatBrlMasked(cents));
  }, [cents, focused]);

  function apply(next: number | null) {
    centsRef.current = next;
    setText(next == null ? "" : formatBrlMasked(next));
    onCentsChange(next);
  }

  return (
    <input
      {...rest}
      className={className}
      inputMode="numeric"
      autoComplete="off"
      placeholder={rest.placeholder ?? "R$ 0,00"}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const inputType = (e.nativeEvent as InputEvent).inputType ?? "";
        apply(shiftMoneyCents(centsRef.current, inputType, e.target.value));
      }}
      onBlur={() => {
        setFocused(false);
        const current = centsRef.current;
        setText(current == null ? "" : formatBrlMasked(current));
      }}
    />
  );
}
