const Datastore = require('nedb-promises')

class Channel {
  constructor(id) {
    this.id = id
  }
}

const channels = Datastore.create({
  filename: './data/trailer_channels.db',
  timestampData: true,
  autoload: true,
})

channels.ensureIndex({ fieldName: 'id', unique: true }).catch(console.error)

function addChannel(channelId) {
  return channels.update({ id: channelId }, new Channel(channelId), {
    upsert: true,
  })
}

function removeChannel(channelId) {
  return channels.remove({ id: channelId }, { multi: true })
}

function getAllChannels() {
  return channels.find({})
}

function getChannel(channelId) {
  return channels.findOne({ id: channelId })
}

module.exports = {
  addChannel,
  removeChannel,
  getChannel,
  getAllChannels,
}
