<script lang="ts">
	import type {
		OptionType,
		Direction,
		PositionFormState,
	} from "$lib/types/options";
	import { positionStore } from "$lib/stores/positions.svelte";

	function roundQuantity(n: number, decimals = 1): number {
		return Math.round(n * 10 ** decimals) / 10 ** decimals;
	}

	function getDefaultExpiryDate(): string {
		const date = new Date();
		date.setDate(date.getDate() + 30);
		return date.toISOString().split("T")[0];
	}

	let formState = $state<PositionFormState>({
		optionType: "call",
		direction: "long",
		strike: "",
		premium: "",
		quantity: "1",
		expiryDate: getDefaultExpiryDate(),
	});

	let errors = $state<Partial<Record<keyof PositionFormState, string>>>({});

	function validate(): boolean {
		const newErrors: typeof errors = {};

		const strike = parseFloat(formState.strike);
		if (isNaN(strike) || strike <= 0) {
			newErrors.strike = "Strike must be positive";
		}

		const premium = parseFloat(formState.premium);
		if (isNaN(premium) || premium < 0) {
			newErrors.premium = "Premium must be non-negative";
		}

		// Prevent BTC entry with invalid price
		if (
			positionStore.denomination === "btc" &&
			positionStore.underlyingPrice <= 0
		) {
			newErrors.premium =
				"Cannot enter BTC premium with invalid Bitcoin price";
		}

		const quantity = parseFloat(formState.quantity);
		if (isNaN(quantity) || quantity < 0.1 || quantity > 1000) {
			newErrors.quantity = "Quantity must be 0.1-1000";
		}

		const expiryDate = new Date(formState.expiryDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (isNaN(expiryDate.getTime()) || expiryDate <= today) {
			newErrors.expiryDate = "Expiry must be in the future";
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSubmit(event: Event) {
		event.preventDefault();

		if (!validate()) return;

		// Capture entry metadata before conversion
		const enteredPremium = parseFloat(formState.premium);
		const currentDenomination = positionStore.denomination;
		const currentBtcPrice = positionStore.underlyingPrice;

		// Calculate USD premium for storage
		let premiumInUsd = enteredPremium;
		let premiumInBtc: number | undefined = undefined;

		if (currentDenomination === "btc") {
			premiumInUsd = enteredPremium * currentBtcPrice;
			premiumInBtc = enteredPremium; // Preserve original BTC amount
		}

		positionStore.addPosition({
			optionType: formState.optionType,
			direction: formState.direction,
			strike: parseFloat(formState.strike),
			premium: premiumInUsd,
			quantity: roundQuantity(parseFloat(formState.quantity)),
			expiryDate: new Date(formState.expiryDate),
			// BTC-settled tracking metadata
			premiumBtc: premiumInBtc,
			btcPriceAtEntry: currentBtcPrice,
			denominationAtEntry: currentDenomination,
		});

		// Reset form (keep type, direction, and expiry, clear numbers)
		formState.strike = "";
		formState.premium = "";
		formState.quantity = "1";
		errors = {};
	}

	function setDirection(dir: Direction) {
		formState.direction = dir;
	}

	function setOptionType(type: OptionType) {
		formState.optionType = type;
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<h2 class="text-lg font-semibold">Add Position</h2>

	<!-- Option Type Toggle -->
	<div class="flex flex-col gap-1">
		<span class="text-sm text-dark-muted">Option Type</span>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => setOptionType("call")}
				class="flex-1 py-2 px-4 rounded text-sm font-medium transition-colors
               {formState.optionType === 'call'
					? 'bg-accent text-white'
					: 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'}"
			>
				Call
			</button>
			<button
				type="button"
				onclick={() => setOptionType("put")}
				class="flex-1 py-2 px-4 rounded text-sm font-medium transition-colors
               {formState.optionType === 'put'
					? 'bg-accent text-white'
					: 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'}"
			>
				Put
			</button>
		</div>
	</div>

	<!-- Direction Toggle -->
	<div class="flex flex-col gap-1">
		<span class="text-sm text-dark-muted">Direction</span>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => setDirection("long")}
				class="flex-1 py-2 px-4 rounded text-sm font-medium transition-colors
               {formState.direction === 'long'
					? 'bg-profit text-white'
					: 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'}"
			>
				Long
			</button>
			<button
				type="button"
				onclick={() => setDirection("short")}
				class="flex-1 py-2 px-4 rounded text-sm font-medium transition-colors
               {formState.direction === 'short'
					? 'bg-loss text-white'
					: 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'}"
			>
				Short
			</button>
		</div>
	</div>

	<!-- Strike Price -->
	<div class="flex flex-col gap-1">
		<label for="strike" class="text-sm text-dark-muted"
			>Strike Price (USD)</label
		>
		<input
			id="strike"
			type="text"
			bind:value={formState.strike}
			class="w-full px-3 py-2 bg-dark-card border rounded text-dark-text
             focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
             {errors.strike ? 'border-loss' : 'border-dark-border'}"
			placeholder="100000"
		/>
		{#if errors.strike}
			<span class="text-xs text-loss">{errors.strike}</span>
		{/if}
	</div>

	<!-- Premium -->
	<div class="flex flex-col gap-1">
		<label for="premium" class="text-sm text-dark-muted">
			Premium per contract ({positionStore.denomination === "usd" ? "USD" : "BTC"})
		</label>
		<input
			id="premium"
			type="text"
			bind:value={formState.premium}
			class="w-full px-3 py-2 bg-dark-card border rounded text-dark-text
             focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
             {errors.premium ? 'border-loss' : 'border-dark-border'}"
			placeholder={positionStore.denomination === "usd" ? "1000" : "0.01"}
		/>
		{#if errors.premium}
			<span class="text-xs text-loss">{errors.premium}</span>
		{/if}
	</div>

	<!-- Quantity -->
	<div class="flex flex-col gap-1">
		<label for="quantity" class="text-sm text-dark-muted">Quantity</label>
		<input
			id="quantity"
			type="text"
			bind:value={formState.quantity}
			class="w-full px-3 py-2 bg-dark-card border rounded text-dark-text
             focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
             {errors.quantity ? 'border-loss' : 'border-dark-border'}"
			placeholder="1"
		/>
		{#if errors.quantity}
			<span class="text-xs text-loss">{errors.quantity}</span>
		{/if}
	</div>

	<!-- Expiry Date -->
	<div class="flex flex-col gap-1">
		<label for="expiryDate" class="text-sm text-dark-muted"
			>Expiry Date</label
		>
		<input
			id="expiryDate"
			type="date"
			bind:value={formState.expiryDate}
			class="w-full px-3 py-2 bg-dark-card border rounded text-dark-text
             focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
             {errors.expiryDate ? 'border-loss' : 'border-dark-border'}"
		/>
		{#if errors.expiryDate}
			<span class="text-xs text-loss">{errors.expiryDate}</span>
		{/if}
	</div>

	<!-- Submit Button -->
	<button
		type="submit"
		class="w-full py-2 px-4 bg-accent text-white rounded font-medium
           hover:bg-accent/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-bg"
	>
		Add Position
	</button>
</form>
