var http = require("http").createServer();
var io = require("socket.io")(http);

var colors = require("colors");

var redis = require("redis");
var rClient = redis.createClient({
  host : 'redis',
  port : 6379
});

io.on('connection', function(socket){
  socket.on('timeping', function(starttime){
    socket.emit('timepong', starttime);
  });
  socket.on('play', function(data){
    io.in(data.group).emit('play', data.time);
  });
  socket.on('new_song', function(data){
    rClient.hget(data.group, 'playlist', function(get_err, playlist){
      if(playlist != ''){
        playlist = JSON.stringify([data.song]);
      }else{
        playlist = JSON.parse(playlist);
        playlist.push(data.song)
        playlist = JSON.stringify(playlist);
      }
      rClient.hset(data.group, 'playlist', playlist, function(set_err, playlist){
        socket.to(data.group).emit('new_song', data.song);
      });
    });
  });
  socket.on('remove_song', function(data){
    socket.in(data.group).emit('remove_song', data.index);
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
