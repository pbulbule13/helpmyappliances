import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListDevices,
  apiGetDevice,
  apiCreateDevice,
  apiDeleteDevice,
  apiListHouseholds,
  apiCreateHousehold,
} from "@/lib/api/client";
import type { DeviceCreate } from "@/lib/api/types";

export const DEVICES_KEY = ["devices"] as const;
export const HOUSEHOLDS_KEY = ["households"] as const;

export function useHouseholds() {
  return useQuery({
    queryKey: HOUSEHOLDS_KEY,
    queryFn: apiListHouseholds,
  });
}

export function useDevices(householdId?: string) {
  return useQuery({
    queryKey: [...DEVICES_KEY, householdId],
    queryFn: () => apiListDevices(householdId),
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: [...DEVICES_KEY, id],
    queryFn: () => apiGetDevice(id),
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DeviceCreate) => apiCreateDevice(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}

export function useCreateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiCreateHousehold(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: HOUSEHOLDS_KEY }),
  });
}
