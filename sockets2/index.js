var http = require("http").createServer();
var io = require("socket.io")(http);

var colors = require("colors");

io.on('connection', function(socket){
  socket.on('timeping', function(starttime){
    socket.emit('timepong', starttime);
  });
  socket.on('play', function(data){
    io.to(data.group).emit('play', data.time);
  });
  socket.on('joingroup', function(group){
    socket.join(group);
  });
  socket.on('leavegroup', function(group){
    socket.leave(group);
  });
});

http.listen(process.env.SOCKET_PORT, function(err){
  err ? console.error(err) : console.log(("Socket up at " + process.env.SOCKET_PORT).rainbow);
});
