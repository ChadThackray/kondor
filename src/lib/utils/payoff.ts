import type {
	OptionPosition,
	PayoffPoint,
	ChartData,
	DualChartData,
	PositionPayoffSeries
} from '$lib/types/options';
import { optionPrice, daysToYears } from './blackscholes';

/**
 * Calculate PNL for a single position at a given underlying price (at expiry)
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
 * Calculate combined PNL across all positions
 */
export function calculateCombinedPnl(positions: OptionPosition[], underlyingPrice: number): number {
	return positions.reduce((total, pos) => {
		return total + calculatePositionPnl(pos, underlyingPrice);
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
 * Format PNL for display
 */
export function formatPnl(pnl: number): string {
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
	numPoints: number = 200
): DualChartData {
	const [minPrice, maxPrice] = calculatePriceRange(positions, currentPrice);
	const step = (maxPrice - minPrice) / (numPoints - 1);

	const atExpiry: PayoffPoint[] = [];
	const withTimeValue: PayoffPoint[] = [];

	// Generate points for both curves
	for (let i = 0; i < numPoints; i++) {
		const price = minPrice + step * i;

		// At-expiry payoff (intrinsic value only)
		atExpiry.push({
			price,
			pnl: calculateCombinedPnl(positions, price)
		});

		// Time-value payoff (Black-Scholes priced)
		// When daysToExpiry is 0, this equals the at-expiry value
		withTimeValue.push({
			price,
			pnl:
				daysToExpiry > 0
					? calculateCombinedPnlWithTimeValue(positions, price, daysToExpiry, volatility, riskFreeRate)
					: calculateCombinedPnl(positions, price)
		});
	}

	// Find breakeven points for the time-value curve
	const breakevens = findBreakevens(withTimeValue);

	// Calculate theoretical max profit/loss (based on at-expiry values)
	const { maxProfit, maxLoss } = calculateTheoreticalMaxProfitLoss(positions);

	return {
		atExpiry,
		withTimeValue,
		breakevens,
		maxProfit,
		maxLoss
	};
}
