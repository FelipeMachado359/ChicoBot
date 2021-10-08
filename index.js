const fs = require("fs");
const {
  WAConnection,
  MessageType,
  MessageOptions,
  Mimetype,
  ReconnectMode,
} = require("@adiwajshing/baileys");


const streamifier = require("streamifier");
const Axios = require("axios");
const Crypto = require("crypto");
const { tmpdir, type } = require("os");
const path = require("path");
const imageminWebp = require("imagemin-webp");
const pathToFfmpeg = require("ffmpeg-static");
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');

//const id = 'abcd@s.whatsapp.net' // the WhatsApp ID 

//import { MessageType, MessageOptions, Mimetype } from '@adiwajshing/baileys'

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
// console.log(ffmpegInstaller.path, ffmpegInstaller.version);
module.exports = ffmpeg;



async function connectToWhatsApp() {
  
  const conn = new WAConnection(); 
  conn.autoReconnect = ReconnectMode.onConnectionLost; 
  //conn.logger.level = "fatal"; // set to 'debug' to see what kind of stuff you can implement
  // attempt to reconnect at most 10 times in a row
  //conn.connectOptions.maxRetries = 10;
  conn.on('open', () => {
    console.log("Reconectado")
    const authInfo = conn.base64EncodedAuthInfo() // get all the auth info we need to restore this session
    fs.writeFileSync('./auth_info.json', JSON.stringify(authInfo, null, '\t')) // save this info to a file
  })
  conn.loadAuthInfo("./auth_info.json")
  await conn.connect()
  //fs.existsSync('./auth_info.json') &&
  
  conn.on("chat-update", async (chatUpdate) => {
    if (chatUpdate.messages) {
      const m = chatUpdate.messages.all()[0];
      if (!m.message) return;
      handleCommand(m);
    }
  });
  


  
  
  async function handleCommand(m) {
    // Mensagem padrão text
    
    

  const reply = (teks) => {

    conn.sendMessage(m.key.remoteJid, teks, MessageType.text)
  
  }

  


  //fim da definição das mensagens
  const messageType = Object.keys(m.message)[0];
    
     if (
      messageType == MessageType.image &&
      m.message.imageMessage.url &&
      m.message.imageMessage.caption == "/sticker"
    ) {
      reply("```🤖 To fazendo, só um instante...Humano```");
      let imageBuffer = await conn.downloadMediaMessage(m);
      let sticker = await imageminWebp({ preset: "icon" })(imageBuffer);
      await conn.sendMessage(m.key.remoteJid, sticker, MessageType.sticker);
      console.log("Sticker Image sent to: " + m.key.remoteJid);
    } if (
      messageType == MessageType.video &&
      m.message.videoMessage.url &&
      m.message.videoMessage.caption == "/sticker"
    ) {
      reply("```🤖 Calmo ae, video é pesado pra krl! 🔪```" + "\n" + "*Se vier travado incurta o mp4/gif*");
      let processOptions = {
        fps: 15,
        startTime: `00:00:00.0`,
        endTime: `00:00:09.0`,
        loop: 0,
      } 
      const tempFile = path.join(
        tmpdir(),
        `processing.${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
      );
      let videoBuffer = await conn.downloadMediaMessage(m);
      const videoStream = await streamifier.createReadStream(videoBuffer);
      let success = await new Promise((resolve, reject) => {
        var command = ffmpeg(videoStream)
          .inputFormat("mp4")
          .on("error", function (err) {
            console.log("An error occurred: " + err.message);
            reject(err);
          })
          .on("start", function (cmd) {
            console.log("Started " + cmd);
          })
           .addOutputOptions([
            `-vcodec`,
            `libwebp`,
            `-vf`,
            `scale=512:512,setsar=1,fps=${processOptions.fps}`,
            `-loop`,
            `${processOptions.loop}`,
            `-ss`,
            processOptions.startTime,
            `-t`,
            processOptions.endTime,
            `-preset`,
            `default`,
            `-an`,
            `-vsync`,
            `1`,
            `-s`,
            `512:512`,
          ])
          .toFormat("webp")
          .on("end", () => {
            resolve(true);
          })
          .saveToFile(tempFile);
      });
      if (!success) {
        console.log("Erro ao processar o video");
        return;
      }
      var bufferwebp = await fs.readFileSync(tempFile);
      await fs.unlinkSync(tempFile);
      await conn.sendMessage(m.key.remoteJid, bufferwebp, MessageType.sticker);
      console.log("Sticker Animated sent to: " + m.key.remoteJid);
    } else if (
      m.message.conversation &&
      m.message.conversation.startsWith("/imagem")
    ) {
      let message = m.message.conversation.replace("/imagem", "").trim();
      let isSticker = false;
      if (message.includes("sticker")) {
        isSticker = true;
        message = message.replace("sticker", "").trim();
      }
      let search = message;
      let { data } = await Axios.get(
        encodeURI(`https://api.fdci.se/rep.php?gambar=${search}`)
      );
      if (!data) {
        console.log("No data from: " + search);
        return;
      }
      let response = await Axios.get(
        data[Math.floor(Math.random() * data.length)],
        {
          responseType: "arraybuffer",
        }
      )
      if (!response.data) return;
      if (isSticker) {
        let sticker = await imageminWebp({ preset: "icon" })(response.data);
        await conn.sendMessage(m.key.remoteJid, sticker, MessageType.sticker);
        console.log("Sticker Image Random sent to: " + m.key.remoteJid);
        return;
      }
      await conn.sendMessage(m.key.remoteJid, response.data, MessageType.image);
      console.log("Random Image sent to: " + m.key.remoteJid);
    }if (m.message.conversation &&
      m.message.conversation.startsWith("/menu")){
        reply("```🤖 MENU DO CHICOBOT \n\n\nComandos: /sticker e /menu\n\nPróximo passo para o projeto: Sistema de cadastro de ficha RPG.\n\nO bot é gratuito para uso.\nMe incentive a continuar: PIX felipemachado359@gmail.com```");
      }
    
    
    


  }
  conn.on("close", ({ reason, isReconnecting }) =>
    console.log(
      "oh no got disconnected: " + reason + ", reconnecting: " + isReconnecting
    )
  )

  

}

connectToWhatsApp().catch((err) => console.log("unexpected error: " + err));
