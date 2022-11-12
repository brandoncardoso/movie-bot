const { PermissionFlagsBits, SlashCommandBuilder, WebhookClient } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unsubscribe')
		.setDescription('Unsubscribes this channel from automatically receiving new movie trailers.')
		.setDefaultMemberPermissions(
			PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
		)
		.setDMPermission(false),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true })

		try {
			const channel = await ChannelRepo.getChannel(interaction.channelId)
			const webhook = new WebhookClient({
				id: channel.webhookId,
				token: channel.webhookToken,
			})
			await webhook.delete()
		} catch (err) {
			if (err.code === 10015) {
				// unknown webhook, already deleted
				console.log('webhook not found')
			} else {
				console.error(err)
			}
		}

		await ChannelRepo.unsubscribeChannel(interaction.channelId)

		console.log('channel unsubscribed:', interaction.channelId)
		await interaction.editReply('This channel will no longer automatically get new movie trailers.')
	},
}
