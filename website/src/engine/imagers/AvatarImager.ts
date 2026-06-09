import AvatarInfo, { type Direction, type FigurePart } from "./AvatarInfo";
import AvatarChunk from "./AvatarChunk";
import type { Atlas } from "./Atlas";
import { SPRITES_BASE_URL } from "../constants";

// ── JSON data shape interfaces ──────────────────────────────────────

interface OffsetResourceEntry {
	x: number;
	y: number;
	flipped?: boolean;
}

interface OffsetData {
	atlas: Atlas;
	[resourceName: string]: Atlas | OffsetResourceEntry;
}

interface OffsetEntry {
	promise: Promise<void>;
	data: OffsetData | undefined;
	atlas: HTMLImageElement | undefined;
}

interface ActivePartEntry {
	activePart: Array<string>;
}

interface PartSetsData {
	activePartSet: Record<string, ActivePartEntry>;
	partSet: Record<string, { "flipped-set-type": string }>;
}

interface FigureDataSetPart {
	index: number;
	id: number;
	type: string;
	colorable: boolean;
	colorindex: number;
}

interface FigureDataSet {
	part: Array<FigureDataSetPart>;
	hidden?: Array<string>;
}

interface FigureDataSetType {
	paletteid: string;
	set: Record<string, FigureDataSet>;
}

interface FigureDataPaletteColor {
	color: string;
}

interface FigureDataData {
	settype: Record<string, FigureDataSetType>;
	palette: Record<string, Record<string, FigureDataPaletteColor>>;
}

type FigureMapData = Record<string, Record<number, string>>;

type DrawOrderData = Record<string, Record<number, Array<string>>>;

interface AnimationPartFrame {
	number: number;
}

interface AnimationAction {
	part: Record<string, Array<AnimationPartFrame>>;
}

type AnimationData = Record<string, AnimationAction>;

interface DrawablePart {
	index: number;
	id: number;
	colorable: boolean;
	color?: string;
}

interface ActivePartsMap {
	rect: Array<string> | null;
	head: Array<string> | null;
	eye: Array<string> | null;
	gesture: Array<string> | null;
	speak: Array<string> | null;
	walk: Array<string> | null;
	sit: Array<string> | null;
	itemRight: Array<string> | null;
	handRight: Array<string> | null;
	handLeft: Array<string> | null;
	swim: Array<string> | null;
}

interface SetPartsMap {
	hidden: Array<string>;
	[type: string]: Array<DrawablePart> | Array<string>;
}

// ── Helpers ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result || !result[1] || !result[2] || !result[3]) return null;
	return {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	};
}

function tintSprite(
	image: HTMLCanvasElement | HTMLImageElement,
	color: string,
	alpha: number
): HTMLCanvasElement | null {
	const element = document.createElement("canvas");
	const context = element.getContext("2d");
	if (context == null) return null;

	const rgb = hexToRgb(color);
	if (rgb == null) return null;

	const { width, height } = image;
	element.width = width;
	element.height = height;

	context.drawImage(image, 0, 0);
	const imageData = context.getImageData(0, 0, width, height);
	for (let yIndex = 0; yIndex < height; yIndex++) {
		let position = yIndex * width * 4;
		for (let xIndex = 0; xIndex < width; xIndex++) {
			position++;
			position++;
			position++;
			const pixelAlpha = imageData.data[position++];
			if (pixelAlpha !== 0) {
				imageData.data[position - 1] = alpha;
				imageData.data[position - 2] = Math.round(
					(rgb.b * (imageData.data[position - 2] ?? 0)) / 255
				);
				imageData.data[position - 3] = Math.round(
					(rgb.g * (imageData.data[position - 3] ?? 0)) / 255
				);
				imageData.data[position - 4] = Math.round(
					(rgb.r * (imageData.data[position - 4] ?? 0)) / 255
				);
			}
		}
	}
	context.putImageData(imageData, 0, 0);
	return element;
}

function flipImageCanvas(
	image: HTMLCanvasElement | HTMLImageElement
): HTMLCanvasElement | null {
	const element = document.createElement("canvas");
	const context = element.getContext("2d");
	if (context == null) return null;

	const { width, height } = image;
	element.width = width;
	element.height = height;

	context.save();
	context.scale(-1, 1);
	context.drawImage(image, 0, 0, width * -1, height);
	context.restore();

	return element;
}

function downsampleImage(
	image: HTMLCanvasElement | HTMLImageElement
): HTMLCanvasElement | null {
	const element = document.createElement("canvas");
	const context = element.getContext("2d");
	if (context == null) return null;

	const { width, height } = image;
	element.width = width;
	element.height = height;

	context.save();
	context.scale(0.5, 0.5);
	context.drawImage(image, 0, 0);
	context.restore();

	return element;
}

// ── Main class ──────────────────────────────────────────────────────

export default class AvatarImager {
	public ready: boolean;
	public offsets: Record<string, OffsetEntry>;
	public chunks: Record<string, AvatarChunk>;
	public figuremap: FigureMapData;
	public figuredata: FigureDataData;
	public partsets: PartSetsData;
	public draworder: DrawOrderData;
	public animation: AnimationData;
	public resourcesUrl: string;

	public constructor() {
		this.ready = false;
		this.offsets = {};
		this.chunks = {};
		this.figuremap = {};
		this.figuredata = { settype: {}, palette: {} };
		this.partsets = { activePartSet: {}, partSet: {} };
		this.draworder = {};
		this.animation = {};
		this.resourcesUrl = SPRITES_BASE_URL;
	}

	public initialize(): Promise<void> {
		return Promise.all(this.loadFiles()).then(() => {
			this.ready = true;
		});
	}

	public loadFiles(): Array<Promise<void>> {
		return [
			this.fetchJsonAsync(this.resourcesUrl + "map.json").then((data) => {
				this.figuremap = data as FigureMapData;
			}),
			this.fetchJsonAsync(this.resourcesUrl + "figuredata.json").then(
				(data) => {
					this.figuredata = data as FigureDataData;
				}
			),
			this.fetchJsonAsync(this.resourcesUrl + "partsets.json").then((data) => {
				this.partsets = data as PartSetsData;
			}),
			this.fetchJsonAsync(this.resourcesUrl + "draworder.json").then((data) => {
				this.draworder = data as DrawOrderData;
			}),
			this.fetchJsonAsync(this.resourcesUrl + "animation.json").then((data) => {
				this.animation = data as AnimationData;
			}),
		];
	}

	public fetchJsonAsync(url: string): Promise<unknown> {
		return fetch(url, { method: "GET", mode: "cors", cache: "default" }).then(
			(response) => response.json() as unknown
		);
	}

	public downloadAtlasAsync(uniqueName: string): Promise<HTMLImageElement> {
		const image = new Image();
		const promise: Promise<HTMLImageElement> = new Promise(
			(resolve, reject) => {
				image.onload = (): void => {
					resolve(image);
				};
				image.onerror = (): void => {
					reject(new Error("Could not load image: " + image.src));
				};
			}
		);
		image.crossOrigin = "anonymous";
		image.src = this.resourcesUrl + uniqueName + "/atlas.png";
		return promise;
	}

	public fetchOffsetAsync(uniqueName: string): Promise<void> {
		const entry = this.offsets[uniqueName];
		if (!entry) return Promise.resolve();

		const offsetPromise = this.fetchJsonAsync(
			this.resourcesUrl + uniqueName + "/offset.json"
		).then((data) => {
			const currentEntry = this.offsets[uniqueName];
			if (currentEntry) {
				currentEntry.data = data as OffsetData;
			}
		});
		const atlasPromise = this.downloadAtlasAsync(uniqueName).then((data) => {
			const currentEntry = this.offsets[uniqueName];
			if (currentEntry) {
				currentEntry.atlas = data;
			}
		});
		return Promise.all([offsetPromise, atlasPromise]).then(() => undefined);
	}

	public getChatColor(figure: string): number {
		return this.getTypeColorId(figure, "ch");
	}

	public getTypeColorId(figure: string, part: string): number {
		const avatarInfo = new AvatarInfo(
			figure,
			0,
			0,
			["std"],
			"std",
			0,
			false,
			false,
			"d"
		);
		let color = 0x000000;

		for (const figurePart of avatarInfo.figure) {
			if (figurePart.type === part) {
				const parts = this.getPartColor(figurePart);
				for (const type in parts) {
					const partGroup = parts[type];
					if (type === "hidden" || !Array.isArray(partGroup)) continue;
					for (const particle of partGroup as Array<DrawablePart>) {
						if (particle.color != null) {
							color = parseInt(particle.color, 16);
							return color;
						}
					}
				}
			}
		}
		return color;
	}

	public generateGeneric(
		avatarInfo: AvatarInfo,
		isGhost: boolean
	): Promise<HTMLCanvasElement> {
		const activeParts: ActivePartsMap = {
			rect: this.getActivePartSet(avatarInfo.isHeadOnly ? "head" : "figure"),
			head: this.getActivePartSet("head"),
			eye: this.getActivePartSet("eye"),
			gesture: this.getActivePartSet("gesture"),
			speak: this.getActivePartSet("speak"),
			walk: this.getActivePartSet("walk"),
			sit: this.getActivePartSet("sit"),
			itemRight: this.getActivePartSet("itemRight"),
			handRight: this.getActivePartSet("handRight"),
			handLeft: this.getActivePartSet("handLeft"),
			swim: this.getActivePartSet("swim"),
		};

		let drawParts = this.getDrawOrder(
			avatarInfo.drawOrder,
			avatarInfo.direction
		);
		if (drawParts == null) {
			drawParts = this.getDrawOrder("std", avatarInfo.direction);
		}

		const setParts: SetPartsMap = { hidden: [] };
		for (const partSet of avatarInfo.figure) {
			const parts = this.getPartColor(partSet);
			for (const type in parts) {
				if (setParts[type] == null) {
					setParts[type] = [];
				}
				const existing = setParts[type] as Array<DrawablePart>;
				const incoming = parts[type] as Array<DrawablePart>;
				setParts[type] = incoming.concat(existing);
			}
		}

		if (avatarInfo.handItem > 0) {
			setParts["ri"] = [
				{ index: 0, id: avatarInfo.handItem, colorable: false },
			];
		}

		const chunks: Array<AvatarChunk> = [];
		const offsetsPromises: Array<Promise<void>> = [];

		if (drawParts == null) {
			return Promise.resolve(document.createElement("canvas"));
		}

		for (const type of drawParts) {
			const drawableParts = setParts[type] as Array<DrawablePart> | undefined;
			if (drawableParts != null) {
				for (const drawablePart of drawableParts) {
					const uniqueName = this.getPartUniqueName(type, drawablePart.id);
					if (uniqueName != null) {
						if (setParts.hidden.includes(type)) continue;
						if (activeParts.head?.includes(type) && avatarInfo.isBodyOnly)
							continue;
						if (!activeParts.rect?.includes(type)) continue;
						if (
							isGhost &&
							(activeParts.gesture?.includes(type) ||
								activeParts.eye?.includes(type))
						)
							continue;

						let drawDirection = avatarInfo.direction;
						let drawAction: string | null = null;

						if (activeParts.rect?.includes(type))
							drawAction = avatarInfo.drawAction.body;
						if (activeParts.head?.includes(type))
							drawDirection = avatarInfo.headDirection;
						if (
							activeParts.speak?.includes(type) &&
							avatarInfo.drawAction.speak
						)
							drawAction = avatarInfo.drawAction.speak;
						if (
							activeParts.gesture?.includes(type) &&
							avatarInfo.drawAction.gesture
						)
							drawAction = avatarInfo.drawAction.gesture;
						if (activeParts.eye?.includes(type)) {
							drawablePart.colorable = false;
							if (avatarInfo.drawAction.eye)
								drawAction = avatarInfo.drawAction.eye;
						}
						if (activeParts.walk?.includes(type) && avatarInfo.drawAction.wlk)
							drawAction = avatarInfo.drawAction.wlk;
						if (activeParts.sit?.includes(type) && avatarInfo.drawAction.sit)
							drawAction = avatarInfo.drawAction.sit;
						if (
							activeParts.handRight?.includes(type) &&
							avatarInfo.drawAction.handRight
						)
							drawAction = avatarInfo.drawAction.handRight;
						if (
							activeParts.itemRight?.includes(type) &&
							avatarInfo.drawAction.itemRight
						)
							drawAction = avatarInfo.drawAction.itemRight;
						if (
							activeParts.handLeft?.includes(type) &&
							avatarInfo.drawAction.handLeft
						)
							drawAction = avatarInfo.drawAction.handLeft;
						if (activeParts.swim?.includes(type) && avatarInfo.drawAction.swm)
							drawAction = avatarInfo.drawAction.swm;

						if (drawAction == null) continue;

						if (this.offsets[uniqueName] == null) {
							const newEntry: OffsetEntry = {
								promise: Promise.resolve(),
								data: undefined,
								atlas: undefined,
							};
							this.offsets[uniqueName] = newEntry;
							newEntry.promise = this.fetchOffsetAsync(uniqueName);
						}
						const offsetEntry = this.offsets[uniqueName];
						if (offsetEntry) {
							offsetsPromises.push(offsetEntry.promise);
						}

						const color = drawablePart.colorable
							? (drawablePart.color ?? null)
							: null;
						const drawPartChunk = this.getPartResource(
							uniqueName,
							drawAction,
							type,
							avatarInfo.isSmall,
							drawablePart.id,
							drawDirection,
							avatarInfo.frame,
							color
						);
						chunks.push(drawPartChunk);
					}
				}
			}
		}

		return new Promise((resolve, reject) => {
			void Promise.all(offsetsPromises).then(() => {
				const temporaryCanvas = document.createElement("canvas");
				const temporaryContext = temporaryCanvas.getContext("2d");
				temporaryCanvas.width = avatarInfo.rectWidth;
				temporaryCanvas.height = avatarInfo.rectHeight;

				const chunksPromises: Array<Promise<HTMLImageElement> | null> = [];

				for (const chunk of chunks) {
					const offsetEntry = this.offsets[chunk.lib];
					if (!offsetEntry?.data) continue;

					const resourceName = chunk.getResourceName();
					const resourceEntry = offsetEntry.data[resourceName] as
						| OffsetResourceEntry
						| undefined;

					if (resourceEntry != null && !resourceEntry.flipped) {
						const atlasData = offsetEntry.data.atlas;
						const atlasImage = offsetEntry.atlas;
						if (atlasImage) {
							chunksPromises.push(
								chunk.extractFromAtlas(atlasData, atlasImage)
							);
						}
					} else {
						const flippedType =
							this.partsets.partSet[chunk.type]?.["flipped-set-type"] ?? "";
						if (flippedType !== "") {
							chunk.resType = flippedType;
						}

						const getResource = (): OffsetResourceEntry | undefined => {
							const entry = this.offsets[chunk.lib];
							if (!entry?.data) return undefined;
							return entry.data[chunk.getResourceName()] as
								| OffsetResourceEntry
								| undefined;
						};

						const isUnresolved = (): boolean => {
							const resource = getResource();
							return resource == null || Boolean(resource.flipped);
						};

						if (chunk.action === "std" && isUnresolved()) {
							chunk.resAction = "spk";
						}
						if (isUnresolved()) {
							chunk.isFlip = true;
							chunk.resAction = chunk.action;
							chunk.resDirection = 6 - chunk.direction;
						}
						if (isUnresolved()) {
							chunk.resFrame = chunk.frame + 1;
							chunk.isFlip = false;
						}
						if (isUnresolved()) {
							chunk.isFlip = false;
							chunk.resFrame = chunk.frame;
							chunk.resAction = chunk.action;
							if (chunk.direction === 7) chunk.resDirection = 3;
							if (chunk.direction === 3) chunk.resDirection = 7;
						}
						if (isUnresolved()) {
							chunk.resFrame = chunk.frame + 1;
							chunk.isFlip = false;
						}
						if (isUnresolved()) {
							chunk.resAction = chunk.action;
							chunk.resType = flippedType;
							chunk.resDirection = chunk.direction;
						}
						if (chunk.action === "std" && isUnresolved()) {
							chunk.resAction = "spk";
							chunk.resType = chunk.type;
						}

						const finalResource = getResource();
						if (finalResource != null && !finalResource.flipped) {
							const finalEntry = this.offsets[chunk.lib];
							if (finalEntry?.data && finalEntry.atlas) {
								const atlasData = finalEntry.data.atlas;
								const atlasImage = finalEntry.atlas;
								chunksPromises.push(
									chunk.extractFromAtlas(atlasData, atlasImage)
								);
							}
						}
					}
				}

				void Promise.all(
					chunksPromises.filter(
						(p): p is Promise<HTMLImageElement> => p != null
					)
				)
					.catch(() => {
						reject(new Error("Error downloading chunks"));
					})
					.then(() => {
						for (const chunk of chunks) {
							const chunkEntry = this.offsets[chunk.lib];
							if (!chunkEntry?.data) continue;

							const chunkResourceName = chunk.getResourceName();
							const chunkResource = chunkEntry.data[chunkResourceName] as
								| OffsetResourceEntry
								| undefined;

							if (chunkResource != null) {
								if (chunk.resource != null) {
									let positionX = -chunkResource.x;
									const positionY =
										avatarInfo.rectHeight / 2 -
										chunkResource.y +
										avatarInfo.rectHeight / 2.5;

									let image: HTMLCanvasElement | HTMLImageElement | null =
										chunk.resource;
									if (chunk.color != null) {
										image = tintSprite(image, chunk.color, isGhost ? 170 : 255);
									}
									if (image != null && chunk.isFlip) {
										positionX = -(
											positionX +
											image.width -
											avatarInfo.rectWidth +
											1
										);
										image = flipImageCanvas(image);
									}
									if (temporaryContext != null && image != null) {
										temporaryContext.drawImage(image, positionX, positionY);
									}
								}
							}
						}

						let result: HTMLCanvasElement = temporaryCanvas;
						if (avatarInfo.isDownsampled) {
							const downsampled = downsampleImage(temporaryCanvas);
							if (downsampled != null) result = downsampled;
						}

						resolve(result);
					});
			});
		});
	}

	public getActivePartSet(partSet: string): Array<string> | null {
		const activePartSetEntry = this.partsets.activePartSet[partSet];
		if (!activePartSetEntry) return null;
		const activeParts = activePartSetEntry.activePart;
		if (activeParts == null || activeParts.length === 0) return null;
		return activeParts;
	}

	public getDrawOrder(
		action: string,
		direction: Direction
	): Array<string> | null {
		const actionOrder = this.draworder[action];
		if (!actionOrder) return null;
		const drawOrder = actionOrder[direction];
		if (drawOrder == null || drawOrder.length === 0) return null;
		return drawOrder;
	}

	public getPartColor(figure: FigurePart): SetPartsMap {
		const parts: SetPartsMap = { hidden: [] };
		const partSet = this.figuredata.settype[figure.type];
		if (partSet != null) {
			const figureSet = partSet.set[figure.id];
			if (figureSet?.part != null) {
				for (const rawPart of figureSet.part) {
					const element: DrawablePart = {
						index: rawPart.index,
						id: rawPart.id,
						colorable: rawPart.colorable,
					};
					if (rawPart.colorable) {
						element.color = this.getColorByPaletteId(
							partSet.paletteid,
							figure.colors[rawPart.colorindex - 1] ?? ""
						);
					}
					const existingParts = parts[rawPart.type] as
						| Array<DrawablePart>
						| undefined;
					if (existingParts == null) {
						parts[rawPart.type] = [element];
					} else {
						existingParts.push(element);
					}
				}
			}
			if (figureSet != null && Array.isArray(figureSet.hidden)) {
				for (const partType of figureSet.hidden) {
					parts.hidden.push(partType);
				}
			}
		}
		return parts;
	}

	public getColorByPaletteId(
		paletteId: string,
		colorId: string
	): string | undefined {
		const palette = this.figuredata.palette[paletteId];
		if (!palette) return undefined;
		const colorEntry = palette[colorId];
		if (!colorEntry) return undefined;
		return colorEntry.color;
	}

	public getPartUniqueName(type: string, partId: number): string | undefined {
		const typeMap = this.figuremap[type];
		let uniqueName = typeMap?.[partId];
		if (uniqueName == null && type === "hrb") {
			uniqueName = this.figuremap["hr"]?.[partId];
		}
		if (uniqueName == null) uniqueName = typeMap?.[1];
		if (uniqueName == null) uniqueName = typeMap?.[0];
		return uniqueName;
	}

	public getPartResource(
		uniqueName: string,
		action: string,
		type: string,
		isSmall: boolean,
		partId: number,
		direction: Direction,
		frame: number,
		color: string | null
	): AvatarChunk {
		const partFrame = this.getFrameNumber(type, action, frame);
		const chunk = new AvatarChunk(
			uniqueName,
			action,
			type,
			isSmall,
			partId,
			direction,
			partFrame,
			color ?? ""
		);
		const resourceName = chunk.getResourceName();
		const cachedChunk = this.chunks[resourceName];
		if (cachedChunk?.resource != null) {
			chunk.resource = cachedChunk.resource;
			chunk.promise = cachedChunk.promise;
		} else {
			this.chunks[resourceName] = chunk;
		}
		return chunk;
	}

	public getFrameNumber(type: string, action: string, frame: number): number {
		const translations: Record<string, string> = {
			wav: "Wave",
			wlk: "Move",
			spk: "Talk",
		};
		const translatedAction = translations[action];
		if (translatedAction != null) {
			const animationAction = this.animation[translatedAction];
			if (animationAction?.part[type] != null) {
				const partFrames = animationAction.part[type];
				if (!partFrames) return 0;
				const count = partFrames.length;
				const frameEntry = partFrames[frame % count];
				if (frameEntry != null) {
					return frameEntry.number;
				}
			}
		}
		return 0;
	}
}

export function generateSilhouette(
	image: HTMLImageElement | HTMLCanvasElement,
	r: number,
	g: number,
	b: number
): HTMLCanvasElement | HTMLImageElement {
	const element = document.createElement("canvas");
	const context = element.getContext("2d");
	const { width, height } = image;

	if (context == null || width === 0 || height === 0) return image;

	element.width = width;
	element.height = height;

	context.drawImage(image, 0, 0);
	const imageData = context.getImageData(0, 0, width, height);

	for (let yIndex = 0; yIndex < height; yIndex++) {
		let position = yIndex * width * 4;
		for (let xIndex = 0; xIndex < width; xIndex++) {
			position += 3;
			const pixelAlpha = imageData.data[position++];
			if (pixelAlpha !== 0) {
				imageData.data[position - 1] = 255;
				imageData.data[position - 2] = b;
				imageData.data[position - 3] = g;
				imageData.data[position - 4] = r;
			}
		}
	}
	context.putImageData(imageData, 0, 0);
	return element;
}
