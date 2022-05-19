const express = require("express")
const http = require("http");
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)

const io = new Server(server)

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache")
  next()
})
app.use(express.static("client"))

const usersCaps = []
const users = []
const nameRegex = /^[a-zA-Z0-9\-_]{1,16}$/

function sanitize(text) {
  return text.replace("&", "&amp").replace("<", "&lt").replace(">", "&gt").replace('"', "&quot").replace("'", "&#x27")
}

io.on("connection", (socket) => {
  let username = ""
  socket.once("disconnect", () => {
    if(username !== "") {
      console.log(username, "has left the chat.")
      socket.broadcast.emit("message", JSON.stringify({system: true, message: `**${sanitize(username)}** has left the chat.`}))
    }

    let i = users.indexOf(username)
    if(i < 0) return
    users.splice(i)

    usersCaps.splice(usersCaps.indexOf(username.toUpperCase()))
  })
  socket.on("hello", (message) => {
    if(username !== "") socket.disconnect()

    if(typeof message !== "string") socket.disconnect()

    if(!nameRegex.test(message)) {
      socket.emit("bad_name")
      socket.disconnect()
      return
    }
    if(usersCaps.includes(message.toUpperCase())) {
      socket.emit("bad_name")
      socket.disconnect()
      return
    }

    username = message
    users.push(username)
    usersCaps.push(username.toUpperCase())

    socket.on("message", (message) => {
      if(typeof message !== "string") socket.disconnect()
      message = message.trim()
      if(message === "") return
      
      console.log(`[${username}]: ${message}`)
      socket.broadcast.emit("message", JSON.stringify({user: sanitize(username), message: sanitize(message)}))
      socket.emit("message", JSON.stringify({user: sanitize(username), message: sanitize(message)}))
    })
    socket.emit("success")

    console.log(username, "has joined the chat.")
    socket.broadcast.emit("message", JSON.stringify({system: true, message: `**${sanitize(username)}** has joined the chat.`}))
    socket.emit("message", JSON.stringify({system: true, message: `**${sanitize(username)}** has joined the chat.`}))
    socket.emit("message", JSON.stringify({system: true, message: `**Please note that usernames are not secure.**`}))
  })
});
  
server.listen(process.env.PORT ?? 80, () => {
  console.log(`Server started on port ${process.env.PORT ?? 80}`);
});