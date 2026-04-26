import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function categoryIcon(category: string): string {
  const icons: Record<string, string> = {
    refrigerator: "🧊",
    washing_machine: "🫧",
    dryer: "♨️",
    dishwasher: "🍽️",
    oven: "🔥",
    microwave: "📡",
    air_conditioner: "❄️",
    vacuum: "🌀",
    water_heater: "💧",
    hvac: "🌬️",
    other: "⚙️",
  };
  return icons[category] ?? "⚙️";
}

export function categoryLabel(category: string): string {
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function docTypeLabel(docType: string): string {
  const labels: Record<string, string> = {
    manual: "Owner's Manual",
    parts_diagram: "Parts Diagram",
    spec_sheet: "Spec Sheet",
    recall_notice: "Recall Notice",
    video: "Tutorial Video",
    guide: "Guide",
  };
  return labels[docType] ?? docType;
}
