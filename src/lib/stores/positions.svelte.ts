import type { OptionPosition, NewPosition } from '$lib/types/options';

// Reactive state using Svelte 5 runes
let positions = $state<OptionPosition[]>([]);
let underlyingPrice = $state<number>(100000); // Default BTC-ish price

// Actions
function addPosition(newPos: NewPosition): void {
	const position: OptionPosition = {
		...newPos,
		id: crypto.randomUUID()
	};
	positions = [...positions, position];
}

function removePosition(id: string): void {
	positions = positions.filter((p) => p.id !== id);
}

function clearAllPositions(): void {
	positions = [];
}

function setUnderlyingPrice(price: number): void {
	if (price > 0) {
		underlyingPrice = price;
	}
}

// Export store object with getters and actions
export const positionStore = {
	get positions() {
		return positions;
	},
	get underlyingPrice() {
		return underlyingPrice;
	},
	get hasPositions() {
		return positions.length > 0;
	},
	addPosition,
	removePosition,
	clearAllPositions,
	setUnderlyingPrice
};
