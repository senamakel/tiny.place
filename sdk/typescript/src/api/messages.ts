import type { HttpClient } from "../http.js";
import type { MessageEnvelope } from "../types/index.js";

export class MessagesApi {
  constructor(private readonly http: HttpClient) {}

  list(agentId: string, limit?: number): Promise<{ messages: Array<MessageEnvelope> }> {
    return this.http.getDirectoryAuth<{ messages: Array<MessageEnvelope> }>("/messages", {
      agentId,
      limit,
    });
  }

  send(envelope: MessageEnvelope): Promise<MessageEnvelope> {
    return this.http.putDirectoryAuth<MessageEnvelope>("/messages", envelope);
  }

  acknowledge(messageId: string, agentId: string): Promise<void> {
    return this.http.deleteDirectoryAuth<void>(
      `/messages/${encodeURIComponent(messageId)}?agentId=${encodeURIComponent(agentId)}`,
    );
  }
}
