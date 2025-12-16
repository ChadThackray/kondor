import type { OptionPosition, NewPosition, Denomination } from '$lib/types/options';
import { browser } from '$app/environment';

const STORAGE_KEY = 'kondor-positions';

// Serialized position type for localStorage (Date as ISO string)
interface SerializedPosition extends Omit<OptionPosition, 'expiryDate'> {
	expiryDate: string;
}

function serializePositions(positions: OptionPosition[]): string {
	const serialized: SerializedPosition[] = positions.map((p) => ({
		...p,
		expiryDate: p.expiryDate.toISOString()
	}));
	return JSON.stringify(serialized);
}

function deserializePositions(json: string): OptionPosition[] {
	const parsed: SerializedPosition[] = JSON.parse(json);
	return parsed.map((p) => ({
		...p,
		expiryDate: new Date(p.expiryDate)
	}));
}

function loadFromStorage(): OptionPosition[] {
	if (!browser) return [];
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return [];
	try {
		return deserializePositions(stored);
	} catch {
		return [];
	}
}

function saveToStorage(positions: OptionPosition[]): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, serializePositions(positions));
}

// Reactive state using Svelte 5 runes
let positions = $state<OptionPosition[]>(loadFromStorage());
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
	saveToStorage(positions);
}

function togglePosition(id: string): void {
	positions = positions.map((p) =>
		p.id === id ? { ...p, enabled: p.enabled === false ? true : false } : p
	);
	saveToStorage(positions);
}

function roundQuantity(n: number, decimals = 1): number {
	return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

function updatePositionQuantity(id: string, quantity: number): void {
	if (quantity < 0.1 || quantity > 1000) return;
	const rounded = roundQuantity(quantity);
	positions = positions.map((p) => (p.id === id ? { ...p, quantity: rounded } : p));
	saveToStorage(positions);
}

function removePosition(id: string): void {
	positions = positions.filter((p) => p.id !== id);
	saveToStorage(positions);
	// Reset slider to expiry when all positions are removed
	if (positions.length === 0) {
		daysToExpiry = 0;
	}
}

function clearAllPositions(): void {
	positions = [];
	saveToStorage(positions);
	// Reset slider to expiry when all positions are cleared
	daysToExpiry = 0;
}

function setPositions(newPositions: OptionPosition[]): void {
	positions = newPositions;
	saveToStorage(positions);
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
	setPositions,
	setUnderlyingPrice,
	setVolatility,
	setRiskFreeRate,
	setDaysToExpiry,
	setDenomination
};
