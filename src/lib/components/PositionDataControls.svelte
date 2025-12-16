<script lang="ts">
	import { positionStore } from '$lib/stores/positions.svelte';
	import {
		exportPositions,
		downloadAsJson,
		generateExportFilename,
		parseImportedJson
	} from '$lib/utils/position-io';

	let fileInput: HTMLInputElement;
	let errorMessage = $state<string | null>(null);
	let showConfirmDialog = $state(false);
	let pendingPositions = $state<typeof positionStore.positions | null>(null);

	function handleExport() {
		const data = exportPositions(positionStore.positions);
		downloadAsJson(data, generateExportFilename());
	}

	function handleImportClick() {
		fileInput.click();
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			const result = parseImportedJson(content);

			if (!result.success) {
				errorMessage = result.error;
				setTimeout(() => (errorMessage = null), 5000);
			} else if (positionStore.hasPositions) {
				pendingPositions = result.positions;
				showConfirmDialog = true;
			} else {
				positionStore.setPositions(result.positions);
			}
		};
		reader.readAsText(file);
		input.value = '';
	}

	function confirmImport() {
		if (pendingPositions) {
			positionStore.setPositions(pendingPositions);
		}
		showConfirmDialog = false;
		pendingPositions = null;
	}

	function cancelImport() {
		showConfirmDialog = false;
		pendingPositions = null;
	}
</script>

<div class="flex flex-col gap-1">
	<span class="text-sm text-dark-muted">Positions</span>
	<div class="flex gap-2">
		<button
			type="button"
			onclick={handleExport}
			disabled={!positionStore.hasPositions}
			class="py-2 px-4 rounded text-sm font-medium transition-colors
                   bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text
                   disabled:opacity-50 disabled:cursor-not-allowed"
		>
			Export
		</button>
		<button
			type="button"
			onclick={handleImportClick}
			class="py-2 px-4 rounded text-sm font-medium transition-colors
                   bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text"
		>
			Import
		</button>
	</div>
	<input
		bind:this={fileInput}
		type="file"
		accept=".json"
		onchange={handleFileSelect}
		class="hidden"
	/>
</div>

{#if errorMessage}
	<div
		class="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded shadow-lg text-sm"
	>
		{errorMessage}
	</div>
{/if}

{#if showConfirmDialog}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md">
			<h3 class="text-lg font-medium mb-2">Replace Existing Positions?</h3>
			<p class="text-dark-muted text-sm mb-4">
				You have {positionStore.positions.length} existing position{positionStore.positions
					.length === 1
					? ''
					: 's'}. Importing will replace all current positions with {pendingPositions?.length ?? 0} position{(pendingPositions?.length ?? 0) === 1 ? '' : 's'} from the file.
			</p>
			<div class="flex gap-2 justify-end">
				<button
					type="button"
					onclick={cancelImport}
					class="py-2 px-4 rounded text-sm font-medium
                           bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmImport}
					class="py-2 px-4 rounded text-sm font-medium bg-accent text-white hover:bg-accent/80"
				>
					Replace
				</button>
			</div>
		</div>
	</div>
{/if}
