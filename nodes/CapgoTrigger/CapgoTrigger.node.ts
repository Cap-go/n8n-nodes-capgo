import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import {
	capgoApiRequest,
	stringifyWebhookPayload,
	verifyCapgoSignature,
	webhookEventOptions,
} from '../Capgo/GenericFunctions';

interface CreatedWebhookResponse {
	webhook?: {
		id: string;
		secret?: string;
		url?: string;
	};
}

interface ExistingWebhookResponse {
	id?: string;
	url?: string;
}

export class CapgoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Capgo Trigger',
		name: 'capgoTrigger',
		icon: 'file:../../icons/capgo.svg',
		group: ['trigger'],
		version: 1,
		description: 'Receive Capgo webhook events in n8n',
		defaults: {
			name: 'Capgo Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'capgoApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				path: 'events',
				responseMode: 'onReceived',
			},
		],
		properties: [
			{
				displayName: 'Organization ID',
				name: 'orgId',
				type: 'string',
				default: '',
				required: true,
				description: 'Organization ID that owns the webhook',
			},
			{
				displayName: 'Webhook Name',
				name: 'webhookName',
				type: 'string',
				default: 'n8n Capgo Trigger',
				description: 'Base name used when registering the webhook in Capgo',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [...webhookEventOptions],
				default: ['app_versions'],
				required: true,
				description: 'Capgo events that should trigger this workflow',
			},
			{
				displayName: 'Verify Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description: 'Whether to verify the X-Capgo-Signature header with the stored webhook secret',
			},
			{
				displayName: 'Max Signature Age',
				name: 'maxSignatureAge',
				type: 'number',
				default: 300,
				description: 'Maximum accepted age, in seconds, for webhook signatures',
				displayOptions: {
					show: {
						verifySignature: [true],
					},
				},
			},
		],
	};

	webhookMethods = {
		default: {
			checkExists: async function (this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as IDataObject;
				const webhookId = staticData.webhookId as string | undefined;
				const orgId = this.getNodeParameter('orgId') as string;
				const expectedUrl = this.getNodeWebhookUrl('default');

				if (!webhookId || !expectedUrl) {
					return false;
				}

				try {
					const response = await capgoApiRequest.call(this, 'GET', '/webhooks', 0, {
						qs: {
							orgId,
							webhookId,
						},
					}) as ExistingWebhookResponse;

					return response.id === webhookId && response.url === expectedUrl;
				} catch {
					delete staticData.webhookId;
					delete staticData.webhookSecret;
					delete staticData.webhookUrl;
					return false;
				}
			},
			create: async function (this: IHookFunctions): Promise<boolean> {
				const orgId = this.getNodeParameter('orgId') as string;
				const webhookName = this.getNodeParameter('webhookName') as string;
				const events = this.getNodeParameter('events') as string[];
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Could not resolve the n8n webhook URL');
				}

				const workflow = this.getWorkflow();
				const node = this.getNode();
				const suffix = workflow.id ? ` (${workflow.id}:${node.name})` : ` (${node.name})`;
				const response = await capgoApiRequest.call(this, 'POST', '/webhooks', 0, {
					body: {
						events,
						name: `${webhookName}${suffix}`,
						orgId,
						url: webhookUrl,
					},
				}) as CreatedWebhookResponse;

				if (!response.webhook?.id) {
					throw new NodeOperationError(this.getNode(), 'Capgo did not return a webhook ID');
				}

				const staticData = this.getWorkflowStaticData('node') as IDataObject;
				staticData.orgId = orgId;
				staticData.webhookId = response.webhook.id;
				staticData.webhookSecret = response.webhook.secret ?? '';
				staticData.webhookUrl = response.webhook.url ?? webhookUrl;

				return true;
			},
			delete: async function (this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as IDataObject;
				const webhookId = staticData.webhookId as string | undefined;
				const orgId = (staticData.orgId as string | undefined) ?? (this.getNodeParameter('orgId') as string);

				if (!webhookId) {
					return true;
				}

				try {
					await capgoApiRequest.call(this, 'DELETE', '/webhooks', 0, {
						body: {
							orgId,
							webhookId,
						},
					});
				} finally {
					delete staticData.orgId;
					delete staticData.webhookId;
					delete staticData.webhookSecret;
					delete staticData.webhookUrl;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const headerData = this.getHeaderData();
		const paramsData = this.getParamsData() as IDataObject;
		const queryData = this.getQueryData() as IDataObject;
		const request = this.getRequestObject();
		const staticData = this.getWorkflowStaticData('node') as IDataObject;
		const verifySignature = this.getNodeParameter('verifySignature') as boolean;

		if (verifySignature) {
			const secret = staticData.webhookSecret as string | undefined;
			const signatureHeader = headerData['x-capgo-signature'];
			const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
			const maxSignatureAge = this.getNodeParameter('maxSignatureAge') as number;

			if (!secret) {
				throw new NodeOperationError(this.getNode(), 'Missing stored webhook secret for signature verification');
			}

			if (!signature) {
				throw new NodeOperationError(this.getNode(), 'Missing X-Capgo-Signature header');
			}

			const payloadString = stringifyWebhookPayload(request.body ?? bodyData);
			const verification = verifyCapgoSignature(signature, secret, payloadString, maxSignatureAge);

			if (!verification.valid) {
				throw new NodeOperationError(
					this.getNode(),
					verification.error ?? 'Capgo webhook signature verification failed',
				);
			}
		}

		const json = typeof bodyData === 'object' && bodyData !== null
			? {
					...(bodyData as IDataObject),
					_meta: {
						headers: headerData,
						params: paramsData,
						query: queryData,
						webhookId: staticData.webhookId,
					},
				}
			: {
					body: bodyData,
					_meta: {
						headers: headerData,
						params: paramsData,
						query: queryData,
						webhookId: staticData.webhookId,
					},
				};

		return {
			webhookResponse: {
				status: 'ok',
			},
			workflowData: [[{ json }]],
		};
	}
}
