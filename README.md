# n8n-nodes-capgo

Capgo community nodes for n8n.

This package adds:

- `Capgo`: manage Capgo resources from n8n workflows
- `Capgo Trigger`: receive Capgo webhook events in n8n with signature verification

## Installation

Follow the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

The published package name is `n8n-nodes-capgo`.

## Credentials

Use the `Capgo API` credential with:

1. Your Capgo base URL. The default is `https://api.capgo.app`
2. A Capgo API key with access to the resources you want to automate

## Supported resources

The `Capgo` action node supports:

- Apps
- Channels
- Bundles
- Devices
- Organizations
- API keys
- Statistics
- Builds
- Webhooks
- Custom requests for unsupported endpoints

## Supported operations

Examples of the available operations include:

- Create, get, list, update, and delete apps
- Create, get, list, and delete channels
- Create, list, delete, assign, and update bundle metadata
- Get devices and manage channel overrides
- Create organizations, invite members, list members, and fetch audit logs
- Create and manage API keys
- Fetch app, organization, bundle, and user statistics
- Request, start, cancel, inspect, and fetch logs for native builds
- Create, test, update, retry, and inspect webhooks and webhook deliveries

## Trigger node

`Capgo Trigger` can register a webhook in Capgo when the workflow is activated.
It stores the returned webhook secret in n8n static data and verifies the
`X-Capgo-Signature` header before passing the payload to the workflow.

## Compatibility

This package is built against the n8n community nodes API v1 and is intended for
current n8n 1.x releases.

## Resources

- [Capgo](https://capgo.app)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Repository](https://github.com/Cap-go/n8n-nodes-capgo)
