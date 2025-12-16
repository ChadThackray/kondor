import type {
	OptionPosition,
	PayoffPoint,
	ChartData,
	DualChartData,
	PositionPayoffSeries,
	Denomination
} from '$lib/types/options';
import { optionPrice, daysToYears } from './blackscholes';

/**
 * Calculate PNL for a single position at a given underlying price (at expiry) in USD
 */
export function calculatePositionPnl(position: OptionPosition, underlyingPrice: number): number {
	const { optionType, direction, strike, premium, quantity } = position;

	let intrinsicValue: number;

	if (optionType === 'call') {
		intrinsicValue = Math.max(0, underlyingPrice - strike);
	} else {
		intrinsicValue = Math.max(0, strike - underlyingPrice);
	}

	// Long pays premium, receives intrinsic value
	// Short receives premium, pays intrinsic value
	const directionMultiplier = direction === 'long' ? 1 : -1;
	const pnlPerContract = (intrinsicValue - premium) * directionMultiplier;

	return pnlPerContract * quantity;
}

/**
 * Calculate PNL for a single position in BTC terms (Bitcoin-settled options)
 *
 * For Bitcoin-settled options, payoff is bounded:
 * - Call: max(0, 1 - K/S) BTC - premium_btc (approaches 1 BTC as S → ∞)
 * - Put: max(0, K/S - 1) BTC - premium_btc (approaches K/S - 1 as S → 0)
 */
export function calculatePositionPnlBtc(position: OptionPosition, underlyingPrice: number): number {
	const { optionType, direction, strike, premium, quantity, btcPriceAtEntry, premiumBtc } = position;

	// Get premium in BTC (use stored BTC value if available, otherwise convert)
	const premiumInBtc = premiumBtc ?? (btcPriceAtEntry > 0 ? premium / btcPriceAtEntry : 0);

	// Avoid division by zero
	if (underlyingPrice <= 0) {
		// At price 0, call is worthless, put pays max (but we cap at reasonable value)
		if (optionType === 'call') {
			const directionMultiplier = direction === 'long' ? 1 : -1;
			return (-premiumInBtc * directionMultiplier) * quantity;
		} else {
			// Put at S=0 would theoretically be infinite in BTC terms
			// Cap at a large but finite value for display purposes
			const directionMultiplier = direction === 'long' ? 1 : -1;
			const maxPutValue = strike / 1; // Use $1 as floor
			return ((maxPutValue - premiumInBtc) * directionMultiplier) * quantity;
		}
	}

	let intrinsicValueBtc: number;

	if (optionType === 'call') {
		// Call: max(0, 1 - K/S) BTC
		intrinsicValueBtc = Math.max(0, 1 - strike / underlyingPrice);
	} else {
		// Put: max(0, K/S - 1) BTC
		intrinsicValueBtc = Math.max(0, strike / underlyingPrice - 1);
	}

	const directionMultiplier = direction === 'long' ? 1 : -1;
	const pnlPerContractBtc = (intrinsicValueBtc - premiumInBtc) * directionMultiplier;

	return pnlPerContractBtc * quantity;
}

/**
 * Calculate combined PNL across all positions in USD
 */
export function calculateCombinedPnl(positions: OptionPosition[], underlyingPrice: number): number {
	return positions.reduce((total, pos) => {
		return total + calculatePositionPnl(pos, underlyingPrice);
	}, 0);
}

/**
 * Calculate combined PNL across all positions in BTC terms
 */
export function calculateCombinedPnlBtc(positions: OptionPosition[], underlyingPrice: number): number {
	return positions.reduce((total, pos) => {
		return total + calculatePositionPnlBtc(pos, underlyingPrice);
	}, 0);
}

/**
 * Calculate PNL for a single position with time value using Black-Scholes
 */
export function calculatePositionPnlWithTimeValue(
	position: OptionPosition,
	underlyingPrice: number,
	daysToExpiry: number,
	volatility: number,
	riskFreeRate: number
): number {
	const { optionType, direction, strike, premium, quantity } = position;
	const isCall = optionType === 'call';
	const T = daysToYears(daysToExpiry);

	// Calculate current option value using Black-Scholes
	const currentValue = optionPrice(isCall, underlyingPrice, strike, T, riskFreeRate, volatility);

	// Long pays premium, current value is what option is worth
	// Short receives premium, current value is cost to close
	const directionMultiplier = direction === 'long' ? 1 : -1;
	const pnlPerContract = (currentValue - premium) * directionMultiplier;

	return pnlPerContract * quantity;
}

/**
 * Calculate combined PNL with time value across all positions
 */
export function calculateCombinedPnlWithTimeValue(
	positions: OptionPosition[],
	underlyingPrice: number,
	daysToExpiry: number,
	volatility: number,
	riskFreeRate: number
): number {
	return positions.reduce((total, pos) => {
		return total + calculatePositionPnlWithTimeValue(pos, underlyingPrice, daysToExpiry, volatility, riskFreeRate);
	}, 0);
}

/**
 * Calculate PNL for a single position with time value in BTC terms
 * Converts USD option value to BTC by dividing by the underlying price
 */
export function calculatePositionPnlWithTimeValueBtc(
	position: OptionPosition,
	underlyingPrice: number,
	daysToExpiry: number,
	volatility: number,
	riskFreeRate: number
): number {
	const { optionType, direction, strike, premium, quantity, btcPriceAtEntry, premiumBtc } = position;
	const isCall = optionType === 'call';
	const T = daysToYears(daysToExpiry);

	// Get premium in BTC (use stored BTC value if available, otherwise convert)
	const premiumInBtc = premiumBtc ?? (btcPriceAtEntry > 0 ? premium / btcPriceAtEntry : 0);

	// Avoid division by zero
	if (underlyingPrice <= 0) {
		const directionMultiplier = direction === 'long' ? 1 : -1;
		return (-premiumInBtc * directionMultiplier) * quantity;
	}

	// Calculate current option value using Black-Scholes (in USD)
	const currentValueUsd = optionPrice(isCall, underlyingPrice, strike, T, riskFreeRate, volatility);

	// Convert option value to BTC at current price
	const currentValueBtc = currentValueUsd / underlyingPrice;

	const directionMultiplier = direction === 'long' ? 1 : -1;
	const pnlPerContractBtc = (currentValueBtc - premiumInBtc) * directionMultiplier;

	return pnlPerContractBtc * quantity;
}

/**
 * Calculate combined PNL with time value across all positions in BTC terms
 */
export function calculateCombinedPnlWithTimeValueBtc(
	positions: OptionPosition[],
	underlyingPrice: number,
	daysToExpiry: number,
	volatility: number,
	riskFreeRate: number
): number {
	return positions.reduce((total, pos) => {
		return total + calculatePositionPnlWithTimeValueBtc(pos, underlyingPrice, daysToExpiry, volatility, riskFreeRate);
	}, 0);
}

/**
 * Determine price range for chart based on positions
 */
export function calculatePriceRange(
	positions: OptionPosition[],
	currentPrice: number
): [number, number] {
	if (positions.length === 0) {
		// Default range around current price (±30%)
		return [currentPrice * 0.7, currentPrice * 1.3];
	}

	const strikes = positions.map((p) => p.strike);
	const minStrike = Math.min(...strikes);
	const maxStrike = Math.max(...strikes);

	// Include current price in range calculation
	const allPrices = [...strikes, currentPrice];
	const minPrice = Math.min(...allPrices);
	const maxPrice = Math.max(...allPrices);

	// Extend range 30% beyond min/max
	const range = maxPrice - minPrice || currentPrice * 0.3;
	const padding = Math.max(range * 0.3, currentPrice * 0.1);

	return [Math.max(0, minPrice - padding), maxPrice + padding];
}

/**
 * Find breakeven points where PNL crosses zero
 */
function findBreakevens(points: PayoffPoint[]): number[] {
	const breakevens: number[] = [];

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];

		// Check if PNL crosses zero
		if ((prev.pnl <= 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl <= 0)) {
			// Linear interpolation to find exact crossing
			const totalDiff = Math.abs(prev.pnl) + Math.abs(curr.pnl);
			if (totalDiff > 0) {
				const ratio = Math.abs(prev.pnl) / totalDiff;
				const breakeven = prev.price + (curr.price - prev.price) * ratio;
				breakevens.push(breakeven);
			}
		}
	}

	return breakevens;
}

/**
 * Format position label for chart legend
 */
function formatPositionLabel(pos: OptionPosition): string {
	const dir = pos.direction === 'long' ? 'Long' : 'Short';
	const type = pos.optionType === 'call' ? 'Call' : 'Put';
	return `${dir} ${type} @ ${formatPrice(pos.strike)}`;
}

/**
 * Get color for position based on type and direction
 */
function getPositionColor(pos: OptionPosition): string {
	if (pos.optionType === 'call') {
		return pos.direction === 'long' ? '#3b82f6' : '#8b5cf6'; // blue / purple
	}
	return pos.direction === 'long' ? '#f59e0b' : '#ec4899'; // amber / pink
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
	if (price >= 1000) {
		return `${(price / 1000).toFixed(1)}k`;
	}
	return price.toFixed(2);
}

/**
 * Format Bitcoin amount for display
 * Shows up to 8 decimal places (satoshi precision) and trims trailing zeros
 */
export function formatBtc(value: number): string {
	// Format with up to 8 decimal places, then remove trailing zeros
	const formatted = value.toFixed(8).replace(/\.?0+$/, '');
	return `₿${formatted}`;
}

/**
 * Format PNL for display (converts USD to BTC if needed)
 */
export function formatPnl(pnl: number, denomination?: Denomination, btcPrice?: number): string {
	// Handle BTC denomination
	if (denomination === 'btc') {
		if (!btcPrice || btcPrice <= 0) {
			return 'N/A';
		}
		const btcValue = pnl / btcPrice;
		const sign = btcValue >= 0 ? '+' : '';
		return `${sign}${formatBtc(Math.abs(btcValue))}`;
	}

	// Default USD formatting
	const sign = pnl >= 0 ? '+' : '';
	if (Math.abs(pnl) >= 1000) {
		return `${sign}${(pnl / 1000).toFixed(2)}k`;
	}
	return `${sign}${pnl.toFixed(2)}`;
}

/**
 * Format PNL that is already in the correct denomination (no conversion needed)
 * Use this when the data has already been calculated in BTC terms
 */
export function formatPnlDirect(pnl: number, denomination: Denomination): string {
	if (denomination === 'btc') {
		const sign = pnl >= 0 ? '+' : '';
		return `${sign}${formatBtc(Math.abs(pnl))}`;
	}

	// USD formatting
	const sign = pnl >= 0 ? '+' : '';
	if (Math.abs(pnl) >= 1000) {
		return `${sign}${(pnl / 1000).toFixed(2)}k`;
	}
	return `${sign}${pnl.toFixed(2)}`;
}

/**
 * Calculate theoretical max profit and loss for a portfolio
 * Returns 'unlimited' when there's no cap on profit/loss
 */
function calculateTheoreticalMaxProfitLoss(positions: OptionPosition[]): {
	maxProfit: number | 'unlimited';
	maxLoss: number | 'unlimited';
} {
	if (positions.length === 0) {
		return { maxProfit: 0, maxLoss: 0 };
	}

	// Calculate net call and put exposure
	// Positive = net long, Negative = net short
	let netCallExposure = 0;
	let netPutExposure = 0;

	for (const pos of positions) {
		const exposure = pos.quantity * (pos.direction === 'long' ? 1 : -1);
		if (pos.optionType === 'call') {
			netCallExposure += exposure;
		} else {
			netPutExposure += exposure;
		}
	}

	// Determine if profit/loss is unlimited
	// - Net long calls: unlimited profit (price can go to infinity)
	// - Net short calls: unlimited loss (price can go to infinity)
	// - Puts are always limited (price can't go below 0)
	const hasUnlimitedProfit = netCallExposure > 0;
	const hasUnlimitedLoss = netCallExposure < 0;

	// Calculate bounded max profit (at price = 0 for puts, and premium for shorts)
	// Calculate bounded max loss (premium paid for longs)
	let maxProfitAtZero = 0;
	let maxLossAtZero = 0;

	for (const pos of positions) {
		const { optionType, direction, strike, premium, quantity } = pos;

		if (direction === 'long') {
			// Long positions: max loss is premium paid
			maxLossAtZero += premium * quantity;

			if (optionType === 'put') {
				// Long put: max profit at price=0 is (strike - premium) * qty
				maxProfitAtZero += (strike - premium) * quantity;
			}
		} else {
			// Short positions: max profit is premium received
			maxProfitAtZero += premium * quantity;

			if (optionType === 'put') {
				// Short put: max loss at price=0 is (strike - premium) * qty
				maxLossAtZero += (strike - premium) * quantity;
			}
		}
	}

	return {
		maxProfit: hasUnlimitedProfit ? 'unlimited' : maxProfitAtZero,
		maxLoss: hasUnlimitedLoss ? 'unlimited' : -maxLossAtZero
	};
}

/**
 * Calculate theoretical max profit and loss for a portfolio in BTC terms
 * For Bitcoin-settled options:
 * - Calls are bounded at 1 BTC per contract (as price → ∞)
 * - Puts are unbounded in BTC terms (as price → 0, K/S → ∞)
 */
function calculateTheoreticalMaxProfitLossBtc(positions: OptionPosition[]): {
	maxProfit: number | 'unlimited';
	maxLoss: number | 'unlimited';
} {
	if (positions.length === 0) {
		return { maxProfit: 0, maxLoss: 0 };
	}

	// Calculate net put exposure (puts are unlimited in BTC terms as S → 0)
	let netPutExposure = 0;

	for (const pos of positions) {
		const exposure = pos.quantity * (pos.direction === 'long' ? 1 : -1);
		if (pos.optionType === 'put') {
			netPutExposure += exposure;
		}
	}

	// In BTC terms:
	// - Net long puts: unlimited profit (as price → 0, K/S → ∞)
	// - Net short puts: unlimited loss (as price → 0)
	// - Calls are always bounded at 1 BTC per contract
	const hasUnlimitedProfit = netPutExposure > 0;
	const hasUnlimitedLoss = netPutExposure < 0;

	// Calculate bounded max profit/loss for calls (at S → ∞)
	// Call payoff approaches 1 BTC per contract as S → ∞
	let maxProfitFromCalls = 0;
	let maxLossFromCalls = 0;

	for (const pos of positions) {
		const { optionType, direction, premium, quantity, btcPriceAtEntry, premiumBtc } = pos;

		// Get premium in BTC
		const premiumInBtc = premiumBtc ?? (btcPriceAtEntry > 0 ? premium / btcPriceAtEntry : 0);

		if (optionType === 'call') {
			if (direction === 'long') {
				// Long call: max profit = (1 - premium_btc) per contract at S → ∞
				maxProfitFromCalls += (1 - premiumInBtc) * quantity;
				// Max loss is premium paid (when call expires worthless)
				maxLossFromCalls += premiumInBtc * quantity;
			} else {
				// Short call: max loss = (1 - premium_btc) per contract at S → ∞
				maxLossFromCalls += (1 - premiumInBtc) * quantity;
				// Max profit is premium received
				maxProfitFromCalls += premiumInBtc * quantity;
			}
		} else {
			// Puts: add premium effect when bounded
			if (direction === 'long') {
				// Long put max loss is premium paid
				maxLossFromCalls += premiumInBtc * quantity;
			} else {
				// Short put max profit is premium received
				maxProfitFromCalls += premiumInBtc * quantity;
			}
		}
	}

	return {
		maxProfit: hasUnlimitedProfit ? 'unlimited' : maxProfitFromCalls,
		maxLoss: hasUnlimitedLoss ? 'unlimited' : -maxLossFromCalls
	};
}

/**
 * Generate chart data for all positions
 */
export function generateChartData(
	positions: OptionPosition[],
	currentPrice: number,
	numPoints: number = 200
): ChartData {
	const [minPrice, maxPrice] = calculatePriceRange(positions, currentPrice);
	const step = (maxPrice - minPrice) / (numPoints - 1);

	const combined: PayoffPoint[] = [];
	const individualMap = new Map<string, PayoffPoint[]>();

	// Initialize individual series
	for (const pos of positions) {
		individualMap.set(pos.id, []);
	}

	// Generate points
	for (let i = 0; i < numPoints; i++) {
		const price = minPrice + step * i;

		// Combined payoff
		combined.push({
			price,
			pnl: calculateCombinedPnl(positions, price)
		});

		// Individual payoffs
		for (const pos of positions) {
			individualMap.get(pos.id)?.push({
				price,
				pnl: calculatePositionPnl(pos, price)
			});
		}
	}

	// Find breakeven points
	const breakevens = findBreakevens(combined);

	// Calculate theoretical max profit/loss
	const { maxProfit, maxLoss } = calculateTheoreticalMaxProfitLoss(positions);

	// Build individual series
	const individual: PositionPayoffSeries[] = positions.map((pos) => ({
		positionId: pos.id,
		label: formatPositionLabel(pos),
		points: individualMap.get(pos.id) ?? [],
		color: getPositionColor(pos)
	}));

	return {
		combined,
		individual,
		breakevens,
		maxProfit,
		maxLoss
	};
}

/**
 * Generate dual chart data with both at-expiry and time-value curves
 */
export function generateDualChartData(
	positions: OptionPosition[],
	currentPrice: number,
	daysToExpiry: number,
	volatility: number,
	riskFreeRate: number,
	numPoints: number = 200,
	priceRange?: [number, number],
	denomination: Denomination = 'usd'
): DualChartData {
	const [minPrice, maxPrice] = priceRange ?? calculatePriceRange(positions, currentPrice);
	const step = (maxPrice - minPrice) / (numPoints - 1);

	const atExpiry: PayoffPoint[] = [];
	const withTimeValue: PayoffPoint[] = [];

	const useBtc = denomination === 'btc';

	// Generate points for both curves
	for (let i = 0; i < numPoints; i++) {
		const price = minPrice + step * i;

		// At-expiry payoff (intrinsic value only)
		atExpiry.push({
			price,
			pnl: useBtc
				? calculateCombinedPnlBtc(positions, price)
				: calculateCombinedPnl(positions, price)
		});

		// Time-value payoff (Black-Scholes priced)
		// When daysToExpiry is 0, this equals the at-expiry value
		if (daysToExpiry > 0) {
			withTimeValue.push({
				price,
				pnl: useBtc
					? calculateCombinedPnlWithTimeValueBtc(positions, price, daysToExpiry, volatility, riskFreeRate)
					: calculateCombinedPnlWithTimeValue(positions, price, daysToExpiry, volatility, riskFreeRate)
			});
		} else {
			withTimeValue.push({
				price,
				pnl: useBtc
					? calculateCombinedPnlBtc(positions, price)
					: calculateCombinedPnl(positions, price)
			});
		}
	}

	// Find breakeven points for the time-value curve
	const breakevens = findBreakevens(withTimeValue);

	// Calculate theoretical max profit/loss
	const { maxProfit, maxLoss } = useBtc
		? calculateTheoreticalMaxProfitLossBtc(positions)
		: calculateTheoreticalMaxProfitLoss(positions);

	return {
		atExpiry,
		withTimeValue,
		breakevens,
		maxProfit,
		maxLoss
	};
}
