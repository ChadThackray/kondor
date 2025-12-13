<script lang="ts">
	import { positionStore } from '$lib/stores/positions.svelte';

	let maxDays = $derived(positionStore.maxDaysToExpiry);
	let sliderValue = $derived(positionStore.daysToExpiry);

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value, 10);
		positionStore.setDaysToExpiry(value);
	}

	function formatLabel(days: number): string {
		if (days === 0) return 'At Expiry';
		if (days === 1) return '1 day';
		return `${days} days`;
	}
</script>

<div class="flex flex-col gap-1">
	<div class="flex justify-between items-center">
		<span class="text-sm text-dark-muted">Days to Expiry</span>
		<span class="text-sm font-medium text-dark-text">{formatLabel(sliderValue)}</span>
	</div>
	<input
		type="range"
		min="0"
		max={maxDays}
		step="1"
		value={sliderValue}
		oninput={handleInput}
		class="w-full h-2 bg-dark-card rounded-lg appearance-none cursor-pointer accent-accent"
	/>
</div>
