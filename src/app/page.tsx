"use client";

import { Download, Moon, RefreshCcw, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createPatient,
  exportPatientsPdf,
  listPatients,
  type Patient,
  type PatientFilters,
  type Sex,
} from "@/lib/patientsApi";
import { useDebounce } from "@/lib/useDebounce";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function todayYmd() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [form, setForm] = useState({
    id_no: "",
    sex: "M" as Sex,
    age: "",
    ww: "",
  });

  const [filters, setFilters] = useState<PatientFilters>({
    id_no: "",
    from_date: todayYmd(),
    to_date: todayYmd(),
  });

  const debouncedFilters = useDebounce(filters, 400);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? (localStorage.getItem("theme") as "light" | "dark" | null)
        : null;
    const next = stored ?? "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const effectiveFilters = useMemo(() => {
    const f: PatientFilters = { ...debouncedFilters };
    const from = f.from_date?.trim();
    const to = f.to_date?.trim();
    if ((from && !to) || (!from && to)) {
      // let backend validation handle the edge case; keep as-is
      return f;
    }
    return f;
  }, [debouncedFilters]);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const data = await listPatients(effectiveFilters);
      setPatients(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilters.id_no, effectiveFilters.from_date, effectiveFilters.to_date, effectiveFilters.date]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ageNum = Number(form.age);
      await createPatient({
        id_no: form.id_no.trim(),
        sex: form.sex,
        age: ageNum,
        ww: form.ww,
      });
      setForm((p) => ({ ...p, id_no: "", age: "", ww: "" }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function onExport() {
    setError(null);
    try {
      const blob = await exportPatientsPdf(effectiveFilters);
      const label =
        effectiveFilters.date ??
        (effectiveFilters.from_date && effectiveFilters.to_date
          ? `${effectiveFilters.from_date}_to_${effectiveFilters.to_date}`
          : todayYmd());
      downloadBlob(blob, `surgical-dressing-log-${label}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div className="min-h-full flex-1 bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Surgical Dressing Log
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" /> Light
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" /> Dark
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void onExport()}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-sm text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Add patient
              </div>
              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    ID NO
                  </label>
                  <input
                    value={form.id_no}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, id_no: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                    placeholder="e.g. 106"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Sex
                    </label>
                    <select
                      value={form.sex}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, sex: e.target.value as Sex }))
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Age
                    </label>
                    <input
                      value={form.age}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, age: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                      placeholder="e.g. 55"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    WW (optional)
                  </label>
                  <input
                    value={form.ww}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ww: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                    placeholder="Type / notes"
                  />
                </div>

                <button
                  disabled={submitting}
                  className="w-full rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </form>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Search & filter
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Search by ID NO
                  </label>
                  <input
                    value={filters.id_no ?? ""}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, id_no: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                    placeholder="e.g. 106"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      From
                    </label>
                    <input
                      type="date"
                      value={filters.from_date ?? ""}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, from_date: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      To
                    </label>
                    <input
                      type="date"
                      value={filters.to_date ?? ""}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, to_date: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({ id_no: "", from_date: todayYmd(), to_date: todayYmd() })
                    }
                    className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Patients
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {loading ? "Loading…" : `${patients.length} مريض`}
                </div>
              </div>

              {error ? (
                <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      <th className="sticky top-0 bg-white/95 px-4 py-3 backdrop-blur dark:bg-zinc-900/95">
                        No
                      </th>
                      <th className="sticky top-0 bg-white/95 px-4 py-3 backdrop-blur dark:bg-zinc-900/95">
                        ID NO
                      </th>
                      <th className="sticky top-0 bg-white/95 px-4 py-3 backdrop-blur dark:bg-zinc-900/95">
                        Sex
                      </th>
                      <th className="sticky top-0 bg-white/95 px-4 py-3 backdrop-blur dark:bg-zinc-900/95">
                        Age
                      </th>
                      <th className="sticky top-0 bg-white/95 px-4 py-3 backdrop-blur dark:bg-zinc-900/95">
                        WW
                      </th>
                      <th className="sticky top-0 bg-white/95 px-4 py-3 backdrop-blur dark:bg-zinc-900/95">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {patients.map((p, idx) => {
                      const dt = new Date(p.created_at);
                      const time = isNaN(dt.getTime())
                        ? ""
                        : dt.toLocaleString(undefined, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                      return (
                        <tr
                          key={p.id}
                          className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-4 py-3 align-top text-zinc-500 dark:text-zinc-400">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 align-top font-medium">
                            {p.id_no}
                          </td>
                          <td className="px-4 py-3 align-top">{p.sex}</td>
                          <td className="px-4 py-3 align-top">{p.age}</td>
                          <td className="px-4 py-3 align-top text-zinc-700 dark:text-zinc-200">
                            {p.ww ?? ""}
                          </td>
                          <td className="px-4 py-3 align-top text-zinc-500 dark:text-zinc-400">
                            {time}
                          </td>
                        </tr>
                      );
                    })}

                    {!loading && patients.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          No rows found for the current filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
