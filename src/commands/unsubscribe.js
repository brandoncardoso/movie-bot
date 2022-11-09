const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Unsubscribes this channel from automatically receiving new movie trailers.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    await ChannelRepo.removeChannel(interaction.channelId)
    console.log('channel unsubscribed:', interaction.channelId)

    await interaction.editReply('This channel will no longer automatically get new movie trailers.')
  },
}
