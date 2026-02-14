"use client";

interface DramaVoteButtonsProps {
  likeCount: number;
  dislikeCount: number;
  currentVote: "like" | "dislike" | null;
  onVote: (voteType: "like" | "dislike") => void;
  size?: "sm" | "md";
}

export default function DramaVoteButtons({
  likeCount,
  dislikeCount,
  currentVote,
  onVote,
  size = "md",
}: DramaVoteButtonsProps) {
  const iconSize = size === "sm" ? 14 : 18;
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const padding = size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5";

  return (
    <div className="flex items-center gap-1">
      {/* Like button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVote("like");
        }}
        className={`flex items-center gap-1 rounded-lg ${padding} transition-colors ${
          currentVote === "like"
            ? "bg-kick/20 text-kick"
            : "text-muted-foreground hover:bg-surface-hover hover:text-kick"
        }`}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={currentVote === "like" ? "currentColor" : "none"}
        >
          <path
            d="M7 22V11l5-9 1.5 1L12 8h9l-2 14H7zm-4 0V11h4v11H3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={`${textSize} font-medium`}>{likeCount}</span>
      </button>

      {/* Dislike button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVote("dislike");
        }}
        className={`flex items-center gap-1 rounded-lg ${padding} transition-colors ${
          currentVote === "dislike"
            ? "bg-red-500/20 text-red-400"
            : "text-muted-foreground hover:bg-surface-hover hover:text-red-400"
        }`}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={currentVote === "dislike" ? "currentColor" : "none"}
          className="rotate-180"
        >
          <path
            d="M7 22V11l5-9 1.5 1L12 8h9l-2 14H7zm-4 0V11h4v11H3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={`${textSize} font-medium`}>{dislikeCount}</span>
      </button>
    </div>
  );
}
