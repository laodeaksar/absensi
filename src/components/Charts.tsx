"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export function TrendChart({
  labels,
  hadir,
  tidakHadir,
}: {
  labels: string[];
  hadir: number[];
  tidakHadir: number[];
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          { label: "Hadir", data: hadir, backgroundColor: "#3b82f6" },
          { label: "Tidak Hadir", data: tidakHadir, backgroundColor: "#f87171" },
        ],
      }}
      options={{ responsive: true, maintainAspectRatio: true }}
    />
  );
}

export function StatusDoughnut({ values }: { values: [number, number, number, number] }) {
  return (
    <Doughnut
      data={{
        labels: ["Hadir", "Sakit", "Izin", "Alpa"],
        datasets: [{ data: values, backgroundColor: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"] }],
      }}
    />
  );
}