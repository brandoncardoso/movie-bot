const { SlashCommandBuilder } = require('@discordjs/builders')
const { Channel } = require('discord.js')
const ChannelRepo = require('../channel-repo')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription(
      'Subscribes this channel to automatically receive new movie trailers.'
    ),
  async execute(interaction) {
    ChannelRepo.addChannel(interaction.channelId)
      .then(() => {
        console.log('subscribed channel:', interaction.channelId)
        return interaction.reply(
          'This channel will now automatically get new movie trailers!'
        )
      })
      .catch(console.error)
  },
}
