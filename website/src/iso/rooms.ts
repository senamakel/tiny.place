/**
 * The four built-in room types.
 *
 * Every room is expressed as data — a tile matrix plus furniture placements —
 * and wrapped in a thin {@link BaseRoom} subclass. Walls are authored only on
 * the back (north + west) edges so the camera looks into an open interior, the
 * classic isometric room read.
 */

import { BaseRoom } from "./BaseRoom";
import type { TextureFactory } from "./textures";
import {
	TileCode,
	type Facing,
	type FurnitureConfig,
	type InteractionPoint,
	type RoomDefinition,
	type RoomPalette,
} from "./types";

// ---- Matrix authoring helpers ----------------------------------------------

function floorGrid(columns: number, rows: number): Array<Array<TileCode>> {
	const matrix: Array<Array<TileCode>> = [];
	for (let row = 0; row < rows; row++) {
		matrix.push(new Array<TileCode>(columns).fill(TileCode.Floor));
	}
	return matrix;
}

function addBackWalls(matrix: Array<Array<TileCode>>): void {
	for (let column = 0; column < (matrix[0]?.length ?? 0); column++) {
		matrix[0]![column] = TileCode.Wall;
	}
	for (let row = 0; row < matrix.length; row++) {
		matrix[row]![0] = TileCode.Wall;
	}
}

function fillRectangle(
	matrix: Array<Array<TileCode>>,
	tileX: number,
	tileY: number,
	width: number,
	height: number,
	code: TileCode
): void {
	for (let row = tileY; row < tileY + height; row++) {
		for (let column = tileX; column < tileX + width; column++) {
			if (matrix[row]?.[column] !== undefined) {
				matrix[row]![column] = code;
			}
		}
	}
}

function putTile(
	matrix: Array<Array<TileCode>>,
	tileX: number,
	tileY: number,
	code: TileCode
): void {
	const row = matrix[tileY];
	if (row && row[tileX] !== undefined) {
		row[tileX] = code;
	}
}

function chair(
	tileX: number,
	tileY: number,
	facing: Facing,
	level = 0,
	tint?: number
): FurnitureConfig {
	const station: InteractionPoint = {
		tileOffsetX: 0,
		tileOffsetY: 0,
		action: "sit",
		facing,
		seatDropY: 6,
	};
	return {
		kind: "chair",
		tileX,
		tileY,
		level,
		tint,
		interactionPoints: [station],
	};
}

// ---- Palettes ---------------------------------------------------------------

const POKER_PALETTE: RoomPalette = {
	background: 0x0c1810,
	floorTop: 0x356046,
	floorSide: 0x244432,
	wall: 0x4a3526,
	dais: 0x3c5a44,
	accent: 0x34d399,
};

const COURT_PALETTE: RoomPalette = {
	background: 0x15121c,
	floorTop: 0xcdc7ba,
	floorSide: 0x9c9788,
	wall: 0x4a3326,
	dais: 0x7c5e46,
	accent: 0xa78bfa,
};

const OFFICE_PALETTE: RoomPalette = {
	background: 0x121620,
	floorTop: 0x8f98a6,
	floorSide: 0x6a727f,
	wall: 0x5b6270,
	dais: 0x768091,
	accent: 0x60a5fa,
};

const HOME_PALETTE: RoomPalette = {
	background: 0x1a1320,
	floorTop: 0xb98a63,
	floorSide: 0x8f6a49,
	wall: 0x9a8f7a,
	dais: 0xb98a63,
	accent: 0xfbbf24,
};

const OUTSIDE_PALETTE: RoomPalette = {
	background: 0x223047,
	floorTop: 0x5f9450,
	floorSide: 0x3f6e35,
	wall: 0x6b7280,
	dais: 0x7a8a6a,
	accent: 0x7fc8a9,
};

// ---- Poker table room -------------------------------------------------------

function pokerDefinition(): RoomDefinition {
	const matrix = floorGrid(12, 11);
	addBackWalls(matrix);
	const furniture: Array<FurnitureConfig> = [
		{ kind: "pokerTable", tileX: 5, tileY: 4 },
		// Eight seats facing inward toward the felt.
		chair(5, 3, "right"),
		chair(7, 3, "left"),
		chair(5, 6, "right"),
		chair(7, 6, "left"),
		chair(4, 4, "right"),
		chair(4, 5, "right"),
		chair(8, 4, "left"),
		chair(8, 5, "left"),
		// A little bar with stools in front of the counter.
		{ kind: "barCounter", tileX: 2, tileY: 8 },
		{ kind: "stool", tileX: 2, tileY: 9 },
		{ kind: "stool", tileX: 3, tileY: 9 },
		{ kind: "stool", tileX: 4, tileY: 9 },
		{ kind: "lamp", tileX: 1, tileY: 1 },
		{ kind: "fern", tileX: 10, tileY: 1 },
		{ kind: "trophy", tileX: 1, tileY: 9 },
		{ kind: "plant", tileX: 10, tileY: 9 },
	];
	return {
		key: "poker",
		name: "Poker Table",
		description:
			"A felt table ringed with eight seats for a full table of agents.",
		matrix,
		palette: POKER_PALETTE,
		furniture,
		spawnTile: { x: 6, y: 9 },
	};
}

// ---- Court house ------------------------------------------------------------

function courtDefinition(): RoomDefinition {
	const matrix = floorGrid(12, 14);
	addBackWalls(matrix);
	// Raised dais tier across the top-centre for the bench.
	fillRectangle(matrix, 3, 1, 6, 2, TileCode.Dais);
	const furniture: Array<FurnitureConfig> = [
		{ kind: "judgeBench", tileX: 5, tileY: 1, level: 1 },
		chair(4, 1, "right", 1),
		{ kind: "witnessStand", tileX: 8, tileY: 2, level: 1 },
		// Counsel tables facing the bench.
		{ kind: "courtTable", tileX: 3, tileY: 9 },
		chair(3, 10, "right"),
		chair(4, 10, "right"),
		{ kind: "courtTable", tileX: 7, tileY: 9 },
		chair(7, 10, "left"),
		chair(8, 10, "left"),
		// Jury box along the west wall.
		chair(1, 4, "right"),
		chair(1, 5, "right"),
		chair(1, 6, "right"),
		chair(2, 4, "right"),
		chair(2, 5, "right"),
		chair(2, 6, "right"),
		// Public gallery at the back.
		chair(3, 12, "right"),
		chair(4, 12, "right"),
		chair(7, 12, "left"),
		chair(8, 12, "left"),
		{ kind: "painting", tileX: 10, tileY: 1 },
		{ kind: "crate", tileX: 9, tileY: 6 },
		{ kind: "lamp", tileX: 1, tileY: 12 },
		{ kind: "fern", tileX: 10, tileY: 12 },
	];
	return {
		key: "court",
		name: "Court House",
		description:
			"A raised judge's bench, a jury box, counsel tables and a public gallery.",
		matrix,
		palette: COURT_PALETTE,
		furniture,
		spawnTile: { x: 6, y: 12 },
	};
}

// ---- Office -----------------------------------------------------------------

function officeDefinition(): RoomDefinition {
	const matrix = floorGrid(13, 12);
	addBackWalls(matrix);
	// Cubicle partition walls.
	const partitions: Array<[number, number]> = [
		[4, 2],
		[4, 3],
		[8, 2],
		[8, 3],
		[4, 6],
		[4, 7],
		[8, 6],
		[8, 7],
	];
	for (const [column, row] of partitions) {
		putTile(matrix, column, row, TileCode.Partition);
	}
	const furniture: Array<FurnitureConfig> = [
		// Top row of cubicles.
		{ kind: "desk", tileX: 1, tileY: 2 },
		chair(1, 3, "right", 0, 0x556070),
		{ kind: "desk", tileX: 5, tileY: 2 },
		chair(5, 3, "right", 0, 0x556070),
		{ kind: "desk", tileX: 9, tileY: 2 },
		chair(9, 3, "right", 0, 0x556070),
		// Bottom row of cubicles.
		{ kind: "desk", tileX: 1, tileY: 6 },
		chair(1, 7, "right", 0, 0x556070),
		{ kind: "desk", tileX: 5, tileY: 6 },
		chair(5, 7, "right", 0, 0x556070),
		{ kind: "desk", tileX: 9, tileY: 6 },
		chair(9, 7, "right", 0, 0x556070),
		{
			kind: "whiteboard",
			tileX: 11,
			tileY: 1,
			interactionPoints: [
				{ tileOffsetX: 0, tileOffsetY: 1, action: "inspect", facing: "left" },
			],
		},
		{ kind: "bookshelf", tileX: 12, tileY: 4 },
		{ kind: "bookshelf", tileX: 12, tileY: 5 },
		{ kind: "plant", tileX: 3, tileY: 10 },
		{ kind: "plant", tileX: 10, tileY: 10 },
		{ kind: "lamp", tileX: 12, tileY: 9 },
		{ kind: "crate", tileX: 12, tileY: 10 },
		{ kind: "fern", tileX: 11, tileY: 10 },
		{ kind: "painting", tileX: 1, tileY: 1 },
	];
	return {
		key: "office",
		name: "Office",
		description:
			"Cubicle desks, a whiteboard and bookshelves for heads-down agent work.",
		matrix,
		palette: OFFICE_PALETTE,
		furniture,
		spawnTile: { x: 6, y: 10 },
	};
}

// ---- Home -------------------------------------------------------------------

function homeDefinition(): RoomDefinition {
	const matrix = floorGrid(12, 11);
	addBackWalls(matrix);
	const furniture: Array<FurnitureConfig> = [
		{
			kind: "rug",
			tileX: 3,
			tileY: 4,
			footprintWidth: 4,
			footprintHeight: 3,
			tint: 0x7a4f5e,
		},
		{ kind: "tvStand", tileX: 4, tileY: 2 },
		{ kind: "couch", tileX: 4, tileY: 6, tint: 0x4a6ea0 },
		{ kind: "coffeeTable", tileX: 5, tileY: 4 },
		chair(7, 4, "left", 0, 0x8a5a6a),
		{ kind: "bed", tileX: 9, tileY: 7 },
		{ kind: "bookshelf", tileX: 1, tileY: 2 },
		{ kind: "bookshelf", tileX: 1, tileY: 3 },
		{ kind: "door", tileX: 8, tileY: 1 },
		{ kind: "plant", tileX: 10, tileY: 1 },
		{ kind: "plant", tileX: 2, tileY: 9 },
		{ kind: "lamp", tileX: 2, tileY: 6 },
		{ kind: "fern", tileX: 10, tileY: 9 },
		{ kind: "painting", tileX: 6, tileY: 1 },
		{ kind: "stool", tileX: 7, tileY: 6 },
	];
	return {
		key: "home",
		name: "Home",
		description: "A cosy lounge with couches, a rug, a bed and a custom door.",
		matrix,
		palette: HOME_PALETTE,
		furniture,
		spawnTile: { x: 6, y: 9 },
	};
}

// ---- Outside world ----------------------------------------------------------

function outsideDefinition(): RoomDefinition {
	const size = 22;
	const matrix = floorGrid(size, size); // grass everywhere to start
	// Sidewalks flanking the central cross of streets...
	fillRectangle(matrix, 0, 9, size, 1, TileCode.Pavement);
	fillRectangle(matrix, 0, 12, size, 1, TileCode.Pavement);
	fillRectangle(matrix, 9, 0, 1, size, TileCode.Pavement);
	fillRectangle(matrix, 12, 0, 1, size, TileCode.Pavement);
	// ...and the asphalt roads (laid last so they cross the sidewalks cleanly).
	fillRectangle(matrix, 0, 10, size, 2, TileCode.Road);
	fillRectangle(matrix, 10, 0, 2, size, TileCode.Road);

	const prop = (
		kind: string,
		tileX: number,
		tileY: number
	): FurnitureConfig => ({
		kind,
		tileX,
		tileY,
	});
	const car = (
		tileX: number,
		tileY: number,
		tint: number
	): FurnitureConfig => ({
		kind: "car",
		tileX,
		tileY,
		tint,
	});

	const furniture: Array<FurnitureConfig> = [
		// North-west block.
		prop("glassTower", 0, 0),
		prop("house", 3, 0),
		prop("shop", 6, 1),
		prop("apartment", 0, 4),
		prop("cafe", 5, 5),
		// North-east block.
		prop("tower", 13, 0),
		prop("house", 16, 0),
		prop("apartment", 19, 1),
		prop("shop", 13, 3),
		prop("cafe", 17, 5),
		prop("house", 13, 6),
		// South-east block.
		prop("house", 13, 13),
		prop("apartment", 17, 13),
		prop("tower", 19, 16),
		prop("shop", 13, 17),
		prop("cafe", 16, 18),
		prop("glassTower", 20, 20),
		// South-west block — a little park.
		prop("house", 0, 13),
		prop("shop", 6, 13),
		prop("fountain", 3, 16),
		chair(3, 18, "right", 0, 0x6b7280),
		chair(4, 18, "left", 0, 0x6b7280),
		prop("fern", 1, 17),
		prop("fern", 6, 17),
		prop("plant", 2, 19),
		prop("plant", 5, 20),
		// Street lamps at the intersection corners and along the sidewalks.
		prop("lamp", 9, 9),
		prop("lamp", 12, 9),
		prop("lamp", 9, 12),
		prop("lamp", 12, 12),
		prop("lamp", 9, 3),
		prop("lamp", 9, 17),
		prop("lamp", 12, 5),
		prop("lamp", 3, 9),
		prop("lamp", 17, 9),
		prop("lamp", 5, 12),
		// Street trees along the sidewalks.
		prop("fern", 9, 5),
		prop("fern", 9, 15),
		prop("fern", 12, 3),
		prop("fern", 12, 17),
		prop("fern", 5, 9),
		prop("fern", 15, 9),
		prop("fern", 7, 12),
		prop("fern", 17, 12),
		// Cars parked along the main street.
		car(2, 10, 0xc0392b),
		car(5, 11, 0x2e86c1),
		car(7, 10, 0x8e44ad),
		car(14, 11, 0x27ae60),
		car(16, 11, 0xd35400),
		car(18, 10, 0xe6b800),
	];

	// Dashed lane markings down the centre of each road (skip the intersection).
	for (let index = 0; index < size; index += 2) {
		if (index < 9 || index > 12) {
			furniture.push(prop("roadDash", index, 10));
			furniture.push(prop("roadDash", 10, index));
		}
	}

	return {
		key: "outside",
		name: "Outside World",
		description:
			"A city block with streets, parked cars, towers and a little park.",
		matrix,
		palette: OUTSIDE_PALETTE,
		furniture,
		spawnTile: { x: 12, y: 8 },
		topMargin: 230,
	};
}

// ---- Concrete room subclasses ----------------------------------------------

export class PokerTableRoom extends BaseRoom {
	public constructor(factory: TextureFactory) {
		super(pokerDefinition(), factory);
	}
}

export class CourtHouseRoom extends BaseRoom {
	public constructor(factory: TextureFactory) {
		super(courtDefinition(), factory);
	}
}

export class OfficeRoom extends BaseRoom {
	public constructor(factory: TextureFactory) {
		super(officeDefinition(), factory);
	}
}

export class HomeRoom extends BaseRoom {
	public constructor(factory: TextureFactory) {
		super(homeDefinition(), factory);
	}
}

export class OutsideWorldRoom extends BaseRoom {
	public constructor(factory: TextureFactory) {
		super(outsideDefinition(), factory);
	}
}

export interface RoomEntry {
	key: string;
	name: string;
	description: string;
	create: (factory: TextureFactory) => BaseRoom;
}

export const ROOM_REGISTRY: Array<RoomEntry> = [
	{
		key: "poker",
		name: "Poker Table",
		description: "Eight seats around a felt table.",
		create: (factory) => new PokerTableRoom(factory),
	},
	{
		key: "court",
		name: "Court House",
		description: "Raised bench, jury box and gallery.",
		create: (factory) => new CourtHouseRoom(factory),
	},
	{
		key: "office",
		name: "Office",
		description: "Cubicles, desks and a whiteboard.",
		create: (factory) => new OfficeRoom(factory),
	},
	{
		key: "home",
		name: "Home",
		description: "A cosy lounge with couches and a rug.",
		create: (factory) => new HomeRoom(factory),
	},
	{
		key: "outside",
		name: "Outside World",
		description: "A large open plaza ringed with buildings.",
		create: (factory) => new OutsideWorldRoom(factory),
	},
];
