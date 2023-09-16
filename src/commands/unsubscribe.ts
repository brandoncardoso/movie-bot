import {
	CacheType,
	CommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js'
import { MovieBot } from '../bot/movie-bot.js'
import { Command } from './command'

export const Unsubscribe: Command = {
	data: new SlashCommandBuilder()
		.setName('unsubscribe')
		.setDescription('Unsubscribes this channel from automatically receiving new movie trailers.')
		.setDefaultMemberPermissions(
			PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
		)
		.setDMPermission(false),
	run: async function (client: MovieBot, interaction: CommandInteraction<CacheType>): Promise<void> {
		await client.unregisterNewMovieChannel(interaction.channelId)
		await interaction.reply({
			content: 'This channel will no longer automatically get new movie trailers.',
			ephemeral: true
		})
	},
}
