import { Texture } from "pixi.js";

export function flipImage(source: HTMLCanvasElement): HTMLCanvasElement | null {
	const element = document.createElement("canvas");
	const context = element.getContext("2d");
	if (context == null) return null;

	const { width, height } = source;
	element.width = width;
	element.height = height;

	context.save();
	context.scale(-1, 1);
	context.drawImage(source, 0, 0, width * -1, height);
	context.restore();

	return element;
}

export default class RoomImager {
	public roomTileTexture?: Texture;
	public roomStairLTexture?: Texture;
	public roomStairRTexture?: Texture;

	public initialize(): void {
		this.roomTileTexture = Texture.from(this.generateFloorTile(7));
		this.roomStairLTexture = Texture.from(this.generateStairL());
		const stairRCanvas = this.generateStairR();
		if (stairRCanvas != null) {
			this.roomStairRTexture = Texture.from(stairRCanvas);
		}
	}

	public generateRoomWallL(z: number): Texture {
		return Texture.from(this.generateWallL(122 + z * 32));
	}

	public generateRoomWallR(z: number): Texture {
		return Texture.from(this.generateWallR(122 + z * 32));
	}

	public generateRoomDoorL(): Texture {
		return Texture.from(this.generateWallL(28));
	}

	public generateRoomDoorBeforeL(z: number): Texture {
		return Texture.from(this.generateWallBeforeDoorL(122 + z * 32));
	}

	public generateStairL(): HTMLCanvasElement {
		return this.generateStair(
			"rgba(142,142,94,127)",
			"#989865",
			"#7A7A51",
			"#838357",
			"#676744",
			"#6F6F49",
			false
		);
	}

	public generateStairR(): HTMLCanvasElement | null {
		return flipImage(
			this.generateStair(
				"rgba(142,142,94,127)",
				"#989865",
				"#676744",
				"#6F6F49",
				"#7A7A51",
				"#838357",
				true
			)
		);
	}

	public generateStair(
		strokeColor: string,
		floorColor: string,
		leftColorStroke: string,
		leftColor: string,
		rightColorStroke: string,
		rightColor: string,
		rightSide: boolean
	): HTMLCanvasElement {
		const temporaryCanvas = document.createElement("canvas");
		const context = temporaryCanvas.getContext("2d");

		temporaryCanvas.width = 99;
		temporaryCanvas.height = 88;

		if (context != null) {
			const topFloorPoints = [
				{ x: 32, y: 0 },
				{ x: 0, y: 16 },
				{ x: 24, y: 28 },
				{ x: 56, y: 12 },
			];

			const stairPoints = [
				{ x: 32, y: 0 },
				{ x: 0, y: 16 },
				{ x: 10, y: 21 },
				{ x: 42, y: 5 },
			];

			context.strokeStyle = strokeColor;
			context.fillStyle = floorColor;
			context.beginPath();
			context.moveTo(topFloorPoints[0]!.x, topFloorPoints[0]!.y);
			context.lineTo(topFloorPoints[1]!.x, topFloorPoints[1]!.y);
			context.lineTo(topFloorPoints[2]!.x, topFloorPoints[2]!.y);
			context.lineTo(topFloorPoints[3]!.x, topFloorPoints[3]!.y);
			context.lineTo(topFloorPoints[0]!.x, topFloorPoints[0]!.y);
			context.closePath();
			context.stroke();
			context.fill();

			const thickness = 7;

			context.strokeStyle = leftColorStroke;
			context.fillStyle = leftColor;
			context.beginPath();
			context.moveTo(topFloorPoints[1]!.x - 0.5, topFloorPoints[1]!.y);
			context.lineTo(
				topFloorPoints[1]!.x - 0.5,
				topFloorPoints[1]!.y + thickness
			);
			context.lineTo(
				topFloorPoints[2]!.x - 0.5,
				topFloorPoints[2]!.y + thickness
			);
			context.lineTo(topFloorPoints[2]!.x - 0.5, topFloorPoints[2]!.y);
			context.closePath();
			context.stroke();
			context.fill();

			context.strokeStyle = rightColorStroke;
			context.fillStyle = rightColor;
			context.beginPath();
			context.moveTo(topFloorPoints[3]!.x + 0.5, topFloorPoints[3]!.y);
			context.lineTo(
				topFloorPoints[3]!.x + 0.5,
				topFloorPoints[3]!.y + thickness
			);
			context.lineTo(
				topFloorPoints[2]!.x + 0.5,
				topFloorPoints[2]!.y + thickness
			);
			context.lineTo(topFloorPoints[2]!.x + 0.5, topFloorPoints[2]!.y);
			context.closePath();
			context.stroke();
			context.fill();

			for (let index = 3; index >= 0; index--) {
				const offsetX = 10 * index + 26;
				let offsetY = 13 * index + 19;
				let fixedThickness = thickness;
				if (rightSide) {
					if (index === 1) fixedThickness += 2;
					if (index === 3 || index === 2) offsetY += 1;
				}
				context.strokeStyle = strokeColor;
				context.fillStyle = floorColor;
				context.beginPath();
				context.moveTo(
					stairPoints[0]!.x + offsetX,
					stairPoints[0]!.y + offsetY
				);
				context.lineTo(
					stairPoints[1]!.x + offsetX,
					stairPoints[1]!.y + offsetY
				);
				context.lineTo(
					stairPoints[2]!.x + offsetX,
					stairPoints[2]!.y + offsetY
				);
				context.lineTo(
					stairPoints[3]!.x + offsetX,
					stairPoints[3]!.y + offsetY
				);
				context.lineTo(
					stairPoints[0]!.x + offsetX,
					stairPoints[0]!.y + offsetY
				);
				context.closePath();
				context.stroke();
				context.fill();

				context.strokeStyle = leftColorStroke;
				context.fillStyle = leftColor;
				context.beginPath();
				context.moveTo(
					stairPoints[1]!.x - 0.5 + offsetX,
					stairPoints[1]!.y + offsetY
				);
				context.lineTo(
					stairPoints[1]!.x - 0.5 + offsetX,
					stairPoints[1]!.y + fixedThickness + offsetY
				);
				context.lineTo(
					stairPoints[2]!.x - 0.5 + offsetX,
					stairPoints[2]!.y + fixedThickness + offsetY
				);
				context.lineTo(
					stairPoints[2]!.x - 0.5 + offsetX,
					stairPoints[2]!.y + offsetY
				);
				context.closePath();
				context.stroke();
				context.fill();

				context.strokeStyle = rightColorStroke;
				context.fillStyle = rightColor;
				context.beginPath();
				context.moveTo(
					stairPoints[3]!.x + 0.5 + offsetX,
					stairPoints[3]!.y + offsetY
				);
				context.lineTo(
					stairPoints[3]!.x + 0.5 + offsetX,
					stairPoints[3]!.y + fixedThickness + offsetY
				);
				context.lineTo(
					stairPoints[2]!.x + 0.5 + offsetX,
					stairPoints[2]!.y + fixedThickness + offsetY
				);
				context.lineTo(
					stairPoints[2]!.x + 0.5 + offsetX,
					stairPoints[2]!.y + offsetY
				);
				context.closePath();
				context.stroke();
				context.fill();
			}
		}

		return temporaryCanvas;
	}

	public generateFloorTile(thickness: number): HTMLCanvasElement {
		const temporaryCanvas = document.createElement("canvas");
		const context = temporaryCanvas.getContext("2d");

		const TILE_H = 32;
		const TILE_W = 64;

		temporaryCanvas.width = 64;
		temporaryCanvas.height = 39;

		if (context != null) {
			const startX = 32;
			const startY = 0;

			const points = [
				{ x: startX, y: startY },
				{ x: startX - TILE_W / 2, y: startY + TILE_H / 2 },
				{ x: startX, y: startY + TILE_H },
				{ x: startX + TILE_W / 2, y: startY + TILE_H / 2 },
			];

			context.strokeStyle = "rgba(142,142,94,127)";
			context.fillStyle = "#989865";
			context.beginPath();
			context.moveTo(points[0]!.x, points[0]!.y);
			context.lineTo(points[1]!.x, points[1]!.y);
			context.lineTo(points[2]!.x, points[2]!.y);
			context.lineTo(points[3]!.x, points[3]!.y);
			context.lineTo(points[0]!.x, points[0]!.y);
			context.closePath();
			context.stroke();
			context.fill();

			if (thickness > 0) {
				context.strokeStyle = "#7A7A51";
				context.fillStyle = "#838357";
				context.beginPath();
				context.moveTo(points[1]!.x - 0.5, points[1]!.y);
				context.lineTo(points[1]!.x - 0.5, points[1]!.y + thickness);
				context.lineTo(points[2]!.x - 0.5, points[2]!.y + thickness);
				context.lineTo(points[2]!.x - 0.5, points[2]!.y);
				context.closePath();
				context.stroke();
				context.fill();

				context.strokeStyle = "#676744";
				context.fillStyle = "#6F6F49";
				context.beginPath();
				context.moveTo(points[3]!.x + 0.5, points[3]!.y);
				context.lineTo(points[3]!.x + 0.5, points[3]!.y + thickness);
				context.lineTo(points[2]!.x + 0.5, points[2]!.y + thickness);
				context.lineTo(points[2]!.x + 0.5, points[2]!.y);
				context.closePath();
				context.stroke();
				context.fill();
			}
		}

		return temporaryCanvas;
	}

	public generateWallBeforeDoorL(height: number): HTMLCanvasElement {
		const temporaryCanvas = document.createElement("canvas");
		const context = temporaryCanvas.getContext("2d");

		temporaryCanvas.width = 40;
		temporaryCanvas.height = 24 + height;

		if (context != null) {
			const points = [
				{ x: 32, y: 0 },
				{ x: 0, y: 16 },
				{ x: 8, y: 20 },
				{ x: 40, y: 4 },
			];

			context.strokeStyle = "#6f717a";
			context.fillStyle = "#70727a";
			context.beginPath();
			context.moveTo(points[0]!.x, points[0]!.y);
			context.lineTo(points[1]!.x, points[1]!.y);
			context.lineTo(points[2]!.x, points[2]!.y);
			context.lineTo(points[3]!.x, points[3]!.y);
			context.lineTo(points[0]!.x, points[0]!.y);
			context.closePath();
			context.stroke();
			context.fill();

			if (height > 0) {
				context.strokeStyle = "#90929e";
				context.fillStyle = "#90929e";
				context.beginPath();
				context.moveTo(points[3]!.x, points[3]!.y);
				context.lineTo(points[3]!.x, points[3]!.y + height);
				context.lineTo(points[2]!.x, points[2]!.y + height);
				context.lineTo(points[2]!.x, points[2]!.y);
				context.closePath();
				context.stroke();
				context.fill();
			}
		}

		return temporaryCanvas;
	}

	public generateWallR(height: number): HTMLCanvasElement {
		const temporaryCanvas = document.createElement("canvas");
		const context = temporaryCanvas.getContext("2d");

		temporaryCanvas.width = 40;
		temporaryCanvas.height = 24 + height;

		if (context != null) {
			const points = [
				{ x: 8, y: 0 },
				{ x: 40, y: 16 },
				{ x: 32, y: 20 },
				{ x: 0, y: 4 },
			];

			context.strokeStyle = "#70727a";
			context.fillStyle = "#70727a";
			context.beginPath();
			context.moveTo(points[0]!.x - 0.5, points[0]!.y);
			context.lineTo(points[1]!.x - 0.5, points[1]!.y);
			context.lineTo(points[2]!.x - 0.5, points[2]!.y);
			context.lineTo(points[3]!.x - 0.5, points[3]!.y);
			context.lineTo(points[0]!.x - 0.5, points[0]!.y);
			context.closePath();
			context.stroke();
			context.fill();

			if (height > 0) {
				context.strokeStyle = "#90929e";
				context.fillStyle = "#90929e";
				context.beginPath();
				context.moveTo(points[1]!.x - 0.5, points[1]!.y);
				context.lineTo(points[1]!.x - 0.5, points[1]!.y + height);
				context.lineTo(points[2]!.x - 0.5, points[2]!.y + height);
				context.lineTo(points[2]!.x - 0.5, points[2]!.y);
				context.closePath();
				context.stroke();
				context.fill();

				context.strokeStyle = "#b6b9c8";
				context.fillStyle = "#b6b9c8";
				context.beginPath();
				context.moveTo(points[3]!.x, points[3]!.y);
				context.lineTo(points[3]!.x, points[3]!.y + height);
				context.lineTo(points[2]!.x, points[2]!.y + height);
				context.lineTo(points[2]!.x, points[2]!.y);
				context.closePath();
				context.stroke();
				context.fill();
			}
		}

		return temporaryCanvas;
	}

	public generateWallL(height: number): HTMLCanvasElement {
		const temporaryCanvas = document.createElement("canvas");
		const context = temporaryCanvas.getContext("2d");

		temporaryCanvas.width = 40;
		temporaryCanvas.height = 24 + height;

		if (context != null) {
			const points = [
				{ x: 32, y: 0 },
				{ x: 0, y: 16 },
				{ x: 8, y: 20 },
				{ x: 40, y: 4 },
			];

			context.strokeStyle = "#70727a";
			context.fillStyle = "#70727a";
			context.beginPath();
			context.moveTo(points[0]!.x, points[0]!.y);
			context.lineTo(points[1]!.x, points[1]!.y);
			context.lineTo(points[2]!.x, points[2]!.y);
			context.lineTo(points[3]!.x, points[3]!.y);
			context.lineTo(points[0]!.x, points[0]!.y);
			context.closePath();
			context.stroke();
			context.fill();

			if (height > 0) {
				context.strokeStyle = "#bbbecd";
				context.fillStyle = "#bbbecd";
				context.beginPath();
				context.moveTo(points[1]!.x - 0.5, points[1]!.y);
				context.lineTo(points[1]!.x - 0.5, points[1]!.y + height);
				context.lineTo(points[2]!.x - 0.5, points[2]!.y + height);
				context.lineTo(points[2]!.x - 0.5, points[2]!.y);
				context.closePath();
				context.stroke();
				context.fill();

				context.strokeStyle = "#90929e";
				context.fillStyle = "#90929e";
				context.beginPath();
				context.moveTo(points[3]!.x, points[3]!.y);
				context.lineTo(points[3]!.x, points[3]!.y + height);
				context.lineTo(points[2]!.x, points[2]!.y + height);
				context.lineTo(points[2]!.x, points[2]!.y);
				context.closePath();
				context.stroke();
				context.fill();
			}
		}

		return temporaryCanvas;
	}
}
