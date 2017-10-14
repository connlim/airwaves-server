var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");

var colours = require("colors");
var crypto = require("crypto");
var streamifier = require("streamifier");
var hri = require("human-readable-ids").hri;
var uniqid = require("uniqid");

var minio = require("minio");
var mClient = new minio.Client({
  endPoint : 'minio',
  port : 9000,
  secure : false,
  accessKey : process.env.MINIO_ACCESS_KEY,
  secretKey : process.env.MINIO_SECRET_KEY
});

var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({
  fileSize : 2000000000, //2GB
  storage : storage
});

var redis = require("redis");
var rClient = redis.createClient({
  host : 'redis',
  port : 6379
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use(cors());

app.get('/', function(req, res){
  res.status(200).send("Received at Filesync API.");
});

app.post('/group', function(req, res){
  var groupid = req.body.groupid;
  mClient.makeBucket(encodeURI(groupid), 'ap-southeast-1', function(make_err){
    if(make_err){
      console.log(make_err);
      res.status(500).send("Error creating group");
    }else{
      res.status(200).send(groupid);
    }
  });
});

app.post('/song', upload.single('file'), function(req, res){
  if(!req.file){
    res.status(404).send("No file found.");
  }else if(!req.body.groupid){
    res.status(404).send("No group id found.");
  }else{
    mClient.bucketExists(req.body.groupid, function(exists_err){
      if(exists_err){
        res.status(404).send("Group does not exist.")
      }else{
        var rs = streamifier.createReadStream(req.file.buffer);
        var shasum = crypto.createHash('sha256');
        rs.on('data', function(data){
          shasum.update(data);
        });
        rs.on('end', function(){
          var hash = shasum.digest('hex');
          mClient.putObject(req.body.groupid, hash, req.file.buffer, function(put_err, etag){
            if(put_err){
              console.log(put_err);
              res.status(500).send("Error storing file");
            }else{
              rClient.hset(req.body.groupid, 'currentsong', hash, function(red_err, red_res){
                res.status(200).send('Success');
              });
            }
          });
        });
      }
    });
  }
});

app.get('/:groupid/song/:songid', function(req, res){
  mClient.getObject(req.params.groupid, req.params.songid, function(err, stream){
    if(err){
      if(err.code == 'NoSuchKey'){
        res.status(400).send("No such file");
      }else{
        res.status(500).send("Error retrieving file");
      }
    }else{
      stream.pipe(res);
    }
  });
});

// app.get('/exists/:groupid/:songid', function(req, res){
//   mClient.getObject(req.params.groupid, req.params.songid, function(err, stream){
//     if(err){
//       if(err.code == 'NoSuchKey'){
//         res.status(400).send("No such file");
//       }else{
//         res.status(500).send("Error retrieving file");
//       }
//     }else{
//       res.status(200).send("Exists");
//     }
//   });
// });

app.get('/:groupid/playing', function(req, res){
  rClient.hget(req.params.groupid, 'currentsong', function(get_err, currentsong){
    if(get_err){
      res.status(400).send("Error retrieving current song.");
    }else{
      res.status(200).send(currentsong);
    }
  });
});

app.listen(process.env.FILESYNC_PORT, function(err){
  err ? console.error(err) : console.log(("Filesync API up at " + process.env.FILESYNC_PORT).rainbow);
});
