import type { OptionPosition, NewPosition } from '$lib/types/options';

// Reactive state using Svelte 5 runes
let positions = $state<OptionPosition[]>([]);
let underlyingPrice = $state<number>(100000); // Default BTC-ish price
let volatility = $state<number>(0.8); // 80% IV - typical for crypto
let riskFreeRate = $state<number>(0); // 0% for crypto
let daysToExpiry = $state<number>(0); // Slider value: 0 = at expiry

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
	// Reset slider to expiry when all positions are removed
	if (positions.length === 0) {
		daysToExpiry = 0;
	}
}

function clearAllPositions(): void {
	positions = [];
	// Reset slider to expiry when all positions are cleared
	daysToExpiry = 0;
}

function setUnderlyingPrice(price: number): void {
	if (price > 0) {
		underlyingPrice = price;
	}
}

function setVolatility(iv: number): void {
	if (iv > 0 && iv <= 5) {
		// 0-500% IV range
		volatility = iv;
	}
}

function setRiskFreeRate(rate: number): void {
	riskFreeRate = rate;
}

function setDaysToExpiry(days: number): void {
	if (days >= 0) {
		daysToExpiry = days;
	}
}

function getMaxDaysToExpiry(): number {
	if (positions.length === 0) return 365;
	const now = new Date();
	const maxExpiry = Math.max(
		...positions.map((p) => {
			const diff = p.expiryDate.getTime() - now.getTime();
			return Math.ceil(diff / (1000 * 60 * 60 * 24));
		})
	);
	return Math.max(maxExpiry, 1);
}

// Export store object with getters and actions
export const positionStore = {
	get positions() {
		return positions;
	},
	get underlyingPrice() {
		return underlyingPrice;
	},
	get volatility() {
		return volatility;
	},
	get riskFreeRate() {
		return riskFreeRate;
	},
	get daysToExpiry() {
		return daysToExpiry;
	},
	get hasPositions() {
		return positions.length > 0;
	},
	get maxDaysToExpiry() {
		return getMaxDaysToExpiry();
	},
	addPosition,
	removePosition,
	clearAllPositions,
	setUnderlyingPrice,
	setVolatility,
	setRiskFreeRate,
	setDaysToExpiry
};
