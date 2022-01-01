require('dotenv').config()
const Discord = require('discord.io')

var client = new Discord.Client({
  token: process.env.TOKEN,
  autorun: true,
})

client.on('ready', () => {
  console.log(`logged in as ${client.username} - ${client.id}`)
})

client.on('disconnect', console.warn)
