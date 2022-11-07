const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribes this channel to automatically receive new movie trailers.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    await ChannelRepo.addChannel(interaction.channelId)
      .then(() => {
        console.log('subscribed channel:', interaction.channelId)
        return interaction.reply({
          content:
            'This channel will now automatically get new movie trailers!',
          ephemeral: true,
        })
      })
      .catch(console.error)
  },
}
