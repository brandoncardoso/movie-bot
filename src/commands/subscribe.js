const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription(
      '*Admin only* - Subscribes this channel to automatically receive new movie trailers.'
    ),
  async execute(interaction) {
    const allowed = interaction.memberPermissions.has(
      PermissionFlagsBits.Administrator || PermissionFlagsBits.ManageGuild
    )

    if (!allowed) {
      await interaction.reply({
        content: "Sorry, you don't have permission to use that command.",
        ephemeral: true,
      })
      return
    }

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
