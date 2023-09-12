import {
	CacheType,
	Client,
	CommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	WebhookClient,
} from 'discord.js'
import { ChannelRepo } from '../repos/index.js'
import { Command } from './command'

const channelRepo = new ChannelRepo()

export const Unsubscribe: Command = {
	data: new SlashCommandBuilder()
		.setName('unsubscribe')
		.setDescription('Unsubscribes this channel from automatically receiving new movie trailers.')
		.setDefaultMemberPermissions(
			PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
		)
		.setDMPermission(false),
	run: async function (_client: Client, interaction: CommandInteraction<CacheType>): Promise<void> {
		await interaction.deferReply({ ephemeral: true })

		try {
			const channel = await channelRepo.getChannel(interaction.channelId)
			const webhook = new WebhookClient({
				id: channel.webhookId,
				token: channel.webhookToken,
			})
			await webhook.delete()
		} catch (err) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (err?.code === 10015) {
				// unknown webhook, already deleted
				console.log('webhook not found')
			} else {
				console.error(err)
			}
		}

		await channelRepo.unsubscribeChannel(interaction.channelId)

		console.log('channel unsubscribed:', interaction.channelId)
		await interaction.editReply('This channel will no longer automatically get new movie trailers.')
	},
}
