import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { line, area, type Line, type Area } from 'd3-shape';
import { extent, bisector } from 'd3-array';
import { axisBottom, axisLeft, type Axis } from 'd3-axis';
import type { ZoomTransform } from 'd3-zoom';
import type { PayoffPoint, Denomination } from '$lib/types/options';
import { formatPrice, formatPnl } from './payoff';

/**
 * Create X scale for price axis
 */
export function createPriceScale(
	data: PayoffPoint[],
	width: number,
	margin: { left: number; right: number }
): ScaleLinear<number, number> {
	if (data.length === 0) {
		return scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
	}

	const domain = extent(data, (d: PayoffPoint) => d.price) as [number, number];
	return scaleLinear().domain(domain).range([margin.left, width - margin.right]);
}

/**
 * Create Y scale for PnL axis
 */
export function createPnlScale(
	data: PayoffPoint[],
	height: number,
	margin: { top: number; bottom: number }
): ScaleLinear<number, number> {
	if (data.length === 0) {
		return scaleLinear()
			.domain([-100, 100])
			.range([height - margin.bottom, margin.top])
			.nice();
	}

	const pnlExtent = extent(data, (d: PayoffPoint) => d.pnl) as [number, number];
	return scaleLinear()
		.domain(pnlExtent)
		.range([height - margin.bottom, margin.top])
		.nice();
}

/**
 * Create line generator
 */
export function createLineGenerator(
	xScale: ScaleLinear<number, number>,
	yScale: ScaleLinear<number, number>
): Line<PayoffPoint> {
	return line<PayoffPoint>()
		.x((d: PayoffPoint) => xScale(d.price))
		.y((d: PayoffPoint) => yScale(d.pnl));
}

/**
 * Create area generator for gradient fill
 */
export function createAreaGenerator(
	xScale: ScaleLinear<number, number>,
	yScale: ScaleLinear<number, number>
): Area<PayoffPoint> {
	return area<PayoffPoint>()
		.x((d: PayoffPoint) => xScale(d.price))
		.y0(yScale(0)) // Baseline at y=0
		.y1((d: PayoffPoint) => yScale(d.pnl));
}

/**
 * Create formatted X axis
 */
export function createPriceAxis(
	scale: ScaleLinear<number, number>
): Axis<number | { valueOf(): number }> {
	return axisBottom(scale)
		.ticks(10)
		.tickFormat((d) => formatPrice(d as number));
}

/**
 * Create formatted Y axis
 */
export function createPnlAxis(
	scale: ScaleLinear<number, number>,
	denomination: Denomination,
	btcPrice: number
): Axis<number | { valueOf(): number }> {
	return axisLeft(scale)
		.ticks(8)
		.tickFormat((d) => formatPnl(d as number, denomination, btcPrice));
}

/**
 * Find closest data point to a price value
 */
export function findClosestPoint(
	data: PayoffPoint[],
	price: number
): { point: PayoffPoint; index: number } | null {
	if (data.length === 0) return null;

	const bisect = bisector((d: PayoffPoint) => d.price).left;
	const index = Math.max(0, Math.min(data.length - 1, bisect(data, price)));

	return { point: data[index], index };
}

/**
 * Calculate visible price range from zoom transform
 */
export function getVisibleRange(
	transform: ZoomTransform,
	scale: ScaleLinear<number, number>,
	margin: { left: number; right: number },
	width: number
): [number, number] {
	const scaledX = transform.rescaleX(scale);
	return [scaledX.invert(margin.left), scaledX.invert(width - margin.right)];
}

/**
 * Check if visible range exceeds data bounds by threshold
 */
export function needsRangeExtension(
	visibleRange: [number, number],
	dataRange: [number, number],
	threshold: number = 0.15
): boolean {
	const [visibleMin, visibleMax] = visibleRange;
	const [dataMin, dataMax] = dataRange;
	const dataSpan = dataMax - dataMin;

	return (
		visibleMin < dataMin + dataSpan * threshold || visibleMax > dataMax - dataSpan * threshold
	);
}

/**
 * Calculate extended range with buffer
 */
export function calculateExtendedRange(
	visibleRange: [number, number],
	buffer: number = 0.3
): [number, number] {
	const [min, max] = visibleRange;
	const span = max - min;
	return [Math.max(0, min - span * buffer), max + span * buffer];
}
