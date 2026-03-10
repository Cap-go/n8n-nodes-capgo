import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	IWebhookFunctions,
} from 'n8n-workflow';

type CapgoRequestContext = IExecuteFunctions | IHookFunctions | IWebhookFunctions;

interface CapgoCredentials {
	baseUrl: string;
}

interface CapgoRequestOptions {
	body?: IDataObject;
	headers?: IDataObject;
	json?: boolean;
	qs?: IDataObject;
}

interface SignatureVerificationResult {
	error?: string;
	timestamp: string | null;
	valid: boolean;
}

export const webhookEventOptions = [
	{
		name: 'App Changes',
		value: 'apps',
		description: 'Fire when apps are created, updated, or deleted',
	},
	{
		name: 'Bundle Changes',
		value: 'app_versions',
		description: 'Fire when bundles are created, updated, or deleted',
	},
	{
		name: 'Channel Updates',
		value: 'channels',
		description: 'Fire when channels are modified',
	},
	{
		name: 'Member Changes',
		value: 'org_users',
		description: 'Fire when organization members change',
	},
	{
		name: 'Organization Changes',
		value: 'orgs',
		description: 'Fire when organization settings change',
	},
] as const;

export const disableUpdateOptions = [
	{ name: 'None', value: 'none' },
	{ name: 'Patch', value: 'patch' },
	{ name: 'Minor', value: 'minor' },
	{ name: 'Major', value: 'major' },
	{ name: 'Version Number', value: 'version_number' },
];

export const apiKeyModeOptions = [
	{ name: 'All', value: 'all' },
	{ name: 'Read', value: 'read' },
	{ name: 'Write', value: 'write' },
	{ name: 'Upload', value: 'upload' },
];

export const inviteTypeOptions = [
	{ name: 'Read', value: 'read' },
	{ name: 'Upload', value: 'upload' },
	{ name: 'Write', value: 'write' },
	{ name: 'Admin', value: 'admin' },
	{ name: 'Super Admin', value: 'super_admin' },
	{ name: 'Org Member', value: 'org_member' },
	{ name: 'Org Billing Admin', value: 'org_billing_admin' },
	{ name: 'Org Admin', value: 'org_admin' },
	{ name: 'Org Super Admin', value: 'org_super_admin' },
];

export function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, '');
}

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDataObject(value: unknown): IDataObject {
	if (isDataObject(value)) {
		return value;
	}

	if (Array.isArray(value)) {
		return { value };
	}

	return {
		value,
	};
}

async function getBaseUrl(
	this: CapgoRequestContext,
	itemIndex = 0,
): Promise<string> {
	const credentials = await this.getCredentials<CapgoCredentials>('capgoApi', itemIndex);
	return normalizeBaseUrl(credentials.baseUrl);
}

export async function capgoApiRequest(
	this: CapgoRequestContext,
	method: IHttpRequestMethods,
	path: string,
	itemIndex = 0,
	options: CapgoRequestOptions = {},
): Promise<unknown> {
	const baseUrl = await getBaseUrl.call(this, itemIndex);

	const requestOptions: IHttpRequestOptions = {
		body: options.body,
		headers: {
			...(options.json === false ? {} : { 'Content-Type': 'application/json' }),
			Accept: options.json === false ? '*/*' : 'application/json',
			...(options.headers ?? {}),
		},
		json: options.json ?? true,
		method,
		qs: options.qs,
		url: `${baseUrl}${path}`,
	};

	return await this.helpers.httpRequestWithAuthentication.call(
		this,
		'capgoApi',
		requestOptions,
	);
}

export function buildExecutionItems(
	response: unknown,
	itemIndex: number,
): INodeExecutionData[] {
	if (Array.isArray(response)) {
		return response.map((entry) => ({
			json: toDataObject(entry),
			pairedItem: { item: itemIndex },
		}));
	}

	if (isDataObject(response) && Array.isArray(response.data)) {
		const { data, ...meta } = response;

		return data.map((entry) => ({
			json: isDataObject(entry)
				? {
						...entry,
						_meta: meta,
					}
				: {
						value: entry,
						_meta: meta,
					},
			pairedItem: { item: itemIndex },
		}));
	}

	return [
		{
			json: toDataObject(response),
			pairedItem: { item: itemIndex },
		},
	];
}

export function parseJsonInput(
	value: string,
	fieldName: string,
): IDataObject {
	if (value.trim() === '') {
		return {};
	}

	try {
		const parsed = JSON.parse(value);

		if (!isDataObject(parsed)) {
			throw new Error(`${fieldName} must be a JSON object`);
		}

		return parsed;
	} catch (error) {
		throw new Error(
			`Invalid JSON in ${fieldName}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export function splitCommaSeparatedValues(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function stringifyWebhookPayload(payload: unknown): string {
	if (typeof payload === 'string') {
		return payload;
	}

	return JSON.stringify(payload ?? {});
}

export function verifyCapgoSignature(
	signature: string,
	secret: string,
	body: string,
	maxAgeSeconds?: number,
): SignatureVerificationResult {
	const match = signature.match(/^v1=(\d+)\.([a-f0-9]+)$/i);
	if (!match) {
		return {
			error: 'Invalid signature format',
			timestamp: null,
			valid: false,
		};
	}

	const [, timestamp, receivedHmac] = match;
	const signaturePayload = `${timestamp}.${body}`;
	const expectedHmac = createHmac('sha256', secret)
		.update(signaturePayload)
		.digest('hex');

	if (expectedHmac.length !== receivedHmac.length) {
		return {
			error: 'HMAC length mismatch',
			timestamp,
			valid: false,
		};
	}

	const isValid = timingSafeEqual(
		Buffer.from(expectedHmac, 'utf8'),
		Buffer.from(receivedHmac, 'utf8'),
	);

	if (!isValid) {
		return {
			error: 'HMAC verification failed',
			timestamp,
			valid: false,
		};
	}

	if (maxAgeSeconds !== undefined && Number.isFinite(maxAgeSeconds)) {
		const ageInSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);
		if (ageInSeconds > maxAgeSeconds) {
			return {
				error: 'Signature timestamp is too old',
				timestamp,
				valid: false,
			};
		}
	}

	return {
		timestamp,
		valid: true,
	};
}
