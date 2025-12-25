

// src/lib/fetcher.ts
export default async function fetcher(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}
