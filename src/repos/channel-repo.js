const Datastore = require('nedb-promises')

class Channel {
  constructor(id) {
    this.channelId = id
    this.subscribed = true
  }
}

const channels = Datastore.create({
  filename: './data/channels.db',
  timestampData: true,
  autoload: true,
})

channels.ensureIndex({ fieldName: 'channelId', unique: true }).catch(console.error)

function addChannel(channelId) {
  return channels.update({ channelId }, new Channel(channelId), {
    upsert: true,
  })
}

function removeChannel(channelId) {
  return channels.remove({ channelId }, { multi: true })
}

function getChannel(channelId) {
  return channels.findOne({ channelId })
}

function getAllChannels() {
  return channels.find({})
}

function getAllSubscribedChannels() {
  return channels.find({ subscribed: true })
}

function unsubscribeChannel(channelId) {
  return channels.update({ channelId }, { subscribed: false })
}

module.exports = {
  addChannel,
  removeChannel,
  getChannel,
  getAllChannels,
  getAllSubscribedChannels,
  unsubscribeChannel,
}
