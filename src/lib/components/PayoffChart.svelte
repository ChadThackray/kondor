<script lang="ts">
	import { Chart, Svg, Axis, Area, Spline, Highlight, Tooltip } from 'layerchart';
	const TooltipRoot = Tooltip.Root;
	import { positionStore } from '$lib/stores/positions.svelte';
	import { generateDualChartData, formatPrice, formatPnl } from '$lib/utils/payoff';
	import type { PayoffPoint } from '$lib/types/options';

	// Generate dual chart data reactively
	const chartData = $derived(
		generateDualChartData(
			positionStore.positions,
			positionStore.underlyingPrice,
			positionStore.daysToExpiry,
			positionStore.volatility,
			positionStore.riskFreeRate
		)
	);

	// Stats for display
	const stats = $derived({
		maxProfit: chartData.maxProfit,
		maxLoss: chartData.maxLoss,
		breakevens: chartData.breakevens
	});

	// Check if we're showing time value (slider not at 0)
	const showingTimeValue = $derived(positionStore.daysToExpiry > 0);

	// Find the at-expiry P&L for a given price (for tooltip)
	function findAtExpiryPnl(price: number): number | null {
		// Find closest price in atExpiry array
		let closest: PayoffPoint | null = null;
		let minDiff = Infinity;
		for (const point of chartData.atExpiry) {
			const diff = Math.abs(point.price - price);
			if (diff < minDiff) {
				minDiff = diff;
				closest = point;
			}
		}
		return closest?.pnl ?? null;
	}
</script>

<div class="flex flex-col h-full">
	<div class="flex items-center justify-between mb-2">
		<h2 class="text-lg font-semibold">
			{showingTimeValue ? `P&L (${positionStore.daysToExpiry} days to expiry)` : 'P&L at Expiry'}
		</h2>
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

	<div class="flex-1 bg-dark-card rounded-lg border border-dark-border p-4 overflow-hidden">
		{#if !positionStore.hasPositions}
			<div class="flex items-center justify-center h-full text-dark-muted">
				<p>Add positions to see the payoff chart</p>
			</div>
		{:else}
			<div style="height: 100%; width: 100%;">
				<Chart
					data={chartData.withTimeValue}
					x="price"
					y="pnl"
					yBaseline={0}
					yNice
					padding={{ top: 20, right: 20, bottom: 36, left: 50 }}
					tooltip={{ mode: 'bisect-x' }}
				>
					<Svg>
						<Axis
							placement="left"
							grid
							format={(d: number) =>
								formatPnl(d, positionStore.denomination, positionStore.underlyingPrice)}
							tickLabelProps={{ class: 'stroke-none fill-current' }}
						/>
						<Axis
							placement="bottom"
							format={(d: number) => formatPrice(d)}
							tickLabelProps={{ class: 'stroke-none fill-current' }}
						/>
						<!-- Time-value curve (solid, filled) -->
						<Area
							y0={0}
							line={{ stroke: 'var(--color-dark-text)', strokeWidth: 2 }}
							fill="var(--color-accent)"
							fillOpacity={0.3}
						/>
						<!-- At-expiry curve (lighter, no fill) - only show when time value is different -->
						{#if showingTimeValue}
							<Spline
								data={chartData.atExpiry}
								stroke="rgba(148, 163, 184, 0.5)"
								strokeWidth={1.5}
							/>
						{/if}
						<!-- Highlight vertical line on hover -->
						<Highlight lines={{ stroke: 'var(--color-dark-muted)', strokeWidth: 1 }} />
					</Svg>
					<!-- Tooltip -->
					<TooltipRoot
						x="data"
						y="pointer"
						anchor="top-left"
						variant="none"
					>
						{#snippet children({ data }: { data: PayoffPoint })}
							{@const atExpiryPnl = findAtExpiryPnl(data.price)}
							<div class="p-2 flex flex-col gap-1 bg-dark-card border border-dark-border rounded shadow-lg text-sm">
								<div class="font-medium border-b border-dark-border pb-1 mb-1">
									Price: {formatPrice(data.price)}
								</div>
								{#if showingTimeValue}
									<div class="flex justify-between gap-4">
										<span class="text-dark-muted">Current:</span>
										<span class="font-mono {data.pnl >= 0 ? 'text-profit' : 'text-loss'}">
											{formatPnl(data.pnl, positionStore.denomination, positionStore.underlyingPrice)}
										</span>
									</div>
								{/if}
								<div class="flex justify-between gap-4">
									<span class="text-dark-muted">At Expiry:</span>
									<span class="font-mono {(atExpiryPnl ?? 0) >= 0 ? 'text-profit' : 'text-loss'}">
										{atExpiryPnl !== null
											? formatPnl(atExpiryPnl, positionStore.denomination, positionStore.underlyingPrice)
											: '-'}
									</span>
								</div>
							</div>
						{/snippet}
					</TooltipRoot>
				</Chart>
			</div>
		{/if}
	</div>
</div>
