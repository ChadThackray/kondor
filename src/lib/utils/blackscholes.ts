/**
 * Black-Scholes Option Pricing Model
 *
 * Implementation of the Black-Scholes-Merton formula for European options.
 * Suitable for crypto options where dividend yield is zero.
 *
 * Parameters convention:
 * - S: Spot price (current underlying price)
 * - K: Strike price
 * - T: Time to expiry in years
 * - r: Risk-free interest rate (annual, e.g., 0.05 for 5%)
 * - sigma: Implied volatility (annual, e.g., 0.80 for 80%)
 */

/**
 * Standard normal probability density function (PDF)
 * φ(x) = (1/√(2π)) * e^(-x²/2)
 */
export function normalPDF(x: number): number {
	return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Cumulative distribution function for the standard normal distribution
 * Uses a rational approximation with high accuracy (error < 1e-7)
 * Based on Cody's algorithm
 */
export function cumulativeNormalDistribution(x: number): number {
	const a1 = 0.31938153;
	const a2 = -0.356563782;
	const a3 = 1.781477937;
	const a4 = -1.821255978;
	const a5 = 1.330274429;
	const p = 0.2316419;

	const absX = Math.abs(x);
	const t = 1.0 / (1.0 + p * absX);

	// Compute the polynomial using Horner's method
	const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));

	// Compute the approximation for the positive tail
	const pdf = Math.exp(-0.5 * absX * absX) / Math.sqrt(2 * Math.PI);
	const cdf = 1.0 - poly * pdf;

	// Use symmetry for negative x
	return x >= 0 ? cdf : 1.0 - cdf;
}

/**
 * Calculate d1 parameter for Black-Scholes formula
 * d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
 */
export function d1(S: number, K: number, T: number, r: number, sigma: number): number {
	if (T <= 0 || sigma <= 0) {
		return S >= K ? Infinity : -Infinity;
	}
	const sqrtT = Math.sqrt(T);
	return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
}

/**
 * Calculate d2 parameter for Black-Scholes formula
 * d2 = d1 - σ√T
 */
export function d2(S: number, K: number, T: number, r: number, sigma: number): number {
	if (T <= 0 || sigma <= 0) {
		return S >= K ? Infinity : -Infinity;
	}
	return d1(S, K, T, r, sigma) - sigma * Math.sqrt(T);
}

/**
 * Calculate European call option price
 * C = S × N(d1) - K × e^(-rT) × N(d2)
 */
export function callPrice(S: number, K: number, T: number, r: number, sigma: number): number {
	// At or past expiry, return intrinsic value
	if (T <= 0) {
		return Math.max(0, S - K);
	}

	const d1Val = d1(S, K, T, r, sigma);
	const d2Val = d2(S, K, T, r, sigma);

	return S * cumulativeNormalDistribution(d1Val) - K * Math.exp(-r * T) * cumulativeNormalDistribution(d2Val);
}

/**
 * Calculate European put option price
 * P = K × e^(-rT) × N(-d2) - S × N(-d1)
 */
export function putPrice(S: number, K: number, T: number, r: number, sigma: number): number {
	// At or past expiry, return intrinsic value
	if (T <= 0) {
		return Math.max(0, K - S);
	}

	const d1Val = d1(S, K, T, r, sigma);
	const d2Val = d2(S, K, T, r, sigma);

	return K * Math.exp(-r * T) * cumulativeNormalDistribution(-d2Val) - S * cumulativeNormalDistribution(-d1Val);
}

/**
 * Calculate option price (convenience function)
 */
export function optionPrice(
	isCall: boolean,
	S: number,
	K: number,
	T: number,
	r: number,
	sigma: number
): number {
	return isCall ? callPrice(S, K, T, r, sigma) : putPrice(S, K, T, r, sigma);
}

/**
 * Calculate Delta - rate of change of option price with respect to underlying price
 * Call Delta = N(d1)
 * Put Delta = N(d1) - 1
 */
export function delta(
	isCall: boolean,
	S: number,
	K: number,
	T: number,
	r: number,
	sigma: number
): number {
	if (T <= 0) {
		// At expiry: delta is 1 if ITM, 0 if OTM
		if (isCall) {
			return S > K ? 1 : 0;
		} else {
			return S < K ? -1 : 0;
		}
	}

	const d1Val = d1(S, K, T, r, sigma);
	const nd1 = cumulativeNormalDistribution(d1Val);

	return isCall ? nd1 : nd1 - 1;
}

/**
 * Calculate Gamma - rate of change of delta with respect to underlying price
 * Gamma = φ(d1) / (S × σ × √T)
 * Same for calls and puts
 */
export function gamma(S: number, K: number, T: number, r: number, sigma: number): number {
	if (T <= 0 || sigma <= 0) {
		return 0;
	}

	const d1Val = d1(S, K, T, r, sigma);
	return normalPDF(d1Val) / (S * sigma * Math.sqrt(T));
}

/**
 * Calculate Theta - rate of change of option price with respect to time
 * Returns theta per day (divide annual theta by 365)
 *
 * Call Theta = -[S × φ(d1) × σ / (2√T)] - r × K × e^(-rT) × N(d2)
 * Put Theta = -[S × φ(d1) × σ / (2√T)] + r × K × e^(-rT) × N(-d2)
 */
export function theta(
	isCall: boolean,
	S: number,
	K: number,
	T: number,
	r: number,
	sigma: number
): number {
	if (T <= 0) {
		return 0;
	}

	const d1Val = d1(S, K, T, r, sigma);
	const d2Val = d2(S, K, T, r, sigma);
	const sqrtT = Math.sqrt(T);

	const term1 = -(S * normalPDF(d1Val) * sigma) / (2 * sqrtT);
	const expRT = Math.exp(-r * T);

	let annualTheta: number;
	if (isCall) {
		annualTheta = term1 - r * K * expRT * cumulativeNormalDistribution(d2Val);
	} else {
		annualTheta = term1 + r * K * expRT * cumulativeNormalDistribution(-d2Val);
	}

	// Return per-day theta
	return annualTheta / 365;
}

/**
 * Calculate Vega - rate of change of option price with respect to volatility
 * Vega = S × √T × φ(d1)
 * Same for calls and puts
 * Returns vega per 1% change in volatility (divide by 100)
 */
export function vega(S: number, K: number, T: number, r: number, sigma: number): number {
	if (T <= 0) {
		return 0;
	}

	const d1Val = d1(S, K, T, r, sigma);
	const annualVega = S * Math.sqrt(T) * normalPDF(d1Val);

	// Return vega per 1% (0.01) change in volatility
	return annualVega / 100;
}

/**
 * Calculate Rho - rate of change of option price with respect to risk-free rate
 * Call Rho = K × T × e^(-rT) × N(d2)
 * Put Rho = -K × T × e^(-rT) × N(-d2)
 * Returns rho per 1% change in rate (divide by 100)
 */
export function rho(
	isCall: boolean,
	S: number,
	K: number,
	T: number,
	r: number,
	sigma: number
): number {
	if (T <= 0) {
		return 0;
	}

	const d2Val = d2(S, K, T, r, sigma);
	const expRT = Math.exp(-r * T);

	let annualRho: number;
	if (isCall) {
		annualRho = K * T * expRT * cumulativeNormalDistribution(d2Val);
	} else {
		annualRho = -K * T * expRT * cumulativeNormalDistribution(-d2Val);
	}

	// Return rho per 1% (0.01) change in rate
	return annualRho / 100;
}

/**
 * Calculate all Greeks at once for efficiency
 */
export function calculateGreeks(
	isCall: boolean,
	S: number,
	K: number,
	T: number,
	r: number,
	sigma: number
): {
	price: number;
	delta: number;
	gamma: number;
	theta: number;
	vega: number;
	rho: number;
} {
	return {
		price: optionPrice(isCall, S, K, T, r, sigma),
		delta: delta(isCall, S, K, T, r, sigma),
		gamma: gamma(S, K, T, r, sigma),
		theta: theta(isCall, S, K, T, r, sigma),
		vega: vega(S, K, T, r, sigma),
		rho: rho(isCall, S, K, T, r, sigma)
	};
}

/**
 * Convert days to years
 */
export function daysToYears(days: number): number {
	return days / 365;
}

/**
 * Convert years to days
 */
export function yearsToDays(years: number): number {
	return years * 365;
}
