<script lang="ts">
	import VolatilityInput from './VolatilityInput.svelte';
	import ExpirySlider from './ExpirySlider.svelte';
</script>

<div class="flex gap-8 p-4 bg-dark-surface rounded-lg border border-dark-border">
	<div class="flex-1">
		<VolatilityInput />
	</div>
	<div class="flex-1">
		<ExpirySlider />
	</div>
</div>
