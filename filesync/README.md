# backend v1.0.0

Backend API for airwaves. Handles calls not relating to sockets.

- [General](#general)
	- [Ping API](#ping-api)
	
- [Group](#group)
	- [Add group](#add-group)
	
- [Song](#song)
	- [Add song to a group. Updates current song to this.](#add-song-to-a-group.-updates-current-song-to-this.)
	- [Gets hash of current playing song.](#gets-hash-of-current-playing-song.)
	- [Gets a song by its id (hash) in a group.](#gets-a-song-by-its-id-(hash)-in-a-group.)
	


# General

## Ping API



	GET /


# Group

## Add group



	POST /group


### Parameters

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| groupid			| String			|  <p>ID of the group. Generate client-side.</p>							|

# Song

## Add song to a group. Updates current song to this.



	POST /song


### Parameters

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| groupid			| String			|  <p>ID of the group song is added to.</p>							|
| file			| File			|  <p>Songfile uploaded.</p>							|

## Gets hash of current playing song.



	GET /:groupid/playing


### Parameters

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| groupid			| String			|  <p>ID of the group song is playing in.</p>							|

## Gets a song by its id (hash) in a group.



	GET /:groupid/song/:songid


### Parameters

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| groupid			| String			|  <p>ID of the group song was added to.</p>							|
| songid			| String			|  <p>Hash of the songfile.</p>							|


