import { useCallback, useState } from "react";

// State form sederhana: nilai + pesan error per field. Error hilang saat field diubah.
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const reset = useCallback((next: T) => {
    setValues(next);
    setErrors({});
  }, []);

  return { values, errors, set, setErrors, reset };
}

// Ambil pesan error pertama per field; kembalikan true jika ada yang salah
export function collectErrors<T extends Record<string, unknown>>(
  checks: Partial<Record<keyof T, string>>,
): { errors: Partial<Record<keyof T, string>>; hasError: boolean } {
  const errors: Partial<Record<keyof T, string>> = {};
  let hasError = false;
  for (const key of Object.keys(checks) as (keyof T)[]) {
    if (checks[key]) {
      errors[key] = checks[key];
      hasError = true;
    }
  }
  return { errors, hasError };
}