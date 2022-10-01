require('dotenv').config()
const { TextFixEngine } = require('textlint')
const path = require('path')
const { App } = require('@slack/bolt')

const formatResults = (results) => {
  const messages = results[0].messages
  let output = ''

  messages.forEach((message) => {
    output += `【${message.fix.range[0]}文字目】${message.message}\n`
  })
  return '```\n' + `${output}` + '```\n'
}

const editResults = (results, replace) => {
  const messages = results[0].messages.reverse()
  let output = ''
  messages.forEach((message) => {
    output = `${replace.slice(0, message.fix.range[1])} \`${message.fix.text}\` ${replace.slice(message.fix.range[1])}`
  })
  return `${output}\n`
}

// アプリ初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
})

// textlint初期化
const engine = new TextFixEngine({
  configFile: path.join(__dirname, 'config/.textlintrc'),
})

app.event('app_mention', async ({ event, context }) => {
  let blocks = []
  blocks.push(
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '文書チェックが完了しました',
      },
    },
    {
      type: 'divider',
    }
  )
  try {
    const regex = /^<@(.+?)>/g // メンションの削除
    const replaceText = event.text.replace(regex, '')
    const fixResults = await engine.executeOnText(replaceText)

    if (replaceText.length === 0) {
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'おや？テキストの指定が無いですね。'
          }
        }
      )
    } else if (replaceText.length > 500) {
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '500文字以上は勘弁してください…（負荷が高すぎます）'
          }
        }
      )
    } else if (engine.isErrorResults(fixResults)) {
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*文章に不備が見つかりました*:smiling_face_with_tear:',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: formatResults(fixResults)
            // text: engine.formatResults(fixResults)
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*修正のご提案:small_red_triangle_down:*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            // text: fixResults[0].output,
            text: editResults(fixResults, replaceText)
          },
        },
      )
    } else {
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '入力された文書に問題は見つかりませんでした:tada:'
          }
        }
      )
    }
    app.client.chat.postMessage({
      token: context.botToken,
      channel: event.channel,
      thread_ts: event.ts,
      blocks: [
        ...blocks
      ]
    })
  } catch (error) {
    throw console.log(error)
  }
})

;(async () => {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ Bolt app is running!')
})()
