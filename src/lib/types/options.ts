/** Option contract type */
export type OptionType = 'call' | 'put';

/** Position direction */
export type Direction = 'long' | 'short';

/** Single option position */
export interface OptionPosition {
	id: string;
	optionType: OptionType;
	direction: Direction;
	strike: number;
	premium: number;
	quantity: number;
	expiryDate: Date;
}

/** Form input state (string values for input binding) */
export interface PositionFormState {
	optionType: OptionType;
	direction: Direction;
	strike: string;
	premium: string;
	quantity: string;
	expiryDate: string;
}

/** Validated position ready for creation (excludes id) */
export type NewPosition = Omit<OptionPosition, 'id'>;

/** Single data point for chart */
export interface PayoffPoint {
	price: number;
	pnl: number;
}

/** Individual position payoff series for chart overlay */
export interface PositionPayoffSeries {
	positionId: string;
	label: string;
	points: PayoffPoint[];
	color: string;
}

/** Chart data structure */
export interface ChartData {
	combined: PayoffPoint[];
	individual: PositionPayoffSeries[];
	breakevens: number[];
	maxProfit: number | 'unlimited';
	maxLoss: number | 'unlimited';
}
