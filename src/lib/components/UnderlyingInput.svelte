<script lang="ts">
	import { positionStore } from '$lib/stores/positions.svelte';

	let inputValue = $state(positionStore.underlyingPrice.toString());

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;

		const parsed = parseFloat(target.value);
		if (!isNaN(parsed) && parsed > 0) {
			positionStore.setUnderlyingPrice(parsed);
		}
	}

	function handleBlur() {
		// Reset to current store value if invalid
		const parsed = parseFloat(inputValue);
		if (isNaN(parsed) || parsed <= 0) {
			inputValue = positionStore.underlyingPrice.toString();
		}
	}
</script>

<div class="flex flex-col gap-1">
	<label for="underlying-price" class="text-sm text-dark-muted">Underlying Price (USD)</label>
	<input
		id="underlying-price"
		type="text"
		value={inputValue}
		oninput={handleInput}
		onblur={handleBlur}
		class="w-full px-3 py-2 bg-dark-card border border-dark-border rounded text-dark-text
           focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
		placeholder="100000"
	/>
</div>
