import type { AgeRange } from "../types/client";

export function ageRangeFromBirthDate(value: string, now = new Date()): AgeRange | null {
  if (!value) return null;
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const months = Math.max(
    0,
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
      now.getMonth() -
      birthDate.getMonth() -
      (now.getDate() < birthDate.getDate() ? 1 : 0)
  );
  if (months < 12) return "1-11 months";
  if (months < 24) return "12-23 months";
  const years = Math.floor(months / 12);
  if (years <= 3) return "2-3";
  if (years <= 5) return "4-5";
  if (years <= 8) return "6-8";
  return "9-12";
}
