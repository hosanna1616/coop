"use client";

import { Target, CheckCircle, Clock, Trophy } from "lucide-react";

type DailyChallengeData = {
  id: string;
  title: string;
  description: string;
  targetType: string;
  targetValue: number;
  currentValue: number;
  xpReward: number;
  completed: boolean;
  completedAt: string | null;
};

type DailyChallengesProps = {
  challenges: DailyChallengeData[];
};

export function DailyChallenges({ challenges }: DailyChallengesProps) {
  const completedCount = challenges.filter((c) => c.completed).length;
  const totalCount = challenges.length;
  const allCompleted = completedCount === totalCount && totalCount === 3;

  const getProgressPercentage = (challenge: DailyChallengeData) => {
    return Math.min(
      (challenge.currentValue / challenge.targetValue) * 100,
      100,
    );
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (challenges.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No Challenges Yet
          </h3>
          <p className="text-sm text-gray-600">
            Complete actions to generate daily challenges!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 shadow-sm border border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-blue-600" />
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Daily Challenges
            </h3>
            <p className="text-sm text-gray-600">
              {completedCount}/{totalCount} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-mono font-bold text-blue-600">
            {getTimeRemaining()}
          </span>
        </div>
      </div>

      {allCompleted && (
        <div className="mb-6 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-lg p-4 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-600 animate-bounce" />
          <h4 className="text-lg font-bold text-yellow-900">
            🎉 All Challenges Complete!
          </h4>
          <p className="text-sm text-yellow-800">
            Amazing! Come back tomorrow for new challenges!
          </p>
        </div>
      )}

      <div className="space-y-4">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-all ${
              challenge.completed
                ? "border-green-400 bg-green-50"
                : "border-blue-200"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {challenge.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Target className="w-5 h-5 text-blue-600" />
                  )}
                  <h4 className="font-bold text-gray-900">{challenge.title}</h4>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  {challenge.description}
                </p>
              </div>

              <div className="ml-4 flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-bold text-yellow-700">
                  +{challenge.xpReward} XP
                </span>
              </div>
            </div>

            <div className="ml-7">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {challenge.currentValue}/{challenge.targetValue}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    challenge.completed
                      ? "bg-gradient-to-r from-green-500 to-green-600"
                      : "bg-gradient-to-r from-blue-500 to-blue-600"
                  }`}
                  style={{ width: `${getProgressPercentage(challenge)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm font-bold text-blue-600">
            {completedCount}/{totalCount} (
            {Math.round((completedCount / totalCount) * 100)}%)
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
