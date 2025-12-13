import { describe, it, expect } from 'vitest';
import {
	cumulativeNormalDistribution,
	normalPDF,
	d1,
	d2,
	callPrice,
	putPrice,
	optionPrice,
	delta,
	gamma,
	theta,
	vega,
	rho
} from '../blackscholes';
import fixtures from './blackscholes.fixtures.json';

interface TestCase {
	inputs: {
		isCall: boolean;
		S: number;
		K: number;
		T: number;
		r: number;
		sigma: number;
	};
	expected: {
		price: number;
		delta: number;
		gamma: number;
		theta: number;
		vega: number;
		rho: number;
	};
	description: string;
}

const TOLERANCE = fixtures.tolerance;
const testCases = fixtures.cases as TestCase[];

describe('Black-Scholes Implementation', () => {
	describe('cumulativeNormalDistribution', () => {
		it('should return 0.5 for x=0', () => {
			expect(cumulativeNormalDistribution(0)).toBeCloseTo(0.5, 6);
		});

		it('should return ~0.8413 for x=1', () => {
			expect(cumulativeNormalDistribution(1)).toBeCloseTo(0.8413447, 4);
		});

		it('should return ~0.1587 for x=-1', () => {
			expect(cumulativeNormalDistribution(-1)).toBeCloseTo(0.1586553, 4);
		});

		it('should approach 1 for large positive x', () => {
			expect(cumulativeNormalDistribution(5)).toBeGreaterThan(0.9999);
		});

		it('should approach 0 for large negative x', () => {
			expect(cumulativeNormalDistribution(-5)).toBeLessThan(0.0001);
		});
	});

	describe('normalPDF', () => {
		it('should return ~0.3989 for x=0', () => {
			expect(normalPDF(0)).toBeCloseTo(0.3989423, 4);
		});

		it('should be symmetric', () => {
			expect(normalPDF(1)).toBeCloseTo(normalPDF(-1), 10);
		});
	});

	describe('Option Pricing - Fixture Tests', () => {
		it.each(testCases.slice(0, 50))('$description - price', (testCase) => {
			const { isCall, S, K, T, r, sigma } = testCase.inputs;
			const result = optionPrice(isCall, S, K, T, r, sigma);
			expect(result).toBeCloseTo(testCase.expected.price, Math.log10(1 / TOLERANCE));
		});
	});

	describe('Delta - Fixture Tests', () => {
		it.each(testCases.slice(0, 50))('$description - delta', (testCase) => {
			const { isCall, S, K, T, r, sigma } = testCase.inputs;
			const result = delta(isCall, S, K, T, r, sigma);
			expect(result).toBeCloseTo(testCase.expected.delta, Math.log10(1 / TOLERANCE));
		});
	});

	describe('Gamma - Fixture Tests', () => {
		it.each(testCases.slice(0, 50))('$description - gamma', (testCase) => {
			const { S, K, T, r, sigma } = testCase.inputs;
			const result = gamma(S, K, T, r, sigma);
			expect(result).toBeCloseTo(testCase.expected.gamma, Math.log10(1 / TOLERANCE));
		});
	});

	describe('Theta - Fixture Tests', () => {
		it.each(testCases.slice(0, 50))('$description - theta', (testCase) => {
			const { isCall, S, K, T, r, sigma } = testCase.inputs;
			const result = theta(isCall, S, K, T, r, sigma);
			expect(result).toBeCloseTo(testCase.expected.theta, Math.log10(1 / TOLERANCE));
		});
	});

	describe('Vega - Fixture Tests', () => {
		it.each(testCases.slice(0, 50))('$description - vega', (testCase) => {
			const { S, K, T, r, sigma } = testCase.inputs;
			const result = vega(S, K, T, r, sigma);
			expect(result).toBeCloseTo(testCase.expected.vega, Math.log10(1 / TOLERANCE));
		});
	});

	describe('Rho - Fixture Tests', () => {
		it.each(testCases.slice(0, 50))('$description - rho', (testCase) => {
			const { isCall, S, K, T, r, sigma } = testCase.inputs;
			const result = rho(isCall, S, K, T, r, sigma);
			expect(result).toBeCloseTo(testCase.expected.rho, Math.log10(1 / TOLERANCE));
		});
	});

	describe('Edge Cases', () => {
		it('call price at expiry should equal intrinsic value (ITM)', () => {
			expect(callPrice(110, 100, 0, 0, 0.5)).toBe(10);
		});

		it('call price at expiry should equal zero (OTM)', () => {
			expect(callPrice(90, 100, 0, 0, 0.5)).toBe(0);
		});

		it('put price at expiry should equal intrinsic value (ITM)', () => {
			expect(putPrice(90, 100, 0, 0, 0.5)).toBe(10);
		});

		it('put price at expiry should equal zero (OTM)', () => {
			expect(putPrice(110, 100, 0, 0, 0.5)).toBe(0);
		});

		it('call delta at expiry ITM should be 1', () => {
			expect(delta(true, 110, 100, 0, 0, 0.5)).toBe(1);
		});

		it('call delta at expiry OTM should be 0', () => {
			expect(delta(true, 90, 100, 0, 0, 0.5)).toBe(0);
		});

		it('put delta at expiry ITM should be -1', () => {
			expect(delta(false, 90, 100, 0, 0, 0.5)).toBe(-1);
		});

		it('put delta at expiry OTM should be 0', () => {
			expect(delta(false, 110, 100, 0, 0, 0.5)).toBe(0);
		});
	});

	describe('Put-Call Parity', () => {
		// C - P = S - K * e^(-rT)
		it.each([
			{ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.3 },
			{ S: 100, K: 90, T: 0.5, r: 0.03, sigma: 0.4 },
			{ S: 150, K: 120, T: 1, r: 0.02, sigma: 0.5 }
		])('should satisfy put-call parity for S=$S K=$K', ({ S, K, T, r, sigma }) => {
			const call = callPrice(S, K, T, r, sigma);
			const put = putPrice(S, K, T, r, sigma);
			const parityDiff = call - put;
			const expected = S - K * Math.exp(-r * T);
			expect(parityDiff).toBeCloseTo(expected, 4);
		});
	});
});
