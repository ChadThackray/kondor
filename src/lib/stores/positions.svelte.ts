import type { OptionPosition, NewPosition, Denomination } from '$lib/types/options';

// Reactive state using Svelte 5 runes
let positions = $state<OptionPosition[]>([]);
let underlyingPrice = $state<number>(100000); // Default BTC-ish price
let volatility = $state<number>(0.8); // 80% IV - typical for crypto
let riskFreeRate = $state<number>(0); // 0% for crypto
let daysToExpiry = $state<number>(0); // Slider value: 0 = at expiry
let denomination = $state<Denomination>('usd'); // Default to USD denomination

// Actions
function addPosition(newPos: NewPosition): void {
	const position: OptionPosition = {
		...newPos,
		id: crypto.randomUUID(),
		enabled: newPos.enabled ?? true
	};
	positions = [...positions, position];
}

function togglePosition(id: string): void {
	positions = positions.map((p) =>
		p.id === id ? { ...p, enabled: p.enabled === false ? true : false } : p
	);
}

function updatePositionQuantity(id: string, quantity: number): void {
	if (quantity < 1 || quantity > 1000 || !Number.isInteger(quantity)) return;
	positions = positions.map((p) => (p.id === id ? { ...p, quantity } : p));
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

function setDenomination(d: Denomination): void {
	denomination = d;
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
	get denomination() {
		return denomination;
	},
	get hasPositions() {
		return positions.length > 0;
	},
	get enabledPositions() {
		return positions.filter((p) => p.enabled !== false);
	},
	get maxDaysToExpiry() {
		return getMaxDaysToExpiry();
	},
	addPosition,
	togglePosition,
	updatePositionQuantity,
	removePosition,
	clearAllPositions,
	setUnderlyingPrice,
	setVolatility,
	setRiskFreeRate,
	setDaysToExpiry,
	setDenomination
};
