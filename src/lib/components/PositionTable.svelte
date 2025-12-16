<script lang="ts">
	import { positionStore } from '$lib/stores/positions.svelte';
	import { formatPrice, formatBtc } from '$lib/utils/payoff';
	import ToggleSwitch from './ToggleSwitch.svelte';
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Positions</h2>
		{#if positionStore.hasPositions}
			<button
				onclick={() => positionStore.clearAllPositions()}
				class="text-sm text-dark-muted hover:text-loss transition-colors"
			>
				Clear All
			</button>
		{/if}
	</div>

	{#if positionStore.positions.length === 0}
		<div class="text-center py-8 text-dark-muted">
			<p>No positions yet</p>
			<p class="text-sm">Add a position to see the payoff chart</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-dark-border text-dark-muted text-left">
						<th class="py-2 px-2 w-12"></th>
						<th class="py-2 px-2">Type</th>
						<th class="py-2 px-2">Dir</th>
						<th class="py-2 px-2 text-right">Strike</th>
						<th class="py-2 px-2 text-right">Premium</th>
						<th class="py-2 px-2 text-right">Qty</th>
						<th class="py-2 px-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each positionStore.positions as position (position.id)}
						<tr class="border-b border-dark-border/50 hover:bg-dark-card/50 {position.enabled === false ? 'opacity-50' : ''}">
							<td class="py-2 px-2">
								<ToggleSwitch
									checked={position.enabled !== false}
									onchange={() => positionStore.togglePosition(position.id)}
								/>
							</td>
							<td class="py-2 px-2">
								<span
									class="px-2 py-0.5 rounded text-xs font-medium
                    {position.optionType === 'call' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'}"
								>
									{position.optionType.toUpperCase()}
								</span>
							</td>
							<td class="py-2 px-2">
								<span
									class="font-medium
                    {position.direction === 'long' ? 'text-profit' : 'text-loss'}"
								>
									{position.direction.toUpperCase()}
								</span>
							</td>
							<td class="py-2 px-2 text-right font-mono">{formatPrice(position.strike)}</td>
							<td class="py-2 px-2 text-right font-mono">
								<div class="flex flex-col">
									<span>${position.premium.toFixed(2)}</span>
									<span class="text-dark-muted text-xs">
										{#if position.premiumBtc !== undefined}
											{formatBtc(position.premiumBtc)}
										{:else}
											{formatBtc(position.premium / position.btcPriceAtEntry)}
										{/if}
									</span>
								</div>
							</td>
							<td class="py-2 px-2 text-right">{position.quantity}</td>
							<td class="py-2 px-2">
								<button
									onclick={() => positionStore.removePosition(position.id)}
									class="text-dark-muted hover:text-loss transition-colors"
									title="Remove position"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
