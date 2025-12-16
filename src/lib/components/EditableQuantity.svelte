<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		value: number;
		onchange: (newValue: number) => void;
	}

	let { value, onchange }: Props = $props();

	let isEditing = $state(false);
	let editValue = $state('');
	let hasError = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	function validate(val: string): number | null {
		const trimmed = val.trim();
		const num = parseInt(trimmed, 10);
		if (isNaN(num) || num < 1 || num > 1000 || String(num) !== trimmed) {
			return null;
		}
		return num;
	}

	async function startEditing(): Promise<void> {
		editValue = String(value);
		isEditing = true;
		hasError = false;
		await tick();
		inputEl?.focus();
		inputEl?.select();
	}

	function handleBlur(): void {
		const validated = validate(editValue);
		if (validated !== null && validated !== value) {
			onchange(validated);
		}
		isEditing = false;
		hasError = false;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			const validated = validate(editValue);
			if (validated !== null) {
				if (validated !== value) {
					onchange(validated);
				}
				isEditing = false;
				hasError = false;
			} else {
				hasError = true;
			}
		} else if (event.key === 'Escape') {
			isEditing = false;
			hasError = false;
		}
	}

	function handleInput(): void {
		hasError = validate(editValue) === null;
	}
</script>

{#if isEditing}
	<input
		bind:this={inputEl}
		type="text"
		bind:value={editValue}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		oninput={handleInput}
		class="w-16 px-1 py-0 text-right bg-dark-card border rounded text-sm font-mono
			focus:outline-none focus:ring-1 focus:ring-accent
			{hasError ? 'border-loss' : 'border-dark-border'}"
	/>
{:else}
	<button
		type="button"
		onclick={startEditing}
		class="hover:bg-dark-card/50 px-1 py-0.5 rounded cursor-pointer transition-colors"
		aria-label="Edit quantity"
	>
		{value}
	</button>
{/if}
