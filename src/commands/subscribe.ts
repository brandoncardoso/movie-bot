import {
	ApplicationCommandType,
	Client,
	CommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
} from 'discord.js'
import { ChannelRepo } from '../repos/index.js'
import { Command } from './command'

const channelRepo = new ChannelRepo()

export const Subscribe: Command = {
	data: new SlashCommandBuilder()
		.setName('subscribe')
		.setDescription('Subscribes this channel to automatically receive new movie trailers.')
		.setDefaultMemberPermissions(
			PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
		)
		.setDMPermission(false),
	run: async function (client: Client, interaction: CommandInteraction): Promise<void> {
		await interaction.deferReply({ ephemeral: true })
		const channel = await channelRepo.getChannel(interaction.channelId)

		if (!channel || !channel.webhookId) {
			const discordChannel: TextChannel = (await client.channels.fetch(
				interaction.channelId,
			)) as TextChannel

			const webhook = await discordChannel.createWebhook({
				name: process.env.BOT_NAME,
				avatar: './avatar.png',
			})
			await channelRepo.addChannel(interaction.channelId, webhook.id, webhook.token)
		}

		console.log('channel subscribed:', interaction.channelId)
		await interaction.editReply('This channel will now automatically get new movie trailers!')
	},
}
