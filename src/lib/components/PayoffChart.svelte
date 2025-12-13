<script lang="ts">
	import { Chart, Svg, Axis, Area } from 'layerchart';
	import { positionStore } from '$lib/stores/positions.svelte';
	import { generateChartData, formatPrice, formatPnl } from '$lib/utils/payoff';

	// Generate chart data reactively
	const chartData = $derived(
		generateChartData(positionStore.positions, positionStore.underlyingPrice)
	);

	// Stats for display
	const stats = $derived({
		maxProfit: chartData.maxProfit,
		maxLoss: chartData.maxLoss,
		breakevens: chartData.breakevens
	});
</script>

<div class="flex flex-col h-full">
	<div class="flex items-center justify-between mb-2">
		<h2 class="text-lg font-semibold">P&L at Expiry</h2>
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
					data={chartData.combined}
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
						<Area
							y0={0}
							line={{ stroke: 'var(--color-dark-text)', strokeWidth: 2 }}
							fill="var(--color-accent)"
							fillOpacity={0.3}
						/>
					</Svg>
				</Chart>
			</div>
		{/if}
	</div>
</div>
