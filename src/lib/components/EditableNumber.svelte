<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		value: number;
		onchange: (newValue: number) => void;
		min?: number;
		max?: number;
		decimals?: number;
		format?: (value: number) => string;
		width?: string;
	}

	let { value, onchange, min = 0, max = Infinity, decimals = 2, format, width = 'w-20' }: Props = $props();

	let isEditing = $state(false);
	let editValue = $state('');
	let hasError = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	function roundValue(n: number): number {
		return Math.round(n * 10 ** decimals) / 10 ** decimals;
	}

	function validate(val: string): number | null {
		const trimmed = val.trim();
		const num = parseFloat(trimmed);
		if (isNaN(num) || num < min || num > max) {
			return null;
		}
		return roundValue(num);
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

	function displayValue(): string {
		if (format) {
			return format(value);
		}
		return String(value);
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
		class="{width} h-6 px-1 text-right bg-dark-card border rounded text-sm font-mono
			focus:outline-none focus:ring-1 focus:ring-accent
			{hasError ? 'border-loss' : 'border-dark-border'}"
	/>
{:else}
	<button
		type="button"
		onclick={startEditing}
		class="{width} h-6 text-right hover:bg-dark-card/50 px-1 rounded cursor-pointer transition-colors"
		aria-label="Edit value"
	>
		{displayValue()}
	</button>
{/if}
