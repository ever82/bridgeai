/**
 * AgentDialogBase
 * ---------------
 * Shared abstract base for agent-driven dialog services (LLM-backed
 * conversation generators used by dating/job/ad/vision-share scenes).
 *
 * Migration note: services such as `agentNegotiationService` and the dating
 * `agentInitiatedChat` currently re-implement prompt/history/metrics plumbing
 * independently. They should be migrated incrementally to extend
 * `AgentDialogBase`, sharing the abstract contract and metric hooks defined
 * here. Until then, this base class is importable but unused.
 */

/**
 * Lightweight metric record emitted by dialog services. Concrete subclasses
 * may extend this shape as needed.
 */
export interface AgentDialogMetric {
  event: string;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  meta?: Record<string, unknown>;
}

/**
 * Generic abstract base for agent dialogs.
 *
 * @typeParam TMessage - shape of a single dialog message
 */
export abstract class AgentDialogBase<TMessage> {
  // ---- Abstract scene-specific contract --------------------------------

  /** Generate the next message given a prompt and optional context. */
  abstract generateMessage(prompt: string, context?: unknown): Promise<TMessage>;

  /** Prune internal history (token-window or retention policy). */
  abstract pruneHistory(): Promise<void>;

  /** Read the dialog history (chronological order). */
  abstract getHistory(): Promise<TMessage[]>;

  // ---- Shared metric hooks (shells; concrete services may override) ----

  /** Hook fired before a generation request — override to start a timer. */
  protected onBeforeGenerate(prompt: string, context?: unknown): void {
    void prompt;
    void context;
  }

  /** Hook fired after a successful generation — override to record metrics. */
  protected onAfterGenerate(message: TMessage, metric?: AgentDialogMetric): void {
    void message;
    void metric;
  }

  /** Hook fired on generation error — override to record failure metrics. */
  protected onGenerateError(error: unknown): void {
    void error;
  }

  /** Generic metric emitter — override to wire to monitoring backend. */
  protected emitMetric(metric: AgentDialogMetric): void {
    void metric;
  }
}
