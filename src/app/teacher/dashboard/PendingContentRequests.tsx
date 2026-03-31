"use client";

import Link from "next/link";
import { BellRing, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ContentRequestItem {
  id: string;
  type: string;
  label: string;
  classId: string;
  className: string;
  requestedBy: string;
  requestedAt: string;
  targetLabel: string;
  href: string;
}

export function PendingContentRequests({
  requests,
}: {
  requests: ContentRequestItem[];
}) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <BellRing size={16} className="text-amber-500" />
        <h2 className="font-semibold">Missing Content Requests</h2>
      </div>

      <div className="space-y-2">
        {requests.map((request) => (
          <Link
            key={request.id}
            href={request.href}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-secondary/40"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {request.label}: {request.targetLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {request.className} · requested by {request.requestedBy}
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
