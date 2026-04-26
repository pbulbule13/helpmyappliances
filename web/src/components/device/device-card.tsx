import Link from "next/link";
import { Trash2 } from "lucide-react";
import { categoryIcon, categoryLabel, formatDate } from "@/lib/utils";
import type { DeviceResponse } from "@/lib/api/types";

interface DeviceCardProps {
  device: DeviceResponse;
  onDelete?: (id: string) => void;
}

export function DeviceCard({ device, onDelete }: DeviceCardProps) {
  const name = device.nickname || `${device.brand} ${device.model_number}`.trim() || device.model_number;

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-brand-300 transition-all">
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (confirm(`Delete "${name}"?`)) onDelete(device.id);
          }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <Trash2 size={15} />
        </button>
      )}

      <Link href={`/devices/${device.id}`} className="block">
        {/* Icon + category */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">{categoryIcon(device.category)}</span>
          <div className="min-w-0">
            <p className="text-xs text-brand-600 font-medium uppercase tracking-wide">
              {categoryLabel(device.category)}
            </p>
            <h3 className="font-semibold text-gray-900 truncate mt-0.5">{name}</h3>
          </div>
        </div>

        {/* Details */}
        <dl className="space-y-1">
          {device.brand && (
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Brand</dt>
              <dd className="text-gray-900 font-medium">{device.brand}</dd>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Model</dt>
            <dd className="text-gray-900 font-mono text-xs">{device.model_number}</dd>
          </div>
          {device.room && (
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Room</dt>
              <dd className="text-gray-900">{device.room}</dd>
            </div>
          )}
        </dl>

        <p className="text-xs text-gray-400 mt-3">Added {formatDate(device.created_at)}</p>
      </Link>
    </div>
  );
}
