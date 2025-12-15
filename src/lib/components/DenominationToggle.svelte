<script lang="ts">
	import { positionStore } from '$lib/stores/positions.svelte';
</script>

<div class="flex flex-col gap-1">
	<span class="text-sm text-dark-muted">Denomination</span>
	<div class="flex gap-2">
		<button
			type="button"
			onclick={() => positionStore.setDenomination('usd')}
			class="flex-1 py-2 px-4 rounded text-sm font-medium transition-colors
               {positionStore.denomination === 'usd'
				? 'bg-accent text-white'
				: 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'}"
		>
			USD
		</button>
		<button
			type="button"
			onclick={() => positionStore.setDenomination('btc')}
			class="flex-1 py-2 px-4 rounded text-sm font-medium transition-colors
               {positionStore.denomination === 'btc'
				? 'bg-accent text-white'
				: 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'}"
		>
			BTC
		</button>
	</div>
</div>
