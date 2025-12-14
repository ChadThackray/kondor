<script lang="ts">
	import { positionStore } from '$lib/stores/positions.svelte';

	let maxDays = $derived(positionStore.maxDaysToExpiry);
	let sliderValue = $derived(positionStore.daysToExpiry);

	// Calculate the selected date based on days to expiry
	// When at "Today" (sliderValue = maxDays), show today's date
	// When at "Expiry" (sliderValue = 0), show expiry date
	let selectedDate = $derived(() => {
		const date = new Date();
		date.setDate(date.getDate() + (maxDays - sliderValue));
		return date;
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value, 10);
		// Invert: slider 0 = today (maxDays), slider maxDays = expiry (0)
		positionStore.setDaysToExpiry(maxDays - value);
	}

	function formatDaysLabel(days: number): string {
		if (days === 0) return 'At Expiry';
		if (days === 1) return '1 day';
		return `${days} days`;
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="flex flex-col gap-1">
	<div class="flex justify-between items-center">
		<span class="text-sm text-dark-muted">Today</span>
		<span class="text-sm font-medium text-dark-text">
			{formatDate(selectedDate())} ({formatDaysLabel(sliderValue)})
		</span>
		<span class="text-sm text-dark-muted">Expiry</span>
	</div>
	<input
		type="range"
		min="0"
		max={maxDays}
		step="1"
		value={maxDays - sliderValue}
		oninput={handleInput}
		class="w-full h-2 bg-dark-card rounded-lg appearance-none cursor-pointer accent-accent"
	/>
</div>
