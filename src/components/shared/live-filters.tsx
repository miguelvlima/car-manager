"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type FilterField =
  | { type: "search"; name: string; placeholder?: string; className?: string }
  | { type: "month"; name: string }
  | {
      type: "select";
      name: string;
      emptyLabel: string;
      options: Array<{ value: string; label: string }>;
      className?: string;
    };

export function LiveFilterForm({
  className,
  fields,
  preserve = [],
  defaults = {},
}: {
  className?: string;
  fields: FilterField[];
  preserve?: string[];
  defaults?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function current() {
    const values: Record<string, string> = { ...defaults };
    for (const key of preserve) {
      const value = searchParams.get(key);
      if (value) values[key] = value;
    }
    for (const field of fields) {
      const value = searchParams.get(field.name);
      if (value) values[field.name] = value;
    }
    return values;
  }

  function push(patch: Record<string, string>) {
    const next = { ...current(), ...patch };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    const now = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (href === now) return;
    router.replace(href, { scroll: false });
  }

  function fieldValue(name: string) {
    return searchParams.get(name) ?? defaults[name] ?? "";
  }

  return (
    <div className={className}>
      {fields.map((field) => {
        if (field.type === "search") {
          return (
            <DebouncedSearch
              key={field.name}
              name={field.name}
              placeholder={field.placeholder}
              className={field.className}
              value={fieldValue(field.name)}
              onCommit={(value) => push({ [field.name]: value })}
            />
          );
        }
        if (field.type === "month") {
          return (
            <input
              key={field.name}
              type="month"
              value={fieldValue(field.name)}
              onChange={(event) => push({ [field.name]: event.target.value })}
              className="h-10 rounded-lg border border-border px-3 text-sm"
            />
          );
        }
        return (
          <select
            key={field.name}
            value={fieldValue(field.name)}
            onChange={(event) => push({ [field.name]: event.target.value })}
            className={field.className ?? "h-10 rounded-lg border border-border px-3 text-sm"}
          >
            <option value="">{field.emptyLabel}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
}

function DebouncedSearch({
  name,
  placeholder,
  className,
  value,
  onCommit,
}: {
  name: string;
  placeholder?: string;
  className?: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <input
      name={name}
      value={text}
      placeholder={placeholder}
      className={className ?? "h-10 rounded-lg border border-border px-3 text-sm"}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => onCommit(next), 280);
      }}
    />
  );
}
