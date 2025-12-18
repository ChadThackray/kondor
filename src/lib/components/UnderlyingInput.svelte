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

<div class="flex items-center gap-3 w-full sm:w-auto">
	<!-- Bitcoin Logo -->
	<svg class="hidden md:block w-8 h-8 flex-shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="16" cy="16" r="16" fill="#F7931A"/>
		<path d="M22.5 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.6-.8.4 0 0-1.2-.3-1.2-.3l-.8 2 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.2 1.9-1 2.1-2.6zm-3.8 5.3c-.5 2.1-4.1 1-5.2.7l.9-3.7c1.2.3 4.9.9 4.3 3zm.5-5.4c-.5 1.9-3.4.9-4.4.7l.8-3.4c1 .3 4.1.7 3.6 2.7z" fill="white"/>
	</svg>
	<div class="flex items-center gap-2 flex-1 sm:flex-none">
		<span class="text-dark-muted font-medium">BTC</span>
		<div class="flex items-center flex-1 sm:flex-none bg-dark-card border border-dark-border rounded px-3 py-1.5">
			<span class="text-dark-muted mr-1">$</span>
			<input
				id="underlying-price"
				type="text"
				value={inputValue}
				oninput={handleInput}
				onblur={handleBlur}
				class="flex-1 sm:w-28 bg-transparent text-dark-text text-lg font-medium focus:outline-none"
				placeholder="100000"
			/>
		</div>
	</div>
</div>
