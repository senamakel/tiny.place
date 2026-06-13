import type { ComponentType } from "react";

import { AdminMock } from "./AdminMock";
import { ApiReferenceMock } from "./ApiReferenceMock";
import { ArtifactsMock } from "./ArtifactsMock";
import { BroadcastsMock } from "./BroadcastsMock";
import { CensorshipResistanceMock } from "./CensorshipResistanceMock";
import { CommunicationMock } from "./CommunicationMock";
import { ConstitutionMock } from "./ConstitutionMock";
import { DirectoryMock } from "./DirectoryMock";
import { EscrowMock } from "./EscrowMock";
import { EventsMock } from "./EventsMock";
import { ExplorerMock } from "./ExplorerMock";
import { GroupsMock } from "./GroupsMock";
import { IdentitiesMock } from "./IdentitiesMock";
import { InboxMock } from "./InboxMock";
import { LeaderboardsMock } from "./LeaderboardsMock";
import { LedgerMock } from "./LedgerMock";
import { MarketplaceMock } from "./MarketplaceMock";
import { MessagingMock } from "./MessagingMock";
import { ModerationMock } from "./ModerationMock";
import { PaymentsMock } from "./PaymentsMock";
import { PokerMock } from "./PokerMock";
import { PricingMock } from "./PricingMock";
import { ProfilesMock } from "./ProfilesMock";
import { ReputationMock } from "./ReputationMock";
import { RoomsMock } from "./RoomsMock";
import { SearchMock } from "./SearchMock";
import { SecurityMock } from "./SecurityMock";
import { SignersMock } from "./SignersMock";
import { StatsMock } from "./StatsMock";
import { TermsMock } from "./TermsMock";

type MockProps = {
	isDark: boolean;
};

export const sectionComponents: Record<string, ComponentType<MockProps>> = {
	admin: AdminMock,
	api: ApiReferenceMock,
	artifacts: ArtifactsMock,
	broadcasts: BroadcastsMock,
	channels: MessagingMock,
	"censorship-resistance": CensorshipResistanceMock,
	constitution: ConstitutionMock,
	directory: DirectoryMock,
	escrow: EscrowMock,
	events: EventsMock,
	explorer: ExplorerMock,
	groups: GroupsMock,
	identities: IdentitiesMock,
	inbox: InboxMock,
	leaderboards: LeaderboardsMock,
	ledger: LedgerMock,
	marketplace: MarketplaceMock,
	messaging: CommunicationMock,
	moderation: ModerationMock,
	payments: PaymentsMock,
	poker: PokerMock,
	pricing: PricingMock,
	profiles: ProfilesMock,
	reputation: ReputationMock,
	rooms: RoomsMock,
	search: SearchMock,
	security: SecurityMock,
	signers: SignersMock,
	stats: StatsMock,
	terms: TermsMock,
};
