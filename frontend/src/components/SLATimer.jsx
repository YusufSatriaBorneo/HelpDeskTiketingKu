import React, { useState, useEffect } from "react";

export default function SLATimer({ ticket }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isBreached: false,
  });

  useEffect(() => {
    // Jika status HOLD, timer dibekukan
    if (ticket.status === "HOLD" || ticket.status === "RESOLVED") {
      return;
    }

    const interval = setInterval(() => {
      // Hitung target deadline sesungguhnya dengan memperhitungkan totalPausedMin
      const createdAt = new Date(ticket.createdAt).getTime();
      const totalPausedMs = (ticket.totalPausedMin || 0) * 60 * 1000;
      const slaDurationMs = ticket.slaMinutes * 60 * 1000;
      const realDeadline = createdAt + slaDurationMs + totalPausedMs;

      const now = new Date().getTime();
      const difference = realDeadline - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isBreached: true });
        clearInterval(interval);
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ hours, minutes, seconds, isBreached: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket]);

  // Render Indikator Visual Berdasarkan Status
  if (ticket.status === "HOLD") {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
        SLA Dihentikan (On Hold)
      </div>
    );
  }

  // Tambahkan pengecekan ini di bagian atas render / komponen SLATimer.jsx Anda
  if (ticket.status === "RESOLVED") {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${ticket.isSlaBreached ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${ticket.isSlaBreached ? "bg-red-600" : "bg-emerald-600"}`}
        ></span>
        {ticket.isSlaBreached
          ? "SLA Tidak Terpenuhi ❌ (Overdue)"
          : "SLA Terpenuhi ✅"}
        {ticket.resolvedAt && (
          <span className="ml-2 text-gray-500 font-normal">
            (Selesai pada:{" "}
            {new Date(ticket.resolvedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            )
          </span>
        )}
      </div>
    );
  }

  if (timeLeft.isBreached) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-300">
        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
        ⚠️ SLA Terlewat (Overdue)
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-medium border border-emerald-200">
      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
      <span>Sisa Waktu:</span>
      <strong className="font-mono text-sm">
        {String(timeLeft.hours).padStart(2, "0")}h :{" "}
        {String(timeLeft.minutes).padStart(2, "0")}m :{" "}
        {String(timeLeft.seconds).padStart(2, "0")}s
      </strong>
    </div>
  );
}
