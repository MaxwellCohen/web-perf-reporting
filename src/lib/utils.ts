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
