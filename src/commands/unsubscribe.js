const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js')
const ChannelRepo = require('../repos/channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription(
      '*Admin only* - Unsubscribes this channel from automatically receiving new movie trailers.'
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
