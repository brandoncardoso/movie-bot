const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
  .setName('subscribe')
  .setDescription('Subscribes this channel to automatically receive new movie trailers.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
  .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    await ChannelRepo.addChannel(interaction.channelId)
    console.log('channel subscribed:', interaction.channelId)

    await interaction.editReply('This channel will now automatically get new movie trailers!')
  },
}
