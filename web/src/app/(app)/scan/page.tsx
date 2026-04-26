"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, ArrowRight, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { UploadZone } from "@/components/scan/upload-zone";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiScanPhoto } from "@/lib/api/client";
import { useCreateDevice, useHouseholds, useCreateHousehold } from "@/hooks/use-devices";
import type { ScanResult } from "@/lib/api/types";
import { categoryLabel } from "@/lib/utils";

export default function ScanPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Form state for device creation
  const [brand, setBrand] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [category, setCategory] = useState("other");
  const [nickname, setNickname] = useState("");
  const [room, setRoom] = useState("");
  const [householdId, setHouseholdId] = useState("");

  const { data: householdsData, isLoading: loadingHouseholds } = useHouseholds();
  const createDevice = useCreateDevice();
  const createHousehold = useCreateHousehold();

  const households = householdsData?.households ?? [];

  const handleFile = async (f: File, pv: string) => {
    setFile(f);
    setPreview(pv);
    setResult(null);
    setScanning(true);

    try {
      const res = await apiScanPhoto(f);
      if (res.success && res.result) {
        const r = res.result;
        setResult(r);
        setBrand(r.brand);
        setModelNumber(r.model_number);
        setCategory(r.suggested_category || "other");
      } else {
        toast.error(res.error || "Could not read the label. Please enter details manually.");
      }
    } catch (err) {
      toast.error("Scan failed. Please enter details manually.");
    } finally {
      setScanning(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setBrand("");
    setModelNumber("");
    setSerialNumber("");
    setCategory("other");
    setNickname("");
    setRoom("");
  };

  const ensureHousehold = async (): Promise<string> => {
    if (householdId) return householdId;
    if (households.length > 0) return households[0].id;
    const h = await createHousehold.mutateAsync("My Home");
    return h.id;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelNumber.trim()) {
      toast.error("Model number is required");
      return;
    }

    try {
      const hId = await ensureHousehold();
      const device = await createDevice.mutateAsync({
        household_id: hId,
        brand,
        model_number: modelNumber,
        serial_number: serialNumber || undefined,
        category,
        nickname,
        room,
      });
      toast.success("Appliance added!");
      router.push(`/devices/${device.id}`);
    } catch (err) {
      toast.error("Failed to save appliance");
    }
  };

  const CATEGORIES = [
    "refrigerator", "washing_machine", "dryer", "dishwasher",
    "oven", "microwave", "air_conditioner", "vacuum",
    "water_heater", "hvac", "other",
  ];

  const showForm = !scanning && (result || preview);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Appliance</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Photograph the model/serial number label — AI extracts the details automatically
        </p>
      </div>

      <div className="space-y-6">
        {/* Upload */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center">1</span>
            Upload label photo
          </h2>

          <UploadZone
            onFile={handleFile}
            preview={preview}
            onClear={handleClear}
            disabled={scanning}
          />

          {scanning && (
            <div className="flex items-center gap-3 mt-4 p-3 bg-brand-50 rounded-xl">
              <Spinner />
              <p className="text-sm text-brand-700 font-medium">Scanning label with AI…</p>
            </div>
          )}

          {result && (
            <div className="flex items-start gap-3 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Label scanned successfully</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Confidence: {Math.round(result.confidence * 100)}% · Review &amp; confirm below
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center">2</span>
              Confirm appliance details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Samsung"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  placeholder="e.g. RF28R7351SR"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname (optional)</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Kitchen fridge"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room (optional)</label>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Kitchen"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {households.length > 0 && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Household</label>
                  <select
                    value={householdId}
                    onChange={(e) => setHouseholdId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="">Select household (or auto-create)</option>
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={handleClear}>
                Start over
              </Button>
              <Button
                type="submit"
                loading={createDevice.isPending || createHousehold.isPending}
              >
                Save appliance
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
