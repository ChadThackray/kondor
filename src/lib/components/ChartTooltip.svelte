<script lang="ts">
	import { formatPrice, formatPnlDirect } from '$lib/utils/payoff';
	import type { Denomination } from '$lib/types/options';

	interface Props {
		visible: boolean;
		x: number;
		y: number;
		price: number;
		currentPnl: number;
		atExpiryPnl: number | null;
		denomination: Denomination;
		btcPrice: number; // Kept for backwards compatibility but not used for conversion
		showingTimeValue: boolean;
		containerWidth: number;
		containerHeight: number;
	}

	let {
		visible,
		x,
		y,
		price,
		currentPnl,
		atExpiryPnl,
		denomination,
		showingTimeValue,
		containerWidth,
		containerHeight
	}: Props = $props();

	// Smart positioning to avoid going off container edge
	// Using transform for flipping so we don't need to know exact tooltip dimensions
	const tooltipWidth = 280; // Approximate, for edge detection only
	const tooltipHeight = 140;
	const padding = 14;

	const flipX = $derived(x + tooltipWidth + padding > containerWidth);
	const flipY = $derived(y - tooltipHeight - padding < 0);

	const position = $derived(() => ({
		x: flipX ? x - padding : x + padding,
		y: flipY ? y + padding : y - padding
	}));

	const transform = $derived(() => {
		const translateX = flipX ? '-100%' : '0';
		const translateY = flipY ? '0' : '-100%';
		return `translate(${translateX}, ${translateY})`;
	});
</script>

{#if visible}
	<div
		class="absolute pointer-events-none z-10 bg-dark-card border border-dark-border rounded-lg p-4 shadow-lg"
		style:left="{position().x}px"
		style:top="{position().y}px"
		style:transform={transform()}
	>
		<div class="border-b border-dark-border pb-2 mb-2 font-medium text-lg">
			Price: {formatPrice(price)}
		</div>
		{#if showingTimeValue}
			<div class="flex justify-between gap-8 text-base mb-1">
				<span class="text-dark-muted">Current:</span>
				<span
					class="font-mono"
					class:text-profit={currentPnl >= 0}
					class:text-loss={currentPnl < 0}
				>
					{formatPnlDirect(currentPnl, denomination)}
				</span>
			</div>
			{#if atExpiryPnl !== null}
				<div class="flex justify-between gap-8 text-base">
					<span class="text-dark-muted">At Expiry:</span>
					<span
						class="font-mono"
						class:text-profit={atExpiryPnl >= 0}
						class:text-loss={atExpiryPnl < 0}
					>
						{formatPnlDirect(atExpiryPnl, denomination)}
					</span>
				</div>
			{/if}
		{:else}
			<div class="flex justify-between gap-8 text-base">
				<span class="text-dark-muted">P&L:</span>
				<span
					class="font-mono"
					class:text-profit={currentPnl >= 0}
					class:text-loss={currentPnl < 0}
				>
					{formatPnlDirect(currentPnl, denomination)}
				</span>
			</div>
		{/if}
	</div>
{/if}
