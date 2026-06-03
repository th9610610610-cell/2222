"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

export function Card({
  children,
  gradient = false,
  className = "",
}: {
  children: ReactNode;
  gradient?: boolean;
  className?: string;
}) {
  const baseClass = gradient ? "card-gradient" : "card";
  return <div className={`${baseClass} ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const variants = { primary: "btn-primary", secondary: "btn-secondary", danger: "btn-danger" };
  const sizes = { sm: "px-4 py-2 text-sm", md: "px-6 py-3", lg: "px-8 py-4 text-lg" };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${variants[variant]} ${sizes[size]} ${className} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {loading && <div className="spinner w-4 h-4" />}
      {children}
    </button>
  );
}

export function Badge({
  label,
  status = "info",
}: {
  label: string;
  status?: "success" | "warning" | "danger" | "info";
}) {
  const statusClass = { success: "badge-success", warning: "badge-warning", danger: "badge-danger", info: "badge-info" };
  return <span className={`${statusClass[status]}`}>{label}</span>;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-darkCard border border-purple-500/20 rounded-2xl max-w-md w-full animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/10">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-purple-500/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {actions && <div className="px-6 pb-6 flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  error,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input-field ${error ? "border-red-500 focus:border-red-500" : ""}`}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        <option value="">Select an option...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  format = "text",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  format?: "currency" | "number" | "text";
}) {
  const formatted =
    format === "currency"
      ? `৳${Number(value).toLocaleString()}`
      : format === "number"
        ? Number(value).toLocaleString()
        : value;

  return (
    <Card className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center text-xl">{icon}</div>
      <div className="flex-1">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white">{formatted}</p>
      </div>
    </Card>
  );
}

export function Alert({
  type = "info",
  message,
  onClose,
}: {
  type?: "info" | "success" | "warning" | "error";
  message: string;
  onClose?: () => void;
}) {
  const typeStyles = {
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${typeStyles[type]}`}>
      <div className="flex-1 text-sm">{message}</div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:opacity-70">
          <X size={16} />
        </button>
      )}
    </div>
  );
}