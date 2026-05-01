/**
 * AgentRoomBase
 * -------------
 * Shared abstract base for cross-scene agent rooms (dating / job / vision-share/ad).
 *
 * Migration note: existing services (agentConversationRoom, negotiationRoom,
 * agentNegotiationService) currently maintain their own room/session state.
 * They should be migrated incrementally to extend `AgentRoomBase`, replacing
 * their bespoke lifecycle/participant/message handling with the unified
 * abstract contract defined here. Until then, this base class is importable
 * but unused by production code paths.
 */

/**
 * Canonical lifecycle states for any agent-driven room.
 *
 *   created -> opened -> in_progress -> completed
 *                                    \-> terminated
 */
export type AgentRoomLifecycleState =
  | 'created'
  | 'opened'
  | 'in_progress'
  | 'completed'
  | 'terminated';

/**
 * Documents the canonical lifecycle transitions every concrete agent room
 * implementation must respect.
 */
export interface AgentRoomLifecycle {
  readonly state: AgentRoomLifecycleState;
  /** Move from `created` -> `opened`. */
  open(): Promise<void>;
  /** Move from `opened` -> `in_progress`. */
  start(): Promise<void>;
  /** Move from `in_progress` -> `completed`. */
  complete(): Promise<void>;
  /** Move from any active state -> `terminated`. */
  terminate(reason?: string): Promise<void>;
}

/**
 * Generic abstract base for agent rooms.
 *
 * @typeParam TParticipant - shape of a participant record (user, agent, etc.)
 * @typeParam TMessage     - shape of a single message exchanged in the room
 * @typeParam TState       - scene-specific room state (phase, counters, ...)
 */
export abstract class AgentRoomBase<TParticipant, TMessage, TState> {
  protected participants: TParticipant[] = [];
  protected state!: TState;
  protected lifecycle: AgentRoomLifecycleState = 'created';

  constructor(
    protected readonly roomId: string,
    initialParticipants: TParticipant[] = []
  ) {
    this.participants = [...initialParticipants];
    this.state = this.initState(this.participants);
  }

  // ---- Abstract scene-specific contract --------------------------------

  /** Build the initial scene-specific state for the given participants. */
  protected abstract initState(participants: TParticipant[]): TState;

  /** Validate a message before it is appended to the room. */
  protected abstract validateMessage(message: TMessage): boolean;

  /** Append a message to the room (after validation/persistence). */
  abstract addMessage(message: TMessage): Promise<void>;

  /** Read the canonical message log for this room. */
  abstract getMessages(): Promise<TMessage[]>;

  /** Terminate the room early (cancellation, timeout, dispute). */
  abstract terminate(reason?: string): Promise<void>;

  /** Advance to the next phase of the room's state machine. */
  abstract advancePhase(): Promise<void>;

  // ---- Concrete shared helpers -----------------------------------------

  /** Add a participant with idempotent semantics. */
  protected addParticipant(p: TParticipant): void {
    if (!this.participants.includes(p)) {
      this.participants.push(p);
    }
  }

  /** Remove a participant if present. */
  protected removeParticipant(p: TParticipant): void {
    const idx = this.participants.indexOf(p);
    if (idx >= 0) this.participants.splice(idx, 1);
  }

  /** Diagnostic hook — concrete services may override to wire to logger. */
  protected logTransition(
    from: AgentRoomLifecycleState,
    to: AgentRoomLifecycleState,
    reason?: string
  ): void {
    // Default: no-op. Override in concrete subclass to emit metrics/logs.
    void from;
    void to;
    void reason;
  }

  /** Guarded lifecycle setter — concrete classes call this when transitioning. */
  protected setLifecycle(next: AgentRoomLifecycleState, reason?: string): void {
    const prev = this.lifecycle;
    this.lifecycle = next;
    this.logTransition(prev, next, reason);
  }

  /** Read-only accessor for the room id. */
  public getRoomId(): string {
    return this.roomId;
  }

  /** Read-only accessor for participants (defensive copy). */
  public getParticipants(): TParticipant[] {
    return [...this.participants];
  }

  /** Read-only accessor for current lifecycle state. */
  public getLifecycleState(): AgentRoomLifecycleState {
    return this.lifecycle;
  }
}
