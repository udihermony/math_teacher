"use client";

import { Coins } from "lucide-react";

interface CoinDisplayProps {
  amount: number;
  earned?: number;
  size?: "sm" | "md";
}

export function CoinDisplay({ amount, earned, size = "md" }: CoinDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Coins
        size={size === "sm" ? 14 : 18}
        className="text-amber-500"
      />
      <span className={`font-bold text-amber-600 ${size === "sm" ? "text-sm" : "text-lg"}`}>
        {amount}
      </span>
      {earned !== undefined && earned > 0 && (
        <span className="animate-bounce text-xs font-medium text-green-600">
          +{earned}
        </span>
      )}
    </div>
  );
}
