import { ActivityType, Channel, Client, Events, GatewayIntentBits, Interaction } from 'discord.js'
import { ChannelRepository } from '../channel/channel.repository.js'
import { Commands } from '../commands/index.js'

export class MovieBot extends Client {
	channelRepo = new ChannelRepository()

	constructor() {
		super({ intents: [GatewayIntentBits.Guilds] })
		this.registerEvents()
	}

	private registerEvents(): void {
		this.once(Events.ClientReady, () => { this.onReady() })
		this.on(Events.InteractionCreate, async (interaction: Interaction) => { await this.onInterationCreate(interaction) })
		this.on(Events.ChannelDelete, async (channel: Channel) => { await this.onChannelDelete(channel) })
	}
	
	private onReady(): void {
		if (!this.user || !this.application) throw new Error('Error during bot login.')

		this.user.setActivity('new movie trailers', { type: ActivityType.Watching })
		console.log(`logged in as ${this.user.tag}`)
	}

	private async onInterationCreate(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return

		const command = Commands[interaction.commandName]
		if (!command) return

		try {
			await command.run(this, interaction)
		} catch (error) {
			console.error(error)
			await interaction.reply({
				content: 'There was an error executing this command.',
				ephemeral: true,
			})
		}
	}

	private async onChannelDelete(channel: Channel): Promise<void> {
		return this.channelRepo.remove(channel.id)
	}
}
