
require('dotenv').config()

const http = require('http')
const Discord = require('discord.js')

const emojiFlags = require('emoji-flags')

const client = new Discord.Client()

const google = require('./translators/google-translator.js')
const papago = require('./translators/papago-translator.js')
const baidu = require('./translators/baidu-translator.js')

const modes = {
  "google": google,
  "papago": papago,
  "baidu": baidu,
}

let guildSettings = {}

client.on('ready', () => {
  console.log('Logged in as ' + client.user.tag)
})

client.on('message', (msg) => {
  if(msg.author === client.user) return
  if(msg.cleanContent.startsWith('^')) return
  const translatedMessages = {}
  const configs = parseConfig(msg.channel.topic)
  configs.forEach((config) => {
    const toLang = config[0]
    try {
      modes[config[1]](msg.cleanContent, 'auto', toLang, (result) => {
        translatedMessages[toLang] = (result == msg.cleanContent) ? '' : result
        if(configs.every(c => translatedMessages[c[0]] !== undefined)) sendTranslatedMessage(msg.channel, msg.author, configs.map(c => [c[0], translatedMessages[c[0]]]))
      })
    } catch(e) {
      translatedMessages[toLang] = ''
    }
  })
})

client.login(process.env.TOKEN)

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.write('')
  res.end()
}).listen()

const parseConfig = (configText) => (configText || '').split('\n').filter((line) => line.startsWith('@tr ')).map((line) => line.slice(4).split(' '))

const sendTranslatedMessage = (channel, user, messages) => {
  const message = messages.filter((entry) => entry[1] != '').map(entry => emojiFlags.countryCode(entry[0].split('_')[1]).emoji + ' ' + entry[1]).join(' ')
  channel.sendMessage(user.username + ': ' + message)
}
