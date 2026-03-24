"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Users, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

interface ClassData {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  myRole: string;
  createdAt: string;
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    const res = await fetch("/api/classes");
    if (res.ok) {
      const data = await res.json();
      setClasses(data.classes);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  async function createClass() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      setShowCreate(false);
      fetchClasses();
    }
    setCreating(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Classes</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} className="mr-1" />
          Create Class
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">New Class</h2>
          <div className="flex gap-2">
            <Input
              label=""
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Class name (e.g., Year 10 Maths)"
              onKeyDown={(e) => e.key === "Enter" && createClass()}
            />
            <Button onClick={createClass} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </Card>
      )}

      {classes.length === 0 ? (
        <p className="text-muted-foreground">
          No classes yet. Create one to get started!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
              <Card className="transition-colors hover:border-primary">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{cls.name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users size={14} />
                      <span>{cls.memberCount} members</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      copyCode(cls.code);
                    }}
                    className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs font-mono hover:bg-secondary/80"
                    title="Copy join code"
                  >
                    {copiedCode === cls.code ? (
                      <><Check size={12} /> Copied</>
                    ) : (
                      <><Copy size={12} /> {cls.code}</>
                    )}
                  </button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
