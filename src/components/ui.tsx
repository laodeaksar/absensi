"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { CircleAlert, X } from "lucide-react";

// ---------- Field dengan pesan error inline ----------
export function FieldWrap({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">{label}</legend>
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1 mt-1 text-xs text-error">
          <CircleAlert className="size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="label">{hint}</p>
      ) : null}
    </fieldset>
  );
}

type TextProps = { label: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, error, hint, className = "", ...rest }: TextProps) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <input
        {...rest}
        aria-invalid={!!error}
        className={`input w-full ${error ? "input-error" : ""} ${className}`}
      />
    </FieldWrap>
  );
}

type SelectProps = {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, error, hint, children, className = "", ...rest }: SelectProps) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <select
        {...rest}
        aria-invalid={!!error}
        className={`select w-full ${error ? "select-error" : ""} ${className}`}
      >
        {children}
      </select>
    </FieldWrap>
  );
}

// ---------- Modal & konfirmasi ----------
export function Modal({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal modal-open modal-bottom sm:modal-middle no-print" role="dialog" aria-modal="true">
      <div className="modal-box w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button type="button" onClick={onClose} className="btn btn-sm btn-circle btn-ghost" aria-label="Tutup">
            <X className="size-4" />
          </button>
        </div>
        {children}
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

export function ConfirmDialog({
  message,
  onCancel,
  onOk,
}: {
  message: string | null;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      open={message !== null}
      title="Konfirmasi"
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="btn" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={onOk}>
            Lanjutkan
          </button>
        </>
      }
    >
      <p className="whitespace-pre-line">{message}</p>
    </Modal>
  );
}

// ---------- Badge, spinner, tabel ----------
const TONE: Record<string, string> = {
  Hadir: "badge-success",
  Alpa: "badge-error",
  Izin: "badge-info",
  Sakit: "badge-warning",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-soft badge-sm ${TONE[status] ?? "badge-ghost"}`}>{status || "-"}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge badge-soft badge-sm ${active ? "badge-success" : "badge-error"}`}>
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="loading loading-spinner loading-xl text-primary" />
      {label && <p className="text-base-content/70 font-medium">{label}</p>}
    </div>
  );
}

export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center text-base-content/60 p-6">
        {children}
      </td>
    </tr>
  );
}