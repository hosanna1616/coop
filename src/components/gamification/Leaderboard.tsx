"use client";

import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  streak: number;
  merchants: number;
  leads: number;
  previousRank?: number;
};

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  scope?: "branch" | "company";
};

export function Leaderboard({
  entries,
  currentUserId,
  scope = "branch",
}: LeaderboardProps) {
  const currentUserEntry = entries.find((e) => e.userId === currentUserId);
  const currentUserRank = currentUserEntry?.rank || 0;

  // Show people around the current user
  const getVisibleEntries = () => {
    if (currentUserRank <= 5) {
      return entries.slice(0, 10);
    }

    const startIndex = Math.max(0, currentUserRank - 3);
    const endIndex = Math.min(entries.length, currentUserRank + 7);
    return entries.slice(startIndex, endIndex);
  };

  const visibleEntries = getVisibleEntries();

  const getRankChange = (entry: LeaderboardEntry) => {
    if (!entry.previousRank) return null;
    const change = entry.previousRank - entry.rank;
    if (change > 0) return { direction: "up" as const, value: change };
    if (change < 0)
      return { direction: "down" as const, value: Math.abs(change) };
    return { direction: "same" as const, value: 0 };
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center font-bold text-gray-600">
            {rank}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Leaderboard</h3>
              <p className="text-sm text-gray-600">
                {scope === "branch" ? "Branch" : "Company"} Rankings
              </p>
            </div>
          </div>

          {currentUserEntry && (
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <p className="text-sm text-blue-900 font-semibold">
                Your Rank: #{currentUserRank}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y">
        {visibleEntries.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId;
          const rankChange = getRankChange(entry);

          return (
            <div
              key={entry.userId}
              className={`p-4 transition-all ${
                isCurrentUser
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">{getMedalIcon(entry.rank)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className={`font-bold truncate ${
                        isCurrentUser ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {entry.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    {rankChange && (
                      <div className="flex items-center gap-1">
                        {rankChange.direction === "up" && (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        )}
                        {rankChange.direction === "down" && (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        {rankChange.direction === "same" && (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                        <span
                          className={`text-xs font-semibold ${
                            rankChange.direction === "up"
                              ? "text-green-600"
                              : rankChange.direction === "down"
                                ? "text-red-600"
                                : "text-gray-400"
                          }`}
                        >
                          {rankChange.value > 0 &&
                            rankChange.direction === "up" &&
                            "+"}
                          {rankChange.value > 0 &&
                            rankChange.direction === "down" &&
                            "-"}
                          {rankChange.value}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">
                        ⚡ {entry.xp.toLocaleString()}
                      </span>
                      <span>XP</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">🔥 {entry.streak}</span>
                      <span>day streak</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">
                        🤝 {entry.merchants}
                      </span>
                      <span>merchants</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-500">{entry.leads} leads</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length > 10 && (
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            Showing {visibleEntries.length} of {entries.length} participants
          </p>
        </div>
      )}
    </div>
  );
}
