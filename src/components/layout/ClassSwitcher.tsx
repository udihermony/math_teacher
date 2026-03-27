"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

export function ClassSwitcher() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/student/active-class")
      .then((r) => r.json())
      .then((data) => {
        setClasses(data.classes ?? []);
        setActiveClassId(data.activeClassId ?? null);
      });
  }, []);

  if (classes.length < 2) return null;

  const activeClass = classes.find((c) => c.id === activeClassId);

  async function switchClass(classId: string) {
    setOpen(false);
    setActiveClassId(classId);
    await fetch("/api/student/active-class", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    router.refresh();
  }

  return (
    <div className="relative px-3 pb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
      >
        <span className="truncate">{activeClass?.name ?? "Select class"}</span>
        <ChevronDown size={14} className={`ml-1 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-3 right-3 z-10 mt-1 rounded-md border border-border bg-card shadow-md">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => switchClass(c.id)}
              className={`flex w-full px-3 py-1.5 text-left text-sm hover:bg-secondary ${
                c.id === activeClassId ? "font-medium text-primary" : "text-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
