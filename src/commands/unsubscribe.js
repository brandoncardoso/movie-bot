const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Unsubscribes this channel from automatically receiving new movie trailers.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    await ChannelRepo.removeChannel(interaction.channelId)
      .then(() => {
        console.log('unsubscribed channel:', interaction.channelId)
        return interaction.reply({
          content:
            'This channel will no longer automatically get new movie trailers.',
          ephemeral: true,
        })
      })
      .catch(console.error)
  },
}
