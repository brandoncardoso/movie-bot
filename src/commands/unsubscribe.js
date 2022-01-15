const { SlashCommandBuilder } = require('@discordjs/builders')
const ChannelRepo = require('../channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription(
      'Unsubscribes this channel from automatically receiving new movie trailers.'
    ),
  async execute(interaction) {
    ChannelRepo.removeChannel(interaction.channelId)
      .then(() => {
        console.log('unsubscribed channel:', interaction.channelId)
        return interaction.reply(
          'This channel will no longer automatically get new movie trailers.'
        )
      })
      .catch(console.error)
  },
}
