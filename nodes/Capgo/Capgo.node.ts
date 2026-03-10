import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	apiKeyModeOptions,
	buildExecutionItems,
	capgoApiRequest,
	disableUpdateOptions,
	inviteTypeOptions,
	parseJsonInput,
	splitCommaSeparatedValues,
	webhookEventOptions,
} from './GenericFunctions';

const show = (
	resource: string | string[],
	operation: string | string[],
): { show: { operation: string[]; resource: string[] } } => ({
	show: {
		operation: Array.isArray(operation) ? operation : [operation],
		resource: Array.isArray(resource) ? resource : [resource],
	},
});

const stringField = (
	displayName: string,
	name: string,
	displayOptions: { show: { operation: string[]; resource: string[] } },
	options: Partial<INodeProperties> = {},
): INodeProperties => ({
	default: '',
	displayName,
	displayOptions,
	name,
	required: true,
	type: 'string',
	...options,
});

const booleanField = (
	displayName: string,
	name: string,
	displayOptions: { show: { operation: string[]; resource: string[] } },
	options: Partial<INodeProperties> = {},
): INodeProperties => ({
	default: false,
	displayName,
	displayOptions,
	name,
	type: 'boolean',
	...options,
});

const numberField = (
	displayName: string,
	name: string,
	displayOptions: { show: { operation: string[]; resource: string[] } },
	options: Partial<INodeProperties> = {},
): INodeProperties => ({
	default: 0,
	displayName,
	displayOptions,
	name,
	required: true,
	type: 'number',
	...options,
});

const jsonStringField = (
	displayName: string,
	name: string,
	displayOptions: { show: { operation: string[]; resource: string[] } },
	description: string,
): INodeProperties => ({
	default: '',
	description,
	displayName,
	displayOptions,
	name,
	placeholder: '{\n  "key": "value"\n}',
	type: 'string',
	typeOptions: {
		rows: 6,
	},
});

const keepTrueFalseField = (
	displayName: string,
	name: string,
	displayOptions: { show: { operation: string[]; resource: string[] } },
): INodeProperties => ({
	default: 'keep',
	displayName,
	displayOptions,
	name,
	options: [
		{ name: 'Keep Current', value: 'keep' },
		{ name: 'Enable', value: 'true' },
		{ name: 'Disable', value: 'false' },
	],
	type: 'options',
});

export class Capgo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Capgo',
		name: 'capgo',
		icon: 'file:../../icons/capgo.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage Capgo apps, channels, bundles, devices, organizations, API keys, statistics, builds, and webhooks',
		defaults: {
			name: 'Capgo',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'capgoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'API Key', value: 'apiKey' },
					{ name: 'App', value: 'app' },
					{ name: 'Build', value: 'build' },
					{ name: 'Bundle', value: 'bundle' },
					{ name: 'Channel', value: 'channel' },
					{ name: 'Custom Request', value: 'customRequest' },
					{ name: 'Device', value: 'device' },
					{ name: 'Organization', value: 'organization' },
					{ name: 'Statistic', value: 'statistic' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'app',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['app'],
					},
				},
				options: [
					{ name: 'Create', value: 'create', action: 'Create an app' },
					{ name: 'Delete', value: 'delete', action: 'Delete an app' },
					{ name: 'Get', value: 'get', action: 'Get an app' },
					{ name: 'List', value: 'list', action: 'List apps' },
					{ name: 'Update', value: 'update', action: 'Update an app' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['channel'],
					},
				},
				options: [
					{ name: 'Create', value: 'create', action: 'Create a channel' },
					{ name: 'Delete', value: 'delete', action: 'Delete a channel' },
					{ name: 'Get', value: 'get', action: 'Get a channel' },
					{ name: 'List', value: 'list', action: 'List channels' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['bundle'],
					},
				},
				options: [
					{ name: 'Create', value: 'create', action: 'Create a bundle' },
					{ name: 'Delete', value: 'delete', action: 'Delete a bundle' },
					{ name: 'List', value: 'list', action: 'List bundles' },
					{ name: 'Set Channel', value: 'setChannel', action: 'Assign a bundle to a channel' },
					{ name: 'Update Metadata', value: 'updateMetadata', action: 'Update bundle metadata' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['device'],
					},
				},
				options: [
					{ name: 'Delete Override', value: 'deleteOverride', action: 'Delete a device channel override' },
					{ name: 'Get', value: 'get', action: 'Get a device' },
					{ name: 'List', value: 'list', action: 'List devices' },
					{ name: 'Set Channel Override', value: 'setChannelOverride', action: 'Set a device channel override' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['organization'],
					},
				},
				options: [
					{ name: 'Create', value: 'create', action: 'Create an organization' },
					{ name: 'Delete', value: 'delete', action: 'Delete an organization' },
					{ name: 'Get', value: 'get', action: 'Get an organization' },
					{ name: 'Get Audit Logs', value: 'getAuditLogs', action: 'Get organization audit logs' },
					{ name: 'Invite Member', value: 'inviteMember', action: 'Invite a member to an organization' },
					{ name: 'List', value: 'list', action: 'List organizations' },
					{ name: 'List Members', value: 'listMembers', action: 'List organization members' },
					{ name: 'Remove Member', value: 'removeMember', action: 'Remove an organization member' },
					{ name: 'Update', value: 'update', action: 'Update an organization' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['apiKey'],
					},
				},
				options: [
					{ name: 'Create', value: 'create', action: 'Create an API key' },
					{ name: 'Delete', value: 'delete', action: 'Delete an API key' },
					{ name: 'Get', value: 'get', action: 'Get an API key' },
					{ name: 'List', value: 'list', action: 'List API keys' },
					{ name: 'Update', value: 'update', action: 'Update an API key' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['statistic'],
					},
				},
				options: [
					{ name: 'Get App Bundle Usage', value: 'getBundleUsage', action: 'Get bundle usage statistics for an app' },
					{ name: 'Get App Stats', value: 'getAppStats', action: 'Get statistics for an app' },
					{ name: 'Get Org Stats', value: 'getOrgStats', action: 'Get statistics for an organization' },
					{ name: 'Get User Stats', value: 'getUserStats', action: 'Get aggregated user statistics' },
				],
				default: 'getAppStats',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['build'],
					},
				},
				options: [
					{ name: 'Cancel', value: 'cancel', action: 'Cancel a native build' },
					{ name: 'Get Logs', value: 'getLogs', action: 'Get build logs' },
					{ name: 'Get Status', value: 'getStatus', action: 'Get build status' },
					{ name: 'Request', value: 'requestBuild', action: 'Request a native build' },
					{ name: 'Start', value: 'start', action: 'Start a native build' },
				],
				default: 'requestBuild',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['webhook'],
					},
				},
				options: [
					{ name: 'Create', value: 'create', action: 'Create a webhook' },
					{ name: 'Delete', value: 'delete', action: 'Delete a webhook' },
					{ name: 'Get', value: 'get', action: 'Get a webhook' },
					{ name: 'List', value: 'list', action: 'List webhooks' },
					{ name: 'List Deliveries', value: 'listDeliveries', action: 'List webhook deliveries' },
					{ name: 'Retry Delivery', value: 'retryDelivery', action: 'Retry a webhook delivery' },
					{ name: 'Test', value: 'test', action: 'Send a test webhook' },
					{ name: 'Update', value: 'update', action: 'Update a webhook' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['customRequest'],
					},
				},
				options: [
					{ name: 'Send', value: 'send', action: 'Send a custom request' },
				],
				default: 'send',
			},
			stringField('App ID', 'appId', show(['app', 'bundle', 'build', 'channel', 'device', 'statistic'], ['create', 'delete', 'get', 'getBundleUsage', 'getLogs', 'getStatus', 'getAppStats', 'list', 'requestBuild', 'setChannel', 'setChannelOverride', 'start', 'update', 'updateMetadata']), {
				description: 'Reverse-domain app identifier, for example com.example.app',
			}),
			stringField('Organization ID', 'orgId', show(['app', 'organization', 'webhook'], ['create', 'delete', 'get', 'getAuditLogs', 'inviteMember', 'list', 'listDeliveries', 'listMembers', 'removeMember', 'retryDelivery', 'test', 'update']), {
				description: 'Capgo organization UUID',
				required: false,
			}),
			stringField('Name', 'name', show(['apiKey', 'app', 'organization', 'webhook'], ['create', 'update']), {
				required: false,
			}),
			stringField('Icon URL', 'icon', show('app', ['create', 'update']), {
				required: false,
			}),
			stringField('Logo URL', 'logo', show('organization', ['update']), {
				description: 'Public image URL or Capgo image path',
				required: false,
			}),
			numberField('Retention', 'retention', show('app', ['update']), {
				default: -1,
				description: 'Retention in seconds. Use -1 to keep the current value',
				required: false,
			}),
			keepTrueFalseField('Expose Metadata', 'exposeMetadataUpdate', show('app', ['update'])),
			keepTrueFalseField('Allow Device Custom ID', 'allowDeviceCustomIdUpdate', show('app', ['update'])),
			stringField('Channel', 'channel', show(['channel', 'device'], ['create', 'delete', 'get', 'setChannelOverride']), {
				description: 'Channel name',
				required: false,
			}),
			stringField('Version', 'version', show(['bundle', 'channel'], ['create', 'delete']), {
				description: 'Bundle version name such as 1.0.0',
				required: false,
			}),
			booleanField('Public', 'public', show('channel', ['create'])),
			{
				displayName: 'Disable Auto Update',
				name: 'disableAutoUpdate',
				type: 'options',
				displayOptions: show('channel', ['create']),
				options: disableUpdateOptions,
				default: 'none',
				description: 'Block updates when a version difference matches this level',
			},
			booleanField('Disable Auto Update Under Native', 'disableAutoUpdateUnderNative', show('channel', ['create'])),
			booleanField('Allow Device Self Set', 'allowDeviceSelfSet', show('channel', ['create'])),
			booleanField('Allow Emulator', 'allowEmulator', show('channel', ['create'])),
			booleanField('Allow Device', 'allowDevice', show('channel', ['create'])),
			booleanField('Allow Dev', 'allowDev', show('channel', ['create'])),
			booleanField('Allow Prod', 'allowProd', show('channel', ['create'])),
			booleanField('iOS', 'ios', show('channel', ['create'])),
			booleanField('Android', 'android', show('channel', ['create'])),
			stringField('External URL', 'externalUrl', show('bundle', ['create']), {
				description: 'HTTPS URL of the ZIP bundle',
			}),
			stringField('Checksum', 'checksum', show('bundle', ['create'])),
			stringField('Session Key', 'sessionKey', show('bundle', ['create']), {
				description: 'Optional encrypted bundle session key',
				required: false,
			}),
			stringField('Key ID', 'keyId', show('bundle', ['create']), {
				description: 'Optional encryption key identifier',
				required: false,
			}),
			numberField('Version ID', 'versionId', show(['bundle'], ['setChannel', 'updateMetadata']), {
				default: 1,
			}),
			numberField('Channel ID', 'channelId', show('bundle', ['setChannel']), {
				default: 1,
			}),
			stringField('Link', 'link', show('bundle', ['updateMetadata']), {
				required: false,
			}),
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				displayOptions: show('bundle', ['updateMetadata']),
				default: '',
				typeOptions: {
					rows: 4,
				},
			},
			stringField('Device ID', 'deviceId', show('device', ['deleteOverride', 'get', 'setChannelOverride'])),
			booleanField('Custom ID Mode', 'customIdMode', show('device', ['get', 'list'])),
			stringField('Cursor', 'cursor', show('device', ['list']), {
				description: 'Pagination cursor from the previous response',
				required: false,
			}),
			numberField('Limit', 'limit', show(['app', 'device', 'organization'], ['list']), {
				default: 50,
				required: false,
			}),
			numberField('Page', 'page', show(['app', 'bundle', 'channel', 'organization', 'webhook'], ['list', 'getAuditLogs', 'listDeliveries']), {
				default: 0,
				required: false,
			}),
			stringField('Email', 'email', show('organization', ['create', 'inviteMember', 'removeMember']), {
				required: false,
			}),
			{
				displayName: 'Invite Type',
				name: 'inviteType',
				type: 'options',
				displayOptions: show('organization', ['inviteMember']),
				options: inviteTypeOptions,
				default: 'org_member',
			},
			stringField('Management Email', 'managementEmail', show('organization', ['update']), {
				required: false,
			}),
			numberField('Max API Key Expiration Days', 'maxApikeyExpirationDays', show('organization', ['update']), {
				default: -1,
				required: false,
			}),
			keepTrueFalseField('Require API Key Expiration', 'requireApikeyExpirationUpdate', show('organization', ['update'])),
			keepTrueFalseField('Enforce Hashed API Keys', 'enforceHashedApiKeysUpdate', show('organization', ['update'])),
			keepTrueFalseField('Enforce 2FA', 'enforcing2FaUpdate', show('organization', ['update'])),
			stringField('API Key ID', 'apiKeyId', show('apiKey', ['delete', 'get', 'update']), {
				description: 'Numeric key ID or raw key value',
			}),
			{
				displayName: 'Mode',
				name: 'createMode',
				type: 'options',
				displayOptions: show('apiKey', ['create']),
				options: apiKeyModeOptions,
				default: 'all',
			},
			{
				displayName: 'Mode',
				name: 'updateMode',
				type: 'options',
				displayOptions: show('apiKey', ['update']),
				options: [
					{ name: 'Keep Current', value: '' },
					...apiKeyModeOptions,
				],
				default: '',
			},
			stringField('App Scope List', 'limitedToApps', show('apiKey', ['create', 'update']), {
				description: 'Comma-separated list of app IDs',
				required: false,
			}),
			stringField('Org Scope List', 'limitedToOrgs', show('apiKey', ['create', 'update']), {
				description: 'Comma-separated list of organization IDs',
				required: false,
			}),
			booleanField('Hashed Key', 'hashed', show('apiKey', ['create'])),
			stringField('Expiration Timestamp', 'expiresAt', show('apiKey', ['create', 'update']), {
				description: 'ISO timestamp or empty to leave unchanged',
				placeholder: '2026-12-31T23:59:59.000Z',
				required: false,
			}),
			booleanField('Regenerate Key', 'regenerate', show('apiKey', ['update'])),
			stringField('From', 'from', show('statistic', ['getAppStats', 'getBundleUsage', 'getOrgStats', 'getUserStats']), {
				description: 'ISO date or datetime',
				placeholder: '2026-01-01T00:00:00.000Z',
			}),
			stringField('To', 'to', show('statistic', ['getAppStats', 'getBundleUsage', 'getOrgStats', 'getUserStats']), {
				description: 'ISO date or datetime',
				placeholder: '2026-01-31T23:59:59.000Z',
			}),
			booleanField('Breakdown', 'breakdown', show('statistic', ['getOrgStats'])),
			booleanField('No Accumulate', 'noAccumulate', show('statistic', ['getAppStats', 'getOrgStats', 'getUserStats'])),
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				displayOptions: show('build', ['getStatus', 'requestBuild']),
				options: [
					{ name: 'Android', value: 'android' },
					{ name: 'iOS', value: 'ios' },
				],
				default: 'ios',
			},
			{
				displayName: 'Build Mode',
				name: 'buildMode',
				type: 'options',
				displayOptions: show('build', ['requestBuild']),
				options: [
					{ name: 'Debug', value: 'debug' },
					{ name: 'Release', value: 'release' },
				],
				default: 'release',
			},
			jsonStringField('Build Config JSON', 'buildConfigJson', show('build', ['requestBuild']), 'Optional JSON object passed as build_config'),
			jsonStringField('Build Options JSON', 'buildOptionsJson', show('build', ['requestBuild']), 'Optional JSON object passed as build_options'),
			jsonStringField('Build Credentials JSON', 'buildCredentialsJson', show('build', ['requestBuild']), 'Optional JSON object passed as build_credentials'),
			stringField('Job ID', 'jobId', show('build', ['cancel', 'getLogs', 'getStatus', 'start'])),
			stringField('Webhook ID', 'webhookId', show('webhook', ['delete', 'get', 'listDeliveries', 'test', 'update']), {
				required: false,
			}),
			{
				displayName: 'Events',
				name: 'createEvents',
				type: 'multiOptions',
				displayOptions: show('webhook', ['create']),
				options: [...webhookEventOptions],
				default: ['app_versions'],
				required: true,
			},
			{
				displayName: 'Events',
				name: 'updateEvents',
				type: 'multiOptions',
				displayOptions: show('webhook', ['update']),
				options: [...webhookEventOptions],
				default: [],
			},
			stringField('Webhook URL', 'url', show('webhook', ['create', 'update']), {
				required: false,
			}),
			booleanField('Enabled', 'enabledCreate', show('webhook', ['create']), { default: true }),
			keepTrueFalseField('Enabled', 'enabledUpdate', show('webhook', ['update'])),
			stringField('Delivery ID', 'deliveryId', show('webhook', ['retryDelivery'])),
			{
				displayName: 'Status Filter',
				name: 'deliveryStatus',
				type: 'options',
				displayOptions: show('webhook', ['listDeliveries']),
				options: [
					{ name: 'All', value: '' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Success', value: 'success' },
				],
				default: '',
			},
			{
				displayName: 'HTTP Method',
				name: 'customMethod',
				type: 'options',
				displayOptions: show('customRequest', ['send']),
				options: [
					{ name: 'Delete', value: 'DELETE' },
					{ name: 'Get', value: 'GET' },
					{ name: 'Head', value: 'HEAD' },
					{ name: 'Options', value: 'OPTIONS' },
					{ name: 'Patch', value: 'PATCH' },
					{ name: 'Post', value: 'POST' },
					{ name: 'Put', value: 'PUT' },
				],
				default: 'GET',
			},
			stringField('Path', 'customPath', show('customRequest', ['send']), {
				description: 'Path relative to the Capgo base URL, for example /app or /build/upload/job-id',
			}),
			jsonStringField('Query JSON', 'customQueryJson', show('customRequest', ['send']), 'Optional query object'),
			jsonStringField('Body JSON', 'customBodyJson', show('customRequest', ['send']), 'Optional request body object'),
			{
				displayName: 'Response Format',
				name: 'customResponseFormat',
				type: 'options',
				displayOptions: show('customRequest', ['send']),
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'Text', value: 'text' },
				],
				default: 'json',
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let body: IDataObject | undefined;
				let method: IHttpRequestMethods = 'GET';
				let path = '';
				let qs: IDataObject | undefined;
				let responseFormat: 'json' | 'text' = 'json';

				switch (resource) {
					case 'app': {
						if (operation === 'list') {
							qs = {};
							const orgId = this.getNodeParameter('orgId', i, '') as string;
							const page = this.getNodeParameter('page', i, 0) as number;
							const limit = this.getNodeParameter('limit', i, 50) as number;
							if (orgId) {
								qs.org_id = orgId;
							}
							if (page > 0) {
								qs.page = page;
							}
							if (limit > 0) {
								qs.limit = limit;
							}
							path = '/app';
						} else if (operation === 'get') {
							path = `/app/${this.getNodeParameter('appId', i) as string}`;
						} else if (operation === 'create') {
							method = 'POST';
							path = '/app';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								name: this.getNodeParameter('name', i) as string,
								owner_org: this.getNodeParameter('orgId', i) as string,
							};
							const icon = this.getNodeParameter('icon', i, '') as string;
							if (icon) {
								body.icon = icon;
							}
						} else if (operation === 'update') {
							method = 'PUT';
							path = `/app/${this.getNodeParameter('appId', i) as string}`;
							body = {};
							const name = this.getNodeParameter('name', i, '') as string;
							const icon = this.getNodeParameter('icon', i, '') as string;
							const retention = this.getNodeParameter('retention', i, -1) as number;
							const exposeMetadataUpdate = this.getNodeParameter('exposeMetadataUpdate', i, 'keep') as string;
							const allowDeviceCustomIdUpdate = this.getNodeParameter('allowDeviceCustomIdUpdate', i, 'keep') as string;
							if (name) body.name = name;
							if (icon) body.icon = icon;
							if (retention >= 0) body.retention = retention;
							if (exposeMetadataUpdate !== 'keep') body.expose_metadata = exposeMetadataUpdate === 'true';
							if (allowDeviceCustomIdUpdate !== 'keep') body.allow_device_custom_id = allowDeviceCustomIdUpdate === 'true';
						} else if (operation === 'delete') {
							method = 'DELETE';
							path = `/app/${this.getNodeParameter('appId', i) as string}`;
						}
						break;
					}
					case 'channel': {
						path = '/channel';
						if (operation === 'list' || operation === 'get') {
							const appId = this.getNodeParameter('appId', i) as string;
							qs = { app_id: appId };
							const page = this.getNodeParameter('page', i, 0) as number;
							if (page > 0) {
								qs.page = page;
							}
							if (operation === 'get') {
								qs.channel = this.getNodeParameter('channel', i) as string;
							}
						} else if (operation === 'create') {
							method = 'POST';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								channel: this.getNodeParameter('channel', i) as string,
								version: this.getNodeParameter('version', i, '') as string || 'unknown',
								public: this.getNodeParameter('public', i, false) as boolean,
								disableAutoUpdate: this.getNodeParameter('disableAutoUpdate', i, 'none') as string,
								disableAutoUpdateUnderNative: this.getNodeParameter('disableAutoUpdateUnderNative', i, false) as boolean,
								allow_device_self_set: this.getNodeParameter('allowDeviceSelfSet', i, false) as boolean,
								allow_emulator: this.getNodeParameter('allowEmulator', i, false) as boolean,
								allow_device: this.getNodeParameter('allowDevice', i, false) as boolean,
								allow_dev: this.getNodeParameter('allowDev', i, false) as boolean,
								allow_prod: this.getNodeParameter('allowProd', i, false) as boolean,
								ios: this.getNodeParameter('ios', i, false) as boolean,
								android: this.getNodeParameter('android', i, false) as boolean,
							};
						} else if (operation === 'delete') {
							method = 'DELETE';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								channel: this.getNodeParameter('channel', i) as string,
							};
						}
						break;
					}
					case 'bundle': {
						if (operation === 'list') {
							path = '/bundle';
							qs = {
								app_id: this.getNodeParameter('appId', i) as string,
							};
							const page = this.getNodeParameter('page', i, 0) as number;
							if (page > 0) {
								qs.page = page;
							}
						} else if (operation === 'create') {
							method = 'POST';
							path = '/bundle';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								version: this.getNodeParameter('version', i) as string,
								external_url: this.getNodeParameter('externalUrl', i) as string,
								checksum: this.getNodeParameter('checksum', i) as string,
							};
							const sessionKey = this.getNodeParameter('sessionKey', i, '') as string;
							const keyId = this.getNodeParameter('keyId', i, '') as string;
							if (sessionKey) body.session_key = sessionKey;
							if (keyId) body.key_id = keyId;
						} else if (operation === 'delete') {
							method = 'DELETE';
							path = '/bundle';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
							};
							const version = this.getNodeParameter('version', i, '') as string;
							if (version) body.version = version;
						} else if (operation === 'setChannel') {
							method = 'PUT';
							path = '/bundle';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								version_id: this.getNodeParameter('versionId', i) as number,
								channel_id: this.getNodeParameter('channelId', i) as number,
							};
						} else if (operation === 'updateMetadata') {
							method = 'POST';
							path = '/bundle/metadata';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								version_id: this.getNodeParameter('versionId', i) as number,
							};
							const link = this.getNodeParameter('link', i, '') as string;
							const comment = this.getNodeParameter('comment', i, '') as string;
							if (link) body.link = link;
							if (comment) body.comment = comment;
						}
						break;
					}
					case 'device': {
						path = '/device';
						if (operation === 'list' || operation === 'get') {
							qs = {
								app_id: this.getNodeParameter('appId', i) as string,
								customIdMode: this.getNodeParameter('customIdMode', i, false) as boolean,
							};
							if (operation === 'get') {
								qs.device_id = this.getNodeParameter('deviceId', i) as string;
							}
							const cursor = this.getNodeParameter('cursor', i, '') as string;
							const limit = this.getNodeParameter('limit', i, 50) as number;
							if (cursor) qs.cursor = cursor;
							if (limit > 0) qs.limit = limit;
						} else if (operation === 'setChannelOverride') {
							method = 'POST';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								device_id: this.getNodeParameter('deviceId', i) as string,
								channel: this.getNodeParameter('channel', i) as string,
							};
						} else if (operation === 'deleteOverride') {
							method = 'DELETE';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								device_id: this.getNodeParameter('deviceId', i) as string,
							};
						}
						break;
					}
					case 'organization': {
						if (operation === 'list') {
							path = '/organization';
							qs = {};
							const page = this.getNodeParameter('page', i, 0) as number;
							const limit = this.getNodeParameter('limit', i, 50) as number;
							if (page > 0) qs.page = page;
							if (limit > 0) qs.limit = limit;
						} else if (operation === 'get') {
							path = '/organization';
							qs = {
								orgId: this.getNodeParameter('orgId', i) as string,
							};
						} else if (operation === 'create') {
							method = 'POST';
							path = '/organization';
							body = {
								name: this.getNodeParameter('name', i) as string,
							};
							const email = this.getNodeParameter('email', i, '') as string;
							if (email) body.email = email;
						} else if (operation === 'update') {
							method = 'PUT';
							path = '/organization';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
							};
							const name = this.getNodeParameter('name', i, '') as string;
							const logo = this.getNodeParameter('logo', i, '') as string;
							const managementEmail = this.getNodeParameter('managementEmail', i, '') as string;
							const maxApikeyExpirationDays = this.getNodeParameter('maxApikeyExpirationDays', i, -1) as number;
							const requireApikeyExpirationUpdate = this.getNodeParameter('requireApikeyExpirationUpdate', i, 'keep') as string;
							const enforceHashedApiKeysUpdate = this.getNodeParameter('enforceHashedApiKeysUpdate', i, 'keep') as string;
							const enforcing2FaUpdate = this.getNodeParameter('enforcing2FaUpdate', i, 'keep') as string;
							if (name) body.name = name;
							if (logo) body.logo = logo;
							if (managementEmail) body.management_email = managementEmail;
							if (requireApikeyExpirationUpdate !== 'keep') body.require_apikey_expiration = requireApikeyExpirationUpdate === 'true';
							if (maxApikeyExpirationDays >= 0) body.max_apikey_expiration_days = maxApikeyExpirationDays;
							if (enforceHashedApiKeysUpdate !== 'keep') body.enforce_hashed_api_keys = enforceHashedApiKeysUpdate === 'true';
							if (enforcing2FaUpdate !== 'keep') body.enforcing_2fa = enforcing2FaUpdate === 'true';
						} else if (operation === 'delete') {
							method = 'DELETE';
							path = '/organization';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
							};
						} else if (operation === 'listMembers') {
							path = '/organization/members';
							qs = {
								orgId: this.getNodeParameter('orgId', i) as string,
							};
						} else if (operation === 'inviteMember') {
							method = 'POST';
							path = '/organization/members';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
								email: this.getNodeParameter('email', i) as string,
								invite_type: this.getNodeParameter('inviteType', i) as string,
							};
						} else if (operation === 'removeMember') {
							method = 'DELETE';
							path = '/organization/members';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
								email: this.getNodeParameter('email', i) as string,
							};
						} else if (operation === 'getAuditLogs') {
							path = '/organization/audit';
							qs = {
								orgId: this.getNodeParameter('orgId', i) as string,
							};
							const page = this.getNodeParameter('page', i, 0) as number;
							const limit = this.getNodeParameter('limit', i, 50) as number;
							if (page > 0) qs.page = page;
							if (limit > 0) qs.limit = limit;
						}
						break;
					}
					case 'apiKey': {
						if (operation === 'list') {
							path = '/apikey';
						} else if (operation === 'get') {
							path = `/apikey/${this.getNodeParameter('apiKeyId', i) as string}`;
						} else if (operation === 'create') {
							method = 'POST';
							path = '/apikey';
							body = {
								name: this.getNodeParameter('name', i) as string,
								mode: this.getNodeParameter('createMode', i, 'all') as string,
								hashed: this.getNodeParameter('hashed', i, false) as boolean,
							};
							const orgId = this.getNodeParameter('orgId', i, '') as string;
							const appId = this.getNodeParameter('appId', i, '') as string;
							const limitedToApps = splitCommaSeparatedValues(this.getNodeParameter('limitedToApps', i, '') as string);
							const limitedToOrgs = splitCommaSeparatedValues(this.getNodeParameter('limitedToOrgs', i, '') as string);
							const expiresAt = this.getNodeParameter('expiresAt', i, '') as string;
							if (orgId) body.org_id = orgId;
							if (appId) body.app_id = appId;
							if (limitedToApps.length > 0) body.limited_to_apps = limitedToApps;
							if (limitedToOrgs.length > 0) body.limited_to_orgs = limitedToOrgs;
							if (expiresAt) body.expires_at = expiresAt;
						} else if (operation === 'update') {
							method = 'PUT';
							const apiKeyId = this.getNodeParameter('apiKeyId', i) as string;
							path = `/apikey/${apiKeyId}`;
							body = {};
							const name = this.getNodeParameter('name', i, '') as string;
							const mode = this.getNodeParameter('updateMode', i, '') as string;
							const limitedToApps = splitCommaSeparatedValues(this.getNodeParameter('limitedToApps', i, '') as string);
							const limitedToOrgs = splitCommaSeparatedValues(this.getNodeParameter('limitedToOrgs', i, '') as string);
							const expiresAt = this.getNodeParameter('expiresAt', i, '') as string;
							if (name) body.name = name;
							if (mode) body.mode = mode;
							if ((this.getNodeParameter('limitedToApps', i, '') as string).trim() !== '') body.limited_to_apps = limitedToApps;
							if ((this.getNodeParameter('limitedToOrgs', i, '') as string).trim() !== '') body.limited_to_orgs = limitedToOrgs;
							if (expiresAt) body.expires_at = expiresAt;
							body.regenerate = this.getNodeParameter('regenerate', i, false) as boolean;
						} else if (operation === 'delete') {
							method = 'DELETE';
							path = `/apikey/${this.getNodeParameter('apiKeyId', i) as string}`;
						}
						break;
					}
					case 'statistic': {
						const from = this.getNodeParameter('from', i) as string;
						const to = this.getNodeParameter('to', i) as string;
						qs = { from, to };
						if (operation === 'getAppStats') {
							path = `/statistics/app/${this.getNodeParameter('appId', i) as string}`;
							qs.noAccumulate = this.getNodeParameter('noAccumulate', i, false) as boolean;
						} else if (operation === 'getOrgStats') {
							path = `/statistics/org/${this.getNodeParameter('orgId', i) as string}`;
							qs.breakdown = this.getNodeParameter('breakdown', i, false) as boolean;
							qs.noAccumulate = this.getNodeParameter('noAccumulate', i, false) as boolean;
						} else if (operation === 'getBundleUsage') {
							path = `/statistics/app/${this.getNodeParameter('appId', i) as string}/bundle_usage`;
						} else if (operation === 'getUserStats') {
							path = '/statistics/user';
							qs.noAccumulate = this.getNodeParameter('noAccumulate', i, false) as boolean;
						}
						break;
					}
					case 'build': {
						if (operation === 'requestBuild') {
							method = 'POST';
							path = '/build/request';
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
								platform: this.getNodeParameter('platform', i) as string,
								build_mode: this.getNodeParameter('buildMode', i, 'release') as string,
							};
							const buildConfigJson = this.getNodeParameter('buildConfigJson', i, '') as string;
							const buildOptionsJson = this.getNodeParameter('buildOptionsJson', i, '') as string;
							const buildCredentialsJson = this.getNodeParameter('buildCredentialsJson', i, '') as string;
							if (buildConfigJson) body.build_config = parseJsonInput(buildConfigJson, 'Build Config JSON');
							if (buildOptionsJson) body.build_options = parseJsonInput(buildOptionsJson, 'Build Options JSON');
							if (buildCredentialsJson) body.build_credentials = parseJsonInput(buildCredentialsJson, 'Build Credentials JSON');
						} else if (operation === 'getStatus') {
							path = '/build/status';
							qs = {
								app_id: this.getNodeParameter('appId', i) as string,
								job_id: this.getNodeParameter('jobId', i) as string,
								platform: this.getNodeParameter('platform', i) as string,
							};
						} else if (operation === 'start') {
							method = 'POST';
							path = `/build/start/${this.getNodeParameter('jobId', i) as string}`;
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
							};
						} else if (operation === 'cancel') {
							method = 'POST';
							path = `/build/cancel/${this.getNodeParameter('jobId', i) as string}`;
							body = {
								app_id: this.getNodeParameter('appId', i) as string,
							};
						} else if (operation === 'getLogs') {
							path = `/build/logs/${this.getNodeParameter('jobId', i) as string}`;
							qs = {
								app_id: this.getNodeParameter('appId', i) as string,
							};
							responseFormat = 'text';
						}
						break;
					}
					case 'webhook': {
						if (operation === 'list') {
							path = '/webhooks';
							qs = {
								orgId: this.getNodeParameter('orgId', i) as string,
							};
							const page = this.getNodeParameter('page', i, 0) as number;
							if (page > 0) qs.page = page;
						} else if (operation === 'get') {
							path = '/webhooks';
							qs = {
								orgId: this.getNodeParameter('orgId', i) as string,
								webhookId: this.getNodeParameter('webhookId', i) as string,
							};
						} else if (operation === 'create') {
							method = 'POST';
							path = '/webhooks';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
								name: this.getNodeParameter('name', i) as string,
								url: this.getNodeParameter('url', i) as string,
								events: this.getNodeParameter('createEvents', i) as string[],
								enabled: this.getNodeParameter('enabledCreate', i, true) as boolean,
							};
						} else if (operation === 'update') {
							method = 'PUT';
							path = '/webhooks';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
								webhookId: this.getNodeParameter('webhookId', i) as string,
							};
							const name = this.getNodeParameter('name', i, '') as string;
							const url = this.getNodeParameter('url', i, '') as string;
							const updateEvents = this.getNodeParameter('updateEvents', i, []) as string[];
							const enabledUpdate = this.getNodeParameter('enabledUpdate', i, 'keep') as string;
							if (name) body.name = name;
							if (url) body.url = url;
							if (updateEvents.length > 0) body.events = updateEvents;
							if (enabledUpdate !== 'keep') body.enabled = enabledUpdate === 'true';
						} else if (operation === 'delete') {
							method = 'DELETE';
							path = '/webhooks';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
								webhookId: this.getNodeParameter('webhookId', i) as string,
							};
						} else if (operation === 'test') {
							method = 'POST';
							path = '/webhooks/test';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
								webhookId: this.getNodeParameter('webhookId', i) as string,
							};
						} else if (operation === 'listDeliveries') {
							path = '/webhooks/deliveries';
							qs = {
								orgId: this.getNodeParameter('orgId', i) as string,
								webhookId: this.getNodeParameter('webhookId', i) as string,
							};
							const page = this.getNodeParameter('page', i, 0) as number;
							const deliveryStatus = this.getNodeParameter('deliveryStatus', i, '') as string;
							if (page > 0) qs.page = page;
							if (deliveryStatus) qs.status = deliveryStatus;
						} else if (operation === 'retryDelivery') {
							method = 'POST';
							path = '/webhooks/deliveries/retry';
							body = {
								orgId: this.getNodeParameter('orgId', i) as string,
								deliveryId: this.getNodeParameter('deliveryId', i) as string,
							};
						}
						break;
					}
					case 'customRequest': {
						method = this.getNodeParameter('customMethod', i) as IHttpRequestMethods;
						path = this.getNodeParameter('customPath', i) as string;
						responseFormat = this.getNodeParameter('customResponseFormat', i, 'json') as 'json' | 'text';
						const customQueryJson = this.getNodeParameter('customQueryJson', i, '') as string;
						const customBodyJson = this.getNodeParameter('customBodyJson', i, '') as string;
						if (customQueryJson) {
							qs = parseJsonInput(customQueryJson, 'Query JSON');
						}
						if (customBodyJson && !['GET', 'HEAD'].includes(method)) {
							body = parseJsonInput(customBodyJson, 'Body JSON');
						}
						if (!path.startsWith('/')) {
							path = `/${path}`;
						}
						break;
					}
					default:
						throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, {
							itemIndex: i,
						});
				}

				const response = await capgoApiRequest.call(
					this,
					method,
					path,
					i,
					{
						body,
						json: responseFormat === 'json',
						qs,
					},
				);

				if (responseFormat === 'text') {
					returnData.push({
						json: {
							data: typeof response === 'string' ? response : JSON.stringify(response),
						},
						pairedItem: { item: i },
					});
					continue;
				}

				returnData.push(...buildExecutionItems(response, i));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: i },
					});
					continue;
				}

				if (
					typeof error === 'object'
					&& error !== null
					&& ('httpCode' in error || 'response' in error)
				) {
					throw new NodeApiError(this.getNode(), error, { itemIndex: i });
				}

				throw new NodeOperationError(
					this.getNode(),
					error instanceof Error ? error.message : String(error),
					{ itemIndex: i },
				);
			}
		}

		return [returnData];
	}
}
