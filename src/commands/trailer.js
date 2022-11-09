const { SlashCommandBuilder } = require('discord.js')
const YoutubeSearch = require('ytsr')
const { createMovieInfoEmbed } = require('../helper')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trailer')
    .setDescription('Searchs youtube for a movie trailer.')
    .addStringOption((option) =>
      option
        .setName('movie')
        .setDescription('The name of the movie you want the trailer for.')
        .setRequired(true)
    ),
  async execute(interaction) {
    const movieName = interaction.options.getString('movie')
    const trailer = await getTrailer(movieName)
    const embed = await createMovieInfoEmbed(trailer.title)

    if (trailer?.url) {
      await interaction.reply(trailer.url)
      const channel = await interaction.client.channels.cache.find(({ id }) => id === interaction.channelId)
      await channel.send({ embeds: [embed] })
    } else {
      await interaction.reply({
        content: `Sorry, I couldn't find a trailer for "${movieName}".`,
        ephemeral: true,
      })
    }
  },
}

async function getTrailer(movieName) {
  const filter = await YoutubeSearch.getFilters(
    `${movieName} movie trailer`
  ).then((f) => f.get('Type').get('Video'))

  const searchResults = await YoutubeSearch(filter.url, {
    pages: 1,
  })

  return searchResults.items.find((video) =>
    video?.title?.toLowerCase().includes('trailer')
  )
}
