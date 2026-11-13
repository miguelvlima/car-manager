"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { STATUS_FILTER_NONE } from "@/lib/vehicle-status";

type FilterField =
  | { type: "search"; name: string; placeholder?: string; className?: string }
  | { type: "month"; name: string }
  | {
      type: "select";
      name: string;
      emptyLabel: string;
      options: Array<{ value: string; label: string }>;
      className?: string;
    }
  | {
      type: "multiselect";
      name: string;
      emptyLabel: string;
      emptyValue?: string;
      options: Array<{ value: string; label: string }>;
      className?: string;
    };

const MULTISELECT_DEBOUNCE_MS = 120;

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
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queued = useRef<Record<string, string>>({});
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  function snapshot() {
    const values: Record<string, string> = { ...defaults };
    const params = searchParamsRef.current;
    for (const key of preserve) {
      const value = params.get(key);
      if (value) values[key] = value;
    }
    for (const field of fields) {
      const value = params.get(field.name);
      if (value) values[field.name] = value;
    }
    return values;
  }

  function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const patch = queued.current;
    queued.current = {};
    const next = { ...snapshot(), ...patch };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    const now = `${pathname}${searchParamsRef.current.toString() ? `?${searchParamsRef.current.toString()}` : ""}`;
    if (href === now) return;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function push(patch: Record<string, string>, debounceMs = 0) {
    queued.current = { ...queued.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    if (debounceMs <= 0) {
      flush();
      return;
    }
    timer.current = setTimeout(flush, debounceMs);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

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
        if (field.type === "multiselect") {
          return (
            <MultiSelect
              key={field.name}
              emptyLabel={field.emptyLabel}
              emptyValue={field.emptyValue}
              options={field.options}
              value={fieldValue(field.name)}
              className={field.className}
              onCommit={(value, immediate) =>
                push({ [field.name]: value }, immediate ? 0 : MULTISELECT_DEBOUNCE_MS)
              }
              onClose={flush}
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

function parseCsv(value: string) {
  if (!value || value === STATUS_FILTER_NONE) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function MultiSelect({
  emptyLabel,
  emptyValue,
  options,
  value,
  className,
  onCommit,
  onClose,
}: {
  emptyLabel: string;
  emptyValue?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  className?: string;
  onCommit: (value: string, immediate?: boolean) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => parseCsv(value));
  const root = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const wasOpen = useRef(false);
  const selectedSet = new Set(selected);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) setSelected(parseCsv(value));
  }, [value, open]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (wasOpen.current && !open) onCloseRef.current();
    wasOpen.current = open;
  }, [open]);

  function apply(next: string[], immediate = false) {
    setSelected(next);
    onCommit(next.length ? next.join(",") : (emptyValue ?? ""), immediate);
  }

  function toggle(id: string) {
    apply(selectedSet.has(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <div ref={root} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-muted-foreground">{emptyLabel}</span>
        <span className="text-xs text-muted-foreground">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div
          className="absolute z-50 mt-1 max-h-72 w-full min-w-[18rem] overflow-auto rounded-xl border border-border bg-card p-2 shadow-lg"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 mb-1 grid grid-cols-2 gap-1 border-b border-border bg-card pb-2">
            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-muted"
              onClick={() => apply(options.map((option) => option.value), true)}
            >
              Escolher todos
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-muted"
              onClick={() => apply([], true)}
            >
              Remover todos
            </button>
          </div>
          {options.map((option) => {
            const checked = selectedSet.has(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="size-4 accent-primary"
                />
                {option.label}
              </label>
            );
          })}
          {selected.length ? null : (
            <p className="px-2 py-1 text-xs text-muted-foreground">A lista mostra só os estados selecionados.</p>
          )}
        </div>
      ) : null}
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
