const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage,generateLocationMessage} = require('./utils/messages')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users')

const app = express()
//Create a new HTTP server from express app.
const server = http.createServer(app)
//Create a SocketIO server from an HTTP server.
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

//io.on() creates an SocketIO event handler (a listener). Needs 2 arguments:
//First event name, and second callback function (argument may be passed with the emit command).
//'connection' event will occurs every time new connection created. socket is an object passed
//to the function and contians information about the connection (on 'connection' event).
//socket.emit() allow us to send an event to the client/server. On client side only socket uses,
//and on server side both socket and io are uses. It's needs an event and objects.
//The event names must be equal on both the server and clients and the objects will be passed
//to the client. By using io.emit() we send response to all connections.
//Third argument for emit() is optional and it's acknowledgment callback. To support acknowledgment
//we need to add second parameter to the on() that handles it, a callback and call it after emit().
//The callback may also be called if there were problems to inform the client.
//This callback could pass data that could be caught on emit() acknoledgment callback as an argument.
//socket.broadcast.emit() will send event to all connections execpt itself (the socket var).
//socket.on('disconnect') is a built-in event occurs when the browser page get closed,
//same as io.on('connection') that occurs when user open/refresh the page.
//Room is an SocketIo string that aggregate connections as room for broadcasting.
//socket.join() is using to enter a room and socket.leave() is using to leave the room.
//When using rooms we need to change some of the original SocketIo methods (io.emit(), socket.emit() and
//socket.broadcast.emit()). The new syntax we will use is chainig to() (room as parameter) inside the
//original methods. When we want to emit to everyone in a room we will use: io.to(ROOM).emit().
//When we want to emit to everyone in a room except ourself we will use: socket.broadcast.to(ROOM).emit().
//socket.emit() need no changes because it's allready emit only to itself.
io.on('connection',(socket)=>{
   console.log('New WebSocket Connection')
   socket.on('join',({username,room},callback)=>{
      const {error,user} =addUser({id:socket.id,username,room})
      if(error) {
         return callback(error)
      }
      socket.join(user.room)
      socket.emit('message',generateMessage('Admin','Welcome!'))
      socket.broadcast.to(user.room).emit('message',generateMessage('Admin',`${user.username} has joined!`))
      io.to(user.room).emit('roomData',{
         room: user.room,
         users: getUsersInRoom(user.room)
      })
      callback()
   })
   socket.on('sendMessage',(message,callback)=>{
      const user = getUser(socket.id)
      const filter = new Filter()
      if(filter.isProfane(message)){
         return callback('Profanity is not allowed!')
      }
      io.to(user.room).emit('message',generateMessage(user.username,message))
      callback()
   })
   socket.on('sendLocation',(coords,callback)=>{
      const user = getUser(socket.id)
      io.to(user.room).emit('locationMessage',
      generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
      callback()
   })
   socket.on('disconnect',()=>{
      const user = removeUser(socket.id)
      if(user){
         io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left!`))
         io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
         })
      }
   })
})

//Instead of start the express app we starting the HTTP server created by the express server.
server.listen(port,()=>{
   console.log('Server is up on port '+port) 
})