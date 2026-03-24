"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface Friend {
  friendshipId: string;
  user: { id: string; name: string; email: string; studentProfile?: { xp: number; level: number; streak: number } };
  since: string;
}

interface PendingRequest {
  friendshipId: string;
  from?: { id: string; name: string; email: string };
  to?: { id: string; name: string; email: string };
  sentAt: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchFriends = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends);
      setPendingReceived(data.pendingReceived);
      setPendingSent(data.pendingSent);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  async function sendRequest() {
    if (!email.trim()) return;
    setMessage(null);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "success", text: data.message || "Request sent!" });
      setEmail("");
      fetchFriends();
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  async function handleRequest(friendshipId: string, action: "accept" | "decline") {
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    });
    fetchFriends();
  }

  async function removeFriend(friendshipId: string) {
    await fetch(`/api/friends?id=${friendshipId}`, { method: "DELETE" });
    fetchFriends();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Friends</h1>

      {/* Add friend */}
      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Add a Friend</h2>
        <div className="flex gap-2">
          <Input
            label=""
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter friend's email"
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
          />
          <Button onClick={sendRequest} className="shrink-0">
            <UserPlus size={16} className="mr-1" />
            Add
          </Button>
        </div>
        {message && (
          <p className={`mt-2 text-sm ${message.type === "error" ? "text-destructive" : "text-green-600"}`}>
            {message.text}
          </p>
        )}
      </Card>

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Friend Requests</h2>
          <div className="space-y-2">
            {pendingReceived.map((req) => (
              <Card key={req.friendshipId} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{req.from?.name}</p>
                  <p className="text-xs text-muted-foreground">{req.from?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRequest(req.friendshipId, "accept")}>
                    <Check size={14} className="mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRequest(req.friendshipId, "decline")}>
                    <X size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Pending Sent</h2>
          <div className="space-y-2">
            {pendingSent.map((req) => (
              <Card key={req.friendshipId} className="flex items-center justify-between opacity-60">
                <p className="text-sm">{req.to?.name} ({req.to?.email})</p>
                <span className="text-xs text-muted-foreground">Pending</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <h2 className="mb-3 text-lg font-semibold">
        My Friends {friends.length > 0 && `(${friends.length})`}
      </h2>
      {friends.length === 0 ? (
        <p className="text-muted-foreground">
          No friends yet. Add someone by their email above!
        </p>
      ) : (
        <div className="space-y-2">
          {friends.map((f) => (
            <Card key={f.friendshipId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {f.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{f.user.name}</p>
                  {f.user.studentProfile && (
                    <p className="text-xs text-muted-foreground">
                      Level {f.user.studentProfile.level} · {f.user.studentProfile.xp} XP · {f.user.studentProfile.streak} day streak
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeFriend(f.friendshipId)}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                title="Remove friend"
              >
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
