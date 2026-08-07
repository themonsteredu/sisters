"use client";

import { useCallback, useState } from "react";

/**
 * Controlled values for a `<form action={serverAction}>`.
 *
 * React 19 resets uncontrolled fields once a form action settles. That is fine
 * after a save, but on a validation failure it wipes everything the user typed —
 * and because the inputs are `required`, the now-empty form silently refuses to
 * submit again. Keeping the values in state makes the reset explicit: we clear
 * on success and preserve on failure.
 */
export function useFields<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);

  const set = useCallback((name: keyof T & string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  }, []);

  const field = useCallback(
    (name: keyof T & string) => ({
      name,
      value: values[name],
      onChange: (event: { target: { value: string } }) => set(name, event.target.value),
    }),
    [values, set],
  );

  const reset = useCallback(() => setValues(initial), [initial]);

  return { values, field, set, reset };
}
