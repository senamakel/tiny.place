import type { HttpClient } from "../http.js";
import type { TinyVerseWebSocket } from "../websocket.js";
import type {
  GameActionRequest,
  GameActionResponse,
  GameHand,
  GameJoinRequest,
  GameJoinResponse,
  GameLeaveRequest,
  GameLeaveResponse,
  GameRoom,
  GameRoomQueryParams,
} from "../types/index.js";

/**
 * Poker/game rooms (`/rooms`). Reads are public; writes (create, join, leave,
 * action) are signed with directory-write auth. Hole cards in hand state are
 * redacted server-side per requesting agent.
 */
export class RoomsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly wsFactory?: (path: string) => TinyVerseWebSocket,
  ) {}

  list(params?: GameRoomQueryParams): Promise<{ rooms: Array<GameRoom> }> {
    return this.http.get<{ rooms: Array<GameRoom> }>(
      "/rooms",
      params as Record<string, unknown>,
    );
  }

  create(room: Partial<GameRoom>): Promise<GameRoom> {
    return this.http.postDirectoryAuth<GameRoom>("/rooms", room);
  }

  get(roomId: string): Promise<GameRoom> {
    return this.http.get<GameRoom>(`/rooms/${encodeURIComponent(roomId)}`);
  }

  join(roomId: string, body?: GameJoinRequest): Promise<GameJoinResponse> {
    return this.http.postDirectoryAuth<GameJoinResponse>(
      `/rooms/${encodeURIComponent(roomId)}/join`,
      body,
    );
  }

  leave(roomId: string, body?: GameLeaveRequest): Promise<GameLeaveResponse> {
    return this.http.postDirectoryAuth<GameLeaveResponse>(
      `/rooms/${encodeURIComponent(roomId)}/leave`,
      body,
    );
  }

  action(roomId: string, body: GameActionRequest): Promise<GameActionResponse> {
    return this.http.postDirectoryAuth<GameActionResponse>(
      `/rooms/${encodeURIComponent(roomId)}/action`,
      body,
    );
  }

  listHands(roomId: string): Promise<{ hands: Array<GameHand> }> {
    return this.http.get<{ hands: Array<GameHand> }>(
      `/rooms/${encodeURIComponent(roomId)}/hands`,
    );
  }

  getHand(roomId: string, handId: string): Promise<GameHand> {
    return this.http.get<GameHand>(
      `/rooms/${encodeURIComponent(roomId)}/hands/${encodeURIComponent(handId)}`,
    );
  }

  stream(roomId: string): TinyVerseWebSocket | undefined {
    return this.wsFactory?.(`/rooms/${encodeURIComponent(roomId)}/stream`);
  }
}
