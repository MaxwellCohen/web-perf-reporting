import { CruxDate } from "@/lib/scema"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (data?: CruxDate) => {
  if (!data) {
    return ""
  }
  const date = new Date(data.year, data.month - 1, data.day);
  return date.toLocaleDateString()
}

export function formatFormFactor(string: string) {
  return string.replaceAll('_', ' ').toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
}
