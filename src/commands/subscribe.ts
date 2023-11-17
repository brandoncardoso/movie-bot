import { CommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import { MovieBot } from '../bot/movie_bot.js'
import { Command } from './types.js'

export const Subscribe: Command = {
	data: new SlashCommandBuilder()
		.setName('subscribe')
		.setDescription('Subscribes this channel to automatically receive information about upcoming movies.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	run: async function (client: MovieBot, interaction: CommandInteraction): Promise<void> {
		await client.subscribeChannel(interaction.channelId)
		await interaction.reply({
			content: 'This channel is now subscribed to get info about upcoming movies!',
			ephemeral: true,
		})
	},
}
