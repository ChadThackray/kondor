<script lang="ts">
	import { formatPrice, formatPnl } from '$lib/utils/payoff';
	import type { Denomination } from '$lib/types/options';

	interface Props {
		visible: boolean;
		x: number;
		y: number;
		price: number;
		currentPnl: number;
		atExpiryPnl: number | null;
		denomination: Denomination;
		btcPrice: number;
		showingTimeValue: boolean;
	}

	let {
		visible,
		x,
		y,
		price,
		currentPnl,
		atExpiryPnl,
		denomination,
		btcPrice,
		showingTimeValue
	}: Props = $props();

	// Smart positioning to avoid going off screen
	const position = $derived(() => {
		const tooltipWidth = 200;
		const tooltipHeight = 100;
		const padding = 10;

		// Check if tooltip would go off right edge
		const offsetX = x + tooltipWidth + padding > window.innerWidth ? -tooltipWidth - padding : padding;

		// Check if tooltip would go off bottom edge
		const offsetY = y + tooltipHeight + padding > window.innerHeight ? -tooltipHeight - padding : padding;

		return { x: x + offsetX, y: y + offsetY };
	});
</script>

{#if visible}
	<div
		class="absolute pointer-events-none z-10 bg-dark-card border border-dark-border rounded-lg p-2 shadow-lg"
		style:left="{position().x}px"
		style:top="{position().y}px"
	>
		<div class="border-b border-dark-border pb-1 mb-1 font-medium text-sm">
			Price: {formatPrice(price)}
		</div>
		{#if showingTimeValue}
			<div class="flex justify-between gap-4 text-xs mb-1">
				<span class="text-dark-muted">Current:</span>
				<span
					class="font-mono"
					class:text-profit={currentPnl >= 0}
					class:text-loss={currentPnl < 0}
				>
					{formatPnl(currentPnl, denomination, btcPrice)}
				</span>
			</div>
			{#if atExpiryPnl !== null}
				<div class="flex justify-between gap-4 text-xs">
					<span class="text-dark-muted">At Expiry:</span>
					<span
						class="font-mono"
						class:text-profit={atExpiryPnl >= 0}
						class:text-loss={atExpiryPnl < 0}
					>
						{formatPnl(atExpiryPnl, denomination, btcPrice)}
					</span>
				</div>
			{/if}
		{:else}
			<div class="flex justify-between gap-4 text-xs">
				<span class="text-dark-muted">P&L:</span>
				<span
					class="font-mono"
					class:text-profit={currentPnl >= 0}
					class:text-loss={currentPnl < 0}
				>
					{formatPnl(currentPnl, denomination, btcPrice)}
				</span>
			</div>
		{/if}
	</div>
{/if}
