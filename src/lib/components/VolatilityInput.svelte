<script lang="ts">
	import { positionStore } from '$lib/stores/positions.svelte';

	let sliderValue = $state(positionStore.volatility * 100);

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseFloat(target.value);
		sliderValue = value;
		positionStore.setVolatility(value / 100);
	}
</script>

<div class="flex flex-col gap-1">
	<div class="flex justify-between items-center">
		<span class="text-sm text-dark-muted">Implied Volatility</span>
		<span class="text-sm font-medium text-dark-text">{sliderValue.toFixed(0)}%</span>
	</div>
	<input
		type="range"
		min="10"
		max="200"
		step="1"
		value={sliderValue}
		oninput={handleInput}
		class="w-full h-2 bg-dark-card rounded-lg appearance-none cursor-pointer accent-accent"
	/>
</div>
