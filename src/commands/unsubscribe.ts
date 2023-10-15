import { CacheType, CommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import { MovieBot } from '../bot/movie-bot.js'
import { Command } from './command'

export const Unsubscribe: Command = {
	data: new SlashCommandBuilder()
		.setName('unsubscribe')
		.setDescription('Unsubscribes this channel from automatically receiving information about upcoming movies.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	run: async function (client: MovieBot, interaction: CommandInteraction<CacheType>): Promise<void> {
		await client.unsubscribeChannel(interaction.channelId)
		await interaction.reply({
			content: 'This channel will no longer get info about upcoming movies.',
			ephemeral: true,
		})
	},
}
