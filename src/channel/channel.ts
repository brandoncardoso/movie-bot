export class Channel {
	channelId: string
	webhookId: string
	webhookToken: string

	constructor(id: string, webhookId: string, webhookToken: string) {
		this.channelId = id
		this.webhookId = webhookId
		this.webhookToken = webhookToken
	}
}

