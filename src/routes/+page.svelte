<script lang="ts">
	import AddPositionForm from '$lib/components/AddPositionForm.svelte';
	import UnderlyingInput from '$lib/components/UnderlyingInput.svelte';
	import PayoffChart from '$lib/components/PayoffChart.svelte';
	import PositionTable from '$lib/components/PositionTable.svelte';
	import ChartControls from '$lib/components/ChartControls.svelte';
</script>

<div class="h-screen flex flex-col p-4 gap-4">
	<!-- Header -->
	<header class="flex-none">
		<h1 class="text-2xl font-bold">Kondor</h1>
		<p class="text-dark-muted text-sm">Options Payoff Visualizer</p>
	</header>

	<!-- Main Content -->
	<div class="flex-1 flex gap-4 min-h-0">
		<!-- Left Panel: Position Entry -->
		<aside class="w-72 flex-none flex flex-col gap-4 bg-dark-card rounded-lg border border-dark-border p-4 overflow-y-auto">
			<UnderlyingInput />
			<hr class="border-dark-border" />
			<AddPositionForm />
		</aside>

		<!-- Center: Chart and Controls -->
		<main class="flex-1 min-w-0 min-h-0 flex flex-col gap-4">
			<ChartControls />
			<div class="flex-1 min-h-0">
				<PayoffChart />
			</div>
		</main>
	</div>

	<!-- Bottom: Position Table -->
	<footer class="flex-none max-h-64 overflow-y-auto bg-dark-card rounded-lg border border-dark-border p-4">
		<PositionTable />
	</footer>
</div>
