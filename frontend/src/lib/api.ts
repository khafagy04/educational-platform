export const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const serverApiBase = process.env.API_INTERNAL_URL ?? apiBase;

export type Grade = { id: string; name: string; slug: string };
export type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  accessDurationDays?: number;
  grade?: { id: string; name: string };
  subject?: { id: string; name: string };
  modules?: { id: string; title: string; lessons: { id: string; title: string; type: string }[] }[];
};

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${serverApiBase}${path}`, { next: { revalidate: 60 } });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
