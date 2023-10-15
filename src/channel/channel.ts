export class Channel {
	channelId: string
	subscribed: boolean

	constructor(id: string, subscribed: boolean = true) {
		this.channelId = id
		this.subscribed = subscribed
	}
}
