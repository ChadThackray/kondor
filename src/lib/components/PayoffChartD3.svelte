<script lang="ts">
	import { scaleLinear, type ScaleLinear } from 'd3-scale';
	import { extent } from 'd3-array';
	import { zoom as d3zoom, zoomIdentity, type ZoomTransform, type D3ZoomEvent } from 'd3-zoom';
	import { axisBottom, axisLeft } from 'd3-axis';
	import { select } from 'd3-selection';
	import { positionStore } from '$lib/stores/positions.svelte';
	import { generateDualChartData, formatPrice, formatPnl } from '$lib/utils/payoff';
	import {
		createLineGenerator,
		createAreaGenerator,
		getVisibleRange,
		needsRangeExtension,
		calculateExtendedRange,
		findClosestPoint
	} from '$lib/utils/d3-chart-helpers';
	import ChartTooltip from './ChartTooltip.svelte';

	// ===== STATE MANAGEMENT =====

	// Custom price range for extended zoom
	let customPriceRange = $state<[number, number] | null>(null);

	// Current zoom transform
	let zoomTransform = $state<ZoomTransform>(zoomIdentity);

	// Track desired data domain for semantic zooming
	let customXDomain = $state<[number, number] | null>(null);

	// Tooltip state
	let tooltipData = $state<{
		visible: boolean;
		x: number;
		y: number;
		price: number;
		currentPnl: number;
		atExpiryPnl: number | null;
	}>({
		visible: false,
		x: 0,
		y: 0,
		price: 0,
		currentPnl: 0,
		atExpiryPnl: null
	});

	// SVG and container references
	let svgRef = $state<SVGSVGElement | null>(null);
	let xAxisRef = $state<SVGGElement | null>(null);
	let yAxisRef = $state<SVGGElement | null>(null);
	let containerRef = $state<HTMLDivElement | null>(null);

	// Track if user is actively dragging
	let isDragging = $state(false);

	// Dimensions
	let dimensions = $state({ width: 800, height: 400 });
	const margin = { top: 20, right: 20, bottom: 50, left: 60 };

	// ===== DERIVED STATE =====

	// Generate dual chart data reactively
	const chartData = $derived(
		generateDualChartData(
			positionStore.positions,
			positionStore.underlyingPrice,
			positionStore.daysToExpiry,
			positionStore.volatility,
			positionStore.riskFreeRate,
			200,
			customPriceRange ?? undefined
		)
	);

	// Stats for display
	const stats = $derived({
		maxProfit: chartData.maxProfit,
		maxLoss: chartData.maxLoss,
		breakevens: chartData.breakevens
	});

	// Check if showing time value
	const showingTimeValue = $derived(positionStore.daysToExpiry > 0);

	// Create base scales from data
	const baseXScale = $derived(() => {
		if (chartData.withTimeValue.length === 0) {
			return scaleLinear().domain([0, 100]).range([margin.left, dimensions.width - margin.right]);
		}
		const domain = extent(chartData.withTimeValue, (d) => d.price) as [number, number];
		return scaleLinear().domain(domain).range([margin.left, dimensions.width - margin.right]);
	});

	const baseYScale = $derived(() => {
		if (chartData.withTimeValue.length === 0) {
			return scaleLinear()
				.domain([-100, 100])
				.range([dimensions.height - margin.bottom, margin.top])
				.nice();
		}
		const pnlExtent = extent(chartData.withTimeValue, (d) => d.pnl) as [number, number];
		return scaleLinear()
			.domain(pnlExtent)
			.range([dimensions.height - margin.bottom, margin.top])
			.nice();
	});

	// Apply zoom transform to get current view domain
	const currentXDomain = $derived(() => {
		if (customXDomain) return customXDomain;
		const scale = baseXScale();
		const transformed = zoomTransform.rescaleX(scale);
		return transformed.domain() as [number, number];
	});

	// Create display scales that always fill the space
	const xScale = $derived(() => {
		return scaleLinear()
			.domain(currentXDomain())
			.range([margin.left, dimensions.width - margin.right]);
	});

	const yScale = $derived(() => {
		// Y scale should show all data in current X range
		if (chartData.withTimeValue.length === 0) {
			return scaleLinear()
				.domain([-100, 100])
				.range([dimensions.height - margin.bottom, margin.top])
				.nice();
		}

		// Filter data to current X domain
		const [xMin, xMax] = currentXDomain();
		const visibleData = chartData.withTimeValue.filter(d => d.price >= xMin && d.price <= xMax);

		if (visibleData.length === 0) {
			return baseYScale();
		}

		const pnlExtent = extent(visibleData, (d) => d.pnl) as [number, number];
		return scaleLinear()
			.domain(pnlExtent)
			.range([dimensions.height - margin.bottom, margin.top])
			.nice();
	});

	// Create line and area generators - no zoom transform applied
	const lineFn = $derived(createLineGenerator(xScale(), yScale()));
	const areaFn = $derived(createAreaGenerator(xScale(), yScale()));

	// Generate paths
	const withTimeValuePath = $derived(lineFn(chartData.withTimeValue) ?? '');
	const atExpiryPath = $derived(
		showingTimeValue ? lineFn(chartData.atExpiry) ?? '' : ''
	);
	const areaPath = $derived(areaFn(chartData.withTimeValue) ?? '');

	// ===== EFFECTS =====

	// Setup zoom behavior
	$effect(() => {
		if (!svgRef) return;

		const zoom = d3zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.5, 20]) // Allow zoom in and out
			.wheelDelta((event) => {
				// Reduce zoom sensitivity - default is -event.deltaY * 0.002
				// Using 0.0005 makes it 4x slower
				return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.0005);
			})
			.on('start', () => {
				isDragging = true;
			})
			.on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
				// Update transform state - triggers Svelte re-render
				zoomTransform = event.transform;

				// Clear custom domain while zooming so transform is used
				customXDomain = null;

				// Only check range extension if not actively dragging
				// This prevents jumpy behavior during pan
				if (!isDragging) {
					checkAndExtendRange();
				}
			})
			.on('end', () => {
				isDragging = false;
				// Check range extension after drag ends
				checkAndExtendRange();
			});

		// Setup zoom with double-click to reset
		select(svgRef)
			.call(zoom)
			.on('dblclick.zoom', null) // Disable default double-click zoom
			.on('dblclick', resetZoom); // Add custom double-click reset

		// Cleanup
		return () => {
			select(svgRef).on('.zoom', null);
			select(svgRef).on('dblclick', null);
		};
	});

	// Render axes
	$effect(() => {
		if (!xAxisRef || !yAxisRef || chartData.withTimeValue.length === 0) return;

		const xAxis = axisBottom(xScale())
			.ticks(10)
			.tickFormat((d) => formatPrice(d as number));

		const yAxis = axisLeft(yScale())
			.ticks(8)
			.tickFormat((d) => formatPnl(d as number, positionStore.denomination, positionStore.underlyingPrice));

		select(xAxisRef).call(xAxis);
		select(yAxisRef).call(yAxis);
	});

	// Handle responsive sizing
	$effect(() => {
		if (!containerRef) return;

		const resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			dimensions = { width, height };
		});

		resizeObserver.observe(containerRef);

		return () => resizeObserver.disconnect();
	});

	// Reset zoom when positions removed
	let previousPositionCount = $state(0);
	$effect(() => {
		const currentCount = positionStore.positions.length;

		if (currentCount === 0 && previousPositionCount > 0 && svgRef) {
			// Reset zoom to identity
			select(svgRef).call(
				d3zoom<SVGSVGElement, unknown>().transform,
				zoomIdentity
			);
			customPriceRange = null;
			customXDomain = null;
		}

		previousPositionCount = currentCount;
	});

	// ===== EVENT HANDLERS =====

	function resetZoom() {
		if (!svgRef) return;

		// Reset zoom transform to identity (no zoom/pan)
		select(svgRef).transition().duration(300).call(
			d3zoom<SVGSVGElement, unknown>().transform,
			zoomIdentity
		);

		// Reset custom price range and domain
		customPriceRange = null;
		customXDomain = null;
	}

	function checkAndExtendRange() {
		if (chartData.withTimeValue.length === 0) return;

		// Get visible price range from current zoom transform
		const [xMin, xMax] = currentXDomain();
		const visibleRange: [number, number] = [xMin, xMax];

		// Get current data range
		const dataMin = chartData.withTimeValue[0].price;
		const dataMax = chartData.withTimeValue[chartData.withTimeValue.length - 1].price;
		const dataRange: [number, number] = [dataMin, dataMax];

		// Check if extension needed (using 25% threshold - more conservative)
		if (needsRangeExtension(visibleRange, dataRange, 0.25)) {
			// Use smaller extension buffer (15% instead of 30%)
			const extendedRange = calculateExtendedRange(visibleRange, 0.15);

			// Apply constraints to keep prices reasonable
			// Max range: 5x the current underlying price (reduced from 10x)
			const maxReasonablePrice = positionStore.underlyingPrice * 5;
			const minReasonablePrice = Math.max(0, positionStore.underlyingPrice * 0.2);

			// Constrain the extended range
			const constrainedRange: [number, number] = [
				Math.max(minReasonablePrice, extendedRange[0]),
				Math.min(maxReasonablePrice, extendedRange[1])
			];

			// Only update if the constrained range is different from current
			if (constrainedRange[0] !== dataMin || constrainedRange[1] !== dataMax) {
				customPriceRange = constrainedRange;
				// Store the current view domain so it doesn't jump
				customXDomain = visibleRange;
			}
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!svgRef || chartData.withTimeValue.length === 0) return;

		const rect = svgRef.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;

		// Convert pixel position to price
		const price = xScale().invert(mouseX);

		// Find closest data point using bisector
		const result = findClosestPoint(chartData.withTimeValue, price);
		if (!result) {
			tooltipData = { ...tooltipData, visible: false };
			return;
		}

		const { point, index } = result;
		const expiryPoint = showingTimeValue ? chartData.atExpiry[index] : null;

		tooltipData = {
			visible: true,
			x: event.clientX,
			y: event.clientY,
			price: point.price,
			currentPnl: point.pnl,
			atExpiryPnl: expiryPoint?.pnl ?? null
		};
	}

	function handleMouseLeave() {
		tooltipData = { ...tooltipData, visible: false };
	}
</script>

<div class="flex flex-col h-full">
	<!-- Stats Header -->
	<div class="flex items-center justify-between mb-2">
		<div class="flex items-center gap-3">
			<h2 class="text-lg font-semibold">
				{showingTimeValue
					? `P&L (${positionStore.daysToExpiry} days to expiry)`
					: 'P&L at Expiry'}
			</h2>
			{#if positionStore.hasPositions}
				<button
					onclick={resetZoom}
					class="text-xs px-2 py-1 rounded border border-dark-border hover:bg-dark-border transition-colors"
					title="Reset zoom (or double-click chart)"
				>
					Reset Zoom
				</button>
			{/if}
		</div>
		{#if positionStore.hasPositions}
			<div class="flex gap-4 text-sm">
				<span>
					Max Profit:
					<span class="text-profit font-mono">
						{stats.maxProfit === 'unlimited'
							? 'Unlimited'
							: formatPnl(
									stats.maxProfit,
									positionStore.denomination,
									positionStore.underlyingPrice
								)}
					</span>
				</span>
				<span>
					Max Loss:
					<span class="text-loss font-mono">
						{stats.maxLoss === 'unlimited'
							? 'Unlimited'
							: formatPnl(stats.maxLoss, positionStore.denomination, positionStore.underlyingPrice)}
					</span>
				</span>
				{#if stats.breakevens.length > 0}
					<span>
						Breakeven{stats.breakevens.length > 1 ? 's' : ''}:
						<span class="text-accent font-mono">
							{stats.breakevens.map((b) => formatPrice(b)).join(', ')}
						</span>
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Chart Container -->
	<div
		bind:this={containerRef}
		class="flex-1 bg-dark-card rounded-lg border border-dark-border p-4 overflow-hidden"
	>
		{#if !positionStore.hasPositions}
			<div class="flex items-center justify-center h-full text-dark-muted">
				<p>Add positions to see the payoff chart</p>
			</div>
		{:else}
			<svg bind:this={svgRef} class="w-full h-full">
				<!-- Definitions -->
				<defs>
					<!-- Clip path for chart area -->
					<clipPath id="clip">
						<rect
							x={margin.left}
							y={margin.top}
							width={dimensions.width - margin.left - margin.right}
							height={dimensions.height - margin.top - margin.bottom}
						/>
					</clipPath>

					<!-- Gradient for area fill -->
					<linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="rgba(88, 166, 255, 0.4)" />
						<stop offset="100%" stop-color="rgba(88, 166, 255, 0.1)" />
					</linearGradient>
				</defs>

				<!-- Grid lines -->
				<g class="grid-lines" clip-path="url(#clip)">
					{#each xScale().ticks(10) as tick}
						<line
							class="grid-line"
							x1={xScale()(tick)}
							y1={margin.top}
							x2={xScale()(tick)}
							y2={dimensions.height - margin.bottom}
						/>
					{/each}
					{#each yScale().ticks(8) as tick}
						<line
							class="grid-line"
							x1={margin.left}
							y1={yScale()(tick)}
							x2={dimensions.width - margin.right}
							y2={yScale()(tick)}
						/>
					{/each}
				</g>

				<!-- Data curves -->
				<g clip-path="url(#clip)">
					<!-- Area fill -->
					<path class="area-fill" d={areaPath} />

					<!-- Current P&L line -->
					<path class="line-current" d={withTimeValuePath} />

					<!-- At expiry line (if showing time value) -->
					{#if showingTimeValue}
						<path class="line-expiry" d={atExpiryPath} />
					{/if}
				</g>

				<!-- Axes -->
				<g
					bind:this={xAxisRef}
					class="axis"
					transform="translate(0, {dimensions.height - margin.bottom})"
				/>
				<g bind:this={yAxisRef} class="axis" transform="translate({margin.left}, 0)" />

				<!-- Mouse capture rect for tooltip -->
				<rect
					role="img"
					aria-label="Interactive chart area"
					class="mouse-capture"
					x={margin.left}
					y={margin.top}
					width={dimensions.width - margin.left - margin.right}
					height={dimensions.height - margin.top - margin.bottom}
					fill="transparent"
					onmousemove={handleMouseMove}
					onmouseleave={handleMouseLeave}
				/>
			</svg>

			<!-- Tooltip Overlay -->
			<ChartTooltip
				visible={tooltipData.visible}
				x={tooltipData.x}
				y={tooltipData.y}
				price={tooltipData.price}
				currentPnl={tooltipData.currentPnl}
				atExpiryPnl={tooltipData.atExpiryPnl}
				denomination={positionStore.denomination}
				btcPrice={positionStore.underlyingPrice}
				showingTimeValue={showingTimeValue}
			/>
		{/if}
	</div>
</div>

<style>
	/* Grid lines */
	:global(.grid-line) {
		stroke: rgba(139, 148, 158, 0.15);
		stroke-width: 1;
	}

	/* Axes */
	:global(.axis text) {
		fill: #e6edf3;
		font-size: 12px;
	}

	:global(.axis .domain),
	:global(.axis .tick line) {
		stroke: rgba(139, 148, 158, 0.3);
	}

	/* Chart lines */
	:global(.line-current) {
		fill: none;
		stroke: #e6edf3;
		stroke-width: 2;
	}

	:global(.line-expiry) {
		fill: none;
		stroke: rgba(148, 163, 184, 0.5);
		stroke-width: 1.5;
	}

	/* Area fill */
	:global(.area-fill) {
		fill: url(#gradient);
	}

	/* Mouse capture - ensure it's always on top */
	:global(.mouse-capture) {
		cursor: crosshair;
	}
</style>
