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

/**
 * @api {get} / Ping API
 * @apiName Ping
 * @apiGroup General
 *
 * @apiSuccess {String} res Received at Filesync API.
 */
app.get('/', function(req, res){
  res.status(200).send("Received at Filesync API.");
});

/**
 * @api {post} /group Add group
 * @apiName AddGroupGen
 * @apiGroup Group
 *
 * @apiSuccess {String} groupid ID of the group.
 *
 * @apiError {String} 500 Error creating group.
 */
app.post('/group/genid', function(req, res){
  var groupid = hri.random();
  mClient.makeBucket(encodeURI(groupid), 'ap-southeast-1', function(make_err){
    if(make_err){
      console.log(make_err);
      res.status(500).send("Error creating group");
    }else{
      var id = uniqid();
      rClient.hset(groupid, 'master', id, function(red_err, red_res){
        res.status(200).send({
          groupid: groupid,
          master : id
        });
      });
    }
  });
});

/**
 * @api {post} /group Add group, autogen group id
 * @apiName AddGroup
 * @apiGroup Group
 *
 * @apiParam {String} groupid ID of the group. Generate client-side.
 *
 * @apiSuccess {String} groupid ID of the group.
 *
 * @apiError {String} 500 Error creating group.
 */
app.post('/group', function(req, res){
  var groupid = req.body.groupid;
  mClient.makeBucket(encodeURI(groupid), 'ap-southeast-1', function(make_err){
    if(make_err){
      console.log(make_err);
      res.status(500).send("Error creating group");
    }else{
      var id = uniqid();
      rClient.hset(req.body.groupid, 'master', id, function(red_err, red_res){
        res.status(200).send({
          groupid: groupid,
          master : id
        });
      });
    }
  });
});

app.get('/:groupid/exists', function(req, res){
  rClient.hget(req.params.groupid, 'master', function(red_err, red_res){
    res.status(200).send(red_res ? '1' : '0');
  });
});

/**
 * @api {post} /song Add song to a group. Updates current song to this.
 * @apiName AddSong
 * @apiGroup Song
 *
 * @apiParam {String} groupid ID of the group song is added to.
 * @apiParam {File} file Songfile uploaded.
 *
 * @apiSuccess {String} message Success.
 *
 * @apiError {String} 404 No file found.
 * @apiError {String} 404 No group id found.
 * @apiError {String} 404 Group does not exist.
 * @apiError {String} 500 Error storing file.
 */
app.post('/song', upload.single('file'), function(req, res){
  if(!req.file){
    res.status(404).send("No file found.");
  }else if(!req.body.groupid){
    res.status(404).send("No group id found.");
  }else if(!req.body.id){
    res.status(401).send("No master id found.");
  }else{
    rClient.hget(req.body.groupid, 'master', function(id_err, id){
      if(id != req.body.id){
        res.status(401).send("Invalid master id.");
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

  }
});

/**
 * @api {get} /:groupid/song/:songid Gets a song by its id (hash) in a group.
 * @apiName GetSong
 * @apiGroup Song
 *
 * @apiParam {String} groupid ID of the group song was added to.
 * @apiParam {String} songid Hash of the songfile.
 *
 * @apiSuccess {File} song The song file.
 *
 * @apiError {String} 400 No such file.
 * @apiError {String} 500 Error retrieving file.
 */
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

/**
 * @api {get} /:groupid/playing Gets hash of current playing song.
 * @apiName GetPlaying
 * @apiGroup Song
 *
 * @apiParam {String} groupid ID of the group song is playing in.
 *
 * @apiSuccess {String} currentsong Hash of current song file.
 *
 * @apiError {String} 400 Error retrieving current song.
 */
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
