"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { DeviceCard } from "@/components/device/device-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDevices, useDeleteDevice, useHouseholds, useCreateHousehold } from "@/hooks/use-devices";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardPage() {
  const { appUser } = useAuth();
  const { data: householdsData, isLoading: loadingHouseholds } = useHouseholds();
  const [selectedHousehold, setSelectedHousehold] = useState<string | undefined>();
  const { data: devicesData, isLoading: loadingDevices, refetch } = useDevices(selectedHousehold);
  const deleteDevice = useDeleteDevice();
  const createHousehold = useCreateHousehold();
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [newName, setNewName] = useState("");

  const households = householdsData?.households ?? [];
  const devices = devicesData?.devices ?? [];

  const handleDelete = async (id: string) => {
    try {
      await deleteDevice.mutateAsync(id);
      toast.success("Appliance removed");
    } catch {
      toast.error("Failed to remove appliance");
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const h = await createHousehold.mutateAsync(newName.trim());
      setSelectedHousehold(h.id);
      setCreatingHousehold(false);
      setNewName("");
      toast.success(`"${h.name}" created`);
    } catch {
      toast.error("Failed to create household");
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const displayName = appUser?.display_name || appUser?.email?.split("@")[0] || "";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {displayName ? `${greeting}, ${displayName}` : "My Appliances"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {devices.length === 0
              ? "No appliances added yet"
              : `${devices.length} appliance${devices.length !== 1 ? "s" : ""} tracked`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Link href="/scan">
            <Button size="sm">
              <Plus size={14} />
              Add Appliance
            </Button>
          </Link>
        </div>
      </div>

      {/* Household selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedHousehold(undefined)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedHousehold
              ? "bg-brand-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
          }`}
        >
          All
        </button>
        {households.map((h) => (
          <button
            key={h.id}
            onClick={() => setSelectedHousehold(h.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedHousehold === h.id
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
            }`}
          >
            {h.name}
          </button>
        ))}
        {!creatingHousehold ? (
          <button
            onClick={() => setCreatingHousehold(true)}
            className="px-3 py-1.5 rounded-full text-sm text-brand-600 border border-dashed border-brand-300 hover:bg-brand-50 transition-colors"
          >
            + New household
          </button>
        ) : (
          <form onSubmit={handleCreateHousehold} className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Household name"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button type="submit" size="sm" loading={createHousehold.isPending}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setCreatingHousehold(false); setNewName(""); }}
            >
              Cancel
            </Button>
          </form>
        )}
      </div>

      {/* Device grid */}
      {loadingDevices || loadingHouseholds ? (
        <div className="flex items-center justify-center h-48">
          <Spinner />
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
            <span className="text-4xl">🏠</span>
          </div>
          <h3 className="font-bold text-gray-800 text-xl">No appliances yet</h3>
          <p className="text-gray-500 text-sm mt-2 mb-6 max-w-xs">
            Photograph your appliance&apos;s model label — AI extracts the model number and finds the manual automatically.
          </p>
          <Link href="/scan">
            <Button>
              <Plus size={16} />
              Add your first appliance
            </Button>
          </Link>
          <p className="text-xs text-gray-400 mt-4">Works with refrigerators, washers, ACs, and more</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
