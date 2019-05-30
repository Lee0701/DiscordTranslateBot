
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

let history = {}

client.on('ready', () => {
  console.log('Logged in as ' + client.user.tag)
})

client.on('message', (msg) => {
  if(msg.author === client.user) return
  if(msg.cleanContent.startsWith('^')) return
  translate(msg, (result) => sendTranslatedMessage(msg, result))
})

client.on('messageUpdate', (oldMsg, newMsg) => {
  const key = getHistoryKey(oldMsg)
  if(history[key]) {
    translate(newMsg, (result) => {
      oldMsg.channel.fetchMessage(history[key]).then(msg => msg.edit(result))
    })
  }
})

client.on('messageDelete', (msg) => {
  const key = getHistoryKey(msg)
  if(history[key]) {
    msg.channel.fetchMessage(history[key]).then(msg => msg.delete())
  }
})

client.login(process.env.TOKEN)

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.write('')
  res.end()
}).listen()

const parseConfig = (configText) => (configText || '').split('\n').filter((line) => line.startsWith('@tr ')).map((line) => line.slice(4).split(' '))

const translate = (msg, callback) => {
  const translatedMessages = {}
  const configs = parseConfig(msg.channel.topic)
  configs.forEach((config) => {
    const toLang = config[0]
    try {
      modes[config[1]](msg.cleanContent, 'auto', toLang, (result) => {
        translatedMessages[toLang] = (result == msg.cleanContent) ? '' : result
        if(configs.every(c => translatedMessages[c[0]] !== undefined)) callback(formatMessage(msg, configs.map(c => [c[0], translatedMessages[c[0]]])))
      })
    } catch(e) {
      translatedMessages[toLang] = ''
    }
  })
}

const formatMessage = (msg, messages) => {
  return msg.author.username + ': ' + messages.filter((entry) => entry[1] != '').map(entry => emojiFlags.countryCode(entry[0].split('_')[1]).emoji + ' ' + entry[1]).join(' ')
}

const sendTranslatedMessage = (msg, translated) => {
  msg.channel.send(translated).then(sent => {
    const key = getHistoryKey(msg)
    history[key] = sent.id
    setTimeout(() => {
      delete history[key]
    }, 5*60*1000)
  })
}

const getHistoryKey = (msg) => msg.guild.id + '/' + msg.channel.id + '/' + msg.id
