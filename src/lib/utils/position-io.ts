import type { OptionPosition, OptionType, Direction, Denomination } from '$lib/types/options';

const EXPORT_VERSION = 1;

interface SerializedPosition extends Omit<OptionPosition, 'expiryDate'> {
	expiryDate: string;
}

interface ExportData {
	version: number;
	exportedAt: string;
	positions: SerializedPosition[];
}

/**
 * Serialize positions to export format
 */
export function exportPositions(positions: OptionPosition[]): ExportData {
	return {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		positions: positions.map((p) => ({
			...p,
			expiryDate: p.expiryDate.toISOString()
		}))
	};
}

/**
 * Trigger browser download of JSON data
 */
export function downloadAsJson(data: ExportData, filename: string): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Generate a filename for export based on current date
 */
export function generateExportFilename(): string {
	const date = new Date().toISOString().split('T')[0];
	return `kondor-positions-${date}.json`;
}

const VALID_OPTION_TYPES: OptionType[] = ['call', 'put'];
const VALID_DIRECTIONS: Direction[] = ['long', 'short'];
const VALID_DENOMINATIONS: Denomination[] = ['usd', 'btc'];

function isValidOptionType(value: unknown): value is OptionType {
	return typeof value === 'string' && VALID_OPTION_TYPES.includes(value as OptionType);
}

function isValidDirection(value: unknown): value is Direction {
	return typeof value === 'string' && VALID_DIRECTIONS.includes(value as Direction);
}

function isValidDenomination(value: unknown): value is Denomination {
	return typeof value === 'string' && VALID_DENOMINATIONS.includes(value as Denomination);
}

function isValidDate(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	const date = new Date(value);
	return !isNaN(date.getTime());
}

function validatePosition(pos: unknown, index: number): SerializedPosition {
	if (typeof pos !== 'object' || pos === null) {
		throw new Error(`Position ${index + 1}: Invalid format`);
	}

	const p = pos as Record<string, unknown>;

	if (typeof p.id !== 'string' || p.id.length === 0) {
		throw new Error(`Position ${index + 1}: Missing or invalid id`);
	}

	if (!isValidOptionType(p.optionType)) {
		throw new Error(`Position ${index + 1}: Invalid optionType (must be 'call' or 'put')`);
	}

	if (!isValidDirection(p.direction)) {
		throw new Error(`Position ${index + 1}: Invalid direction (must be 'long' or 'short')`);
	}

	if (typeof p.strike !== 'number' || p.strike <= 0) {
		throw new Error(`Position ${index + 1}: Invalid strike price`);
	}

	if (typeof p.premium !== 'number' || p.premium < 0) {
		throw new Error(`Position ${index + 1}: Invalid premium`);
	}

	if (typeof p.quantity !== 'number' || p.quantity <= 0) {
		throw new Error(`Position ${index + 1}: Invalid quantity`);
	}

	if (!isValidDate(p.expiryDate)) {
		throw new Error(`Position ${index + 1}: Invalid expiry date`);
	}

	if (typeof p.btcPriceAtEntry !== 'number' || p.btcPriceAtEntry <= 0) {
		throw new Error(`Position ${index + 1}: Invalid btcPriceAtEntry`);
	}

	if (!isValidDenomination(p.denominationAtEntry)) {
		throw new Error(
			`Position ${index + 1}: Invalid denominationAtEntry (must be 'usd' or 'btc')`
		);
	}

	return {
		id: p.id,
		optionType: p.optionType,
		direction: p.direction,
		strike: p.strike,
		premium: p.premium,
		quantity: p.quantity,
		expiryDate: p.expiryDate as string,
		premiumBtc: typeof p.premiumBtc === 'number' ? p.premiumBtc : undefined,
		btcPriceAtEntry: p.btcPriceAtEntry,
		denominationAtEntry: p.denominationAtEntry,
		enabled: typeof p.enabled === 'boolean' ? p.enabled : true
	};
}

export interface ParseResult {
	success: true;
	positions: OptionPosition[];
}

export interface ParseError {
	success: false;
	error: string;
}

/**
 * Parse and validate imported JSON
 */
export function parseImportedJson(jsonString: string): ParseResult | ParseError {
	let data: unknown;

	try {
		data = JSON.parse(jsonString);
	} catch {
		return { success: false, error: 'Invalid JSON format' };
	}

	if (typeof data !== 'object' || data === null) {
		return { success: false, error: 'Invalid export file format' };
	}

	const exportData = data as Record<string, unknown>;

	if (typeof exportData.version !== 'number') {
		return { success: false, error: 'Missing version in export file' };
	}

	if (exportData.version > EXPORT_VERSION) {
		return {
			success: false,
			error: `Unsupported version ${exportData.version}. Please update Kondor.`
		};
	}

	if (!Array.isArray(exportData.positions)) {
		return { success: false, error: 'Missing positions array in export file' };
	}

	try {
		const validatedPositions = exportData.positions.map((pos, index) =>
			validatePosition(pos, index)
		);

		const positions: OptionPosition[] = validatedPositions.map((p) => ({
			...p,
			expiryDate: new Date(p.expiryDate)
		}));

		return { success: true, positions };
	} catch (e) {
		return {
			success: false,
			error: e instanceof Error ? e.message : 'Unknown validation error'
		};
	}
}
