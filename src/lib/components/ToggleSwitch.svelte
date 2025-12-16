<script lang="ts">
	interface Props {
		checked: boolean;
		onchange: () => void;
	}

	let { checked, onchange }: Props = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label="Toggle position"
	onclick={onchange}
	class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200
		{checked ? 'bg-accent' : 'bg-dark-border'}"
>
	<span
		class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200
			{checked ? 'translate-x-5' : 'translate-x-1'}"
	></span>
</button>
