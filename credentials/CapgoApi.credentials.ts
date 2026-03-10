import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CapgoApi implements ICredentialType {
	name = 'capgoApi';

	displayName = 'Capgo API';

	icon: Icon = 'file:../icons/capgo.svg';

	documentationUrl = 'https://capgo.app/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.capgo.app',
			placeholder: 'https://api.capgo.app',
			description: 'Use your Capgo API host. For Supabase self-hosted setups, include /functions/v1',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/app',
			method: 'GET',
		},
	};
}
