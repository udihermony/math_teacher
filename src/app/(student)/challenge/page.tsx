"use client";

import { useState, useEffect, useCallback } from "react";
import { Swords, Play, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface ChallengeData {
  id: string;
  status: string;
  difficulty: number;
  problemCount: number;
  timeLimit: number;
  creatorScore: number;
  opponentScore: number;
  creator: { id: string; name: string };
  opponent?: { id: string; name: string } | null;
  createdAt: string;
  completedAt?: string | null;
}

export default function ChallengePage() {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [openChallenges, setOpenChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchChallenges = useCallback(async () => {
    const res = await fetch("/api/challenges");
    if (res.ok) {
      const data = await res.json();
      setChallenges(data.challenges);
      setOpenChallenges(data.openChallenges);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  async function createChallenge() {
    setCreating(true);
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemCount: 5, difficulty: 5, timeLimit: 300 }),
    });
    if (res.ok) {
      fetchChallenges();
    }
    setCreating(false);
  }

  async function joinChallenge(challengeId: string) {
    const res = await fetch(`/api/challenges/${challengeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join" }),
    });
    if (res.ok) {
      fetchChallenges();
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "WAITING": return <Badge variant="warning">Waiting</Badge>;
      case "ACTIVE": return <Badge variant="primary">Active</Badge>;
      case "COMPLETED": return <Badge variant="success">Complete</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Challenge Arena</h1>
        <Button onClick={createChallenge} disabled={creating}>
          <Swords size={16} className="mr-1" />
          {creating ? "Creating..." : "New Challenge"}
        </Button>
      </div>

      {/* Open challenges from friends */}
      {openChallenges.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Join a Challenge</h2>
          <div className="space-y-2">
            {openChallenges.map((c) => (
              <Card key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Swords size={20} className="text-primary" />
                  <div>
                    <p className="font-medium">{c.creator.name}&apos;s Challenge</p>
                    <p className="text-xs text-muted-foreground">
                      {c.problemCount} problems · Difficulty {c.difficulty} ·{" "}
                      <Clock size={10} className="inline" /> {Math.floor(c.timeLimit / 60)}min
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => joinChallenge(c.id)}>
                  <Play size={14} className="mr-1" /> Join
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* My challenges */}
      <h2 className="mb-3 text-lg font-semibold">My Challenges</h2>
      {challenges.length === 0 ? (
        <p className="text-muted-foreground">
          No challenges yet. Create one and invite a friend!
        </p>
      ) : (
        <div className="space-y-2">
          {challenges.map((c) => (
            <Card key={c.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {c.status === "COMPLETED" ? (
                  <Trophy size={20} className="text-amber-500" />
                ) : (
                  <Swords size={20} className="text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {c.creator.name} vs {c.opponent?.name || "???"}
                    </span>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.problemCount} problems · Score: {c.creatorScore} - {c.opponentScore}
                  </p>
                </div>
              </div>
              {c.status === "ACTIVE" && (
                <Button size="sm" variant="primary" onClick={() => window.location.href = `/challenge/${c.id}`}>
                  Play
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
