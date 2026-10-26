import type { CostEstimate, HistoryEntry } from "./types";

/**
 * No token usage is stored anywhere by the bot, so cost is ESTIMATED from message
 * counts + content length. Always surfaced as an estimate, never a billed figure.
 *
 * Haiku 4.5 pricing (USD per 1M tokens). Centralized so it's trivially updatable.
 */
const INPUT_USD_PER_MTOK = 1.0;
const OUTPUT_USD_PER_MTOK = 5.0;

/**
 * Per-turn input is dominated by the resent system prompt (advisor template + profile
 * + ~19 memories) — measured at ~2500 tokens. Plus the recent history window.
 */
const SYSTEM_INPUT_TOKENS_PER_TURN = 2500;
const AVG_INPUT_TOKENS_PER_USER_MSG = 60;
const CHARS_PER_TOKEN = 4;
const FALLBACK_OUTPUT_TOKENS = 220;

function estimateOutputTokens(content: string): number {
  if (content && content.trim()) {
    return Math.ceil(content.length / CHARS_PER_TOKEN);
  }
  return FALLBACK_OUTPUT_TOKENS;
}

export function estimateCost(entries: HistoryEntry[]): CostEstimate {
  let userMsgs = 0;
  let assistantMsgs = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const e of entries) {
    if (e.role === "user") {
      userMsgs++;
      inputTokens += AVG_INPUT_TOKENS_PER_USER_MSG;
    } else {
      assistantMsgs++;
      // each assistant turn implies a full request: system prompt resent + output
      inputTokens += SYSTEM_INPUT_TOKENS_PER_TURN;
      outputTokens += estimateOutputTokens(e.content);
    }
  }

  const estimatedUsd =
    (inputTokens / 1_000_000) * INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * OUTPUT_USD_PER_MTOK;

  return {
    messageCount: entries.length,
    userMsgs,
    assistantMsgs,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedUsd,
    isEstimate: true,
    assumptions: {
      inputUsdPerMTok: INPUT_USD_PER_MTOK,
      outputUsdPerMTok: OUTPUT_USD_PER_MTOK,
      systemTokensPerTurn: SYSTEM_INPUT_TOKENS_PER_TURN,
      avgInputTokensPerUserMsg: AVG_INPUT_TOKENS_PER_USER_MSG,
      charsPerToken: CHARS_PER_TOKEN,
    },
  };
}
