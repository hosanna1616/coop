"use client";

import { useState } from "react";
import { Sparkles, Gift, X } from "lucide-react";
import { handleRevealScratchCard } from "@/app/actions/gamification";

type ScratchCardData = {
  id: string;
  rewardType: string;
  rewardValue: number;
  revealed: boolean;
  expiresAt: string;
};

type ScratchCardComponentProps = {
  card: ScratchCardData;
  onReveal: () => void;
};

export function ScratchCard({ card, onReveal }: ScratchCardComponentProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealed, setRevealed] = useState(card.revealed);
  const [reward, setReward] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReveal = async () => {
    setIsRevealing(true);
    setError(null);

    try {
      const result = await handleRevealScratchCard(card.id);
      if (result.success && result.reward) {
        setReward(result.reward);
        setRevealed(true);
        onReveal();
      } else {
        setError(result.error || "Failed to reveal card");
      }
    } catch (err) {
      setError("Error revealing card");
    } finally {
      setIsRevealing(false);
    }
  };

  const getRewardIcon = () => {
    switch (card.rewardType) {
      case "XP":
        return "⚡";
      case "FREEZE_SHIELD":
        return "🛡️";
      case "POWER_UP":
        return "⚡";
      case "RAFFLE_TICKET":
        return "🎟️";
      default:
        return "🎁";
    }
  };

  const getRewardLabel = () => {
    switch (card.rewardType) {
      case "XP":
        return `${card.rewardValue} XP`;
      case "FREEZE_SHIELD":
        return "Freeze Shield";
      case "POWER_UP":
        return `${card.rewardValue}min Double XP`;
      case "RAFFLE_TICKET":
        return "Weekly Raffle Ticket";
      default:
        return `${card.rewardValue} ${card.rewardType}`;
    }
  };

  const getTimeRemaining = () => {
    const expires = new Date(card.expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  if (revealed && reward) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 shadow-lg border-2 border-purple-300">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{getRewardIcon()}</div>
          <h3 className="text-2xl font-bold text-purple-900 mb-2">
            Congratulations!
          </h3>
          <div className="bg-white rounded-lg p-4 mb-4 shadow-inner">
            <p className="text-lg font-bold text-purple-700">
              {getRewardLabel()}
            </p>
          </div>
          <p className="text-sm text-purple-600">
            Reward has been added to your account
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-6 shadow-lg border-2 border-purple-300 relative overflow-hidden">
      {isRevealing && (
        <div className="absolute inset-0 bg-purple-900/50 flex items-center justify-center z-10">
          <div className="text-white text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-2 animate-spin" />
            <p className="font-bold">Revealing...</p>
          </div>
        </div>
      )}

      <div className="text-center">
        <Gift className="w-16 h-16 mx-auto mb-4 text-purple-600" />
        <h3 className="text-xl font-bold text-purple-900 mb-2">Scratch Card</h3>
        <p className="text-sm text-purple-700 mb-4">
          Tap to reveal your reward!
        </p>

        <div className="bg-white/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-purple-600">
            ⏰ Expires in: {getTimeRemaining()}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleReveal}
          disabled={isRevealing}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <Sparkles className="w-5 h-5 inline mr-2" />
          Reveal Reward
        </button>
      </div>
    </div>
  );
}

export function ScratchCardList({ cards }: { cards: ScratchCardData[] }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReveal = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const unrevealed = cards.filter((c) => !c.revealed);
  const revealed = cards.filter((c) => c.revealed);

  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="text-center">
          <Gift className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No Scratch Cards
          </h3>
          <p className="text-sm text-gray-600">
            Induct merchants to earn scratch cards with rewards!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unrevealed.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-purple-900 mb-3">
            🎰 Unrevealed Cards ({unrevealed.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unrevealed.map((card) => (
              <ScratchCard key={card.id} card={card} onReveal={handleReveal} />
            ))}
          </div>
        </div>
      )}

      {revealed.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            ✅ Revealed Cards ({revealed.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {revealed.map((card) => (
              <div
                key={card.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="text-3xl mb-2">
                  {getRewardIconForType(card.rewardType)}
                </div>
                <p className="font-semibold text-gray-900">
                  {getRewardLabelForType(card.rewardType, card.rewardValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Revealed</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getRewardIconForType(type: string): string {
  switch (type) {
    case "XP":
      return "⚡";
    case "FREEZE_SHIELD":
      return "🛡️";
    case "POWER_UP":
      return "⚡";
    case "RAFFLE_TICKET":
      return "🎟️";
    default:
      return "🎁";
  }
}

function getRewardLabelForType(type: string, value: number): string {
  switch (type) {
    case "XP":
      return `${value} XP`;
    case "FREEZE_SHIELD":
      return "Freeze Shield";
    case "POWER_UP":
      return `${value}min Double XP`;
    case "RAFFLE_TICKET":
      return "Raffle Ticket";
    default:
      return `${value} ${type}`;
  }
}
