<script lang="ts">
	import AddPositionForm from '$lib/components/AddPositionForm.svelte';
	import PayoffChartD3 from '$lib/components/PayoffChartD3.svelte';
	import PositionTable from '$lib/components/PositionTable.svelte';
	import ChartControls from '$lib/components/ChartControls.svelte';
	import UnderlyingInput from '$lib/components/UnderlyingInput.svelte';
	import DenominationToggle from '$lib/components/DenominationToggle.svelte';
	import PositionDataControls from '$lib/components/PositionDataControls.svelte';
</script>

<div class="min-h-screen flex flex-col p-4 gap-4 max-w-[2000px] mx-auto">
	<!-- Header -->
	<header class="flex-none flex flex-col md:flex-row md:items-center md:justify-between gap-3">
		<div class="text-center md:text-left">
			<h1 class="text-xl md:text-2xl font-bold">Kondor</h1>
			<p class="text-dark-muted text-xs md:text-sm">Options Payoff Visualizer</p>
		</div>
		<div class="flex flex-col sm:flex-row sm:flex-wrap items-center gap-4 sm:gap-3 md:gap-4 w-full sm:w-auto">
			<div class="w-full sm:w-auto">
				<PositionDataControls />
			</div>
			<div class="w-full sm:w-auto">
				<DenominationToggle />
			</div>
			<div class="w-full sm:w-auto">
				<UnderlyingInput />
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col md:flex-row gap-4">
		<!-- Left Panel: Position Entry -->
		<aside class="w-full md:w-1/4 lg:w-1/5 md:min-w-64 md:max-w-sm flex flex-col gap-4 bg-dark-card rounded-lg border border-dark-border p-4 overflow-y-auto min-h-[300px]">
			<AddPositionForm />
		</aside>

		<!-- Center: Chart and Controls -->
		<main class="flex-1 min-w-0 flex flex-col gap-4">
			<ChartControls />
			<div class="flex-1 min-h-[300px] md:min-h-[400px]">
				<PayoffChartD3 />
			</div>
		</main>
	</div>

	<!-- Bottom: Position Table -->
	<footer class="flex-none bg-dark-card rounded-lg border border-dark-border p-4 max-h-[30vh] overflow-y-auto">
		<PositionTable />
	</footer>
</div>
