<script lang="ts">
	import { Chart, Svg, Axis, Area, Spline } from 'layerchart';
	import { positionStore } from '$lib/stores/positions.svelte';
	import { generateDualChartData, formatPrice, formatPnl } from '$lib/utils/payoff';

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
						{stats.maxProfit === 'unlimited' ? 'Unlimited' : formatPnl(stats.maxProfit)}
					</span>
				</span>
				<span>
					Max Loss:
					<span class="text-loss font-mono">
						{stats.maxLoss === 'unlimited' ? 'Unlimited' : formatPnl(stats.maxLoss)}
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
				>
					<Svg>
						<Axis
							placement="left"
							grid
							format={(d: number) => formatPnl(d)}
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
					</Svg>
				</Chart>
			</div>
		{/if}
	</div>
</div>
