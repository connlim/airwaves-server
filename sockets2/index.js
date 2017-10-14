var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var colors = require("colors");

io.on('connection', function(socket){
  socket.on('timeping', function(starttime){
    socket.emit('timepong', starttime);
  });
  socket.on('play', function(data){
    io.emit('play', data);
  })

});

http.listen(process.env.SOCKET_PORT, function(){
  console.log(("Socket up at " + process.env.SOCKET_PORT).rainbow);
});
