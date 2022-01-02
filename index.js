require('dotenv').config()
const Discord = require('discord.io')
const YoutubeSearch = require('ytsr')

const COMMAND_PREFIX = '!'

var client = new Discord.Client({
  token: process.env.TOKEN,
  autorun: true,
})

client.on('ready', () => {
  console.log(`logged in as ${client.username} - ${client.id}`)
})

client.on('message', async (user, userId, channelID, message, event) => {
  if (userId === client.id) return
  if (!message.startsWith(COMMAND_PREFIX)) return

  const { command, arg } = getCommand(message)

  switch (command) {
    case 'trailer':
      await handleTrailerCommand(channelID, arg)
      break
  }
})

client.on('disconnect', console.warn)

function getCommand(message) {
  const temp = message.slice(COMMAND_PREFIX.length).split(' ')

  return {
    command: temp.shift().toLowerCase(),
    arg: temp.join(' '),
  }
}

async function handleTrailerCommand(channelId, arg) {
  if (!arg) {
    client.sendMessage({
      to: channelId,
      message: 'Please enter a movie or show title.',
    })
    return
  }

  const yts = await YoutubeSearch(`${arg} movie trailer`, {
    pages: 1,
  })
  const trailer = yts.items.find((video) =>
    video?.title?.toLowerCase().includes('trailer')
  )

  if (trailer) {
    client.sendMessage({
      to: channelId,
      message: trailer.url,
    })
  } else {
    client.sendMessage({
      to: channelId,
      message: `I couldn't find a movie trailer for "${arg}".`,
    })
  }
}
