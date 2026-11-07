import { openai } from "@workspace/integrations-openai-ai-server";
import { answerGatePolicy, gateMessages, gateResponseFormat, type GateJudge } from "./tax-answer-gate";

export const judgeTaxAnswer: GateJudge = async (input, signal) => {
  const result = await openai.chat.completions.create({
    model: answerGatePolicy.model,
    max_completion_tokens: answerGatePolicy.maxCompletionTokens,
    response_format: gateResponseFormat(input),
    messages: gateMessages(input),
  }, { signal, timeout: answerGatePolicy.timeoutMs, maxRetries: 0 });
  if (result.choices[0]?.finish_reason !== "stop") throw new Error("Incomplete semantic verdict");
  return JSON.parse(result.choices[0]?.message?.content ?? "{}") as unknown;
};
