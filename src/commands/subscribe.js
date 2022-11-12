const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('subscribe')
		.setDescription('Subscribes this channel to automatically receive new movie trailers.')
		.setDefaultMemberPermissions(
			PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
		)
		.setDMPermission(false),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true })
		const channel = await ChannelRepo.getChannel(interaction.channelId)

		if (!channel || !channel.webhookId) {
			const discordChannel = await interaction.client.channels.cache.find(
				({ id }) => id === interaction.channelId,
			)
			const webhook = await discordChannel.createWebhook({
				name: process.env.BOT_NAME,
				avatar: './avatar.png',
			})
			await ChannelRepo.addChannel(interaction.channelId, webhook.id, webhook.token)
		}

		console.log('channel subscribed:', interaction.channelId)
		await interaction.editReply('This channel will now automatically get new movie trailers!')
	},
}
