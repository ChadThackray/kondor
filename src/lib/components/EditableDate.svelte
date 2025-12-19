<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		value: Date;
		onchange: (newValue: Date) => void;
		width?: string;
	}

	let { value, onchange, width = 'w-28' }: Props = $props();

	let isEditing = $state(false);
	let editValue = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	function toInputFormat(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	function formatDisplay(date: Date): string {
		return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
	}

	async function startEditing(): Promise<void> {
		editValue = toInputFormat(value);
		isEditing = true;
		await tick();
		inputEl?.focus();
	}

	function handleChange(): void {
		const newDate = new Date(editValue + 'T00:00:00');
		if (!isNaN(newDate.getTime()) && newDate.getTime() !== value.getTime()) {
			onchange(newDate);
		}
		isEditing = false;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleChange();
		} else if (event.key === 'Escape') {
			isEditing = false;
		}
	}
</script>

{#if isEditing}
	<input
		bind:this={inputEl}
		type="date"
		bind:value={editValue}
		onblur={handleChange}
		onkeydown={handleKeydown}
		class="{width} h-6 px-1 bg-dark-card border border-dark-border rounded text-sm font-mono
			focus:outline-none focus:ring-1 focus:ring-accent"
	/>
{:else}
	<button
		type="button"
		onclick={startEditing}
		class="{width} h-6 text-right hover:bg-dark-card/50 px-1 rounded cursor-pointer transition-colors"
		aria-label="Edit expiry date"
	>
		{formatDisplay(value)}
	</button>
{/if}
